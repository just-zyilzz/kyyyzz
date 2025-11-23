# Gunakan image Node.js sebagai base
FROM node:18-slim

# Install Python (untuk yt-dlp) dan FFmpeg
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json dan install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy semua file source code
COPY . .

# Buat folder yang dibutuhkan
RUN mkdir -p downloads yt_cache database

# Expose port 3000
EXPOSE 3000

# Command untuk menjalankan aplikasi
CMD ["node", "server.js"]
