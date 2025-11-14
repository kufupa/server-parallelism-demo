const express = require('express');
const sql = require('mssql');

const app = express();
const PORT = process.env.PORT || 3000;

// SQL Server config (uses env vars if provided, otherwise falls back to given read-only creds)
const sqlConfig = {
  user: process.env.DB_USER || 'hackathon_ro_05',
  password: process.env.DB_PASSWORD || 'B8^cNp1%',
  server: process.env.DB_HOST || 'pepsaco-db-standard.c1oqimeoszvd.eu-west-2.rds.amazonaws.com',
  database: process.env.DB_NAME || 'WideWorldImporters_Base',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: true,
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool;

// Initialize DB connection pool once at startup
async function initDb() {
  try {
    pool = await sql.connect(sqlConfig);
    console.log('Connected to SQL Server:', sqlConfig.server);
  } catch (err) {
    console.error('Failed to connect to SQL Server:', err.message);
  }
}

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from your Node.js API!');
});

// Health check for DB connectivity
app.get('/db/ping', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ ok: false, error: 'DB pool not initialized' });
    }
    const result = await pool.request().query('SELECT TOP (1) name FROM sys.tables ORDER BY name;');
    res.json({ ok: true, sampleTable: result.recordset?.[0]?.name || null });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Example: list top N customers from WideWorldImporters (read-only)
app.get('/customers', async (req, res) => {
  const top = Math.min(parseInt(req.query.top || '10', 10), 100);
  try {
    if (!pool) {
      return res.status(503).json({ ok: false, error: 'DB pool not initialized' });
    }
    const result = await pool
      .request()
      .query(`SELECT TOP (${top}) CustomerID, CustomerName FROM Sales.Customers ORDER BY CustomerID;`);
    res.json({ ok: true, count: result.recordset.length, rows: result.recordset });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  initDb();
});
