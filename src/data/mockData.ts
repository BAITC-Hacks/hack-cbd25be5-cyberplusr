import type { AccountNode, GraphDataset, TransferEdge } from '../types';

/**
 * СИНТЕТИЧЕСКИЙ НАБОР ДАННЫХ.
 *
 * Все gid, суммы, роли и оценки придуманы для демонстрации интерфейса
 * и не относятся ни к каким реальным счетам, людям или организациям.
 * Роли и приоритетные оценки — рабочие гипотезы для сортировки очереди
 * проверки, а не выводы о нарушении или виновности.
 *
 * Формат соответствует интерфейсу GraphDataset (см. src/types.ts).
 * Когда появится реальный экспорт Python-пайплайна той же формы,
 * этот файл можно заменить на:
 *
 *   import graphExport from './graph_export.json';
 *   export const graphData = graphExport as GraphDataset;
 *
 * gid хранятся строками — реальные идентификаторы превышают
 * Number.MAX_SAFE_INTEGER.
 */

const PREFIX = '87213904651278';

const gid = (n: number): string => `${PREFIX}${String(n).padStart(4, '0')}`;

// Колонки по глубине и базовые строки по кластерам — для читаемой раскладки графа.
const X_BY_DEPTH: Record<1 | 2 | 3 | 4, number> = { 1: 40, 2: 360, 3: 680, 4: 1000 };
const Y_BASE: Record<'A' | 'B' | 'C', number> = { A: 0, B: 320, C: 640 };

type RawNode = Omit<AccountNode, 'inboundAmountKzt' | 'outboundAmountKzt' | 'payersCount' | 'payeesCount'>;

const rawNodes: RawNode[] = [
  // ---- Кластер A ----
  { gid: gid(1), role: 'coordinator', cluster: 'Кластер A', depth: 1, x: X_BY_DEPTH[1], y: Y_BASE.A + 0,
    priorityScore: 88, priorityReason: 'Связывает три кластера переводов',
    explanation: 'Узел имеет исходящие связи в кластеры A, B и C одновременно, что нетипично для рядового участника и указывает на координирующую роль в цепочке.' },
  { gid: gid(6), role: 'peripheral', cluster: 'Кластер A', depth: 1, x: X_BY_DEPTH[1], y: Y_BASE.A + 90,
    priorityScore: 22, priorityReason: 'Единичный исходящий перевод к консолидатору',
    explanation: 'У узла одна исходящая связь и нет входящих в собранном графе. Самостоятельного интереса не представляет, попал в выборку как источник цепочки.' },
  { gid: gid(7), role: 'peripheral', cluster: 'Кластер A', depth: 1, x: X_BY_DEPTH[1], y: Y_BASE.A + 180,
    priorityScore: 24, priorityReason: 'Единичный исходящий перевод к консолидатору',
    explanation: 'Аналогично соседнему узлу — один исходящий перевод, низкая связность, роль в цепочке второстепенная.' },
  { gid: gid(2), role: 'consolidator', cluster: 'Кластер A', depth: 2, x: X_BY_DEPTH[2], y: Y_BASE.A + 30,
    priorityScore: 79, priorityReason: 'Принимает переводы от 3 плательщиков за короткий период',
    explanation: 'Суммы от нескольких периферийных плательщиков и координатора поступают в узкое окно времени и далее уходят одним потоком дальше по цепочке — характерный признак консолидации.' },
  { gid: gid(3), role: 'transit', cluster: 'Кластер A', depth: 2, x: X_BY_DEPTH[2], y: Y_BASE.A + 150,
    priorityScore: 61, priorityReason: 'Короткое время удержания средств',
    explanation: 'Входящая сумма покидает счёт почти полностью и в короткий срок — поведение, типичное для транзитного звена, а не конечного получателя.' },
  { gid: gid(4), role: 'distributor', cluster: 'Кластер A', depth: 3, x: X_BY_DEPTH[3], y: Y_BASE.A + 30,
    priorityScore: 72, priorityReason: 'Разбивает поступление на 2 исходящих перевода',
    explanation: 'Объединённая сумма от консолидатора и транзитного узла дробится на несколько исходящих переводов меньшего размера — типичный паттерн распределения.' },
  { gid: gid(8), role: 'transit', cluster: 'Кластер A', depth: 3, x: X_BY_DEPTH[3], y: Y_BASE.A + 150,
    priorityScore: 58, priorityReason: 'Промежуточное звено перед границей наблюдения',
    explanation: 'Пропускает средства дальше без заметного накопления остатка; часть исходящих связей ведёт к узлам на границе текущей глубины обхода.' },
  { gid: gid(5), role: 'terminal', cluster: 'Кластер A', depth: 4, x: X_BY_DEPTH[4], y: Y_BASE.A + 0,
    priorityScore: 46, priorityReason: 'Конечная точка известной части цепочки',
    explanation: 'Получает средства от дистрибьютора и не имеет исходящих переводов в собранном графе — рассматривается как конечная точка отслеженной цепочки.' },
  { gid: gid(9), role: 'terminal', cluster: 'Кластер A', depth: 4, x: X_BY_DEPTH[4], y: Y_BASE.A + 90,
    priorityScore: 51, priorityReason: 'Получатель от двух разных ветвей цепочки',
    explanation: 'Принимает переводы одновременно от дистрибьютора и транзитного узла — сходящиеся ветви цепочки повышают приоритет проверки.' },
  { gid: gid(10), role: 'peripheral', cluster: 'Кластер A', depth: 4, x: X_BY_DEPTH[4], y: Y_BASE.A + 180,
    priorityScore: 18, priorityReason: 'Граница наблюдения — дальнейшие связи не собраны',
    explanation: 'Достигнута граница глубины наблюдения (depth = 4): у узла нет исходящих переводов в собранном графе. Это ограничение обхода, а не признак роли «терминальный счёт» — дальше граф просто не разворачивался.',
    isObservationBoundary: true },

  // ---- Кластер B ----
  { gid: gid(11), role: 'coordinator', cluster: 'Кластер B', depth: 1, x: X_BY_DEPTH[1], y: Y_BASE.B + 0,
    priorityScore: 74, priorityReason: 'Инициирует переводы в два независимых звена',
    explanation: 'Одновременно открывает консолидирующую и транзитную ветви внутри кластера B — распределение потоков на старте цепочки.' },
  { gid: gid(16), role: 'peripheral', cluster: 'Кластер B', depth: 1, x: X_BY_DEPTH[1], y: Y_BASE.B + 90,
    priorityScore: 20, priorityReason: 'Единичный исходящий перевод',
    explanation: 'Один исходящий перевод к консолидатору кластера B, входящих связей в графе нет.' },
  { gid: gid(17), role: 'peripheral', cluster: 'Кластер B', depth: 1, x: X_BY_DEPTH[1], y: Y_BASE.B + 180,
    priorityScore: 19, priorityReason: 'Единичный исходящий перевод',
    explanation: 'Один исходящий перевод к консолидатору кластера B, роль в цепочке второстепенная.' },
  { gid: gid(12), role: 'consolidator', cluster: 'Кластер B', depth: 2, x: X_BY_DEPTH[2], y: Y_BASE.B + 30,
    priorityScore: 81, priorityReason: 'Приём от 3 плательщиков, включая координатора',
    explanation: 'Собирает переводы от координатора и двух периферийных узлов, далее сумма уходит единым потоком — выраженный паттерн консолидации.' },
  { gid: gid(14), role: 'transit', cluster: 'Кластер B', depth: 2, x: X_BY_DEPTH[2], y: Y_BASE.B + 150,
    priorityScore: 55, priorityReason: 'Короткое время удержания средств',
    explanation: 'Получает перевод от координатора и практически сразу направляет средства дальше по двум исходящим связям.' },
  { gid: gid(13), role: 'distributor', cluster: 'Кластер B', depth: 3, x: X_BY_DEPTH[3], y: Y_BASE.B + 30,
    priorityScore: 69, priorityReason: 'Разбивает поступление на несколько исходящих переводов',
    explanation: 'Принимает объединённую сумму от консолидатора и транзитного узла, дробит её на переводы меньшего размера в сторону конечных узлов.' },
  { gid: gid(18), role: 'transit', cluster: 'Кластер B', depth: 3, x: X_BY_DEPTH[3], y: Y_BASE.B + 150,
    priorityScore: 53, priorityReason: 'Промежуточное звено перед границей наблюдения',
    explanation: 'Передаёт средства дальше без накопления остатка, часть связей ведёт к узлу на границе глубины обхода.' },
  { gid: gid(15), role: 'terminal', cluster: 'Кластер B', depth: 4, x: X_BY_DEPTH[4], y: Y_BASE.B + 0,
    priorityScore: 41, priorityReason: 'Конечная точка известной части цепочки',
    explanation: 'Получает перевод от дистрибьютора, исходящих переводов в собранном графе не обнаружено.' },
  { gid: gid(19), role: 'terminal', cluster: 'Кластер B', depth: 4, x: X_BY_DEPTH[4], y: Y_BASE.B + 90,
    priorityScore: 48, priorityReason: 'Получатель от двух разных ветвей цепочки',
    explanation: 'Принимает переводы от дистрибьютора и от транзитного узла — сходящиеся ветви повышают приоритет проверки.' },
  { gid: gid(20), role: 'peripheral', cluster: 'Кластер B', depth: 4, x: X_BY_DEPTH[4], y: Y_BASE.B + 180,
    priorityScore: 17, priorityReason: 'Граница наблюдения — дальнейшие связи не собраны',
    explanation: 'Достигнута граница глубины наблюдения (depth = 4), исходящих переводов в графе нет. Роль оставлена «периферийный», а не назначена автоматически как «терминальный счёт».',
    isObservationBoundary: true },

  // ---- Кластер C ----
  { gid: gid(27), role: 'coordinator', cluster: 'Кластер C', depth: 1, x: X_BY_DEPTH[1], y: Y_BASE.C + 0,
    priorityScore: 93, priorityReason: 'Связывает кластер C с консолидаторами A и B',
    explanation: 'Единственный узел набора с исходящими связями сразу в три кластера (A, B и C) — наиболее выраженный кандидат на координирующую роль во всей цепочке.' },
  { gid: gid(25), role: 'peripheral', cluster: 'Кластер C', depth: 1, x: X_BY_DEPTH[1], y: Y_BASE.C + 90,
    priorityScore: 21, priorityReason: 'Единичный исходящий перевод',
    explanation: 'Один исходящий перевод к консолидатору кластера C, входящих связей в графе нет.' },
  { gid: gid(26), role: 'peripheral', cluster: 'Кластер C', depth: 1, x: X_BY_DEPTH[1], y: Y_BASE.C + 180,
    priorityScore: 23, priorityReason: 'Единичный исходящий перевод',
    explanation: 'Один исходящий перевод к консолидатору кластера C, роль в цепочке второстепенная.' },
  { gid: gid(21), role: 'consolidator', cluster: 'Кластер C', depth: 2, x: X_BY_DEPTH[2], y: Y_BASE.C + 30,
    priorityScore: 84, priorityReason: 'Приём от 3 плательщиков, включая координатора',
    explanation: 'Собирает переводы от координатора кластера C и двух периферийных узлов, далее направляет объединённую сумму дальше по цепочке.' },
  { gid: gid(22), role: 'transit', cluster: 'Кластер C', depth: 2, x: X_BY_DEPTH[2], y: Y_BASE.C + 150,
    priorityScore: 60, priorityReason: 'Короткое время удержания средств',
    explanation: 'Получает перевод от координатора кластера C и в короткий срок передаёт средства дистрибьютору и транзитному узлу следующего уровня.' },
  { gid: gid(23), role: 'distributor', cluster: 'Кластер C', depth: 3, x: X_BY_DEPTH[3], y: Y_BASE.C + 30,
    priorityScore: 75, priorityReason: 'Разбивает поступление на несколько исходящих переводов',
    explanation: 'Принимает объединённую сумму от консолидатора и транзитного узла, дробит её на исходящие переводы к двум конечным узлам.' },
  { gid: gid(28), role: 'transit', cluster: 'Кластер C', depth: 3, x: X_BY_DEPTH[3], y: Y_BASE.C + 150,
    priorityScore: 57, priorityReason: 'Промежуточное звено перед границей наблюдения',
    explanation: 'Передаёт средства дальше по цепочке, часть исходящих связей ведёт к узлу на границе глубины обхода.' },
  { gid: gid(24), role: 'terminal', cluster: 'Кластер C', depth: 4, x: X_BY_DEPTH[4], y: Y_BASE.C + 0,
    priorityScore: 44, priorityReason: 'Конечная точка известной части цепочки',
    explanation: 'Получает перевод от дистрибьютора, исходящих переводов в собранном графе не обнаружено.' },
  { gid: gid(29), role: 'terminal', cluster: 'Кластер C', depth: 4, x: X_BY_DEPTH[4], y: Y_BASE.C + 90,
    priorityScore: 49, priorityReason: 'Получатель от двух разных ветвей цепочки',
    explanation: 'Принимает переводы от дистрибьютора и транзитного узла — сходящиеся ветви цепочки повышают приоритет проверки.' },
  { gid: gid(30), role: 'peripheral', cluster: 'Кластер C', depth: 4, x: X_BY_DEPTH[4], y: Y_BASE.C + 180,
    priorityScore: 16, priorityReason: 'Граница наблюдения — дальнейшие связи не собраны',
    explanation: 'Достигнута граница глубины наблюдения (depth = 4). Исходящих переводов в собранном графе нет; роль оставлена «периферийный».',
    isObservationBoundary: true },
];

const rawEdges: TransferEdge[] = [
  // Кластер A
  { id: 'e-a1', source: gid(1), target: gid(2), amountKzt: 4_200_000 },
  { id: 'e-a2', source: gid(6), target: gid(2), amountKzt: 1_150_000 },
  { id: 'e-a3', source: gid(7), target: gid(2), amountKzt: 980_000 },
  { id: 'e-a4', source: gid(1), target: gid(3), amountKzt: 3_600_000 },
  { id: 'e-a5', source: gid(2), target: gid(4), amountKzt: 6_100_000 },
  { id: 'e-a6', source: gid(3), target: gid(4), amountKzt: 3_400_000 },
  { id: 'e-a7', source: gid(3), target: gid(8), amountKzt: 190_000 },
  { id: 'e-a8', source: gid(4), target: gid(5), amountKzt: 5_200_000 },
  { id: 'e-a9', source: gid(4), target: gid(9), amountKzt: 3_900_000 },
  { id: 'e-a10', source: gid(8), target: gid(9), amountKzt: 150_000 },
  { id: 'e-a11', source: gid(8), target: gid(10), amountKzt: 40_000 },

  // Кластер B
  { id: 'e-b1', source: gid(11), target: gid(12), amountKzt: 3_800_000 },
  { id: 'e-b2', source: gid(16), target: gid(12), amountKzt: 1_050_000 },
  { id: 'e-b3', source: gid(17), target: gid(12), amountKzt: 890_000 },
  { id: 'e-b4', source: gid(11), target: gid(14), amountKzt: 2_900_000 },
  { id: 'e-b5', source: gid(12), target: gid(13), amountKzt: 5_500_000 },
  { id: 'e-b6', source: gid(14), target: gid(13), amountKzt: 2_650_000 },
  { id: 'e-b7', source: gid(14), target: gid(18), amountKzt: 170_000 },
  { id: 'e-b8', source: gid(13), target: gid(15), amountKzt: 4_700_000 },
  { id: 'e-b9', source: gid(13), target: gid(19), amountKzt: 3_300_000 },
  { id: 'e-b10', source: gid(18), target: gid(19), amountKzt: 130_000 },
  { id: 'e-b11', source: gid(18), target: gid(20), amountKzt: 35_000 },

  // Кластер C
  { id: 'e-c1', source: gid(27), target: gid(21), amountKzt: 5_100_000 },
  { id: 'e-c2', source: gid(25), target: gid(21), amountKzt: 1_300_000 },
  { id: 'e-c3', source: gid(26), target: gid(21), amountKzt: 1_020_000 },
  { id: 'e-c4', source: gid(27), target: gid(22), amountKzt: 4_400_000 },
  { id: 'e-c5', source: gid(21), target: gid(23), amountKzt: 7_200_000 },
  { id: 'e-c6', source: gid(22), target: gid(23), amountKzt: 4_100_000 },
  { id: 'e-c7', source: gid(22), target: gid(28), amountKzt: 210_000 },
  { id: 'e-c8', source: gid(23), target: gid(24), amountKzt: 6_000_000 },
  { id: 'e-c9', source: gid(23), target: gid(29), amountKzt: 4_600_000 },
  { id: 'e-c10', source: gid(28), target: gid(29), amountKzt: 160_000 },
  { id: 'e-c11', source: gid(28), target: gid(30), amountKzt: 45_000 },

  // Межкластерные связи координатора C — повод считать его координирующим узлом
  { id: 'e-cross1', source: gid(27), target: gid(2), amountKzt: 2_400_000 },
  { id: 'e-cross2', source: gid(27), target: gid(12), amountKzt: 2_100_000 },
];

function deriveMetrics(nodes: RawNode[], edges: TransferEdge[]): AccountNode[] {
  const inbound = new Map<string, number>();
  const outbound = new Map<string, number>();
  const payers = new Map<string, Set<string>>();
  const payees = new Map<string, Set<string>>();

  for (const e of edges) {
    inbound.set(e.target, (inbound.get(e.target) ?? 0) + e.amountKzt);
    outbound.set(e.source, (outbound.get(e.source) ?? 0) + e.amountKzt);
    if (!payers.has(e.target)) payers.set(e.target, new Set());
    payers.get(e.target)!.add(e.source);
    if (!payees.has(e.source)) payees.set(e.source, new Set());
    payees.get(e.source)!.add(e.target);
  }

  return nodes.map((n) => ({
    ...n,
    inboundAmountKzt: inbound.get(n.gid) ?? 0,
    outboundAmountKzt: outbound.get(n.gid) ?? 0,
    payersCount: payers.get(n.gid)?.size ?? 0,
    payeesCount: payees.get(n.gid)?.size ?? 0,
  }));
}

export const graphData: GraphDataset = {
  generatedAt: '2026-09-18T09:00:00+05:00',
  isDemo: true,
  nodes: deriveMetrics(rawNodes, rawEdges),
  edges: rawEdges,
};

export const CLUSTERS = ['Кластер A', 'Кластер B', 'Кластер C'];
