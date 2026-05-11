/**
 * Публичные env-переменные (NEXT_PUBLIC_*). Любая утечка приватных секретов
 * сюда — баг. Не добавлять сюда токены или ключи.
 */
export const publicEnv = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
};
