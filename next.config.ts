import type { NextConfig } from "next";

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

const imageRemotePatterns: RemotePattern[] = [
  {
    protocol: "https",
    hostname: "images.unsplash.com",
  },
  {
    protocol: "http",
    hostname: "localhost",
    port: "9000",
  },
  {
    protocol: "http",
    hostname: "127.0.0.1",
    port: "9000",
  },
  // Yandex Object Storage — не зависит от S3_PUBLIC_URL в .env (next.config читается при старте dev).
  {
    protocol: "https",
    hostname: "storage.yandexcloud.net",
    pathname: "/**",
  },
];

const storageImageRemotePattern = getStorageImageRemotePattern(process.env.S3_PUBLIC_URL);
const contentSecurityPolicy = buildContentSecurityPolicy(process.env.S3_PUBLIC_URL);

if (storageImageRemotePattern) {
  imageRemotePatterns.push(storageImageRemotePattern);
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  experimental: {
    serverActions: {
      bodySizeLimit: "90mb",
    },
  },
  images: {
    remotePatterns: imageRemotePatterns,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

function getStorageImageRemotePattern(publicUrl: string | undefined): RemotePattern | null {
  if (!publicUrl) {
    return null;
  }

  try {
    const parsedPublicUrl = new URL(publicUrl);
    const protocol = parsedPublicUrl.protocol.replace(":", "");

    if (protocol !== "http" && protocol !== "https") {
      return null;
    }

    const pathname = `${parsedPublicUrl.pathname.replace(/\/$/, "")}/**`;

    return {
      protocol,
      hostname: parsedPublicUrl.hostname,
      port: parsedPublicUrl.port,
      pathname,
    };
  } catch {
    return null;
  }
}

function buildContentSecurityPolicy(storagePublicUrl: string | undefined) {
  const imageSources = [
    "'self'",
    "data:",
    "blob:",
    "https://images.unsplash.com",
    "https://storage.yandexcloud.net",
    "http://localhost:9000",
    "http://127.0.0.1:9000",
    getOrigin(storagePublicUrl),
  ].filter(Boolean);

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imageSources.join(" ")}`,
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

function getOrigin(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export default nextConfig;
