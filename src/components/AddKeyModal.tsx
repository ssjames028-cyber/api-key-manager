import { useState, useEffect, type FormEvent } from "react";
import { X, Eye, EyeOff, Loader2 } from "lucide-react";
import { useKeyContext } from "../context/KeyContext";

interface AddKeyModalProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function AddKeyModal({ onClose, onSuccess, onError }: AddKeyModalProps) {
  const { addKey } = useKeyContext();
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [nameError, setNameError] = useState("");
  const [valueError, setValueError] = useState("");
  const [showValue, setShowValue] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const validate = (): boolean => {
    let valid = true;
    if (!name.trim()) {
      setNameError("이름을 입력해주세요.");
      valid = false;
    } else {
      setNameError("");
    }
    if (!value.trim()) {
      setValueError("API 키 값을 입력해주세요.");
      valid = false;
    } else {
      setValueError("");
    }
    return valid;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await addKey(name.trim(), value.trim());
      onSuccess("키가 저장되었습니다.");
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* 배경 딤 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* 모달 패널 */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">새 API 키 추가</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="px-5 py-5 flex flex-col gap-4">
          {/* 이름 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-400">
              이름 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(""); }}
              placeholder="예: OpenAI Prod"
              disabled={isSubmitting}
              className={`bg-zinc-800 border rounded-lg px-3 py-2 text-sm text-zinc-100
                placeholder-zinc-600 focus:outline-none transition-colors
                ${nameError
                  ? "border-red-500/70 focus:border-red-500"
                  : "border-zinc-700 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
                }
                disabled:opacity-50`}
            />
            {nameError && <p className="text-xs text-red-400">{nameError}</p>}
          </div>

          {/* 값 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-400">
              API 키 값 <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showValue ? "text" : "password"}
                value={value}
                onChange={(e) => { setValue(e.target.value); setValueError(""); }}
                placeholder="sk-proj-..."
                disabled={isSubmitting}
                className={`w-full bg-zinc-800 border rounded-lg pl-3 pr-9 py-2 text-sm
                  text-zinc-100 placeholder-zinc-600 focus:outline-none font-mono transition-colors
                  ${valueError
                    ? "border-red-500/70 focus:border-red-500"
                    : "border-zinc-700 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
                  }
                  disabled:opacity-50`}
              />
              <button
                type="button"
                onClick={() => setShowValue((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showValue ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {valueError && <p className="text-xs text-red-400">{valueError}</p>}
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700
                rounded-lg transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium
                text-zinc-950 bg-emerald-400 hover:bg-emerald-300
                rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
