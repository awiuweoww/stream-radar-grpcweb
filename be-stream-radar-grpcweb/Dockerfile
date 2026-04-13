# Stage 1: Build
FROM debian:bookworm AS builder

# Install dependencies untuk build C++ gRPC
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libgrpc++-dev \
    libprotobuf-dev \
    protobuf-compiler-grpc \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Salin folder proto dan source 
COPY proto/ /app/proto/
COPY . /app/be/

WORKDIR /app/be
RUN mkdir build && cd build && \
    cmake .. && \
    make -j$(nproc)

# Stage 2: Runtime
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    libgrpc++1.51 \
    libprotobuf32 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/be/build/radar_server /app/radar_server

EXPOSE 50051

CMD ["./radar_server"]
