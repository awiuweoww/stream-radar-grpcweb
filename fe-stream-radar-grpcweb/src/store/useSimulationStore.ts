/**
 * Created Date       : 11-04-2026
 * Description        : Bank penyimpanan (Store) Global konfigurasi Radar.
 *                      Fokus utama: Menyimpan state global aplikasi, seperti status simulasi, 
 *                      jumlah target, dan data track yang dipilih.
 *
 * Arsitektur:
 *   Zustand Store (Setters Panel Kontrol UI) ◄── Subscribers (Komponen React HUD)
 *
 * Changelog:
 *   - 0.1.0 (11-04-2026): Kerangka awal penyimpanan variabel FPS, Objek Aktif, dan toggle status Peta.
 */
import { create } from 'zustand';
import { RadarTrack } from '../types/radar';

interface SimulationState {
  isActive: boolean;
  fps: number;
  totalObjects: number;
  targetCount: number;
  selectedTrack: RadarTrack | null;
  setTargetCount: (count: number) => void;
  startSimulation: () => void;
  endSimulation: () => void;
  setStats: (fps: number, totalObjects: number) => void;
  setSelectedTrack: (track: RadarTrack | null) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  isActive: false,
  fps: 60.1,
  totalObjects: 0,
  targetCount: 3000,
  selectedTrack: null,
  setTargetCount: (count) => set({ targetCount: count }),
  startSimulation: () => set({ isActive: true }),
  endSimulation: () => set({ isActive: false }),
  setStats: (fps, totalObjects) => set({ fps, totalObjects }),
  setSelectedTrack: (track) => set({ selectedTrack: track }),
}));
