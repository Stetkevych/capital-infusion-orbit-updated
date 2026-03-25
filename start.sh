#!/bin/bash

# MCA Lending Platform - Production Startup Script
# This script starts the application with proper logging and health checks

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Starting MCA Lending Platform...${NC}"
echo "Timestamp: $(date)"
echo "Node Version: $(node -v)"
echo "npm Version: $(npm -v)"
echo ""

# Check .env
if [ ! -f .env ]; then
  echo -e "${RED}Error: .env file not found${NC}"
  exit 1
fi

# Load environment
set -a
source .env
set +a

# Check required variables
echo -e "${BLUE}Validating configuration...${NC}"
required_vars=("DATABASE_URL" "JWT_SECRET" "AWS_S3_BUCKET")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}Error: $var is not set${NC}"
    exit 1
  fi
done
echo -e "${GREEN}✓ Configuration valid${NC}"
echo ""

# Check database connectivity
echo -e "${BLUE}Checking database connectivity...${NC}"
for i in {1..30}; do
  if node -e "
    const { query } = require('./server/src/config/database');
    query('SELECT 1')
      .then(() => console.log('Connected'))
      .catch(err => { console.error(err.message); process.exit(1); });
  " 2>/dev/null; then
    echo -e "${GREEN}✓ Database connected${NC}"
    break
  else
    if [ $i -eq 30 ]; then
      echo -e "${RED}Error: Could not connect to database after 30 attempts${NC}"
      exit 1
    fi
    echo "Attempt $i/30 - Retrying in 2 seconds..."
    sleep 2
  fi
done
echo ""

# Run migrations if needed
if [ "$RUN_MIGRATIONS" = "true" ] || [ "$1" = "--migrate" ]; then
  echo -e "${BLUE}Running database migrations...${NC}"
  cd server
  npm run migrate
  cd ..
  echo -e "${GREEN}✓ Migrations complete${NC}"
  echo ""
fi

# Start application
echo -e "${BLUE}Starting Node.js server...${NC}"
echo "Port: $PORT"
echo "Environment: $NODE_ENV"
echo ""

cd server

# Use nodemon for development, node for production
if [ "$NODE_ENV" = "production" ]; then
  echo -e "${GREEN}Starting in PRODUCTION mode${NC}"
  echo ""
  exec node src/index.js
else
  echo -e "${YELLOW}Starting in DEVELOPMENT mode${NC}"
  echo ""
  if command -v nodemon &> /dev/null; then
    exec nodemon src/index.js
  else
    exec node src/index.js
  fi
fi
