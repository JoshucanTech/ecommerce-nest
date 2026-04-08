# Stage 1: Base image
FROM node:22-alpine AS base

# Install libc6-compat for some Native Modules
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Stage 2: Dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
# Copy Prisma schema early to cache Prisma Client generation if schema hasn't changed
COPY prisma ./prisma/
RUN npm ci --legacy-peer-deps

# Stage 3: Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# npx prisma generate is usually fast, but we'll run it explicitly here 
# just to be sure the dist build has access to it.
RUN npx prisma generate
RUN npm run build

# Stage 4: Runner (Production)
FROM base AS runner
ENV NODE_ENV=production

# Security: Create non-root user
RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs

# Copy built application and production node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/start.sh ./start.sh

RUN chmod +x ./start.sh
RUN chown -R nestjs:nestjs /app

USER nestjs

EXPOSE 4000
ENV PORT=4000
ENV HOST=0.0.0.0

# Using a start script for migrations/health check logic
CMD ["./start.sh"]

# Stage 5: Development (HMR / Watch Mode)
FROM deps AS dev
ENV NODE_ENV=development
WORKDIR /app

# In development, we mount the host volume, so we don't need to COPY . .
# but doing it here ensures the image is still usable independently.
COPY . .

# Ensure prisma client is up-to-date and run dev server
EXPOSE 4000
ENV PORT=4000
ENV HOST=0.0.0.0

# Using npm run start:dev for NestJS watch mode
# Using npx prisma migrate dev with auto-naming for smooth Docker dev workflow
CMD ["sh", "-c", "npx prisma migrate dev --name sync_schema --skip-seed && npm run start:dev"]