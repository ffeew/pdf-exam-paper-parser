import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { env } from "@/lib/config/env";
import * as schema from "./schema";

const client = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

// Enable foreign key enforcement for cascade deletes
client.execute("PRAGMA foreign_keys = ON");

export const db = drizzle(client, { schema });
