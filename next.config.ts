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

export default nextConfig;
