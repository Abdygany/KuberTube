import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://learnspace:learnspace@localhost:5432/learnspace',
  },
  strict: true,
  verbose: true,
} satisfies Config;
