import { useKeyContext } from "../context/KeyContext";
import { KeyTableRow } from "./KeyTableRow";
import { EmptyState } from "./EmptyState";

interface KeyTableProps {
  onDeleteRequest: (id: string, name: string) => void;
  onError: (message: string) => void;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-zinc-800/60">
      <td className="px-4 py-3">
        <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
      </td>
    </tr>
  );
}

export function KeyTable({ onDeleteRequest, onError }: KeyTableProps) {
  const { filteredKeys, searchQuery, isLoading } = useKeyContext();

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/60">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
              이름
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
              값
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
              생성일
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
              작업
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : filteredKeys.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <EmptyState searchQuery={searchQuery || undefined} />
              </td>
            </tr>
          ) : (
            filteredKeys.map((key) => (
              <KeyTableRow
                key={key.id}
                apiKey={key}
                onDeleteRequest={onDeleteRequest}
                onError={onError}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
