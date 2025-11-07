import { Pool, PoolConfig, PoolClient, QueryResultRow } from 'pg';
import { NEON_CONNECTION_STRING } from '../constants/constants'

/**
 * NeonDB is a small wrapper around `pg` Pool exposing query helpers.
 * It expects a connection string in `process.env.NEON_CONNECTION_STRING` unless one
 * is provided to the constructor.
 */
export default class NeonDB {
  private pool: Pool;

  constructor(poolConfig?: PoolConfig) {
    // Default pool config: connectionString + SSL for Neon. Caller may override via poolConfig.
    const defaultConfig: PoolConfig = {
      connectionString: NEON_CONNECTION_STRING,
      // Neon typically requires SSL; set rejectUnauthorized false to avoid issues with some providers.
      ssl: {
        rejectUnauthorized: false,
      } as any,
    };

    this.pool = new Pool(Object.assign(defaultConfig, poolConfig || {}));
  }

  /**
   * Generic query helper. Returns rows.
   */
  public async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const res = await client.query<T>(text, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Acquire a client for transactions. Remember to release it after use.
   */
  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Close the pool. Useful in tests or on shutdown.
   */
  public async close(): Promise<void> {
    await this.pool.end();
  }
}

// Export a default singleton instance for convenience (uses env variable).
// Callers may also create their own instance: `new NeonDB(connString)` for tests.
export const neonDb = new NeonDB();