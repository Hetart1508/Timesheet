export function normalizeUsername(value) {
  return value.normalize('NFKC').trim().toLowerCase();
}

export function normalizeEmail(value) {
  return value.normalize('NFKC').trim().toLowerCase();
}

export function normalizeName(value) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}
