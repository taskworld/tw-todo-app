FROM node:22-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY backend/package*.json ./

RUN npm install

# Copy backend source files
COPY backend/ ./

EXPOSE 3001

CMD ["npm", "start"]
