use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKey {
    pub id: String,
    pub name: String,
    pub encrypted_value: String, // Base64(nonce || ciphertext)
    pub created_at: String,      // ISO 8601 (UTC)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Vault {
    pub version: u8,
    pub keys: Vec<ApiKey>,
}

impl Default for Vault {
    fn default() -> Self {
        Vault {
            version: 1,
            keys: vec![],
        }
    }
}
