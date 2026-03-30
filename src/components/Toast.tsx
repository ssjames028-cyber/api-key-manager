import { X, CheckCircle, AlertCircle } from "lucide-react";
import type { Toast } from "../types";

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const isSuccess = toast.type === "success";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-64 max-w-80
        ${isSuccess ? "bg-zinc-800 border border-emerald-500/30" : "bg-zinc-800 border border-red-500/30"}`}
    >
      {isSuccess ? (
        <CheckCircle size={16} className="text-emerald-400 shrink-0" />
      ) : (
        <AlertCircle size={16} className="text-red-400 shrink-0" />
      )}
      <span className="text-sm text-zinc-100 flex-1">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-zinc-500 hover:text-zinc-300 shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}
