/**
 * Created Date       : 11-04-2026
 * Description        : Definisi antarmuka kontrak tipe data (Types/Interfaces) dari sinyal radar.
 *                      Fokus utama: Memastikan struktur lintasan kapal statis secara ketat di seluruh aplikasi.
 *
 * Arsitektur:
 *   Type Definition ──► Payload Generator ──► State Store & Rendering
 *
 * Changelog:
 *   - 0.1.0 (11-04-2026): Kerangka awal struktur Latitude, Longitude, Heading, dan Speed (KTS).
 */
export interface RadarTrack {
  trackId: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  altitude: number;
  timestamp: number;
  classification: 'UNKNOWN' | 'FRIEND' | 'HOSTILE' | 'NEUTRAL';
}


