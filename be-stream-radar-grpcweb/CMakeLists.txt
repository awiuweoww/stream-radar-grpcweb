cmake_minimum_required(VERSION 3.10)
project(RadarGRPCBackend CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Mencari package gRPC dan Protobuf
find_package(gRPC REQUIRED)
find_package(Protobuf REQUIRED)

# Lokasi file proto yang lebih aman (absolut)
set(PROTO_SRC "${CMAKE_CURRENT_SOURCE_DIR}/proto/radar.proto")

# Generate kode C++ dari proto (Manual atau via gRPC CMake function)
# Di sini kita asumsikan protoc dan grpc_cpp_plugin tersedia di PATH
get_filename_component(proto_path "${PROTO_SRC}" DIRECTORY)
get_filename_component(proto_name "${PROTO_SRC}" NAME_WE)

set(GEN_SOURCES "${CMAKE_CURRENT_BINARY_DIR}/${proto_name}.pb.cc" "${CMAKE_CURRENT_BINARY_DIR}/${proto_name}.grpc.pb.cc")
set(GEN_HEADERS "${CMAKE_CURRENT_BINARY_DIR}/${proto_name}.pb.h" "${CMAKE_CURRENT_BINARY_DIR}/${proto_name}.grpc.pb.h")

add_custom_command(
    OUTPUT ${GEN_SOURCES} ${GEN_HEADERS}
    COMMAND ${Protobuf_PROTOC_EXECUTABLE}
    ARGS --cpp_out=${CMAKE_CURRENT_BINARY_DIR}
         --grpc_out=${CMAKE_CURRENT_BINARY_DIR}
         --plugin=protoc-gen-grpc=$<TARGET_FILE:gRPC::grpc_cpp_plugin>
         -I${proto_path}
         ${PROTO_SRC}
    DEPENDS ${PROTO_SRC}
)

# Tambahkan executable
add_executable(radar_server src/main.cpp ${GEN_SOURCES})

target_include_directories(radar_server PRIVATE ${CMAKE_CURRENT_BINARY_DIR})
target_link_libraries(radar_server
    gRPC::grpc++
    gRPC::grpc++_reflection
    protobuf::libprotobuf
    pthread
)
