export interface ApiKey {
  id: string;
  name: string;
  encrypted_value: string; // Rust snake_case 그대로
  created_at: string;      // ISO 8601
}

export interface AddKeyPayload {
  name: string;
  value: string;
}

export type ToastType = "success" | "error";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}
