# Multi-stage build for apps/api. Optimized for Railway / any container
# host with shared monorepo layout. Build the image from the repo root:
#
#   docker build -f apps/api/Dockerfile -t kubertube-api .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

# ---- deps stage (dev + prod, used to compile) ----------------------------
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/config/package.json packages/config/
COPY packages/api-types/package.json packages/api-types/
RUN pnpm install --frozen-lockfile

# ---- prod-deps stage (production only) -----------------------------------
FROM base AS prod-deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/config/package.json packages/config/
COPY packages/api-types/package.json packages/api-types/
RUN pnpm install --frozen-lockfile --prod

# ---- build stage ---------------------------------------------------------
FROM deps AS build
COPY apps/api ./apps/api
COPY packages ./packages
RUN pnpm --filter @kubertube/api build

# ---- runtime stage -------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app

# Production-only node_modules (no typescript / vitest / drizzle-kit /
# eslint / etc.) and the compiled output. Workspace packages are
# resolved via the hoisted prod node_modules + their package.json,
# so we only need package.json + compiled JS, not the original .ts.
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=prod-deps /repo/packages ./packages
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./

EXPOSE 3001
USER node
CMD ["node", "dist/index.js"]
