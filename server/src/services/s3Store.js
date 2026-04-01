const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.AWS_S3_BUCKET || 'orbit-documents-882611632216-882611632216-us-east-1-an';
const PREFIX = '_orbit_data/';

// In-memory cache to avoid hitting S3 on every read
const cache = {};

async function loadFromS3(fileName) {
  // Return cache if fresh (< 5 seconds old)
  if (cache[fileName] && Date.now() - cache[fileName].ts < 5000) {
    return cache[fileName].data;
  }
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: `${PREFIX}${fileName}` }));
    const body = await res.Body.transformToString();
    const data = JSON.parse(body);
    cache[fileName] = { data, ts: Date.now() };
    return data;
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return [];
    }
    console.error(`[S3Store] Load error for ${fileName}:`, err.message);
    // Fall back to cache if S3 is temporarily unavailable
    return cache[fileName]?.data || [];
  }
}

async function saveToS3(fileName, data) {
  cache[fileName] = { data, ts: Date.now() };
  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${PREFIX}${fileName}`,
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json',
    }));
  } catch (err) {
    console.error(`[S3Store] Save error for ${fileName}:`, err.message);
  }
}

module.exports = { loadFromS3, saveToS3 };
