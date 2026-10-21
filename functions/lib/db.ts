/**
 * Cloudflare D1 原生类型安全数据访问层 (DAL)
 * 零外部 npm 依赖，完美兼容 Cloudflare Pages Functions 边缘构建
 */
import { Env } from "../types";

export interface DatabaseClient {
  queryOne: <T>(sql: string, ...params: unknown[]) => Promise<T | null>;
  queryAll: <T>(sql: string, ...params: unknown[]) => Promise<T[]>;
  query: <T>(sql: string, ...params: unknown[]) => Promise<T[]>;
  execute: (sql: string, ...params: unknown[]) => Promise<{ success: boolean }>;
}

/**
 * 获取 D1 数据库执行客户端
 */
export function getDb(env: Env): DatabaseClient {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 Database binding 'DB' is missing. Please configure D1 database binding in Cloudflare Pages."
    );
  }

  const d1 = env.DB;

  return {
    async queryOne<T>(sql: string, ...params: unknown[]): Promise<T | null> {
      try {
        const stmt = d1.prepare(sql).bind(...params);
        const result = (await stmt.first()) as T | null | undefined;
        return result || null;
      } catch (err) {
        console.error("D1 queryOne error:", err, { sql, params });
        throw err;
      }
    },

    async queryAll<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      try {
        const stmt = d1.prepare(sql).bind(...params);
        const res = (await stmt.all()) as { results?: unknown[] };
        return ((res?.results || []) as T[]);
      } catch (err) {
        console.error("D1 queryAll error:", err, { sql, params });
        throw err;
      }
    },

    async query<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      return this.queryAll<T>(sql, ...params);
    },

    async execute(sql: string, ...params: unknown[]): Promise<{ success: boolean }> {
      try {
        const stmt = d1.prepare(sql).bind(...params);
        await stmt.run();
        return { success: true };
      } catch (err) {
        console.error("D1 execute error:", err, { sql, params });
        throw err;
      }
    },
  };
}
