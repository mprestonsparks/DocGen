FROM node:18-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y git bash curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Set environment variables
ENV NODE_ENV=production

# Command to run
CMD ["node", "dist/index.js"]