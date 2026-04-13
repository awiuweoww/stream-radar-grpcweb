/**
 * Created Date       : 13-04-2026
 * Description        : Radar Engine (C++ gRPC Server).
 *                      Mesin utama untuk simulasi pergerakan objek radar (Warfare Speed) 
 *                      dan pengiriman aliran data biner melalui gRPC Server Streaming.
 *
 * Arsitektur:
 *   Native C++ ──► gRPC Framework ──► Protobuf (Binary Payload)
 *
 * Changelog:
 *   - 0.1.0 (13-04-2026): Inisialisasi gRPC Server dan implementasi logika pergerakan objek.
 */
#include <iostream>
#include <memory>
#include <string>
#include <vector>
#include <chrono>
#include <thread>
#include <cmath>

#include <grpcpp/grpcpp.h>
#include <grpcpp/ext/proto_server_reflection_plugin.h>
#include "radar.pb.h"
#include "radar.grpc.pb.h"

using grpc::Server;
using grpc::ServerBuilder;
using grpc::ServerContext;
using grpc::ServerWriter;
using grpc::Status;

using namespace radar;

class RadarServiceImpl final : public RadarService::Service {
    // logika untuk menghasilkan angka acak
    double get_random(int index, double seed) {
        return fmod(std::abs(sin(index * 12.9898 + seed * 78.233)) * 43758.5453, 1.0);
    }

public:
    // logika untuk streaming data radar
    Status StreamRadar(ServerContext* context, const RadarRequest* request, ServerWriter<RadarResponse>* writer) override {
        int targetCount = request->object_count() > 0 ? request->object_count() : 30;
        auto startTime = std::chrono::steady_clock::now();

        std::cout << "[Radar Engine] Streaming " << targetCount << " targets (Warfare Speed Active)" << std::endl;

        while (!context->IsCancelled()) {
            RadarResponse response;
            auto nowWall = std::chrono::system_clock::now();
            long long timestampMs = std::chrono::duration_cast<std::chrono::milliseconds>(nowWall.time_since_epoch()).count();
            
            auto nowSteady = std::chrono::steady_clock::now();
            double timeSec = std::chrono::duration_cast<std::chrono::milliseconds>(nowSteady - startTime).count() * 0.001;

            for (int i = 0; i < targetCount; i++) {
                // SEBARAN LUAS: Muncul acak di radius luas sekitar koordinat -5.5, 110.5
                double startLat = -5.5 + (get_random(i, 1.1) - 0.5) * 1.5;
                double startLon = 110.5 + (get_random(i, 2.2) - 0.5) * 1.5;
                
                // ARAH DAN KECEPATAN (100 - 500 KNOTS)
                double knots = 100.0 + (get_random(i, 5.5) * 400.0);
                double headingRad = get_random(i, 3.3) * 6.28318; // Arah acak 0-360 derajat
                
                // Konversi Knots ke pergerakan visual 
                double velocityFactor = knots * 0.0000035; 
                
                TrackData* t = response.add_tracks();
                t->set_track_id(i);
                
                // Kalkulasi posisi real-time berdasarkan waktu berjalan
                t->set_lat(startLat + (sin(headingRad) * timeSec * velocityFactor));
                t->set_lon(startLon + (cos(headingRad) * timeSec * velocityFactor));
                
                t->set_altitude((float)(get_random(i, 7.7) * 2000.0)); // 0 - 2000m
                t->set_speed((float)knots);
                t->set_heading((float)(fmod(headingRad * 57.29, 360.0)));
                t->set_timestamp(timestampMs);
                t->set_classification((int32_t)(get_random(i, 6.6) > 0.6 ? 1 : 0));
            }

            if (!writer->Write(response)) break;
            
            // Interval pengiriman 200ms (5 FPS) agar pergerakan mulus tapi hemat bandwidth
            std::this_thread::sleep_for(std::chrono::milliseconds(200));
        }

        std::cout << "🔌 [Radar Engine] Client disconnected." << std::endl;
        return Status::OK;
    }
};

// Fungsi untuk menjalankan server
void RunServer() {
    std::string server_address("0.0.0.0:50051");
    RadarServiceImpl service;

    grpc::reflection::InitProtoReflectionServerBuilderPlugin();
    ServerBuilder builder;
    builder.AddListeningPort(server_address, grpc::InsecureServerCredentials());
    builder.RegisterService(&service);

    std::unique_ptr<Server> server(builder.BuildAndStart());
    if (server) {
        std::cout << "Radar gRPC Server listening on " << server_address << std::endl;
        server->Wait();
    }
}

int main(int argc, char** argv) {
    RunServer();
    return 0;
}
