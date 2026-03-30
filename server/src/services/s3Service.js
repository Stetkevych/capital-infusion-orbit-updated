const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.AWS_S3_BUCKET || 'orbit-documents-882611632216';

// ─── Generate presigned upload URL ───────────────────────────────────────────
async function getPresignedUploadUrl({ clientId, category, fileName, contentType }) {
  const ext = fileName.split('.').pop();
  const key = `clients/${clientId}/${category}/${uuidv4()}_${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
    ServerSideEncryption: 'AES256',
    Metadata: { clientId, category, originalName: fileName },
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min
  return { url, key };
}

// ─── Generate presigned download URL ─────────────────────────────────────────
async function getPresignedDownloadUrl(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
}

// ─── Check file exists in S3 ─────────────────────────────────────────────────
async function fileExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch { return false; }
}

// ─── Delete file from S3 ─────────────────────────────────────────────────────
async function deleteFile(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

module.exports = { getPresignedUploadUrl, getPresignedDownloadUrl, fileExists, deleteFile };
