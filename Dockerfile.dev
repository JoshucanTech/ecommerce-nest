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

# Copy entrypoint script early and make executable
COPY docker-entrypoint.dev.sh ./
RUN chmod +x docker-entrypoint.dev.sh

# Copy full app code after deps to preserve cache
COPY . .

# Change ownership to non-root user
RUN chown -R nodejs:nodejs . && \
    chmod +x docker-entrypoint.dev.sh

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4000

# Use entrypoint script instead of direct CMD
ENTRYPOINT ["./docker-entrypoint.dev.sh"]

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

CMD ["node", "dist/main"]