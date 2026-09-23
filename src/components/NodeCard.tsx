import type { AccountNode } from '../types';
import { ROLE_COLORS, ROLE_LABELS } from '../roles';
import { formatKzt } from '../utils/format';

interface NodeCardProps {
  node: AccountNode | null;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs text-ink/50">{label}</span>
      <span className="text-right text-sm text-ink">{value}</span>
    </div>
  );
}

export default function NodeCard({ node }: NodeCardProps) {
  if (!node) {
    return (
      <aside className="flex h-full w-80 shrink-0 flex-col border-l border-line bg-panel px-4 py-5">
        <div className="text-sm text-ink/40">
          Выберите узел на графе или в таблице приоритетов, чтобы увидеть подробности.
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col overflow-y-auto border-l border-line bg-panel px-4 py-5">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: ROLE_COLORS[node.role] }} />
        <span className="text-sm font-semibold text-ink">{ROLE_LABELS[node.role]}</span>
      </div>

      <div className="gid-mono mt-2 break-all rounded bg-accent-50 px-2 py-1.5 text-xs text-accent-900">
        {node.gid}
      </div>

      <div className="mt-1 divide-y divide-line">
        <Row label="Кластер" value={node.cluster} /><Row label="Исходный seed" value={node.isSeed ? "Да" : "Нет"} /><Row label="Сила подтверждения роли" value={`${Math.round((node.roleScore ?? 0)*100)}% · эвристика`} />
        <Row label="Глубина" value={node.isObservationBoundary ? `d${node.depth} · граница наблюдения` : `d${node.depth}`} />
        <Row label="Приоритетная оценка" value={<span className="font-semibold">{node.priorityScore}</span>} />
        <Row label="Входящая сумма" value={formatKzt(node.inboundAmountKzt)} />
        <Row label="Исходящая сумма" value={formatKzt(node.outboundAmountKzt)} />
        <Row label="Плательщиков" value={node.payersCount} />
        <Row label="Получателей" value={node.payeesCount} />
      </div>

      <div className="mt-4">
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink/40">Основание оценки</div>
        <p className="text-sm leading-relaxed text-ink/80">{node.explanation}</p>
      </div>

      {node.isObservationBoundary && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
          Граница наблюдения: у узла нет исходящих переводов в собранном графе. Это не означает, что счёт
          терминальный по существу — дальше цепочка просто не была раскрыта на текущей глубине обхода.
        </div>
      )}

      <div className="mt-4 rounded-md border border-line bg-white px-3 py-2 text-[11px] leading-relaxed text-ink/50">
        Роль и оценка — гипотеза по неполной выборке для сортировки очереди проверки, а не вывод о нарушении
        или виновности.
      </div>
    </aside>
  );
}
