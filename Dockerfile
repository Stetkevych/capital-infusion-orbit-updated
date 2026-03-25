FROM node:18-alpine

WORKDIR /app

# Install bash and other utilities
RUN apk add --no-cache bash curl

# Copy all files
COPY . .

# Copy runtime config
COPY .runtimeconfig.json .

# Install dependencies
RUN npm run install:all

# Build client
WORKDIR /app/client
RUN npm run build

# Install server dependencies
WORKDIR /app/server
RUN npm install

# Set working directory to app root
WORKDIR /app

# Make startup scripts executable
RUN chmod +x deploy.sh start.sh

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server with configuration
CMD ["bash", "start.sh"]
