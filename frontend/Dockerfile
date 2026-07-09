FROM node:18-alpine

WORKDIR /app

# Install dependencies terlebih dahulu (untuk caching)
COPY package*.json ./
RUN npm install

# Copy seluruh source code frontend
COPY . .

# Build project Next.js
RUN npm run build

EXPOSE 3000

# Jalankan server production Next.js
CMD ["npm", "start"]
