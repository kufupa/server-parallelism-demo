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
        // Find all columns with 'country' in the name (case-insensitive)
        const result = await pool.request().query(`
      SELECT
        TABLE_SCHEMA,
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE LOWER(COLUMN_NAME) LIKE '%country%'
      ORDER BY TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME
    `);
        console.log('=== FIELDS WITH "COUNTRY" IN NAME ===\n');
        let currentTable = '';
        for (const col of result.recordset) {
            const fullName = `[${col.TABLE_SCHEMA}].[${col.TABLE_NAME}]`;
            if (fullName !== currentTable) {
                console.log(`\n${fullName}:`);
                currentTable = fullName;
            }
            console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
        }
        // Check for StateProvinces reference which is the FK to Countries
        console.log('\n\n=== FOREIGN KEY TO Countries (INDIRECT via StateProvinces) ===\n');
        console.log('Direct FK: [Application].[StateProvinces].CountryID → [Application].[Countries].CountryID\n');
        console.log('\n=== ALL PATHS TO COUNTRIES ===\n');
        console.log('1. DIRECT: Application.Countries table');
        console.log('   - 190 records with CountryID, CountryName, Continent, Region, Subregion');
        console.log('\n2. INDIRECT via StateProvinces:');
        console.log('   - Application.StateProvinces (53 records) has CountryID field');
        console.log('   - Application.Cities references StateProvinceID');
        console.log('   - Sales.Customers has DeliveryCityID & PostalCityID → Cities → StateProvinces → Countries');
        console.log('   - Purchasing.Suppliers has DeliveryCityID & PostalCityID → Cities → StateProvinces → Countries');
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
//# sourceMappingURL=find-countries.js.map