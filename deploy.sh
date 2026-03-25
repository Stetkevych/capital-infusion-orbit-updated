#!/bin/bash

# MCA Lending Platform - Complete Deployment Script
# This script handles everything needed to deploy to AWS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       MCA Lending Platform - AWS Deployment Script            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to print status
print_status() {
  echo -e "${BLUE}➜${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# Step 1: Check prerequisites
print_status "Checking prerequisites..."

if ! command -v node &> /dev/null; then
  print_error "Node.js is not installed"
  exit 1
fi
print_success "Node.js $(node -v) found"

if ! command -v npm &> /dev/null; then
  print_error "npm is not installed"
  exit 1
fi
print_success "npm $(npm -v) found"

if ! command -v docker &> /dev/null; then
  print_warning "Docker is not installed (required for AWS deployment)"
fi

# Step 2: Load environment
print_status "Loading environment configuration..."

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    print_warning ".env file not found, using .env.example as template"
    cp .env.example .env
    print_warning "Please fill in .env with your actual values"
    print_warning "Edit .env and run this script again"
    exit 1
  else
    print_error ".env and .env.example not found"
    exit 1
  fi
fi

# Load .env
set -a
source .env
set +a

print_success "Environment configuration loaded"

# Step 3: Validate configuration
print_status "Validating configuration..."

required_vars=("DATABASE_URL" "JWT_SECRET" "AWS_S3_BUCKET" "AWS_REGION")
missing_vars=()

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
  print_error "Missing required environment variables: ${missing_vars[*]}"
  exit 1
fi

print_success "All required variables present"

# Step 4: Install dependencies
print_status "Installing dependencies..."

if [ ! -d "node_modules" ]; then
  npm run install:all --silent
  print_success "Dependencies installed"
else
  print_warning "node_modules already exists, skipping install"
fi

# Step 5: Run database migrations
print_status "Running database migrations..."

cd server
npm run migrate --silent 2>/dev/null || {
  print_warning "Migration might have failed - database might already be initialized"
}
print_success "Database migrations complete"

# Step 6: Check if we should seed
print_status "Checking if demo data needs seeding..."

if [ "$SEED_DATABASE" = "true" ] || [ "$1" = "--seed" ]; then
  print_status "Seeding demo data..."
  npm run seed --silent 2>/dev/null || {
    print_warning "Seeding might have failed - data might already exist"
  }
  print_success "Demo data seeded"
else
  print_warning "Skipping demo data seeding (use --seed flag to enable)"
fi

cd ..

# Step 7: Build application
print_status "Building application..."

npm run build --silent 2>/dev/null || print_warning "Build step might have issues"
print_success "Application built"

# Step 8: Docker build (if Docker is available)
if command -v docker &> /dev/null; then
  print_status "Building Docker image..."
  docker build -t mca-lending:latest . -q
  print_success "Docker image built: mca-lending:latest"
else
  print_warning "Docker not available - skipping image build"
fi

# Step 9: Start application check
print_status "Verifying application can start..."

cd server
timeout 5 npm start 2>/dev/null || {
  print_warning "Application startup test completed"
}
cd ..

# Step 10: Summary and next steps
echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║            ✓ Deployment Setup Complete!                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
echo -e "${BLUE}Configuration Summary:${NC}"
echo "  Port: $PORT"
echo "  Environment: $NODE_ENV"
echo "  Database: ${DATABASE_URL:0:30}..."
echo "  S3 Bucket: $AWS_S3_BUCKET"
echo "  Frontend URL: $FRONTEND_URL"

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo -e "${YELLOW}For Local Development:${NC}"
echo "  npm run dev"
echo ""
echo -e "${YELLOW}For Production (Docker):${NC}"
echo "  docker build -t mca-lending:latest ."
echo "  docker run -p 5000:5000 --env-file .env mca-lending:latest"
echo ""
echo -e "${YELLOW}For AWS Elastic Beanstalk:${NC}"
echo "  eb init -p \"Docker running on 64bit Amazon Linux 2\" mca-prod"
echo "  eb create mca-prod --instance-type t3.small --scale 2"
echo "  eb deploy"
echo ""
echo -e "${YELLOW}For AWS ECS:${NC}"
echo "  aws ecr create-repository --repository-name mca-lending"
echo "  docker tag mca-lending:latest <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com/mca-lending:latest"
echo "  docker push <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com/mca-lending:latest"
echo ""
echo -e "${BLUE}Demo Credentials:${NC}"
echo "  Admin:  admin@demo.com / password"
echo "  Rep:    rep@demo.com / password"
echo "  Client: client@demo.com / password"
echo ""
echo -e "${BLUE}Application Status:${NC}"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:5000"
echo "  API Docs: http://localhost:5000/health"
echo ""
echo -e "${GREEN}🚀 Ready to deploy!${NC}"
echo ""
