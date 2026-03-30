import { useState, useCallback } from "react";
import { Plus, KeyRound } from "lucide-react";
import { KeyContextProvider } from "./context/KeyContext";
import { KeyTable } from "./components/KeyTable";
import { SearchBar } from "./components/SearchBar";
import { AddKeyModal } from "./components/AddKeyModal";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import { ToastContainer } from "./components/Toast";
import { useToast } from "./hooks/useToast";

interface DeleteTarget {
  id: string;
  name: string;
}

function AppContent() {
  const { toasts, showToast, removeToast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const handleDeleteRequest = useCallback((id: string, name: string) => {
    setDeleteTarget({ id, name });
  }, []);

  const handleError = useCallback(
    (message: string) => showToast(message, "error"),
    [showToast]
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-emerald-400" />
          <h1 className="text-sm font-semibold text-zinc-100 tracking-tight">
            API Key Manager
          </h1>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
            text-zinc-950 bg-emerald-400 hover:bg-emerald-300
            rounded-lg transition-colors"
        >
          <Plus size={14} />
          새 키
        </button>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 px-6 py-5 flex flex-col gap-4">
        <SearchBar />
        <KeyTable
          onDeleteRequest={handleDeleteRequest}
          onError={handleError}
        />
      </main>

      {/* 모달 */}
      {isAddModalOpen && (
        <AddKeyModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={(msg) => showToast(msg, "success")}
          onError={handleError}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={(msg) => showToast(msg, "success")}
          onError={handleError}
        />
      )}

      {/* 토스트 */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default function App() {
  return (
    <KeyContextProvider>
      <AppContent />
    </KeyContextProvider>
  );
}
