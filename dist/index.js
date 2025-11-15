"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./utils/db");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
let pool = null;
// Initialize DB connection pool once at startup
const initDb = async () => {
    try {
        const sqlConfig = (0, db_1.getDefaultPoolConfig)();
        pool = await (0, db_1.connectToDatabase)(sqlConfig);
    }
    catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error('Failed to initialize database pool:', error);
        process.exit(1);
    }
};
app.use(express_1.default.json());
app.get('/', (_req, res) => {
    res.send({ message: 'Hello from your Node.js API!' });
});
// Health check for DB connectivity
app.get('/db/ping', async (_req, res) => {
    try {
        if (!pool) {
            res.status(503).json({ ok: false, error: 'DB pool not initialized' });
            return;
        }
        const result = await pool.request().query('SELECT TOP (1) name FROM sys.tables ORDER BY name;');
        res.json({ ok: true, sampleTable: result.recordset?.[0]?.name || null });
    }
    catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        res.status(500).json({ ok: false, error });
    }
});
// Example: list top N customers from WideWorldImporters (read-only)
app.get('/customers', async (req, res) => {
    const topParam = req.query.top;
    const top = Math.min(parseInt(topParam || '10', 10), 100);
    try {
        if (!pool) {
            res.status(503).json({ ok: false, error: 'DB pool not initialized' });
            return;
        }
        const result = await pool
            .request()
            .query(`SELECT TOP (${top}) CustomerID, CustomerName FROM Sales.Customers ORDER BY CustomerID;`);
        res.json({ ok: true, count: result.recordset.length, rows: result.recordset });
    }
    catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        res.status(500).json({ ok: false, error });
    }
});
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    initDb();
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(async () => {
        if (pool) {
            await (0, db_1.closeConnection)(pool);
        }
        process.exit(0);
    });
});
//# sourceMappingURL=index.js.map