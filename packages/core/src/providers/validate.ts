/**
 * Лёгкие проверки валидности BYO-ключей провайдеров.
 * Делаем минимальный запрос: достаточно увидеть 200/401 в ответе.
 * Plaintext-ключ никогда не пишем в логи и не сохраняем.
 */

export type Provider = 'youtube' | 'brave' | 'anthropic';
export type ValidationResult = { valid: boolean; reason?: string };

const TIMEOUT_MS = 8_000;

async function probe(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function validateYoutube(key: string): Promise<ValidationResult> {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', 'test');
  url.searchParams.set('maxResults', '1');
  url.searchParams.set('type', 'video');
  url.searchParams.set('key', key);
  const res = await probe(url.toString(), { method: 'GET' });
  if (res.ok) return { valid: true };
  if (res.status === 400 || res.status === 403) {
    return { valid: false, reason: 'YouTube Data API отклонил ключ' };
  }
  return { valid: false, reason: `YouTube API: HTTP ${res.status}` };
}

async function validateBrave(key: string): Promise<ValidationResult> {
  const res = await probe('https://api.search.brave.com/res/v1/web/search?q=test&count=1', {
    method: 'GET',
    headers: {
      'X-Subscription-Token': key,
      Accept: 'application/json',
    },
  });
  if (res.ok) return { valid: true };
  if (res.status === 401 || res.status === 403) {
    return { valid: false, reason: 'Brave Search отклонил ключ' };
  }
  return { valid: false, reason: `Brave API: HTTP ${res.status}` };
}

async function validateAnthropic(key: string): Promise<ValidationResult> {
  const res = await probe('https://api.anthropic.com/v1/models', {
    method: 'GET',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      Accept: 'application/json',
    },
  });
  if (res.ok) return { valid: true };
  if (res.status === 401 || res.status === 403) {
    return { valid: false, reason: 'Anthropic API отклонил ключ' };
  }
  return { valid: false, reason: `Anthropic API: HTTP ${res.status}` };
}

export async function validateProviderKey(
  provider: Provider,
  key: string,
): Promise<ValidationResult> {
  if (!key.trim()) return { valid: false, reason: 'Пустой ключ' };
  switch (provider) {
    case 'youtube':
      return validateYoutube(key);
    case 'brave':
      return validateBrave(key);
    case 'anthropic':
      return validateAnthropic(key);
  }
}
