import type { AccountRole } from './types';

export const ROLE_LABELS: Record<AccountRole, string> = {
  coordinator: 'Кандидат координации',
  consolidator: 'Консолидатор',
  distributor: 'Дистрибьютор',
  transit: 'Транзит',
  terminal: 'Получатель в выборке',
  peripheral: 'Периферийный',
};

export const ROLE_SHORT_DESCRIPTIONS: Record<AccountRole, string> = {
  coordinator: 'посредничество и пути от нескольких seed',
  consolidator: 'принимает переводы от многих плательщиков',
  distributor: 'отправляет переводы многим получателям',
  transit: 'сопоставимые наблюдаемые вход и выход',
  terminal: 'конечная точка известной части цепочки',
  peripheral: 'недостаточно признаков основной роли',
};

// Палитра подобрана так, чтобы роли различались и на светлом фоне,
// и не выглядели как акцент интерфейса (тёмно-зелёный).
export const ROLE_COLORS: Record<AccountRole, string> = {
  coordinator: '#7C3AED',
  consolidator: '#0F766E',
  distributor: '#B45309',
  transit: '#2563EB',
  terminal: '#B91C1C',
  peripheral: '#64748B',
};

export const ROLE_ORDER: AccountRole[] = [
  'coordinator',
  'consolidator',
  'distributor',
  'transit',
  'terminal',
  'peripheral',
];
