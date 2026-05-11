FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# ── deps: install production + dev deps for api and its workspace packages ──
FROM base AS deps
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json                     apps/api/
COPY packages/core/package.json                packages/core/
COPY packages/db/package.json                  packages/db/
COPY packages/config/package.json              packages/config/
RUN pnpm install --frozen-lockfile --filter @learnspace/api...

# ── build: compile api (tsc resolves workspace sources via main: ./src/*.ts) ──
FROM base AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules            ./node_modules
COPY --from=deps /repo/apps/api/node_modules   ./apps/api/node_modules
COPY apps/api                                  ./apps/api
COPY packages/core/src                         ./packages/core/src
COPY packages/core/package.json                ./packages/core/
COPY packages/core/tsconfig.json               ./packages/core/
COPY packages/db/src                           ./packages/db/src
COPY packages/db/package.json                  ./packages/db/
COPY packages/db/tsconfig.json                 ./packages/db/
COPY packages/config                           ./packages/config
COPY pnpm-workspace.yaml package.json turbo.json ./
RUN pnpm --filter @learnspace/api build

# ── runtime: minimal image with only the compiled output + prod node_modules ──
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo
ENV NODE_ENV=production
ENV PORT=3001

# Re-install production deps only (no devDependencies, no build tools)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json                     apps/api/
COPY packages/core/package.json                packages/core/
COPY packages/db/package.json                  packages/db/
COPY packages/config/package.json              packages/config/
RUN pnpm install --frozen-lockfile --prod --filter @learnspace/api...

# Copy compiled output (resolves imports; workspace packages compiled inline by tsc)
COPY --from=builder /repo/apps/api/dist        ./apps/api/dist

USER node
EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
