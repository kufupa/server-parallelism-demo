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
        console.log('\n=== HackathonMetadata Table Schema ===\n');
        const schemaResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'Application' AND TABLE_NAME = 'HackathonMetadata'
      ORDER BY ORDINAL_POSITION
    `);
        if (schemaResult.recordset.length === 0) {
            console.log('Table not found!');
        }
        else {
            console.log('Columns:');
            console.table(schemaResult.recordset);
            console.log('\n=== Row Count ===\n');
            const countResult = await pool.request().query(`
        SELECT COUNT(*) as row_count FROM [Application].[HackathonMetadata]
      `);
            const rowCount = countResult.recordset[0].row_count;
            console.log(`Total records: ${rowCount}`);
            // Try to get all records anyway
            console.log('\n=== All Records ===\n');
            const dataResult = await pool.request().query(`
        SELECT * FROM [Application].[HackathonMetadata]
      `);
            if (dataResult.recordset.length === 0) {
                console.log('(Table is empty)');
            }
            else {
                console.table(dataResult.recordset);
                console.log('\n=== JSON Format ===\n');
                console.log(JSON.stringify(dataResult.recordset, null, 2));
            }
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
//# sourceMappingURL=check-hackathon-schema.js.map