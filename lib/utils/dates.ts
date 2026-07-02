const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function dateOnlyFromParts(
  year: number,
  month: number,
  day: number,
): string | null {
  if (!isValidDateParts(year, month, day)) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function dateOnlyFromLocalDate(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null;
  return dateOnlyFromParts(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
}

export function todayDateOnly(): string {
  return dateOnlyFromLocalDate(new Date())!;
}

export function isDateOnlyString(value: string): boolean {
  if (!DATE_ONLY_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return isValidDateParts(year, month, day);
}

export function normalizeDateOnlyInput(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;

  if (raw instanceof Date) {
    return dateOnlyFromLocalDate(raw);
  }

  const value = String(raw).trim();
  if (!value) return null;

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return dateOnlyFromParts(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
    );
  }

  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (slashMatch) {
    const year =
      slashMatch[3].length === 2
        ? 2000 + Number(slashMatch[3])
        : Number(slashMatch[3]);
    return dateOnlyFromParts(year, Number(slashMatch[2]), Number(slashMatch[1]));
  }

  const parsed = new Date(value);
  return dateOnlyFromLocalDate(parsed);
}

export function formatDateOnly(value: string | Date): string {
  const normalized = normalizeDateOnlyInput(value);
  if (!normalized) return "";

  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function daysBetweenDateOnly(from: string, to: string): number {
  if (!isDateOnlyString(from) || !isDateOnlyString(to)) return 0;

  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  const fromUtc = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const toUtc = Date.UTC(toYear, toMonth - 1, toDay);

  return Math.max(0, Math.floor((toUtc - fromUtc) / 86_400_000));
}
