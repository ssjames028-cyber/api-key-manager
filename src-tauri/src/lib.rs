mod commands;
mod crypto;
mod models;
mod store;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_all_keys,
            commands::add_key,
            commands::delete_key,
            commands::get_decrypted_value,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
