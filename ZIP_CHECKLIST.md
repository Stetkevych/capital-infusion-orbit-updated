# FILES THAT MUST BE INCLUDED IN THE ZIP FOR AWS DEPLOYMENT

## ✅ CORE APPLICATION FILES

### Root Level
- [x] package.json (root monorepo config)
- [x] .env.example (environment template)
- [x] .gitignore
- [x] .dockerignore
- [x] Dockerfile (main app container)
- [x] docker-compose.yml (local development)
- [x] Procfile (Heroku/Beanstalk)
- [x] README.md (main documentation)
- [x] DEPLOYMENT.md (AWS deployment guide)
- [x] PROJECT_STRUCTURE.md (detailed structure)

### Documentation
- [x] schema/001_init_schema.sql (database schema - CRITICAL)
- [x] .ebextensions/01_nodejs.config (Beanstalk config)
- [x] cloudformation/infrastructure.yaml (CloudFormation template)

---

## ✅ BACKEND (Node.js/Express)

### Package & Config
- [x] server/package.json
- [x] server/src/index.js (entry point)
- [x] server/.gitignore

### Configuration
- [x] server/src/config/database.js

### Middleware
- [x] server/src/middleware/auth.js
- [x] server/src/middleware/errorHandler.js

### Routes (ALL CRITICAL)
- [x] server/src/routes/auth.js
- [x] server/src/routes/applications.js
- [x] server/src/routes/deals.js
- [x] server/src/routes/documents.js
- [x] server/src/routes/plaid.js
- [x] server/src/routes/docusign.js
- [x] server/src/routes/zoho.js
- [x] server/src/routes/offers.js
- [x] server/src/routes/analytics.js
- [x] server/src/routes/metrics.js

### Scripts
- [x] server/src/scripts/migrate.js
- [x] server/src/scripts/seed.js

---

## ✅ FRONTEND (React)

### Package & Config
- [x] client/package.json
- [x] client/tailwind.config.js
- [x] client/postcss.config.js
- [x] client/Dockerfile
- [x] client/.gitignore

### HTML & JS
- [x] client/public/index.html
- [x] client/src/index.js
- [x] client/src/App.jsx

### API & Context
- [x] client/src/api/index.js
- [x] client/src/context/AuthContext.jsx

### Components
- [x] client/src/components/Navbar.jsx
- [x] client/src/components/Sidebar.jsx

### Pages - Login
- [x] client/src/pages/Login.jsx

### Pages - Client Portal
- [x] client/src/pages/ClientPortal/Dashboard.jsx
- [x] client/src/pages/ClientPortal/ApplicationStatus.jsx
- [x] client/src/pages/ClientPortal/SecureUpload.jsx
- [x] client/src/pages/ClientPortal/Messages.jsx
- [x] client/src/pages/ClientPortal/Shop.jsx

### Pages - Sales Rep Portal
- [x] client/src/pages/RepPortal/Dashboard.jsx
- [x] client/src/pages/RepPortal/Kanban.jsx
- [x] client/src/pages/RepPortal/Documents.jsx
- [x] client/src/pages/RepPortal/Contacts.jsx

### Pages - Admin Portal
- [x] client/src/pages/AdminPortal/Dashboard.jsx
- [x] client/src/pages/AdminPortal/Portfolio.jsx
- [x] client/src/pages/AdminPortal/DealDetail.jsx
- [x] client/src/pages/AdminPortal/OfferManagement.jsx
- [x] client/src/pages/AdminPortal/AUGold.jsx
- [x] client/src/pages/AdminPortal/ZohoSync.jsx
- [x] client/src/pages/AdminPortal/SystemHealth.jsx
- [x] client/src/pages/AdminPortal/AuditLogs.jsx
- [x] client/src/pages/AdminPortal/Analytics.jsx

### Utilities
- [x] client/src/utils/format.js (date, currency, phone formatting)
- [x] client/src/utils/constants.js (app constants)

### Styles
- [x] client/src/styles/index.css

---

## ✅ DATABASE SCHEMA

- [x] schema/001_init_schema.sql
  - Users table
  - Merchants table
  - Applications table
  - Deals table
  - Documents table
  - Payments table
  - Notes table
  - Offers table
  - Funders table
  - ISOs table
  - Tasks table
  - Audit logs table
  - Upload logs table
  - System metrics table
  - Merchant health scores table
  - Deal alerts table
  - Portfolio metrics table
  - DocuSign envelopes table
  - Zoho sync logs table
  - Bank connections table

---

## ✅ ENVIRONMENT & DEPLOYMENT

- [x] .env.example (all required variables)
  - DATABASE_URL
  - PORT
  - NODE_ENV
  - JWT_SECRET
  - PLAID_CLIENT_ID
  - PLAID_SECRET
  - PLAID_ENV
  - DOCUSIGN_INTEGRATION_KEY
  - DOCUSIGN_USER_ID
  - DOCUSIGN_ACCOUNT_ID
  - DOCUSIGN_WEBHOOK_SECRET
  - ZOHO_CLIENT_ID
  - ZOHO_CLIENT_SECRET
  - ZOHO_REFRESH_TOKEN
  - ZOHO_ACCOUNT_DOMAIN
  - AWS_REGION
  - AWS_S3_BUCKET
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY
  - FRONTEND_URL
  - API_BASE_URL

- [x] .ebextensions/01_nodejs.config
- [x] cloudformation/infrastructure.yaml
- [x] Procfile
- [x] docker-compose.yml
- [x] Dockerfile

---

## ✅ DOCUMENTATION

- [x] README.md (local setup, environment, build, run, deployment)
- [x] DEPLOYMENT.md (3 AWS deployment options with step-by-step)
- [x] PROJECT_STRUCTURE.md (complete file structure reference)
- [x] .gitignore (prevents committing secrets, node_modules)
- [x] .dockerignore (optimizes Docker builds)

---

## ⚙️ CRITICAL SETUP STEPS BEFORE DEPLOYMENT

### 1. Before Zipping
```bash
✅ Remove .env (keep .env.example only)
✅ Remove node_modules/ directories
✅ Remove build/ directories
✅ Remove .git/ (if using git)
✅ Verify all import paths are correct
✅ Check package.json dependencies are current
```

### 2. After Extracting ZIP
```bash
✅ npm install:all (installs all dependencies)
✅ Copy .env.example to .env
✅ Fill in .env with production values
```

### 3. Database Setup
```bash
✅ Create RDS PostgreSQL instance
✅ Get RDS endpoint
✅ Update DATABASE_URL in .env
✅ Run: npm run migrate (creates all tables)
✅ Run: npm run seed (adds demo data)
```

### 4. AWS Setup
```bash
✅ Create S3 bucket for documents
✅ Create IAM user with S3 access
✅ Get AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
✅ Create CloudFront distribution (optional, for CDN)
✅ Create ALB for load balancing
```

### 5. Docker Build
```bash
✅ docker build -t mca-lending:latest .
✅ docker tag mca-lending:latest <registry>/mca-lending:latest
✅ docker push <registry>/mca-lending:latest
```

### 6. Deployment
```bash
✅ Option A: Elastic Beanstalk (recommended)
   eb create mca-prod
   eb deploy

✅ Option B: ECS
   Create ECR repo
   Push image
   Create task definition
   Create service

✅ Option C: EC2
   Launch instance
   Install Docker
   docker-compose up -d
```

---

## 📋 ZIP FILE CHECKLIST

Run this before creating ZIP:

```bash
# Remove unnecessary files
rm -rf node_modules/
rm -rf client/node_modules/
rm -rf server/node_modules/
rm -rf client/build/
rm -rf server/dist/
rm -rf .git/ (if exists)

# Keep only .env.example (not .env)
rm .env (if exists)

# Verify all critical files exist
ls schema/001_init_schema.sql
ls server/src/index.js
ls client/src/App.jsx
ls README.md
ls DEPLOYMENT.md

# Create ZIP
zip -r mca-lending-platform.zip mca-lending-platform/
```

---

## 🚀 TOTAL FILE COUNT

- **Total Files**: 100+
- **Critical Files**: 45
- **Documentation Files**: 5
- **Configuration Files**: 10
- **Source Code Files**: 40+
- **ZIP Size (without node_modules)**: ~5-10MB
- **Extracted Size (after npm install)**: ~500-800MB

---

## ⚠️ IMPORTANT NOTES

1. **Never commit secrets** - Use .env.example only
2. **Database schema is critical** - Without 001_init_schema.sql, nothing works
3. **All routes must be present** - Missing any route breaks functionality
4. **Environment variables are required** - Application won't start without them
5. **Docker is recommended** - Simplest path to AWS deployment
6. **Elastic Beanstalk is easiest** - Best for teams new to AWS

---

## 🔄 VERIFICATION CHECKLIST

After extracting ZIP on deployment server:

- [ ] All directories exist
- [ ] All .js files are present
- [ ] All .jsx files are present
- [ ] schema/001_init_schema.sql exists
- [ ] README.md is readable
- [ ] DEPLOYMENT.md exists
- [ ] .env.example exists (not .env)
- [ ] package.json files exist (3 total)
- [ ] Docker files present (Dockerfile, docker-compose.yml)
- [ ] No node_modules/ directories
- [ ] No .git/ directory
- [ ] No build/ or dist/ directories
- [ ] .gitignore present
- [ ] All documentation present

---

## 📞 SUPPORT CHECKLIST

If deployment fails, verify:

1. [ ] Node.js 18+ installed
2. [ ] PostgreSQL 15 running
3. [ ] .env file created with all variables
4. [ ] DATABASE_URL is correct
5. [ ] AWS credentials configured
6. [ ] S3 bucket created
7. [ ] npm install:all completed successfully
8. [ ] npm run migrate completed
9. [ ] No port conflicts (5000, 3000)
10. [ ] Docker running (if using containers)

---

**Ready to Deploy? ✅ All files prepared for production AWS deployment.**
