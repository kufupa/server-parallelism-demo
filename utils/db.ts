import * as sql from 'mssql';

export interface SqlConfig {
  user: string;
  password: string;
  server: string;
  database: string;
  port: number;
  options: {
    encrypt: boolean;
    trustServerCertificate: boolean;
  };
  pool?: {
    max: number;
    min: number;
    idleTimeoutMillis: number;
  };
}

export const getDefaultSqlConfig = (): SqlConfig => {
  return {
    user: process.env.DB_USER || 'hackathon_ro_05',
    password: process.env.DB_PASSWORD || 'B8^cNp1%',
    server: process.env.DB_HOST || 'pepsaco-db-standard.c1oqimeoszvd.eu-west-2.rds.amazonaws.com',
    database: process.env.DB_NAME || 'WideWorldImporters_Base',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    options: {
      encrypt: true,
      trustServerCertificate: true
    }
  };
};

export const getDefaultPoolConfig = (): SqlConfig => {
  const config = getDefaultSqlConfig();
  return {
    ...config,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };
};

export const connectToDatabase = async (config: SqlConfig): Promise<sql.ConnectionPool> => {
  try {
    const pool = await (sql as any).connect(config);
    console.log('✓ Connected to SQL Server:', config.server);
    return pool;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('✗ Failed to connect to SQL Server:', error);
    throw err;
  }
};

export const closeConnection = async (pool: sql.ConnectionPool): Promise<void> => {
  try {
    await pool.close();
    console.log('✓ Database connection closed');
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('✗ Error closing connection:', error);
    throw err;
  }
};
