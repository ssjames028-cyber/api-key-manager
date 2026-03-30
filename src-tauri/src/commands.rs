use tauri::AppHandle;

use crate::{
    crypto,
    models::ApiKey,
    store,
};

#[tauri::command]
pub async fn get_all_keys(app: AppHandle) -> Result<Vec<ApiKey>, String> {
    let vault = store::load_vault(&app)?;
    Ok(vault.keys)
}

#[tauri::command]
pub async fn add_key(
    app: AppHandle,
    name: String,
    value: String,
) -> Result<ApiKey, String> {
    let name = name.trim().to_string();
    let value = value.trim().to_string();

    if name.is_empty() {
        return Err("이름을 입력해주세요.".to_string());
    }
    if value.is_empty() {
        return Err("API 키 값을 입력해주세요.".to_string());
    }

    let vault = store::load_vault(&app)?;

    if vault.keys.iter().any(|k| k.name == name) {
        return Err(format!("'{name}'은 이미 존재하는 키 이름입니다."));
    }

    let master_key = crypto::get_master_key(&app)?;
    let encrypted_value = crypto::encrypt(&value, &master_key)?;

    let new_key = ApiKey {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        encrypted_value,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    let updated_vault = crate::models::Vault {
        version: vault.version,
        keys: {
            let mut keys = vault.keys;
            keys.push(new_key.clone());
            keys
        },
    };

    store::save_vault(&app, &updated_vault)?;
    Ok(new_key)
}

#[tauri::command]
pub async fn delete_key(app: AppHandle, id: String) -> Result<(), String> {
    let vault = store::load_vault(&app)?;

    let updated_vault = crate::models::Vault {
        version: vault.version,
        keys: vault.keys.into_iter().filter(|k| k.id != id).collect(),
    };

    store::save_vault(&app, &updated_vault)
}

#[tauri::command]
pub async fn get_decrypted_value(app: AppHandle, id: String) -> Result<String, String> {
    let vault = store::load_vault(&app)?;

    let key = vault
        .keys
        .iter()
        .find(|k| k.id == id)
        .ok_or_else(|| "키를 찾을 수 없습니다.".to_string())?;

    let master_key = crypto::get_master_key(&app)?;
    crypto::decrypt(&key.encrypted_value, &master_key)
}
