FROM node:22-alpine

WORKDIR /app

COPY backend/package.json backend/pnpm-lock.yaml ./backend/
COPY frontend/package.json frontend/pnpm-lock.yaml ./frontend/

WORKDIR /app/backend
RUN npm install -g pnpm && pnpm install

WORKDIR /app/frontend
RUN npm install -g pnpm && pnpm install

WORKDIR /app/frontend
RUN pnpm build

WORKDIR /app

COPY backend/ ./backend/
COPY frontend/src ./frontend/src
COPY frontend/public ./frontend/public 2>/dev/null || true
COPY frontend/index.html ./frontend/
COPY frontend/vite.config.ts ./frontend/ 2>/dev/null || true
COPY frontend/tsconfig.json ./frontend/ 2>/dev/null || true

EXPOSE 3001

CMD ["pnpm", "-C", "backend", "start"]
