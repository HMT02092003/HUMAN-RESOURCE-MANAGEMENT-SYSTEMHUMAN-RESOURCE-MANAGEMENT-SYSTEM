# Auth Service Dockerfile
FROM node:20-alpine

# Install yarn v1 (classic)
RUN corepack enable && corepack prepare yarn@1 --activate

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --production --frozen-lockfile || yarn install --production

COPY . .

EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENV NODE_OPTIONS="--max-old-space-size=256"

CMD ["npx", "tsx", "server.js"]
