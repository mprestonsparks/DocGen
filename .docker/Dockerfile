FROM node:20-slim

WORKDIR /app

# Install system dependencies for paper_architect
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies for paper_architect
RUN pip3 install --no-cache-dir \
    networkx \
    matplotlib \
    requests

# Install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (if needed)
# EXPOSE 3000

# Set default command
CMD ["npm", "run", "interview"]