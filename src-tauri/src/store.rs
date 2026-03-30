use std::fs;
use std::os::unix::fs::PermissionsExt;
use tauri::AppHandle;
use tauri::Manager;

use crate::models::Vault;

fn vault_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("앱 데이터 디렉토리를 가져올 수 없습니다: {e}"))?;

    Ok(data_dir.join("vault.json"))
}

/// vault.json을 읽어 Vault 구조체로 반환. 파일이 없으면 빈 Vault 반환
pub fn load_vault(app: &AppHandle) -> Result<Vault, String> {
    let path = vault_path(app)?;

    if !path.exists() {
        return Ok(Vault::default());
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("vault.json 읽기 실패: {e}"))?;

    serde_json::from_str::<Vault>(&content)
        .map_err(|e| format!("vault.json 파싱 실패: {e}"))
}

/// Vault 구조체를 vault.json에 저장. 파일 권한을 0o600으로 설정
pub fn save_vault(app: &AppHandle, vault: &Vault) -> Result<(), String> {
    let path = vault_path(app)?;

    // 상위 디렉토리가 없으면 생성
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("디렉토리 생성 실패: {e}"))?;
    }

    let content = serde_json::to_string_pretty(vault)
        .map_err(|e| format!("JSON 직렬화 실패: {e}"))?;

    fs::write(&path, content)
        .map_err(|e| format!("vault.json 쓰기 실패: {e}"))?;

    // 소유자 읽기/쓰기만 허용 (0o600)
    fs::set_permissions(&path, fs::Permissions::from_mode(0o600))
        .map_err(|e| format!("파일 권한 설정 실패: {e}"))?;

    Ok(())
}
