use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose, Engine};
use pbkdf2::pbkdf2_hmac;
use sha2::Sha256;
use std::fs;
use std::os::unix::fs::PermissionsExt;
use tauri::{AppHandle, Manager};

const PBKDF2_ITERATIONS: u32 = 100_000;
const SALT: &[u8] = b"com.lysislab.api-key-manager-v1";
const KEY_FILE: &str = "keyfile.bin";

/// 앱 데이터 디렉토리에서 마스터 키를 로드하거나 최초 실행 시 생성
pub fn get_master_key(app: &AppHandle) -> Result<[u8; 32], String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("데이터 디렉토리 접근 실패: {e}"))?;

    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("디렉토리 생성 실패: {e}"))?;

    let key_path = data_dir.join(KEY_FILE);

    if key_path.exists() {
        // 기존 키 로드
        let raw = fs::read(&key_path)
            .map_err(|e| format!("키 파일 읽기 실패: {e}"))?;

        if raw.len() != 32 {
            return Err("키 파일이 손상되었습니다.".to_string());
        }

        let mut key = [0u8; 32];
        key.copy_from_slice(&raw);
        Ok(key)
    } else {
        // 최초 실행: 랜덤 32바이트 생성 후 PBKDF2로 키 파생
        let mut random_seed = [0u8; 32];
        use aes_gcm::aead::rand_core::RngCore;
        OsRng.fill_bytes(&mut random_seed);

        let mut key = [0u8; 32];
        pbkdf2_hmac::<Sha256>(&random_seed, SALT, PBKDF2_ITERATIONS, &mut key);

        // 키 파일 저장 (권한 0o600)
        fs::write(&key_path, &key)
            .map_err(|e| format!("키 파일 저장 실패: {e}"))?;
        fs::set_permissions(&key_path, fs::Permissions::from_mode(0o600))
            .map_err(|e| format!("키 파일 권한 설정 실패: {e}"))?;

        Ok(key)
    }
}

/// 평문 → Base64(nonce[12] || ciphertext)
pub fn encrypt(plaintext: &str, key: &[u8; 32]) -> Result<String, String> {
    let cipher = Aes256Gcm::new(key.into());
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);

    let ciphertext = cipher
        .encrypt(&nonce, plaintext.as_bytes())
        .map_err(|e| format!("암호화 실패: {e}"))?;

    let mut combined = nonce.to_vec();
    combined.extend_from_slice(&ciphertext);

    Ok(general_purpose::STANDARD.encode(combined))
}

/// Base64(nonce[12] || ciphertext) → 평문
pub fn decrypt(encoded: &str, key: &[u8; 32]) -> Result<String, String> {
    let combined = general_purpose::STANDARD
        .decode(encoded)
        .map_err(|e| format!("Base64 디코딩 실패: {e}"))?;

    if combined.len() < 12 {
        return Err("암호화 데이터가 손상되었습니다.".to_string());
    }

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let cipher = Aes256Gcm::new(key.into());
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "복호화 실패: 데이터가 손상되었거나 키가 올바르지 않습니다.".to_string())?;

    String::from_utf8(plaintext).map_err(|e| format!("UTF-8 변환 실패: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_key() -> [u8; 32] {
        let mut key = [0u8; 32];
        pbkdf2_hmac::<Sha256>(b"test-seed-value", SALT, PBKDF2_ITERATIONS, &mut key);
        key
    }

    #[test]
    fn encrypt_result_differs_from_plaintext() {
        let key = test_key();
        let plaintext = "sk-proj-test1234567890";
        let encrypted = encrypt(plaintext, &key).unwrap();
        assert_ne!(encrypted, plaintext);
        assert!(!encrypted.is_empty());
    }

    #[test]
    fn encrypt_decrypt_roundtrip() {
        let key = test_key();
        let plaintext = "sk-proj-abcdefghijklmnop";
        let encrypted = encrypt(plaintext, &key).unwrap();
        let decrypted = decrypt(&encrypted, &key).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn each_encrypt_produces_unique_ciphertext() {
        let key = test_key();
        let plaintext = "same-value";
        let enc1 = encrypt(plaintext, &key).unwrap();
        let enc2 = encrypt(plaintext, &key).unwrap();
        assert_ne!(enc1, enc2);
    }

    #[test]
    fn wrong_key_returns_error() {
        let key1 = test_key();
        let mut key2 = [0u8; 32];
        pbkdf2_hmac::<Sha256>(b"different-seed", SALT, PBKDF2_ITERATIONS, &mut key2);

        let encrypted = encrypt("secret", &key1).unwrap();
        let result = decrypt(&encrypted, &key2);
        assert!(result.is_err());
    }

    #[test]
    fn tampered_data_returns_error() {
        let key = test_key();
        let mut encoded = encrypt("secret", &key).unwrap();
        encoded.pop();
        encoded.push(if encoded.ends_with('A') { 'B' } else { 'A' });
        let result = decrypt(&encoded, &key);
        assert!(result.is_err());
    }
}
