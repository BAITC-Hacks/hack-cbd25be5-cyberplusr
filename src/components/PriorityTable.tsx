import type { AccountNode } from '../types';
import { ROLE_COLORS, ROLE_LABELS } from '../roles';
import { shortenGid } from '../utils/format';

interface PriorityTableProps {
  nodes: AccountNode[];
  selectedGid: string | null;
  onSelect: (gid: string) => void;
}

export default function PriorityTable({ nodes, selectedGid, onSelect }: PriorityTableProps) {
  const sorted = [...nodes].sort((a, b) => b.priorityScore - a.priorityScore);

  return (
    <div className="flex h-56 shrink-0 flex-col border-t border-line bg-panel">
      <div className="border-b border-line px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-ink/40">
        Таблица приоритетов
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-ink/40">
            Нет результатов — измените фильтры
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-panel text-[11px] uppercase tracking-wide text-ink/40">
              <tr>
                <th className="px-4 py-1.5 font-medium">gid</th>
                <th className="px-4 py-1.5 font-medium">Роль</th>
                <th className="px-4 py-1.5 font-medium">Оценка</th>
                <th className="px-4 py-1.5 font-medium">Основание проверки</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((n) => (
                <tr
                  key={n.gid}
                  onClick={() => onSelect(n.gid)} tabIndex={0} onKeyDown={e => { if(e.key === "Enter" || e.key === " "){e.preventDefault();onSelect(n.gid);} }}
                  className={`cursor-pointer border-b border-line/70 hover:bg-accent-50 ${
                    n.gid === selectedGid ? 'bg-accent-50' : ''
                  }`}
                >
                  <td className="gid-mono whitespace-nowrap px-4 py-1.5 text-xs text-ink" title={n.gid}>
                    {n.gid}
                  </td>
                  <td className="px-4 py-1.5">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: ROLE_COLORS[n.role] }}
                      />
                      {ROLE_LABELS[n.role]}
                    </span>
                  </td>
                  <td className="px-4 py-1.5 font-medium">{n.priorityScore}</td>
                  <td className="px-4 py-1.5 text-ink/70">{n.priorityReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
