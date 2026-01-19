import { drizzle } from "drizzle-orm/libsql";
import { env } from "@/lib/config/env";
import * as schema from "./schema";

export const db = drizzle({
  connection: {
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  },
  schema,
});
