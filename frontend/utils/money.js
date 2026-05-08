export function parseMoney(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;

  return Number(
    String(value)
      .replace(/\./g, '')
      .replace(',', '.')
  ) || 0;
}