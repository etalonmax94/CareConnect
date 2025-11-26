# EmpowerLink CRM - Backend API for Google Cloud Run
# This Dockerfile builds a production-ready Express.js API server
# Designed to run in Australia (australia-southeast1) for healthcare data sovereignty

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev deps for build)
RUN npm ci

# Copy source code needed for backend build
COPY shared ./shared
COPY server ./server
COPY drizzle.config.ts ./
COPY tsconfig.json ./

# Build ONLY the backend server for Cloud Run (skip frontend, API-only)
RUN npx esbuild server/index-cloudrun.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.mjs

# Production stage - smaller image
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S empowerlink -u 1001 -G nodejs

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built server from builder stage
COPY --from=builder /app/dist ./dist

# Copy shared schema for runtime type validation
COPY --from=builder /app/shared ./shared

# Create uploads directory - NOTE: Use Cloud Storage for production!
# Cloud Run has ephemeral storage, mount GCS bucket for persistent files
RUN mkdir -p /app/uploads && chown -R empowerlink:nodejs /app/uploads

# Cloud Run provides PORT environment variable (default 8080)
ENV PORT=8080
ENV NODE_ENV=production

# Switch to non-root user
USER empowerlink

# Expose the port Cloud Run will use
EXPOSE 8080

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

# Run the production server (use .mjs extension for ESM support)
CMD ["node", "dist/index.mjs"]
