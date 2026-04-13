/**
 * Created Date       : 11-04-2026
 * Description        : Utilitas Logging & Monitoring Performa Radar.
 *                      Digunakan untuk memantau metrik gRPC, throughput, dan latency streaming.
 */

import { RadarTrack } from '../../types/radar';

/**
 * Interface dasar untuk objek pesan gRPC yang mendukung serialisasi biner.
 */
interface GRPCPacket {
  serializeBinary?(): Uint8Array;
}

class RadarLogger {
  private stats = {
    packetCount: 0,
    totalBytes: 0,
    lastLogTime: performance.now(),
  };

  /**
   * Mencatat data paket yang masuk dan menghitung statistik performa.
   * 
   * @param data - Data mentah yang diterima (Protobuf atau JSON)
   * @param tracks - Data yang sudah diparsing menjadi array RadarTrack
   * @returns Rata-rata latency dari paket tersebut (ms)
   */
  public logIncomingPackets(data: unknown, tracks: RadarTrack[]): number {
    const arrivalTime = Date.now();
    this.stats.packetCount++;
    
    let byteSize = 0;
    if (data && typeof (data as GRPCPacket).serializeBinary === 'function') {
        const bytes = (data as GRPCPacket).serializeBinary?.();
        byteSize = bytes ? bytes.length : 0;
    } else {
        byteSize = JSON.stringify(data).length;
    }
    
    this.stats.totalBytes += byteSize;

    let avgLatency = 0;
    if (tracks.length > 0 && tracks[0].timestamp) {
      avgLatency = arrivalTime - tracks[0].timestamp;
    }

    if (this.stats.packetCount % 10 === 0) { 
        console.debug(`[Radar gRPC] Stream Incoming: ${tracks.length} objects`);
    }

    const now = performance.now();
    if (now - this.stats.lastLogTime > 5000) {
      this.printPerformanceSummary(avgLatency, now, tracks.length);
      this.resetStats(now);
    }
    
    return avgLatency;
  }

  /**
   * Mencatat eror yang terjadi pada sistem radar ke konsol.
   * 
   * @param context - Lokasi atau konteks terjadinya eror.
   * @param error - Objek eror yang ditangkap.
   */
  public logError(context: string, error: unknown): void {
    console.error(`%c[Radar Error] @ ${context}:`, 'color: #ef4444; font-weight: bold', error);
  }

  /**
   * Mencatat status koneksi gRPC ke konsol.
   * 
   * @param status - Status koneksi (CONNECTED/DISCONNECTED/RECONNECTING).
   * @param url - URL endpoint gRPC.
   */
  public logConnection(status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING', url: string): void {
    const color = status === 'CONNECTED' ? '#22c55e' : '#eab308';
    console.log(`%c[Radar gRPC Connection] ${status}: ${url}`, `color: ${color}; font-weight: bold`);
  }

  /**
   * Mencetak ringkasan performa streaming ke konsol.
   * 
   * @param avgLatency - Rata-rata latency (ms).
   * @param now - Timestamp saat ini (ms).
   * @param lastTrackCount - Jumlah objek terakhir yang diterima.
   */
  private printPerformanceSummary(avgLatency: number, now: number, lastTrackCount: number): void {
    const durationSec = (now - this.stats.lastLogTime) / 1000;
    const throughputKB = (this.stats.totalBytes / 1024) / durationSec;
    
    console.groupCollapsed(`%c📊 gRPC Performance Report (${new Date().toLocaleTimeString()})`, 'color: #f97316; font-weight: bold');
    console.log(`Packets Received : ${this.stats.packetCount}`);
    console.log(`Avg Latency     : ${avgLatency.toFixed(2)}ms`);
    console.log(`Throughput      : ${throughputKB.toFixed(2)} KB/s`);
    console.log(`Data Density    : ${(this.stats.totalBytes / 1024).toFixed(2)} KB total`);
    console.log(`Total Objects   : ${lastTrackCount}`);
    console.groupEnd();
  }

  /**
   * Mereset data statistik untuk siklus perhitungan berikutnya.
   * 
   * @param now - Timestamp saat ini (ms).
   */
  private resetStats(now: number): void {
    this.stats.packetCount = 0;
    this.stats.totalBytes = 0;
    this.stats.lastLogTime = now;
  }
}

export const radarLogger = new RadarLogger();
