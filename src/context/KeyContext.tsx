import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { tauriApi } from "../lib/tauri";
import type { ApiKey } from "../types";

interface KeyContextValue {
  keys: ApiKey[];
  filteredKeys: ApiKey[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  addKey: (name: string, value: string) => Promise<void>;
  deleteKey: (id: string) => Promise<void>;
  isLoading: boolean;
}

const KeyContext = createContext<KeyContextValue | null>(null);

export function KeyContextProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    tauriApi
      .getAllKeys()
      .then(setKeys)
      .catch(() => {}) // 로딩 실패 시 빈 목록 유지, 민감 정보 콘솔 출력 금지
      .finally(() => setIsLoading(false));
  }, []);

  const filteredKeys = keys.filter((k) =>
    k.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addKey = useCallback(async (name: string, value: string) => {
    const newKey = await tauriApi.addKey({ name, value });
    setKeys((prev) => [newKey, ...prev]);
  }, []);

  const deleteKey = useCallback(async (id: string) => {
    await tauriApi.deleteKey(id);
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }, []);

  return (
    <KeyContext.Provider
      value={{
        keys,
        filteredKeys,
        searchQuery,
        setSearchQuery,
        addKey,
        deleteKey,
        isLoading,
      }}
    >
      {children}
    </KeyContext.Provider>
  );
}

export function useKeyContext(): KeyContextValue {
  const ctx = useContext(KeyContext);
  if (!ctx) throw new Error("useKeyContext must be used within KeyContextProvider");
  return ctx;
}
