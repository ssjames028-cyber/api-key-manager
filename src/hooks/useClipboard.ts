import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useCallback, useRef } from "react";

const CLIPBOARD_CLEAR_DELAY_MS = 30_000;

export function useClipboard() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (text: string): Promise<void> => {
    await writeText(text);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      await writeText("").catch(() => {});
      timerRef.current = null;
    }, CLIPBOARD_CLEAR_DELAY_MS);
  }, []);

  return { copy };
}
