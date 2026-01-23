# ============================================
# Dockerfile - Frontend Production Build
# ============================================
# Multi-stage build for optimized production
# Using YARN for package management
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

# Install yarn v1 (classic)
RUN corepack enable && corepack prepare yarn@1 --activate

WORKDIR /app

# Copy package files
COPY package.json yarn.lock* ./

# Install dependencies
RUN yarn config set network-timeout 600000 && \
    (yarn install --frozen-lockfile --production=false || yarn install --production=false)

# Copy source code
COPY . .

# Copy Docker environment file (overrides .env.local for Docker builds)
# We handle missing variables via build args in docker-compose
COPY .env.docker* .env.local

# Allow passing environment variables at build time
ARG NEXT_PUBLIC_API_GATEWAY_URL
ARG NEXT_PUBLIC_NOTIFICATION_SERVICE_URL
ENV NEXT_PUBLIC_API_GATEWAY_URL=$NEXT_PUBLIC_API_GATEWAY_URL
ENV NEXT_PUBLIC_NOTIFICATION_SERVICE_URL=$NEXT_PUBLIC_NOTIFICATION_SERVICE_URL

# Build Next.js app
RUN yarn build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install yarn v1
RUN corepack enable && corepack prepare yarn@1 --activate

# Copy necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Install only production dependencies
RUN yarn config set network-timeout 600000 && \
    (yarn install --frozen-lockfile --production=true || yarn install --production=true)

# Expose port
EXPOSE 3000

# Start Next.js production server
CMD ["node", "server.js"]
