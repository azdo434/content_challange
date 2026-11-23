export const DAYS = 30;
export const PEOPLE = ['viceo', 'clipco'];

export function clampContentCount(value) {
  return Math.max(0, Math.min(100, Math.trunc(Number(value) || 0)));
}

export function markContentCount(row, value) {
  return {
    ...row,
    done: true,
    clips: clampContentCount(value),
  };
}

export function emptyPerson() {
  return Array.from({ length: DAYS }, () => ({ done: false, clips: 0 }));
}

export function emptyState() {
  return { viceo: emptyPerson(), clipco: emptyPerson(), updatedAt: 0 };
}

export function normalizeState(raw) {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  for (const who of PEOPLE) {
    const source = Array.isArray(raw[who]) ? raw[who] : [];
    base[who] = base[who].map((slot, index) => {
      const row = source[index] || {};
      return {
        done: Boolean(row.done),
        clips: clampContentCount(row.clips),
      };
    });
  }
  base.updatedAt = Number(raw.updatedAt) || 0;
  return base;
}

export function personTotals(rows) {
  return {
    days: rows.filter((row) => row.done).length,
    clips: rows.reduce((sum, row) => sum + (row.done ? row.clips : 0), 0),
  };
}
