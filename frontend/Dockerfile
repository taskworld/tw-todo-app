FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files (excluding node_modules)
COPY src ./src
COPY public ./public
COPY index.html .
COPY vite.config.ts .
COPY tsconfig.json .

EXPOSE 3000

# Run dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
