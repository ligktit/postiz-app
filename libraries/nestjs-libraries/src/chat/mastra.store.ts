import { PostgresStore } from '@mastra/pg';

export const pStore = new PostgresStore({
  id: 'lightcircle-store',
  connectionString: process.env.DATABASE_URL!,
});
