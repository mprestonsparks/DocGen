FROM node:18-alpine

WORKDIR /app

# Install dependencies first (for better caching)
COPY package.json package-lock.json* tsconfig.json ./
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript code
RUN npm run build

# Create a non-root user to run the application
RUN addgroup -S mcp && adduser -S mcp -G mcp

# Create data directory with proper permissions
RUN mkdir -p /app/data && chown -R mcp:mcp /app/data && chmod 755 /app/data

# Switch to non-root user
USER mcp

# Expose the MCP server ports
EXPOSE 3200
EXPOSE 8800

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://localhost:8800/health || exit 1

# Start the MCP server
CMD ["node", "dist/index.js"]
