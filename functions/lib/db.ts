import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../../d1/schema.enterprise";
import { Env } from "../types";

export type AppDatabase = DrizzleD1Database<typeof schema>;

/**
 * 获取 Drizzle ORM 数据库连接实例
 * @param env Cloudflare 环境变量绑定
 */
export function getDb(env: Env): AppDatabase {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 Database binding 'DB' is missing. Please configure D1 database binding in Cloudflare Pages settings."
    );
  }
  return drizzle(env.DB, { schema });
}

export { schema };
