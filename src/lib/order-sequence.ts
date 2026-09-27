/**
 * Extrae el número de secuencia de una orden (admite cualquier cantidad de dígitos: 4, 5, 6+).
 */
export function extractOrderSequenceNumber(
  numero?: string | null,
  yearMonth?: string,
): number | null {
  if (!numero || typeof numero !== "string") return null;
  const match = yearMonth
    ? numero.match(new RegExp(`^(?:[A-Za-z0-9_-]+)-${yearMonth}-(\\d+)$`, "i"))
    : numero.match(/-(\d+)$/);
  if (!match) return null;

  const sequence = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(sequence) && sequence > 0 ? sequence : null;
}

/**
 * Calcula el siguiente número de orden:
 * - Para MR Lavandería Express (alto volumen histórico con cientos de órdenes >= 1000 que en agosto llegó a 1,262),
 *   continúa en 1,263 para evitar colisión con órdenes históricas de junio (67..429).
 * - Para todas las demás lavanderías (volumen normal < 500 órdenes como Reynita, LavAroma, Apartahotel, etc.),
 *   continúa de forma 100% natural a partir de su última orden creada (ej: 47 -> 48, 181 -> 182, 160 -> 161).
 * - Al pasar a cualquier nuevo mes (octubre, noviembre, etc.), ninguna lavandería reinicia a 1; todas siguen su curso continuo.
 */
export function computeNextOrderSequence(numbers: (number | null | undefined)[]): number {
  const valid = numbers.filter((value): value is number => Number.isSafeInteger(value) && Number(value) > 0);
  if (valid.length === 0) return 1;

  // La orden más reciente creada
  const latest = valid[0] || 0;

  // Verificar si es un tenant de alto volumen histórico (MR Lavandería Express, con >= 50 órdenes con número >= 1000)
  const isHistoricalHighVolume = valid.filter((n) => n >= 1000 && n < 20000).length >= 50;

  if (isHistoricalHighVolume) {
    const validHigh = valid.filter((n) => n < 20000);
    const maxHistorical = Math.max(...validHigh);
    return Math.max(maxHistorical, latest) + 1;
  }

  // Para todas las demás lavanderías (< 500 órdenes), continuar de forma 100% natural desde su última orden activa
  return latest + 1;
}
