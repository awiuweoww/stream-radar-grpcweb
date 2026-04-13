/**
 * Created Date       : 11-04-2026
 * Description        : Utilitas untuk dekoding dan pemformatan output antarmuka Radar.
 *                      Fokus utama: Meringankan komponen TSX dari operasi ternary dan konversi matematis spasial.
 */

/**
 * Format Latitude float ke format string DMM (Derajat)
 * @param lat lat
 * @returns lat
 */
export function formatLatitude(lat: number): string {
  return `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? 'N' : 'S'}`;
}

/**
 * Format Longitude float ke format string DMM (Derajat)
 * @param lon lon
 * @returns lon
 */
export function formatLongitude(lon: number): string {
  return `${Math.abs(lon).toFixed(5)}° ${lon >= 0 ? 'E' : 'W'}`;
}

/**
 * Resolusi Tailwind Class berdasarkan Klasifikasi Kapal
 * @param classification clas
 * @returns clas
 */
export function getClassificationTailwindClass(classification: string): string {
  switch (classification) {
    case 'FRIEND':
      return 'bg-success';
    case 'HOSTILE':
      return 'bg-danger';
    case 'CENTER':
    default:
      return 'bg-orange-400';
  }
}
