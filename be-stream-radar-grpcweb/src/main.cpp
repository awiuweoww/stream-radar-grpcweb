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
    struct TrackParams {
        double startLat;
        double startLon;
        float speed;
        double sinHeading; 
        double cosHeading; 
        uint8_t classification;
        float altitude;
        float heading;
    };

    std::vector<TrackParams> params;

    double get_random(int index, double seed) {
        return fmod(std::abs(sin(index * 12.9898 + seed * 78.233)) * 43758.5453, 1.0);
    }

public:
    RadarServiceImpl() {
        const int MAX_TRACKS = 10000;
        params.resize(MAX_TRACKS);
        for (int i = 0; i < MAX_TRACKS; i++) {
            double headingRad = get_random(i, 3.3) * 6.28318;
            double knots = 100.0 + (get_random(i, 5.5) * 400.0);
            double velocityFactor = knots * 0.0000035;

            params[i].startLat = -5.5 + (get_random(i, 1.1) - 0.5) * 1.5;
            params[i].startLon = 110.5 + (get_random(i, 2.2) - 0.5) * 1.5;
            params[i].speed = (float)knots;
            params[i].sinHeading = sin(headingRad) * velocityFactor;
            params[i].cosHeading = cos(headingRad) * velocityFactor;
            params[i].classification = (uint8_t)(get_random(i, 6.6) > 0.6 ? 1 : 0);
            params[i].altitude = (float)(get_random(i, 7.7) * 2000.0);
            params[i].heading = (float)(fmod(headingRad * 57.29, 360.0));
        }
        std::cout << "[Radar Engine] Pre-calculation for " << MAX_TRACKS << " tracks complete." << std::endl;
    }

    Status StreamRadar(ServerContext* context, const RadarRequest* request, ServerWriter<RadarResponse>* writer) override {
        int targetCount = request->object_count() > 0 ? request->object_count() : 30;
        if (targetCount > params.size()) targetCount = params.size();

        auto startTime = std::chrono::steady_clock::now();

        std::cout << "[Radar Engine] Streaming " << targetCount << " targets (Warfare Speed Active)" << std::endl;

        while (!context->IsCancelled()) {
            auto nowSteady = std::chrono::steady_clock::now();
            double timeSec = std::chrono::duration_cast<std::chrono::milliseconds>(nowSteady - startTime).count() * 0.001;

            bool write_success = true;
            for (int i = 0; i < targetCount; i++) {
                RadarResponse response; 
                long long timestampMs = std::chrono::duration_cast<std::chrono::milliseconds>(
                    std::chrono::system_clock::now().time_since_epoch()).count();

                const auto& p = params[i];
                TrackData* t = response.add_tracks(); 
                
                t->set_track_id(i);
                t->set_lat(p.startLat + (p.sinHeading * timeSec));
                t->set_lon(p.startLon + (p.cosHeading * timeSec));
                t->set_speed(p.speed);
                t->set_altitude(p.altitude);
                t->set_heading(p.heading);
                t->set_timestamp(timestampMs);
                t->set_classification(p.classification);

                if (!writer->Write(response)) {
                    write_success = false;
                    break;
                }
            }

            if (!write_success) break;
            
            std::this_thread::sleep_for(std::chrono::milliseconds(1000));
        }

        std::cout << " [Radar Engine] Client disconnected." << std::endl;
        return Status::OK;
    }
};


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
