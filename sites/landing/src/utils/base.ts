export function withBase(path: string): string {
  if (!path) return path;
  if (/^(https?:|mailto:|tel:|#)/i.test(path)) return path;
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  if (!path.startsWith("/")) return `${normalizedBase}/${path}`;
  return `${normalizedBase}${path}`;
}
