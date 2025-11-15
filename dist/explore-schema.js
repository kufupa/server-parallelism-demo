"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./utils/db");
dotenv_1.default.config();
(async () => {
    let pool = null;
    try {
        const sqlConfig = (0, db_1.getDefaultSqlConfig)();
        pool = await (0, db_1.connectToDatabase)(sqlConfig);
        // Get all schemas and tables
        const tablesResult = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);
        console.log('=== DATABASE SCHEMA ===\n');
        for (const table of tablesResult.recordset) {
            const { TABLE_SCHEMA, TABLE_NAME } = table;
            console.log(`\n[${TABLE_SCHEMA}].[${TABLE_NAME}]`);
            console.log('-'.repeat(50));
            // Get columns for each table
            const columnsResult = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = '${TABLE_SCHEMA}' AND TABLE_NAME = '${TABLE_NAME}'
        ORDER BY ORDINAL_POSITION
      `);
            for (const col of columnsResult.recordset) {
                const nullable = col.IS_NULLABLE === 'YES' ? '(nullable)' : '(NOT NULL)';
                console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${nullable}`);
            }
            // Get row count
            const countResult = await pool.request().query(`
        SELECT COUNT(*) as row_count FROM [${TABLE_SCHEMA}].[${TABLE_NAME}]
      `);
            const rowCount = countResult.recordset[0].row_count;
            console.log(`  → ${rowCount} rows`);
        }
        if (pool) {
            await (0, db_1.closeConnection)(pool);
        }
    }
    catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error('Error:', error);
        process.exit(1);
    }
})();
//# sourceMappingURL=explore-schema.js.map