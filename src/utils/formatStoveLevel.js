/**
 * Converts a raw stove level integer into its display label:
 *
 *  <= 30          →  "30"  (plain number)
 *  31 – 34        →  "TC30.1" … "TC30.4"
 *  35             →  "TG1"
 *  36 – 39        →  "TG1.1" … "TG1.4"
 *  40             →  "TG2"
 *  41 – 44        →  "TG2.1" … "TG2.4"
 *  …and so on every 5 levels.
 *
 * Returns null for non-finite / non-positive values.
 */
export function formatStoveLevel(stoveLevel) {
  if (!Number.isFinite(stoveLevel) || stoveLevel <= 0) {
    return null;
  }

  if (stoveLevel <= 30) {
    return String(stoveLevel);
  }

  if (stoveLevel <= 34) {
    return `TC30.${stoveLevel - 30}`;
  }

  const tgIndex = stoveLevel - 35;
  const tier = Math.floor(tgIndex / 5) + 1;
  const sub = tgIndex % 5;

  return sub === 0 ? `TG${tier}` : `TG${tier}.${sub}`;
}
