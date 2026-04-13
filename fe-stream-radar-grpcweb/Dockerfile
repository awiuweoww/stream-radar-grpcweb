# Basis image Node modern yang ringan
FROM node:20-alpine

# Mengaktifkan corepack dan menginstal pnpm
RUN npm install -g pnpm

# Mengatur direktori kerja di dalam kontainer
WORKDIR /app

# Menyalin file daftar depedensi (cache layer)
COPY package.json pnpm-lock.yaml ./

# Instal depedensi
RUN pnpm install

# Salin seluruh kode sisa proyek ke kontainer
COPY . .

# Ekspos port default (3001)
EXPOSE 3001

# Jalankan server development Rspack
CMD ["pnpm", "run", "dev"]
