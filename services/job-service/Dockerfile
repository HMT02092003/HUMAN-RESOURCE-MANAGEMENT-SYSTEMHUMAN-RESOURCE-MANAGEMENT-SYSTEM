# Job Service Dockerfile
FROM node:20-alpine

# Install yarn v1 (classic)
RUN corepack enable && corepack prepare yarn@1 --activate

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --production --frozen-lockfile || yarn install --production
RUN npm rebuild esbuild

COPY . .

EXPOSE 4008

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4008/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENV NODE_OPTIONS="--max-old-space-size=256"

# Job service uses TypeScript - run with tsx
CMD ["npx", "tsx", "server.ts"]
