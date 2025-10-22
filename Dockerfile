# Stage 1: Build the app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies including dev dependencies for building
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma

COPY prisma.config.ts ./

# Generate Prisma client
RUN npx prisma generate

# Copy all source files
COPY . .

# Build the NestJS app
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS runner

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy Prisma files and generate client for production
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
RUN npx prisma generate

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of app directory to non-root user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose the port the app runs on
EXPOSE 4000

# Health check using the existing health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

# Start the application directly
CMD ["node", "dist/src/main.js"]