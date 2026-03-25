# AWS Deployment Guide

This guide walks through deploying the MCA Lending Platform to AWS.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured (`aws configure`)
- Docker installed
- Git repository access

## Architecture

```
┌─────────────────┐
│   CloudFront    │ (CDN for static assets)
│   (S3 Origin)   │
└────────┬────────┘
         │
    ┌────▼─────┐
    │  S3      │ (React frontend build)
    └──────────┘

┌──────────────────────┐
│  Application Load    │
│  Balancer            │
└──────────┬───────────┘
           │
      ┌────▼─────┐
      │   ECS    │ (Node.js backend)
      │ Cluster  │
      └────┬─────┘
           │
      ┌────▼─────┐
      │  RDS     │ (PostgreSQL)
      └──────────┘
```

## Option 1: Deploy with Elastic Beanstalk (Recommended)

### Step 1: Install EB CLI
```bash
pip install awsebcli
```

### Step 2: Initialize Elastic Beanstalk
```bash
eb init -p "Docker running on 64bit Amazon Linux 2" mca-lending-prod --region us-east-1
```

### Step 3: Create RDS Database
```bash
# Create RDS instance in AWS Console or via CLI
aws rds create-db-instance \
  --db-instance-identifier mca-lending-prod \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.3 \
  --master-username mcaadmin \
  --master-user-password YourSecurePassword \
  --allocated-storage 100 \
  --storage-encrypted \
  --backup-retention-period 30 \
  --region us-east-1

# Get RDS endpoint
aws rds describe-db-instances \
  --db-instance-identifier mca-lending-prod \
  --query 'DBInstances[0].Endpoint.Address' \
  --region us-east-1
```

### Step 4: Create S3 Bucket
```bash
aws s3 mb s3://mca-lending-prod-documents --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket mca-lending-prod-documents \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket mca-lending-prod-documents \
  --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}'

# Block public access
aws s3api put-public-access-block \
  --bucket mca-lending-prod-documents \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### Step 5: Create .env File
```bash
cat > .env << 'EOF'
DATABASE_URL=postgresql://mcaadmin:YourSecurePassword@mca-lending-prod.xxxxx.us-east-1.rds.amazonaws.com:5432/mca_lending
PORT=5000
NODE_ENV=production
JWT_SECRET=your-super-secret-key-minimum-32-chars
AWS_REGION=us-east-1
AWS_S3_BUCKET=mca-lending-prod-documents
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
FRONTEND_URL=https://yourdomain.com
API_BASE_URL=https://api.yourdomain.com
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=production
EOF
```

### Step 6: Create Elastic Beanstalk Environment
```bash
eb create mca-prod \
  --instance-type t3.small \
  --envvars DATABASE_URL,JWT_SECRET,AWS_REGION,AWS_S3_BUCKET,AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,FRONTEND_URL,API_BASE_URL,NODE_ENV \
  --scale 2 \
  --elb-type application
```

### Step 7: Deploy Application
```bash
eb deploy
```

### Step 8: Initialize Database
```bash
# SSH into instance
eb ssh

# Run migrations
npm run migrate

# Exit
exit

# Or run via EB CLI
eb setenv INITIAL_DEPLOY=true
eb deploy
```

### Step 9: Monitor Deployment
```bash
# Check environment health
eb health

# View logs
eb logs

# Check status
eb status
```

## Option 2: Deploy with ECS & Fargate

### Step 1: Create ECR Repository
```bash
aws ecr create-repository \
  --repository-name mca-lending \
  --region us-east-1
```

### Step 2: Build and Push Docker Image
```bash
# Get ECR login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t mca-lending:latest .

# Tag image
docker tag mca-lending:latest \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/mca-lending:latest

# Push to ECR
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/mca-lending:latest
```

### Step 3: Create RDS Database
```bash
# See Option 1, Step 3
```

### Step 4: Create ECS Cluster
```bash
aws ecs create-cluster --cluster-name mca-lending-prod
```

### Step 5: Create IAM Role for ECS Task
```bash
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

### Step 6: Create CloudWatch Log Group
```bash
aws logs create-log-group --log-group-name /ecs/mca-lending
```

### Step 7: Register Task Definition
```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json
```

### Step 8: Create ECS Service
```bash
aws ecs create-service \
  --cluster mca-lending-prod \
  --service-name mca-api \
  --task-definition mca-lending \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

## Option 3: Deploy with EC2 & Auto Scaling

### Step 1: Create Launch Template
```bash
aws ec2 create-launch-template \
  --launch-template-name mca-lending-template \
  --version-description "MCA Lending Platform" \
  --launch-template-data file://launch-template.json
```

### Step 2: Create Auto Scaling Group
```bash
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name mca-lending-asg \
  --launch-template LaunchTemplateName=mca-lending-template,Version='$Latest' \
  --min-size 2 \
  --max-size 6 \
  --desired-capacity 2 \
  --vpc-zone-identifier "subnet-xxx,subnet-yyy" \
  --target-group-arns arn:aws:elasticloadbalancing:...
```

## Post-Deployment Configuration

### Set Up CloudFront for Frontend

```bash
# Create CloudFront distribution pointing to S3
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

### Configure Custom Domain

```bash
# Update Route 53 records to point to CloudFront/ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id ZONE_ID \
  --change-batch file://route53-changes.json
```

### Set Up SSL Certificate

```bash
# Request or import SSL certificate in ACM
aws acm request-certificate \
  --domain-name yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

### Configure Environment Variables

```bash
# Using AWS Systems Manager Parameter Store
aws ssm put-parameter \
  --name /mca/prod/database-url \
  --value "postgresql://..." \
  --type SecureString

aws ssm put-parameter \
  --name /mca/prod/jwt-secret \
  --value "your-secret" \
  --type SecureString
```

### Enable CloudWatch Logging

```bash
# Logs are automatically sent to CloudWatch
# View logs:
aws logs tail /ecs/mca-lending --follow
```

## Database Migration on Production

```bash
# Option 1: Via SSH
eb ssh
cd /var/app/current
npm run migrate
npm run seed  # Only for first deployment
exit

# Option 2: Via RDS client
psql -h mca-lending-prod.xxxxx.us-east-1.rds.amazonaws.com \
     -U mcaadmin \
     -d mca_lending \
     -f schema/001_init_schema.sql
```

## Monitoring & Logging

### CloudWatch Dashboard
```bash
aws cloudwatch put-dashboard \
  --dashboard-name MCA-Lending-Dashboard \
  --dashboard-body file://dashboard-config.json
```

### Alarms
```bash
# High CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name mca-cpu-high \
  --alarm-description "Alert when CPU is high" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 70 \
  --comparison-operator GreaterThanThreshold
```

## Scaling Configuration

### Auto Scaling Policies (ECS)
```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/mca-lending-prod/mca-api \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 6
```

## Backup & Disaster Recovery

### RDS Backups
```bash
# Automated daily backups (configured during creation)
# Manual backup:
aws rds create-db-snapshot \
  --db-instance-identifier mca-lending-prod \
  --db-snapshot-identifier mca-backup-$(date +%s)
```

### S3 Backup
```bash
# Enable versioning (done during bucket creation)
# Lifecycle policy for old versions
aws s3api put-bucket-lifecycle-configuration \
  --bucket mca-lending-prod-documents \
  --lifecycle-configuration file://lifecycle-policy.json
```

## Cost Optimization

1. **Reserved Instances**: Use RIs for stable workloads
2. **Spot Instances**: Use for non-critical worker instances
3. **S3 Lifecycle**: Move old documents to Glacier
4. **CloudFront Caching**: Aggressive caching for static assets
5. **Auto Scaling**: Scale down during off-peak hours

## Security Hardening

1. ✅ Enable VPC encryption
2. ✅ Use Security Groups restrictively
3. ✅ Enable CloudTrail for audit logs
4. ✅ Rotate database passwords regularly
5. ✅ Use AWS Secrets Manager for secrets
6. ✅ Enable S3 Block Public Access
7. ✅ Use HTTPS everywhere
8. ✅ Enable WAF on ALB
9. ✅ Regular security patching
10. ✅ VPC Flow Logs for troubleshooting

## Rollback Procedure

```bash
# Elastic Beanstalk
eb appversion:clean --delete-source
eb deploy <previous-version>

# ECS
aws ecs update-service \
  --cluster mca-lending-prod \
  --service mca-api \
  --task-definition mca-lending:previous-revision
```

## Troubleshooting

### Application won't start
```bash
# Check logs
eb logs --all

# SSH and check manually
eb ssh
docker logs $(docker ps -q)
```

### Database connection issues
```bash
# Verify RDS is running
aws rds describe-db-instances --db-instance-identifier mca-lending-prod

# Check security group
aws ec2 describe-security-groups --group-ids sg-xxxxx
```

### High latency
```bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 300 \
  --statistics Average
```

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review AWS service health
3. Check application error logs
4. Verify environment variables
5. Test database connectivity
