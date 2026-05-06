/**
 * Created Date       : 13-04-2026
 * Description        : Hook Sinkronisasi Radar Simulation (React + OpenLayers).
 *                      Mengelola koneksi gRPC stream, pemrosesan paket data biner, 
 *                      dan pembaruan posisi objek di canvas Map secara reaktif.
 *
 * Arsitektur:
 *   gRPC-Web Client ──► useRadarSimulation ──► OpenLayers Vector Source
 *
 * Changelog:
 *   - 0.1.0 (13-04-2026): Implementasi integrasi gRPC-Web dengan siklus hidup komponen React.
 */
import { useEffect, useRef } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import OLMap from 'ol/Map';
import Overlay from 'ol/Overlay';
import { fromLonLat } from 'ol/proj';
import { Style, Fill, Stroke, RegularShape } from 'ol/style';
import { RadarTrack } from '../types/radar';
import { useSimulationStore } from '../store/useSimulationStore';
import colors from '../utils/colors';
import { CENTER_COORD } from './useMapInstance';
import { radarLogger } from '../utils/logger/radarLogger';

import { RadarServiceClient } from '../generated/RadarServiceClientPb';
import { RadarRequest } from '../generated/radar_pb';

const GRPC_URL = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_GRPC_URL || 'http://localhost:9080';
const client = new RadarServiceClient(GRPC_URL);

/**
 * Hook kustom untuk menjalankan simulasi radar menggunakan gRPC-Web.
 * 
 * @param mapInstanceRef - Referensi ke objek peta OpenLayers.
 * @param selectedTrackId - Referensi ke ID track yang sedang dipilih.
 * @param popupInstanceRef - Referensi ke objek overlay popup pada peta.
 * @returns Referensi ke VectorSource yang berisi semua objek radar.
 */
export function useRadarSimulation(
  mapInstanceRef: React.MutableRefObject<OLMap | null>,
  selectedTrackId: React.MutableRefObject<string | null>,
  popupInstanceRef: React.MutableRefObject<Overlay | null>
) {
  const isActive = useSimulationStore(state => state.isActive);
  const targetCount = useSimulationStore(state => state.targetCount);
  const setStats = useSimulationStore(state => state.setStats);
  const setPopupData = useSimulationStore(state => state.setSelectedTrack);
  
  const vectorSourceRef = useRef<VectorSource>(new VectorSource());
  const featuresMapRef = useRef<Map<string, Feature<Point>>>(new Map<string, Feature<Point>>());
  const lastPacketTime = useRef<number>(Date.now());
  const burstCountRef = useRef<number>(0);
  const latestTracksMapRef = useRef<Map<string, RadarTrack>>(new Map());
  const animationFrameRef = useRef<number>(0);
  const lastCleanupTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const pointsLayer = new VectorLayer({
      source: vectorSourceRef.current,
      style: (feature) => {
        const type = feature.get('classification') as string;
        let color: string = (colors.orange as Record<string, string>)[400];
        if (type === '1') color = colors.success as string; 
        else if (type === '0') color = colors.danger as string;

        return new Style({
          image: new RegularShape({
            fill: new Fill({ color }),
            stroke: new Stroke({ color: (colors.surface as Record<string, string>)[50], width: 2 }),
            points: 4, 
            radius: 8,
            angle: Math.PI / 4,
          }),
        });
      },
      zIndex: 2,
    });
    map.addLayer(pointsLayer);

    return () => {
      map.removeLayer(pointsLayer);
    };
  }, [mapInstanceRef.current]);

  useEffect(() => {
    if (!isActive) {
      vectorSourceRef.current.clear();
      featuresMapRef.current.clear();
      burstCountRef.current = 0;
      latestTracksMapRef.current.clear();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      setStats(0, 0);
      return;
    }

    /**
     * Loop render utama yang berjalan di setiap frame animasi.
     * Mengelola pembaruan posisi fitur di peta dan pembersihan data usang.
     */
    const renderLoop = () => {
      const now = Date.now();
      const tracksMap = latestTracksMapRef.current;
      
      if (tracksMap.size > 0) {
        tracksMap.forEach((trackDataObj) => {
          const id = trackDataObj.trackId;
          const { lon, lat } = trackDataObj;

          let feature = featuresMapRef.current.get(id);
          const coords = fromLonLat([lon, lat]);

          if (!feature) {
            feature = new Feature({ geometry: new Point(coords) });
            vectorSourceRef.current.addFeature(feature);
            featuresMapRef.current.set(id, feature);
          } else {
            const geom = feature.getGeometry();
            if (geom) geom.setCoordinates(coords);
          }

          // Tambahkan metadata untuk pembersihan data lama (TTL)
          feature.set('lastUpdate', now);
          feature.set('classification', trackDataObj.classification === 'FRIEND' ? '1' : '0');
          feature.set('trackData', trackDataObj);

          if (selectedTrackId.current === id) {
            setPopupData(trackDataObj);
            if (popupInstanceRef.current) {
              popupInstanceRef.current.setPosition(coords);
            }
          }
        });
        
        tracksMap.clear();
      }

      // Pembersihan data (Stale Data Cleanup) setiap 5 detik
      if (now - lastCleanupTimeRef.current > 5000) {
        const STALE_THRESHOLD = 10000; 
        featuresMapRef.current.forEach((feature, id) => {
          const lastUpdate = feature.get('lastUpdate') as number;
          if (id !== '0' && feature.get('classification') !== 'CENTER' && (!lastUpdate || now - lastUpdate > STALE_THRESHOLD)) {
            vectorSourceRef.current.removeFeature(feature);
            featuresMapRef.current.delete(id);
          }
        });
        lastCleanupTimeRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    const centerFeature = new Feature({ geometry: new Point(CENTER_COORD) });
    centerFeature.set('classification', 'CENTER');
    vectorSourceRef.current.addFeature(centerFeature);

    console.log(` [gRPC] Starting stream with ${targetCount} objects...`);
    radarLogger.logConnection('CONNECTED', GRPC_URL);
    
    const request = new RadarRequest();
    request.setObjectCount(targetCount);

    const stream = client.streamRadar(request, {});

    stream.on('data', (response) => {
      const now = Date.now();
      const tracksList = response.getTracksList();
      const currentTracks: RadarTrack[] = [];

      for (let i = 0; i < tracksList.length; i++) {
        const t = tracksList[i];
        const id = t.getTrackId().toString();

        if (id === '0') {
           const dt = Math.max(now - lastPacketTime.current, 1);
           setStats(1000 / dt, featuresMapRef.current.size);
           radarLogger.logDataDrop(burstCountRef.current, targetCount);
           
           burstCountRef.current = 0;
           lastPacketTime.current = now;
        }
        
        burstCountRef.current += 1;

        const trackDataObj: RadarTrack = {
          trackId: id,
          lat: t.getLat(),
          lon: t.getLon(),
          speed: t.getSpeed(),
          heading: t.getHeading(),
          altitude: t.getAltitude(),
          timestamp: t.getTimestamp(),
          classification: t.getClassification().toString() === '1' ? 'FRIEND' : 'HOSTILE'
        };

        latestTracksMapRef.current.set(id, trackDataObj);
        currentTracks.push(trackDataObj);
      }
      radarLogger.logIncomingPackets(response, currentTracks);
    });

    stream.on('error', (err) => {
      radarLogger.logError('gRPC Stream', err);
    });

    stream.on('end', () => {
      console.log(' [gRPC Stream] Ended');
    });

    return () => {
      stream.cancel();
    };
  }, [isActive, targetCount]);

  return vectorSourceRef;
}
