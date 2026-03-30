import { KeyRound } from "lucide-react";

interface EmptyStateProps {
  searchQuery?: string;
}

export function EmptyState({ searchQuery }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <KeyRound size={40} className="text-zinc-700 mb-4" />
      {searchQuery ? (
        <>
          <p className="text-zinc-400 text-sm font-medium">
            '{searchQuery}'에 해당하는 키가 없습니다.
          </p>
          <p className="text-zinc-600 text-xs mt-1">다른 이름으로 검색해보세요.</p>
        </>
      ) : (
        <>
          <p className="text-zinc-400 text-sm font-medium">
            등록된 API 키가 없습니다.
          </p>
          <p className="text-zinc-600 text-xs mt-1">
            우상단 '+ 새 키' 버튼으로 추가해보세요.
          </p>
        </>
      )}
    </div>
  );
}
