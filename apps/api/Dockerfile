# Multi-stage build for apps/api. Optimized for Railway / any container
# host with shared monorepo layout. Build the image from the repo root:
#
#   docker build -f apps/api/Dockerfile -t kubertube-api .

FROM node:20.10-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

# ---- deps stage ----------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/config/package.json packages/config/
COPY packages/api-types/package.json packages/api-types/
RUN pnpm install --frozen-lockfile

# ---- build stage ---------------------------------------------------------
FROM base AS build
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /repo/packages ./packages
COPY . .
RUN pnpm --filter @kubertube/api build

# ---- runtime stage -------------------------------------------------------
FROM node:20.10-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app

# Copy production node_modules + built api.
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./
COPY --from=build /repo/packages ./packages

EXPOSE 3001
USER node
CMD ["node", "dist/index.js"]
