import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { useKeyContext } from "../context/KeyContext";

interface DeleteTarget {
  id: string;
  name: string;
}

interface DeleteConfirmModalProps {
  target: DeleteTarget;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function DeleteConfirmModal({
  target,
  onClose,
  onSuccess,
  onError,
}: DeleteConfirmModalProps) {
  const { deleteKey } = useKeyContext();
  const [isDeleting, setIsDeleting] = useState(false);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isDeleting]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteKey(target.id);
      onSuccess("키가 삭제되었습니다.");
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onError(message);
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget && !isDeleting) onClose(); }}
    >
      {/* 배경 딤 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* 모달 패널 */}
      <div className="relative z-10 w-full max-w-sm mx-4 bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-400" />
            <h2 className="text-sm font-semibold text-zinc-100">키 삭제</h2>
          </div>
          {!isDeleting && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* 본문 */}
        <div className="px-5 py-5">
          <p className="text-sm text-zinc-300 leading-relaxed">
            <span className="font-semibold text-zinc-100">'{target.name}'</span>{" "}
            키를 삭제하시겠습니까?
          </p>
          <p className="text-xs text-zinc-500 mt-1.5">
            이 작업은 되돌릴 수 없습니다.
          </p>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700
                rounded-lg transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium
                text-white bg-red-600 hover:bg-red-500
                rounded-lg transition-colors disabled:opacity-50"
            >
              {isDeleting && <Loader2 size={14} className="animate-spin" />}
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
