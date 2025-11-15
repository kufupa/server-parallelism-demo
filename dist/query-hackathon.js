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
        console.log('\n');
        // Query HackathonMetadata table
        const result = await pool.request().query(`
      SELECT * FROM [Application].[HackathonMetadata]
    `);
        console.log('=== HackathonMetadata Table Contents ===\n');
        if (result.recordset.length === 0) {
            console.log('(No records found)');
        }
        else {
            // Display as formatted table
            console.table(result.recordset);
            // Also display as JSON for clarity
            console.log('\n=== JSON Format ===\n');
            console.log(JSON.stringify(result.recordset, null, 2));
        }
        console.log(`\nTotal records: ${result.recordset.length}`);
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
//# sourceMappingURL=query-hackathon.js.map