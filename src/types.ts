/**
 * Единый контракт данных графа.
 *
 * Этот файл описывает форму данных, которую сейчас поставляет
 * `src/data/mockData.ts`, а в дальнейшем должен поставлять экспорт
 * Python-пайплайна (например, `graph_export.json`). Если пайплайн
 * отдаёт JSON такой же формы, для перехода на реальные данные
 * достаточно заменить содержимое `mockData.ts` на `import` этого JSON
 * (см. комментарий в конце mockData.ts).
 */

export type AccountRole =
  | 'consolidator'
  | 'transit'
  | 'distributor'
  | 'terminal'
  | 'coordinator'
  | 'peripheral';

export interface AccountNode {
  /**
   * Полный идентификатор узла (счёта). Хранится строкой намеренно:
   * реальные gid могут превышать Number.MAX_SAFE_INTEGER (2^53 − 1),
   * и приведение к number привело бы к потере точности.
   */
  gid: string;
  role: AccountRole;
  roleScore?: number;
  isSeed?: boolean;
  /** Идентификатор кластера, к которому пайплайн отнёс узел. */
  cluster: string;
  /** Глубина обхода от точки входа в расследование. */
  depth: 0 | 1 | 2 | 3 | 4;
  /** Итоговая приоритетная оценка для очереди проверки, 0–100. */
  priorityScore: number;
  /** Короткое основание проверки — для таблицы приоритетов. */
  priorityReason: string;
  /** Развёрнутое пояснение оценки — для карточки узла. */
  explanation: string;
  inboundAmountKzt: number;
  outboundAmountKzt: number;
  payersCount: number;
  payeesCount: number;
  /**
   * true, если узел находится на границе глубины наблюдения (depth 4)
   * и в собранном графе у него нет исходящих переводов. Это ограничение
   * обхода, а не признак роли terminal — роль по-прежнему назначается
   * по сути поведения узла, а не по факту "нет исходящих".
   */
  isObservationBoundary?: boolean;
  /** Координаты для раскладки графа (заполняются пайплайном или layout-шагом). */
  x: number;
  y: number;
}

export interface TransferEdge {
  id: string;
  /** gid плательщика */
  source: string;
  /** gid получателя */
  target: string;
  amountKzt: number;
}

export interface GraphDataset {
  generatedAt: string;
  /** Всегда true для синтетического набора — используется в верхней панели. */
  isDemo: boolean;
  nodes: AccountNode[];
  edges: TransferEdge[];
}

export interface DepthRange {
  min: 0 | 1 | 2 | 3 | 4;
  max: 0 | 1 | 2 | 3 | 4;
}

export interface FilterState {
  roles: Set<AccountRole>;
  cluster: string | 'all';
  depth: DepthRange;
}
