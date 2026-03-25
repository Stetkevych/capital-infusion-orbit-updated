const fs = require('fs');
const path = require('path');

class Config {
  constructor() {
    this.config = {};
    this.loadRuntimeConfig();
    this.loadEnvironmentVariables();
    this.validate();
  }

  loadRuntimeConfig() {
    const configPath = path.join(__dirname, '../../.runtimeconfig.json');
    try {
      if (fs.existsSync(configPath)) {
        const rawConfig = fs.readFileSync(configPath, 'utf8');
        this.config = JSON.parse(rawConfig);
        console.log('✓ Loaded .runtimeconfig.json');
      }
    } catch (err) {
      console.warn('⚠ Could not load .runtimeconfig.json:', err.message);
    }
  }

  loadEnvironmentVariables() {
    require('dotenv').config();

    // Replace placeholders in config with environment variables
    this.replaceWithEnv(this.config);

    // Load env vars directly
    this.env = {
      PORT: process.env.PORT || this.config.server?.port || 5000,
      NODE_ENV: process.env.NODE_ENV || this.config.server?.nodeEnv || 'development',
      DATABASE_URL: process.env.DATABASE_URL || this.config.database?.url,
      JWT_SECRET: process.env.JWT_SECRET || this.config.auth?.jwtSecret,
      FRONTEND_URL: process.env.FRONTEND_URL || this.config.server?.frontendUrl,
      API_BASE_URL: process.env.API_BASE_URL || this.config.server?.apiBaseUrl,
      AWS_REGION: process.env.AWS_REGION || this.config.aws?.region,
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || this.config.aws?.s3Bucket,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || this.config.aws?.accessKeyId,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || this.config.aws?.secretAccessKey,
      PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID || this.config.integrations?.plaid?.clientId,
      PLAID_SECRET: process.env.PLAID_SECRET || this.config.integrations?.plaid?.secret,
      PLAID_ENV: process.env.PLAID_ENV || this.config.integrations?.plaid?.env || 'sandbox',
      DOCUSIGN_INTEGRATION_KEY: process.env.DOCUSIGN_INTEGRATION_KEY || this.config.integrations?.docusign?.integrationKey,
      DOCUSIGN_USER_ID: process.env.DOCUSIGN_USER_ID || this.config.integrations?.docusign?.userId,
      DOCUSIGN_ACCOUNT_ID: process.env.DOCUSIGN_ACCOUNT_ID || this.config.integrations?.docusign?.accountId,
      DOCUSIGN_WEBHOOK_SECRET: process.env.DOCUSIGN_WEBHOOK_SECRET || this.config.integrations?.docusign?.webhookSecret,
      ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID || this.config.integrations?.zoho?.clientId,
      ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET || this.config.integrations?.zoho?.clientSecret,
      ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN || this.config.integrations?.zoho?.refreshToken,
      ZOHO_ACCOUNT_DOMAIN: process.env.ZOHO_ACCOUNT_DOMAIN || this.config.integrations?.zoho?.accountDomain,
    };

    console.log('✓ Loaded environment configuration');
  }

  replaceWithEnv(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'string' && obj[key].startsWith('${') && obj[key].endsWith('}')) {
        const envKey = obj[key].slice(2, -1).split(':-')[0];
        const defaultValue = obj[key].includes(':-') ? obj[key].split(':-')[1].replace('}', '') : undefined;
        obj[key] = process.env[envKey] || defaultValue || '';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.replaceWithEnv(obj[key]);
      }
    }
  }

  validate() {
    const required = [
      'DATABASE_URL',
      'JWT_SECRET',
      'AWS_REGION',
      'AWS_S3_BUCKET',
    ];

    const missing = required.filter(key => !this.env[key]);
    if (missing.length > 0) {
      console.warn(`⚠ Missing required env vars: ${missing.join(', ')}`);
      if (this.env.NODE_ENV === 'production') {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
      }
    }

    console.log('✓ Configuration validated');
  }

  get(key) {
    return this.env[key] || process.env[key];
  }

  getConfig() {
    return this.config;
  }

  getAll() {
    return this.env;
  }
}

module.exports = new Config();
