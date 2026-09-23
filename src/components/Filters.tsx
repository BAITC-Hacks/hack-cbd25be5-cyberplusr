import type { AccountRole, FilterState } from '../types';
import { ROLE_COLORS, ROLE_LABELS, ROLE_ORDER } from '../roles';

interface FiltersProps {
  filters: FilterState;
  clusters: string[];
  onChange: (next: FilterState) => void;
}

export default function Filters({ filters, clusters, onChange }: FiltersProps) {
  const toggleRole = (role: AccountRole) => {
    const roles = new Set(filters.roles);
    if (roles.has(role)) roles.delete(role);
    else roles.add(role);
    onChange({ ...filters, roles });
  };

  const setDepthMin = (v: number) => {
    const min = Math.min(v, filters.depth.max) as 0 | 1 | 2 | 3 | 4;
    onChange({ ...filters, depth: { ...filters.depth, min } });
  };
  const setDepthMax = (v: number) => {
    const max = Math.max(v, filters.depth.min) as 0 | 1 | 2 | 3 | 4;
    onChange({ ...filters, depth: { ...filters.depth, max } });
  };

  return (
    <div className="flex flex-wrap items-start gap-6 border-b border-line bg-panel px-5 py-3">
      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink/40">Роль</div>
        <div className="flex flex-wrap gap-1.5">
          {ROLE_ORDER.map((role) => {
            const active = filters.roles.has(role);
            return (
              <button
                key={role}
                onClick={() => toggleRole(role)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  active
                    ? 'border-accent-600 bg-accent-50 text-accent-700'
                    : 'border-line bg-white text-ink/50 hover:text-ink/80'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: active ? ROLE_COLORS[role] : '#CBD5D1' }}
                />
                {ROLE_LABELS[role]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink/40">Кластер</div>
        <select
          value={filters.cluster}
          onChange={(e) => onChange({ ...filters, cluster: e.target.value })}
          className="rounded-md border border-line bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent-500"
        >
          <option value="all">Все кластеры</option>
          {clusters.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink/40">
          Глубина: {filters.depth.min}–{filters.depth.max}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-ink/60">
            от
            <input
              type="range"
              min={0}
              max={4}
              value={filters.depth.min}
              onChange={(e) => setDepthMin(Number(e.target.value))}
              className="accent-accent-600"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-ink/60">
            до
            <input
              type="range"
              min={0}
              max={4}
              value={filters.depth.max}
              onChange={(e) => setDepthMax(Number(e.target.value))}
              className="accent-accent-600"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
