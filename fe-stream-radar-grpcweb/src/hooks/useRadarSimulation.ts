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
import { RadarRequest, TrackData } from '../generated/radar_pb';

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
      setStats(0, 0);
      return;
    }

    const centerFeature = new Feature({ geometry: new Point(CENTER_COORD) });
    centerFeature.set('classification', 'CENTER');
    vectorSourceRef.current.addFeature(centerFeature);

    console.log(`📡 [gRPC] Starting stream with ${targetCount} objects...`);
    radarLogger.logConnection('CONNECTED', GRPC_URL);
    
    const request = new RadarRequest();
    request.setObjectCount(targetCount);

    const stream = client.streamRadar(request, {});

    stream.on('data', (response) => {
      const now = Date.now();
      const dt = Math.max(now - lastPacketTime.current, 1); // Avoid division by zero
      lastPacketTime.current = now;
      
      const tracksList = response.getTracksList();
      const currentTracks: RadarTrack[] = [];

      tracksList.forEach((t: TrackData) => {
        const id = t.getTrackId().toString();
        const lat = t.getLat();
        const lon = t.getLon();
        const classification = t.getClassification().toString();
        const speed = t.getSpeed();
        const heading = t.getHeading();
        const altitude = t.getAltitude();
        const timestamp = t.getTimestamp();

        const trackDataObj: RadarTrack = {
          trackId: id,
          lat,
          lon,
          speed,
          heading,
          altitude,
          timestamp,
          classification: classification === '1' ? 'FRIEND' : 'HOSTILE'
        };

        currentTracks.push(trackDataObj);

        let feature = featuresMapRef.current.get(id);
        if (!feature) {
          feature = new Feature({ geometry: new Point(fromLonLat([lon, lat])) });
          vectorSourceRef.current.addFeature(feature);
          featuresMapRef.current.set(id, feature);
        } else {
          const geom = feature.getGeometry();
          if (geom) geom.setCoordinates(fromLonLat([lon, lat]));
        }

        feature.set('classification', classification);
        feature.set('trackData', trackDataObj);

        if (selectedTrackId.current === id) {
           setPopupData(trackDataObj);
           if (popupInstanceRef.current) {
             popupInstanceRef.current.setPosition(fromLonLat([lon, lat]));
           }
        }
      });

      radarLogger.logIncomingPackets(response, currentTracks);
      setStats(1000 / dt, tracksList.length);
    });

    stream.on('error', (err) => {
      radarLogger.logError('gRPC Stream', err);
    });

    stream.on('end', () => {
      console.log('🔌 [gRPC Stream] Ended');
    });

    return () => {
      stream.cancel();
    };
  }, [isActive, targetCount]);

  return vectorSourceRef;
}
