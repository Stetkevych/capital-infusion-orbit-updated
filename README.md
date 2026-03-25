# MCA Lending Platform

A production-ready Merchant Cash Advance (MCA) lending platform built with React, Node.js, PostgreSQL, and AWS.

## Architecture Overview

**Monorepo Structure:**
- **Frontend**: React 18 → Static build → S3 + CloudFront CDN
- **Backend**: Express.js Node.js → Docker container → ECS or Elastic Beanstalk
- **Database**: PostgreSQL (RDS)
- **Storage**: AWS S3 for documents with signed URLs
- **Authentication**: JWT with role-based access control (RBAC)

## Features

### Client Portal
- Apply for funding
- Upload documents securely
- Connect bank accounts (Plaid)
- Track application status
- Message sales reps
- Browse offers

### Sales Rep Portal
- Manage merchant pipeline
- Kanban board for applications
- Document management
- Contact management
- Task tracking

### Admin Portal
- Full portfolio management
- Deal tracking and analytics
- Offer management
- AU Gold AI underwriting
- Zoho CRM sync
- System health monitoring
- Audit logs
- Financial analytics

## Tech Stack

- **Frontend**: React 18, React Router v6, Tailwind CSS, TanStack Query, Recharts
- **Backend**: Express.js, Node.js 18+
- **Database**: PostgreSQL 15
- **Authentication**: JWT + bcrypt
- **File Storage**: AWS S3
- **Integrations**: Plaid, DocuSign, Zoho CRM, AU Gold
- **Deployment**: Docker, AWS (ECS/Beanstalk/RDS)

## Local Development Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15 (or use Docker)
- Git

### Quick Start (Docker)

```bash
# Clone the repository
git clone <repo-url>
cd mca-lending-platform

# Create environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Initialize database
docker-compose exec server npm run migrate
docker-compose exec server npm run seed

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000/api
# Demo login: admin@demo.com / password
```

### Manual Setup (without Docker)

#### 1. Database Setup
```bash
# Create PostgreSQL database
createdb mca_lending
createuser mca_user -P  # Set password to "mca_password"

# Initialize schema
psql -U mca_user -d mca_lending < schema/001_init_schema.sql
```

#### 2. Backend Setup
```bash
cd server
npm install

# Create .env file
cat > .env << 'EOF'
DATABASE_URL=postgresql://mca_user:mca_password@localhost:5432/mca_lending
PORT=5000
NODE_ENV=development
JWT_SECRET=dev-secret-key
FRONTEND_URL=http://localhost:3000
EOF

# Run migrations and seed
npm run migrate
npm run seed

# Start server
npm run dev  # Starts on http://localhost:5000
```

#### 3. Frontend Setup
```bash
cd client
npm install

# Create .env file
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env.local

# Start development server
npm start  # Starts on http://localhost:3000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Applications
- `POST /api/applications` - Create application
- `GET /api/applications` - Get applications (filtered by role)
- `GET /api/applications/:id` - Get application details
- `PATCH /api/applications/:id` - Update application

### Deals
- `POST /api/deals` - Create deal
- `GET /api/deals` - Get all deals
- `GET /api/deals/:id` - Get deal details
- `PATCH /api/deals/:id` - Update deal

### Documents
- `POST /api/documents/upload` - Upload document (multipart)
- `GET /api/documents` - Get documents
- `GET /api/documents/:id/download` - Get signed download URL
- `PATCH /api/documents/:id` - Update document

### Bank Connections (Plaid)
- `POST /api/plaid/create-link-token` - Create Plaid link
- `POST /api/plaid/exchange-token` - Exchange public token
- `GET /api/plaid/transactions/:merchant_id` - Get transactions
- `GET /api/plaid/status/:merchant_id` - Get connection status

### E-Signatures (DocuSign)
- `POST /api/docusign/send-envelope` - Send envelope for signing
- `POST /api/docusign/webhook` - Webhook for envelope updates
- `GET /api/docusign/envelope/:envelope_id` - Get envelope status

### CRM Integration (Zoho)
- `POST /api/zoho/sync-leads` - Sync merchants as leads
- `POST /api/zoho/sync-deals` - Sync deals
- `GET /api/zoho/sync-status` - Get sync status
- `GET /api/zoho/sync-logs` - Get sync logs

### Offers
- `GET /api/offers` - Get active offers
- `POST /api/offers` - Create offer (admin)
- `POST /api/offers/match/:merchant_id` - Match offers for merchant
- `PATCH /api/offers/:id` - Update offer (admin)

### Analytics
- `GET /api/analytics/summary` - Dashboard summary
- `GET /api/analytics/applications-by-status` - Application breakdown
- `GET /api/analytics/revenue-by-industry` - Revenue by industry
- `GET /api/analytics/payment-trends` - Payment trends
- `GET /api/analytics/deal-performance` - Deal performance
- `GET /api/analytics/audit-logs` - Audit logs

### System Health
- `GET /api/metrics/health` - System health check
- `POST /api/metrics` - Store metrics
- `GET /api/metrics` - Get metrics
- `GET /api/metrics/portfolio/metrics` - Portfolio metrics
- `POST /api/metrics/portfolio/calculate` - Calculate portfolio metrics

## Environment Variables

See `.env.example` for complete list. Key variables:

```
# Server
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db

# Auth
JWT_SECRET=your-secret-key

# AWS
AWS_REGION=us-east-1
AWS_S3_BUCKET=mca-lending-documents
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Plaid
PLAID_CLIENT_ID=xxx
PLAID_SECRET=xxx
PLAID_ENV=sandbox

# DocuSign
DOCUSIGN_INTEGRATION_KEY=xxx
DOCUSIGN_USER_ID=xxx
DOCUSIGN_ACCOUNT_ID=xxx

# Zoho CRM
ZOHO_CLIENT_ID=xxx
ZOHO_CLIENT_SECRET=xxx
ZOHO_REFRESH_TOKEN=xxx
ZOHO_ACCOUNT_DOMAIN=com

# Frontend
FRONTEND_URL=https://yourdomain.com
API_BASE_URL=https://api.yourdomain.com
```

## AWS Deployment

### Option 1: Elastic Beanstalk (Recommended for beginners)

```bash
# Install EB CLI
pip install awsebcli

# Initialize EB app
eb init -p "Docker running on 64bit Amazon Linux 2" mca-lending

# Create environment
eb create mca-prod

# Deploy
eb deploy

# View logs
eb logs
eb health
```

### Option 2: ECS with Fargate

```bash
# Build and push Docker image
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

docker build -t mca-lending:latest .

docker tag mca-lending:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/mca-lending:latest

docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/mca-lending:latest

# Create ECS task definition and service in AWS Console
# Or use CloudFormation template
```

### Option 3: EC2 with Auto Scaling

```bash
# Launch EC2 instance (Ubuntu 20.04)
# Install Docker, Docker Compose, and Node.js
# Clone repo and start services

curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

git clone <repo-url> /home/ubuntu/mca-lending-platform
cd /home/ubuntu/mca-lending-platform

# Create .env with production values
# Run with docker-compose
docker-compose -f docker-compose.yml up -d
```

### Required AWS Setup

1. **RDS PostgreSQL**
   - Create PostgreSQL 15 instance
   - Enable backups
   - Set security group for server access
   - Run migrations after creation

2. **S3 Bucket**
   ```bash
   aws s3 mb s3://mca-lending-documents
   aws s3api put-bucket-versioning --bucket mca-lending-documents --versioning-configuration Status=Enabled
   aws s3api put-bucket-encryption --bucket mca-lending-documents --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}'
   ```

3. **IAM Role/User**
   - S3 read/write permissions
   - RDS access
   - CloudWatch logs

4. **CloudFront Distribution** (for frontend)
   - Point to S3 bucket
   - Set cache policies
   - Enable HTTPS

5. **Load Balancer** (for backend)
   - ALB for ECS/Beanstalk
   - Health checks
   - HTTPS listeners

## Database Migrations

### Run Migrations
```bash
npm run migrate
```

### Create Schema from Scratch
```bash
psql -U mca_user -d mca_lending < schema/001_init_schema.sql
```

### Seed Demo Data
```bash
npm run seed
```

## Testing

```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test
```

## Building for Production

### Frontend Build
```bash
cd client
npm run build
# Creates `build/` directory with static files
# Upload to S3: aws s3 sync build/ s3://your-bucket/
```

### Backend Build
```bash
# Docker image is already production-ready
docker build -t mca-lending:1.0.0 .
docker tag mca-lending:1.0.0 <registry>/mca-lending:1.0.0
docker push <registry>/mca-lending:1.0.0
```

## Monitoring & Logging

- **CloudWatch**: Server logs and metrics
- **AWS RDS Enhanced Monitoring**: Database performance
- **Application Insights**: Custom metrics via `/api/metrics` endpoints
- **Audit Logs**: User actions tracked in `audit_logs` table

## Security Best Practices

1. ✅ JWT authentication with 24h expiry
2. ✅ Password hashing with bcrypt
3. ✅ RBAC middleware on all routes
4. ✅ Encrypted S3 document storage
5. ✅ CORS restricted to FRONTEND_URL
6. ✅ Rate limiting on API endpoints
7. ✅ Helmet security headers
8. ✅ Signed S3 URLs (5min expiry)
9. ✅ Environment variables for secrets
10. ✅ SQL injection prevention (parameterized queries)

## Troubleshooting

### Connection Refused
- Ensure PostgreSQL is running
- Check DATABASE_URL
- Verify network access

### S3 Access Denied
- Verify AWS credentials
- Check IAM permissions
- Ensure bucket name is correct

### Plaid Integration Not Working
- Verify PLAID_CLIENT_ID and PLAID_SECRET
- Check PLAID_ENV (sandbox vs production)
- Review Plaid dashboard for errors

### Docker Issues
```bash
# Clear and rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Performance Optimization

- Frontend: React.lazy() for code splitting
- Backend: Query result caching with Redis (optional)
- Database: Proper indexing on frequently queried columns
- S3: CloudFront CDN for document access
- Compression: gzip enabled on all endpoints

## Support & Documentation

- API Documentation: `/api/docs` (Swagger - optional)
- Database Schema: `schema/001_init_schema.sql`
- Environment Setup: `.env.example`

## License

Commercial license - All rights reserved

## Deployment Checklist

- [ ] Set secure JWT_SECRET
- [ ] Configure AWS credentials
- [ ] Create S3 bucket
- [ ] Set up RDS PostgreSQL
- [ ] Update environment variables
- [ ] Run database migrations
- [ ] Configure Plaid/DocuSign/Zoho credentials
- [ ] Set CORS to production domain
- [ ] Enable HTTPS/SSL
- [ ] Configure CloudFront
- [ ] Set up CloudWatch alarms
- [ ] Configure database backups
- [ ] Set up email notifications
- [ ] Test all integrations
- [ ] Load testing (recommended)
- [ ] Security audit
