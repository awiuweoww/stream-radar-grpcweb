/**
 * @file radarLogger.ts
 * @description Auditor performa radar dengan akurasi tinggi.
 * Menghitung latensi end-to-end (Backend-to-Frontend) secara real-time.
 */

import { RadarTrack } from '../../types/radar';

class RadarLogger {
  private baseOffset: number | null = null;
  private audit = {
    t1_sent: 0,
    t100_received: 0,
    t1_received: 0
  };

  private stats = {
    count: 0,
    totalBytes: 0,
    totalLat: 0,
    startTime: performance.now(),
  };

  private integrity = {
    targetReached: false,
    maxObserved: 0,
    lastDropLog: 0,
    lastTargetCount: 0
  };

  /**
   * Mencatat paket masuk dengan perhitungan latensi yang disinkronisasi. 
   * @param data - Data payload mentah
   * @param tracks - Daftar objek RadarTrack
   * @param rawLength - Ukuran data dalam byte (opsional)
   */
  public logIncomingPackets(data: unknown, tracks: RadarTrack[], rawLength?: number): void {
    const arrivalTime = Date.now();
    this.stats.count += tracks.length;

    const byteSize = rawLength ?? (tracks.length * 150);
    this.stats.totalBytes += byteSize;

    tracks.forEach(track => {
      const rawLat = arrivalTime - track.timestamp;
      if (this.baseOffset === null || rawLat < this.baseOffset) {
        this.baseOffset = rawLat;
      }

      const cleanLat = Math.max(0, rawLat - this.baseOffset);
      this.stats.totalLat += cleanLat;

      if (String(track.trackId) === '1') {
        this.audit.t1_sent = track.timestamp;
        this.audit.t1_received = arrivalTime;
      }
      if (String(track.trackId) === '100') {
        this.audit.t100_received = arrivalTime;
      }
    });
    const now = performance.now();
    if (now - this.stats.startTime > 5000) {
      this.printSummary();
      this.resetStats(now);
    }
  }

  /**
   * Mencetak ringkasan performa streaming ke konsol.
   */
  private printSummary(): void {
    const duration = (performance.now() - this.stats.startTime) / 1000;
    const throughput = (this.stats.totalBytes / 1024) / duration;
    const avgLatency = this.stats.count > 0 ? (this.stats.totalLat / this.stats.count) : 0;

    const burstDuration = this.audit.t100_received > 0 && this.audit.t1_sent > 0
      ? Math.max(100, this.audit.t100_received - this.audit.t1_sent - (this.baseOffset || 0))
      : 0;

    console.groupCollapsed(`%c  Radar Performance Report (${new Date().toLocaleTimeString()})`, 'color: #3b82f6; font-weight: bold');
    console.log(`Packets Processed : ${this.stats.count}`);
    console.log(`Avg Latency      : %c${avgLatency.toFixed(2)}ms`, 'color: #22c55e; font-weight: bold');
    console.log(`Throughput       : ${throughput.toFixed(2)} KB/s`);
    console.log(`-------------------------------------------`);
    console.log(`Waktu Kirim ID 1   : ${this.formatTime(this.audit.t1_sent)}`);
    console.log(`Waktu Terima ID 100: ${this.formatTime(this.audit.t100_received)}`);
    console.log(`%cDurasi Streaming 1 s/d 100: ${burstDuration.toFixed(2)}ms`, 'color: #f59e0b; font-weight: bold');
    console.groupEnd();
  }

  /**
   * Memformat timestamp menjadi string waktu yang dapat dibaca.
   * @param ts - Timestamp (ms)
   * @returns String format waktu (HH:MM:SS)
   */
  private formatTime(ts: number): string {
    if (!ts) return "N/A";
    const d = new Date(ts);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }

  /**
   * Mereset statistik perhitungan performa.
   * @param now - Waktu saat ini dari performance.now()
   */
  private resetStats(now: number): void {
    this.stats.count = 0;
    this.stats.totalBytes = 0;
    this.stats.totalLat = 0;
    this.stats.startTime = now;
    this.baseOffset = null;

    /** Reset audit */
    this.audit.t1_sent = 0;
    this.audit.t100_received = 0;
    this.audit.t1_received = 0;
  }

  /**
   * Mencatat bukti jika data hilang setelah mencapai target.
   * @param currentCount - Jumlah objek saat ini
   * @param targetCount - Target jumlah objek maksimal
   */
  public logDataDrop(currentCount: number, targetCount: number): void {
    if (targetCount <= 0) return;
    if (this.integrity.lastTargetCount !== targetCount) {
      this.integrity.targetReached = false;
      this.integrity.maxObserved = 0;
      this.integrity.lastTargetCount = targetCount;
    }

    if (!this.integrity.targetReached) {
      if (currentCount >= targetCount) {
        this.integrity.targetReached = true;
        this.integrity.maxObserved = currentCount;
        console.log(`%c Target ${targetCount} tercapai. Monitoring drop diaktifkan.`, 'color: #22c55e; font-weight: bold');
      }
      return;
    }

    if (currentCount < targetCount) {
      const now = Date.now();
      if (now - this.integrity.lastDropLog > 1000) {
        console.warn(
          `%c  DATA DROP DETECTED! %c Bukti: Data turun menjadi ${currentCount}/${targetCount} (Missing: ${targetCount - currentCount})`,
          'color: #ffffff; background: #ef4444; padding: 2px 5px; border-radius: 3px;',
          'color: #ef4444; font-weight: bold'
        );
        this.integrity.lastDropLog = now;
      }
    } else {
      this.integrity.maxObserved = Math.max(this.integrity.maxObserved, currentCount);
    }
  }

  /**
   * Mencatat log error ke konsol.
   * @param ctx - Konteks terjadinya error
   * @param err - Objek error
   */
  public logError(ctx: string, err: unknown) {
    console.error(`[Error] ${ctx}:`, err);
  }

  /**
   * Mencatat status koneksi jaringan ke konsol.
   * @param status - Status koneksi
   * @param url - URL endpoint koneksi
   */
  public logConnection(status: string, url: string) {
    console.log(`[Connection] ${status}: ${url}`);
  }
}

export const radarLogger = new RadarLogger();
