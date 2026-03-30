const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.AWS_S3_BUCKET || 'orbit-documents-882611632216-882611632216-us-east-1-an';

async function logEvent(type, data) {
  try {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const record = { event_id: uuidv4(), event_type: type, timestamp: now.toISOString(), year, month, ...data };
    const key = `analytics/${type}s/year=${year}/month=${month}/${record.event_id}.json`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: JSON.stringify(record),
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256',
    }));
    console.log(`[EventLog] ${type} logged to S3: ${key}`);
  } catch (err) {
    console.error(`[EventLog] Failed to log ${type}:`, err.message);
    // Non-fatal — never block the main operation
  }
}

// ── Typed event loggers ───────────────────────────────────────────────────────
const EventLogger = {
  deal: (data) => logEvent('deal', data),
  upload: (data) => logEvent('document_upload', data),
  request: (data) => logEvent('document_request', data),
  login: (data) => logEvent('login', data),
  underwriting: (data) => logEvent('underwriting_metric', data),
};

module.exports = EventLogger;
