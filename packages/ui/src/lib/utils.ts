import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Стандартный shadcn/ui хелпер для составления класс-строк.
 * Используется во всех компонентах apps/web.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
