import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useKeyContext } from "../context/KeyContext";

const DEBOUNCE_MS = 200;

export function SearchBar() {
  const { setSearchQuery } = useKeyContext();
  const [inputValue, setInputValue] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSearchQuery(inputValue);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [inputValue, setSearchQuery]);

  const handleClear = () => {
    setInputValue("");
    setSearchQuery("");
  };

  return (
    <div className="relative">
      <Search
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
      />
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="이름으로 검색..."
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg
          pl-9 pr-8 py-2 text-sm text-zinc-100 placeholder-zinc-600
          focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30
          transition-colors"
      />
      {inputValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
