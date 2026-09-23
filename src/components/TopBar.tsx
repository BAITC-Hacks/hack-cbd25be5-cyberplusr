import { useState } from 'react';
import { graphData } from '../data/realData';

interface TopBarProps {
  onSearch: (gid: string) => void;
  searchStatus: 'idle' | 'not_found';
}

export default function TopBar({ onSearch, searchStatus }: TopBarProps) {
  const [query, setQuery] = useState('');

  const submit = () => {
    const trimmed = query.trim();
    if (trimmed) onSearch(trimmed);
  };

  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-line bg-panel px-5 py-3">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold tracking-tight text-ink">Граф денег</h1>
        <span className="rounded border border-accent-300 bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-700">
          {graphData.isDemo ? 'Демонстрационные данные' : 'HackAlem AI · Июль 2026 · Локальные данные'}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Поиск по полному gid…" aria-label="Поиск по полному gid"
              className="w-56 rounded-md border border-line bg-white px-3 py-1.5 text-sm text-ink outline-none focus:border-accent-500 gid-mono"
              inputMode="numeric"
            />
            <button
              onClick={submit}
              className="rounded-md bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700"
            >
              Найти
            </button>
          </div>
          {searchStatus === 'not_found' && (
            <span className="mt-1 text-[11px] text-red-700">Узел не найден</span>
          )}
        </div>
      </div>
    </header>
  );
}
