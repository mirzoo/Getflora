// Хосты из next.config remotePatterns: для них next/image может
// оптимизировать (resize/WebP). Остальные внешние URL рендерим как есть,
// иначе next/image упадёт на незнакомом хосте.
const optimizableImageHosts = new Set([
  "images.unsplash.com",
  "storage.yandexcloud.net",
  "localhost",
  "127.0.0.1",
]);

export function shouldBypassNextImageOptimizer(src: string) {
  if (!src.startsWith("http://") && !src.startsWith("https://")) {
    return false;
  }

  try {
    return !optimizableImageHosts.has(new URL(src).hostname);
  } catch {
    return true;
  }
}
