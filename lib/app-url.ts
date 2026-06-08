export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function buildAppUrl(path: string) {
  return new URL(path, getAppUrl());
}
