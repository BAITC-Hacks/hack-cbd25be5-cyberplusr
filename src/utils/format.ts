export function formatKzt(amount: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(amount)} ₸`;
}

/** Сокращает длинный gid для отображения в узлах графа: первые/последние цифры. */
export function shortenGid(gid: string): string {
  if (gid.length <= 10) return gid;
  return `${gid.slice(0, 4)}…${gid.slice(-4)}`;
}
