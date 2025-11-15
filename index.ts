import express, { Express, Request, Response } from 'express';
import * as sql from 'mssql';
import dotenv from 'dotenv';
import { getDefaultPoolConfig, connectToDatabase, closeConnection } from './utils/db';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

let pool: sql.ConnectionPool | null = null;

interface CustomerRow {
  CustomerID: number;
  CustomerName: string;
}

interface Customer {
  ok: boolean;
  error?: string;
  count?: number;
  rows?: CustomerRow[];
  sampleTable?: string | null;
}

// Initialize DB connection pool once at startup
const initDb = async (): Promise<void> => {
  try {
    const sqlConfig = getDefaultPoolConfig();
    pool = await connectToDatabase(sqlConfig);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('Failed to initialize database pool:', error);
    process.exit(1);
  }
};

app.use(express.json());

app.get('/', (_req: Request, res: Response<{ message: string }>): void => {
  res.send({ message: 'Hello from your Node.js API!' });
});

// Health check for DB connectivity
app.get('/db/ping', async (_req: Request, res: Response<Customer>): Promise<void> => {
  try {
    if (!pool) {
      res.status(503).json({ ok: false, error: 'DB pool not initialized' });
      return;
    }
    const result = await pool.request().query('SELECT TOP (1) name FROM sys.tables ORDER BY name;');
    res.json({ ok: true, sampleTable: result.recordset?.[0]?.name || null });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error });
  }
});

// Example: list top N customers from WideWorldImporters (read-only)
app.get('/customers', async (req: Request, res: Response<Customer>): Promise<void> => {
  const topParam = req.query.top as string | undefined;
  const top = Math.min(parseInt(topParam || '10', 10), 100);

  try {
    if (!pool) {
      res.status(503).json({ ok: false, error: 'DB pool not initialized' });
      return;
    }

    const result = await pool
      .request()
      .query(`SELECT TOP (${top}) CustomerID, CustomerName FROM Sales.Customers ORDER BY CustomerID;`);

    res.json({ ok: true, count: result.recordset.length, rows: result.recordset as CustomerRow[] });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error });
  }
});

const server = app.listen(PORT, (): void => {
  console.log(`Server is running on port ${PORT}`);
  initDb();
});

// Graceful shutdown
process.on('SIGTERM', async (): Promise<void> => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(async (): Promise<void> => {
    if (pool) {
      await closeConnection(pool);
    }
    process.exit(0);
  });
});
