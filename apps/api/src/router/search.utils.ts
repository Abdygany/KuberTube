import { createHash } from 'node:crypto';

export function interleave<T>(a: T[], b: T[]): T[] {
  const result: T[] = [];
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (i < a.length) result.push(a[i]!);
    if (i < b.length) result.push(b[i]!);
  }
  return result;
}

export function cacheHash(
  query: string,
  filters: Record<string, unknown>,
  provider: string,
): string {
  const payload = JSON.stringify({ query: query.trim().toLowerCase(), filters, provider });
  return createHash('sha256').update(payload).digest('hex');
}
