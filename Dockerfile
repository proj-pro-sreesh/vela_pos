# Stage 1: Install dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Copy both package files
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install server dependencies
WORKDIR /app/server
RUN npm install

# Install client dependencies
WORKDIR /app/client
RUN npm install

# Stage 2: Build the application
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Copy installed node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules

# Copy source code
COPY server/ ./server/
COPY client/ ./client/

# Build client
WORKDIR /app/client
RUN npm run build

# Stage 3: Production runtime
FROM node:18-alpine
WORKDIR /app

# Install production dependencies only
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --production

# Copy server source and built client
COPY server/ ./server/
COPY --from=builder /app/client/dist ./client/dist

# Expose ports
EXPOSE 5000

# Start command
WORKDIR /app/server
CMD ["node", "server.js"]
