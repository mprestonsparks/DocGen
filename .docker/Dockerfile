FROM node:18-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    bash \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the codebase
COPY . .

# Build TypeScript
RUN npm run build

# Set environment variables
ENV NODE_ENV=development

# Create indicator file for Docker environment
RUN touch .mcp-in-docker

# Command to keep container running
CMD ["tail", "-f", "/dev/null"]