FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-pip \
    python3-venv \
    git \
    procps \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Create and activate a Python virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python packages in the virtual environment
RUN pip3 install --upgrade pip && \
    pip3 install \
    networkx \
    matplotlib \
    requests \
    pytest \
    black \
    pylint

# Set Python environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create shell script aliases for easier access
RUN echo '#!/bin/bash\n\
alias get-to-work="bash /app/get-to-work.sh"\n\
alias start-mcp-servers="bash /app/mcp-servers/start-mcp-servers.sh"\n\
alias run-github-workflow="bash /app/scripts/run-github-workflow.sh"\n\
alias run-monitoring="bash /app/scripts/run-monitoring.sh"\n\
exec "$@"' > /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Expose ports for MCP servers
EXPOSE 7867 7868

ENTRYPOINT ["/entrypoint.sh"]
CMD ["bash"]