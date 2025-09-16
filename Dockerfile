# syntax=docker/dockerfile:1.4

# -------- Base Stage --------
FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies only when package files change
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# -------- Development Stage --------
FROM base AS dev

# Create non-root user for security
RUN addgroup --g 1001 --system nodejs && \
    adduser --uid 1001 --system nodejs --ingroup nodejs

# Leverage BuildKit caching for faster rebuilds
RUN --mount=type=cache,target=/app/.npm \
    npm config set cache /app/.npm --global && \
    npm ci --loglevel verbose

# Generate Prisma client
RUN npx prisma generate

# Copy full app code after deps to preserve cache
COPY . .

# Change ownership to non-root user
RUN chown -R nodejs:nodejs .

# Switch to non-root user
USER nodejs

# Expose port (consistent with application configuration)
EXPOSE 4000

# Start app in dev mode
CMD ["npm", "run", "start:dev"]

# -------- Production Stage --------
FROM base AS production

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --g 1001 --system nodejs && \
    adduser --uid 1001 --system nodejs --ingroup nodejs

# Install only production deps
RUN --mount=type=cache,target=/app/.npm \
    npm config set cache /app/.npm --global && \
    npm ci --omit=dev

# Copy app code with correct ownership
COPY --chown=nodejs:nodejs . .

# Compile NestJS app
RUN npm run build

# Switch to non-root user for security
USER nodejs

EXPOSE 4000

# Optional: Uncomment if you have a healthcheck script
# HEALTHCHECK --interval=30s --timeout=10s --start-period=10s \
#   CMD node healthcheck/healthcheck.js || exit 1

CMD ["node", "dist/main"]