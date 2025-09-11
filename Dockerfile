# Multi-stage Dockerfile for Document Management System

# Base stage with common dependencies
FROM node:20-alpine AS base
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    && ln -sf python3 /usr/bin/python

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development
# Install all dependencies (including dev dependencies)
RUN npm install

# Copy source code
COPY . .

# Expose port and debug port
EXPOSE 3000 9229

# Start development server with hot reload
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Install only curl for health checks
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Copy other necessary files
COPY --from=build /app/drizzle.config.ts ./

# Create drizzle directory (migrations will be generated at runtime)
RUN mkdir -p drizzle

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]
