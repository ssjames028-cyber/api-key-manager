import { useState, useCallback, useEffect, useRef } from "react";
import { Eye, EyeOff, Copy, Check, Trash2 } from "lucide-react";
import { tauriApi } from "../lib/tauri";
import { useClipboard } from "../hooks/useClipboard";
import type { ApiKey } from "../types";

const MASK_FIXED_LENGTH = 12;
const COPY_FEEDBACK_MS = 1500;
const AUTO_HIDE_SEC = 5;

function maskValue(value: string): string {
  if (value.length <= 7) return "•".repeat(MASK_FIXED_LENGTH);
  const prefix = value.slice(0, 4);
  const suffix = value.slice(-3);
  return `${prefix}${"•".repeat(MASK_FIXED_LENGTH)}${suffix}`;
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

interface KeyTableRowProps {
  apiKey: ApiKey;
  onDeleteRequest: (id: string, name: string) => void;
  onError: (message: string) => void;
}

export function KeyTableRow({ apiKey, onDeleteRequest, onError }: KeyTableRowProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [plainValue, setPlainValue] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [countdown, setCountdown] = useState(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { copy } = useClipboard();

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const startAutoHide = useCallback(() => {
    // 기존 타이머 초기화
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setCountdown(AUTO_HIDE_SEC);

    // 1초마다 카운트다운
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 5초 후 자동 숨김
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setCountdown(0);
    }, AUTO_HIDE_SEC * 1000);
  }, []);

  const stopAutoHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(0);
  }, []);

  const handleToggleVisible = useCallback(async () => {
    if (!isVisible) {
      // 보기 — 복호화 후 자동 숨김 타이머 시작
      if (plainValue === null) {
        try {
          const decrypted = await tauriApi.getDecryptedValue(apiKey.id);
          setPlainValue(decrypted);
        } catch {
          onError("값을 불러오는 데 실패했습니다.");
          return;
        }
      }
      setIsVisible(true);
      startAutoHide();
    } else {
      // 수동 숨기기
      setIsVisible(false);
      stopAutoHide();
    }
  }, [isVisible, plainValue, apiKey.id, onError, startAutoHide, stopAutoHide]);

  const handleCopy = useCallback(async () => {
    try {
      let value = plainValue;
      if (value === null) {
        value = await tauriApi.getDecryptedValue(apiKey.id);
        setPlainValue(value);
      }
      await copy(value);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), COPY_FEEDBACK_MS);
    } catch {
      onError("복사에 실패했습니다.");
    }
  }, [plainValue, apiKey.id, copy, onError]);

  return (
    <tr className="group border-b border-zinc-800/60 hover:bg-zinc-900/40 transition-colors">
      {/* 이름 */}
      <td className="px-4 py-3 text-sm text-zinc-100 font-medium">
        {apiKey.name}
      </td>

      {/* 값 */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-zinc-400 tracking-wider">
            {isVisible && plainValue ? plainValue : maskValue(plainValue ?? "")}
          </span>
          {/* 카운트다운 + 수동 숨기기 버튼 */}
          {isVisible && countdown > 0 && (
            <button
              onClick={() => { setIsVisible(false); stopAutoHide(); }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs
                text-zinc-500 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition-colors"
              title="지금 숨기기"
            >
              <EyeOff size={11} />
              <span className="tabular-nums">{countdown}s</span>
            </button>
          )}
        </div>
      </td>

      {/* 생성일 */}
      <td className="px-4 py-3 text-sm text-zinc-500">
        {formatDate(apiKey.created_at)}
      </td>

      {/* 작업 */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* 보기/숨기기 */}
          <button
            onClick={handleToggleVisible}
            title={isVisible ? "숨기기" : "보기"}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            {isVisible ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>

          {/* 복사 */}
          <button
            onClick={handleCopy}
            title="클립보드 복사"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            {copyState === "copied" ? (
              <Check size={15} className="text-emerald-400" />
            ) : (
              <Copy size={15} />
            )}
          </button>

          {/* 삭제 */}
          <button
            onClick={() => onDeleteRequest(apiKey.id, apiKey.name)}
            title="삭제"
            className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}
