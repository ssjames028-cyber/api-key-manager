import { invoke } from "@tauri-apps/api/core";
import type { ApiKey, AddKeyPayload } from "../types";

export const tauriApi = {
  getAllKeys: (): Promise<ApiKey[]> => invoke("get_all_keys"),

  addKey: (payload: AddKeyPayload): Promise<ApiKey> =>
    invoke("add_key", { name: payload.name, value: payload.value }),

  deleteKey: (id: string): Promise<void> => invoke("delete_key", { id }),

  getDecryptedValue: (id: string): Promise<string> =>
    invoke("get_decrypted_value", { id }),
};
