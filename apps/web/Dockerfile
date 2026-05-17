# Production Dockerfile for apps/web (Next.js 15). Build from repo root:
#   docker build -f apps/web/Dockerfile -t kubertube-web .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

# ---- deps stage ----------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/config/package.json packages/config/
COPY packages/api-types/package.json packages/api-types/
RUN pnpm install --frozen-lockfile

# ---- build stage ---------------------------------------------------------
FROM deps AS build
COPY apps/web ./apps/web
COPY apps/api ./apps/api
COPY packages ./packages
ENV NEXT_TELEMETRY_DISABLED=1
# Build env — values are placeholders; real env is injected at runtime.
ENV DATABASE_URL=postgres://placeholder
ENV BETTER_AUTH_SECRET=placeholder-build-time
ENV BETTER_AUTH_URL=http://localhost:3001
ENV WEB_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=http://localhost:3001
ENV ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
RUN pnpm --filter @kubertube/web build

# ---- runtime stage -------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY --from=build /repo/apps/web/.next ./apps/web/.next
COPY --from=build /repo/apps/web/public ./apps/web/public
COPY --from=build /repo/apps/web/package.json ./apps/web/
COPY --from=build /repo/apps/web/next.config.mjs ./apps/web/
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./
COPY --from=build /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/pnpm-lock.yaml ./

EXPOSE 3000
WORKDIR /app/apps/web
CMD ["pnpm", "start"]
