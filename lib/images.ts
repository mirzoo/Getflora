export function shouldBypassNextImageOptimizer(src: string) {
  return src.startsWith("http://") || src.startsWith("https://");
}
