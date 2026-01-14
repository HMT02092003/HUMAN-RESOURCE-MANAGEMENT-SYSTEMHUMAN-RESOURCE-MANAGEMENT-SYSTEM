# API Gateway Dockerfile
FROM node:20-alpine

# Install yarn v1 (classic)
RUN corepack enable && corepack prepare yarn@1 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock* ./

# Install dependencies (production only)
RUN yarn install --production --frozen-lockfile || yarn install --production

# Copy source code
COPY . .

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/gateway-health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Set memory limit for Node.js
ENV NODE_OPTIONS="--max-old-space-size=512"

# Start server
CMD ["node", "server.js"]
