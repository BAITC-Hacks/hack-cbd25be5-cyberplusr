import { ROLE_COLORS, ROLE_LABELS, ROLE_ORDER } from '../roles';

export default function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-panel px-4 py-2 text-[11px] text-ink/70">
      <span className="font-medium text-ink/50">Роли:</span>
      {ROLE_ORDER.map((role) => (
        <span key={role} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ROLE_COLORS[role] }} />
          {ROLE_LABELS[role]}
        </span>
      ))}
    </div>
  );
}
