import { createHash, createHmac, randomUUID } from "crypto";

import {
  maxImageFiles,
  maxImageSizeBytes,
  maxTotalImageSizeBytes,
} from "@/features/listings/constants/listing-limits";

type UploadImageInput = {
  file: File;
  folder?: string;
};

type PresignedImageUploadInput = {
  contentType: string;
  size: number;
  folder?: string;
};

type S3StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
};

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const presignedUploadTtlSeconds = 120;

export function createPresignedListingImageUpload({
  contentType,
  size,
  folder = "listing-images",
}: PresignedImageUploadInput) {
  validateImageMetadata({ contentType, size });

  const config = readS3StorageConfig();
  const extension = getImageExtension(contentType);
  const key = `${folder}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;

  return {
    key,
    imageUrl: getPublicListingImageUrl(key, config.publicUrl),
    uploadUrl: createPresignedPutObjectUrl({
      config,
      key,
      expiresInSeconds: presignedUploadTtlSeconds,
    }),
  };
}

export async function uploadListingImage({ file, folder = "listing-images" }: UploadImageInput) {
  validateImageFile(file);

  const config = readS3StorageConfig();
  const extension = getImageExtension(file.type);
  const key = `${folder}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  await putS3Object({
    config,
    key,
    body: bytes,
    contentType: file.type,
  });

  return getListingImageProxyUrl(key);
}

export async function deleteListingImages(imageUrls: string[], keptImageUrls: string[] = []) {
  const config = readS3StorageConfig();
  const keptUrls = new Set(keptImageUrls);
  const objectKeys = imageUrls
    .filter((imageUrl) => !keptUrls.has(imageUrl))
    .map((imageUrl) => getObjectKeyFromImageUrl(imageUrl, config.publicUrl))
    .filter((key): key is string => Boolean(key));

  await Promise.allSettled(
    objectKeys.map((key) =>
      deleteS3Object({
        config,
        key,
      }),
    ),
  );
}

export async function getListingImageObject(key: string) {
  const config = readS3StorageConfig();
  const safeKey = normalizeObjectKey(key);

  if (!safeKey) {
    return null;
  }

  const response = await fetchSignedS3Object({
    config,
    key: safeKey,
  });

  if (!response.ok) {
    return null;
  }

  return {
    body: response.body,
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
  };
}

export function getListingImageDisplayUrl(imageUrl: string) {
  const publicUrl = process.env.S3_PUBLIC_URL;

  if (!publicUrl) {
    return imageUrl;
  }

  const objectKey = getObjectKeyFromImageUrl(imageUrl, publicUrl);

  return objectKey ? getPublicListingImageUrl(objectKey, publicUrl) : imageUrl;
}

export function getUploadableImageFiles(formData: FormData, key = "imageFiles") {
  const files = formData
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length > maxImageFiles) {
    throw new Error(`Можно загрузить максимум ${maxImageFiles} фото.`);
  }

  validateTotalImageFileSize(files);

  return files;
}

function validateImageFile(file: File) {
  validateImageMetadata({
    contentType: file.type,
    size: file.size,
  });
}

function validateImageMetadata({
  contentType,
  size,
}: {
  contentType: string;
  size: number;
}) {
  if (!allowedImageTypes.has(contentType)) {
    throw new Error("Загрузите фото в формате JPG, PNG или WebP.");
  }

  if (size > maxImageSizeBytes) {
    throw new Error("Размер одного фото не должен превышать 8 МБ.");
  }
}

function validateTotalImageFileSize(files: File[]) {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  if (totalSize > maxTotalImageSizeBytes) {
    throw new Error("Общий размер фото не должен превышать 24 МБ.");
  }
}

function readS3StorageConfig(): S3StorageConfig {
  const config = {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || "us-east-1",
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    publicUrl: process.env.S3_PUBLIC_URL,
  };

  if (
    !config.endpoint ||
    !config.bucket ||
    !config.accessKeyId ||
    !config.secretAccessKey ||
    !config.publicUrl
  ) {
    throw new Error("Хранилище фото не настроено. Проверьте S3 env-переменные.");
  }

  return config as S3StorageConfig;
}

async function putS3Object({
  config,
  key,
  body,
  contentType,
}: {
  config: S3StorageConfig;
  key: string;
  body: Buffer;
  contentType: string;
}) {
  const endpoint = new URL(config.endpoint);
  const objectPath = `/${config.bucket}/${key}`;
  const uploadUrl = new URL(objectPath, endpoint);
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);
  const host = uploadUrl.host;
  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    encodePath(objectPath),
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, config.region, "s3");
  const signature = hmacHex(signingKey, stringToSign);
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: body as unknown as BodyInit,
    headers: {
      Authorization: authorization,
      "Content-Type": contentType,
      "X-Amz-Content-Sha256": payloadHash,
      "X-Amz-Date": amzDate,
    },
  });

  if (!response.ok) {
    throw new Error(`Не удалось загрузить фото в хранилище: ${response.status}.`);
  }
}

async function deleteS3Object({
  config,
  key,
}: {
  config: S3StorageConfig;
  key: string;
}) {
  const endpoint = new URL(config.endpoint);
  const objectPath = `/${config.bucket}/${key}`;
  const deleteUrl = new URL(objectPath, endpoint);
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex("");
  const host = deleteUrl.host;
  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "DELETE",
    encodePath(objectPath),
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, config.region, "s3");
  const signature = hmacHex(signingKey, stringToSign);
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      Authorization: authorization,
      "X-Amz-Content-Sha256": payloadHash,
      "X-Amz-Date": amzDate,
    },
  });

  if (!response.ok) {
    throw new Error(`Не удалось удалить фото из хранилища: ${response.status}.`);
  }
}

function getObjectKeyFromImageUrl(imageUrl: string, publicUrl: string) {
  const proxyPrefix = "/api/listing-images/";

  if (imageUrl.startsWith(proxyPrefix)) {
    return safeDecodeURIComponent(imageUrl.slice(proxyPrefix.length));
  }

  const normalizedPublicUrl = publicUrl.replace(/\/$/, "");

  if (!imageUrl.startsWith(`${normalizedPublicUrl}/`)) {
    return null;
  }

  return imageUrl.slice(normalizedPublicUrl.length + 1);
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

async function fetchSignedS3Object({
  config,
  key,
}: {
  config: S3StorageConfig;
  key: string;
}) {
  const endpoint = new URL(config.endpoint);
  const objectPath = `/${config.bucket}/${key}`;
  const objectUrl = new URL(objectPath, endpoint);
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex("");
  const host = objectUrl.host;
  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "GET",
    encodePath(objectPath),
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, config.region, "s3");
  const signature = hmacHex(signingKey, stringToSign);
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(objectUrl, {
    headers: {
      Authorization: authorization,
      "X-Amz-Content-Sha256": payloadHash,
      "X-Amz-Date": amzDate,
    },
  });
}

function getListingImageProxyUrl(key: string) {
  return `/api/listing-images/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function getPublicListingImageUrl(key: string, publicUrl: string) {
  return `${publicUrl.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function createPresignedPutObjectUrl({
  config,
  key,
  expiresInSeconds,
}: {
  config: S3StorageConfig;
  key: string;
  expiresInSeconds: number;
}) {
  const endpoint = new URL(config.endpoint);
  const objectPath = `/${config.bucket}/${key}`;
  const uploadUrl = new URL(objectPath, endpoint);
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const signedHeaders = "host";
  const queryParams = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresInSeconds),
    "X-Amz-SignedHeaders": signedHeaders,
  };
  const canonicalRequest = [
    "PUT",
    encodePath(objectPath),
    createCanonicalQueryString(queryParams),
    `host:${uploadUrl.host}\n`,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, config.region, "s3");
  const signature = hmacHex(signingKey, stringToSign);

  uploadUrl.search = createCanonicalQueryString({
    ...queryParams,
    "X-Amz-Signature": signature,
  });

  return uploadUrl.toString();
}

function normalizeObjectKey(key: string) {
  const normalizedKey = key
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");

  return normalizedKey.startsWith("listing-images/") ? normalizedKey : null;
}

function getImageExtension(contentType: string) {
  if (contentType === "image/png") {
    return "png";
  }

  if (contentType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function encodePath(path: string) {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function createCanonicalQueryString(params: Record<string, string>) {
  return Object.entries(params)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${encodeQueryComponent(key)}=${encodeQueryComponent(value)}`)
    .join("&");
}

function encodeQueryComponent(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function toAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function sha256Hex(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function hmacHex(key: Buffer, value: string) {
  return createHmac("sha256", key).update(value).digest("hex");
}

function getSignatureKey(secretAccessKey: string, dateStamp: string, region: string, service: string) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const dateRegionKey = hmac(dateKey, region);
  const dateRegionServiceKey = hmac(dateRegionKey, service);

  return hmac(dateRegionServiceKey, "aws4_request");
}
