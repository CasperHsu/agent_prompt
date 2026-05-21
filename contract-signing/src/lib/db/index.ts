import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  var __dbClient: ReturnType<typeof postgres> | undefined;
  var __db: Db | undefined;
}

function buildClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and configure it."
    );
  }
  return postgres(url, { prepare: false, max: 10 });
}

function getDb(): Db {
  if (!globalThis.__db) {
    if (!globalThis.__dbClient) globalThis.__dbClient = buildClient();
    globalThis.__db = drizzle(globalThis.__dbClient, { schema });
  }
  return globalThis.__db;
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});

export * from "./schema";
