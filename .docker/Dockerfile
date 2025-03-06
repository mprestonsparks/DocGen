FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Expose port (if needed)
# EXPOSE 3000

# Set default command
CMD ["npm", "run", "interview"]