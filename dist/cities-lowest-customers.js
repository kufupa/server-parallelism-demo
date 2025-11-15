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
        console.log('Connected to database\n');
        // Get cities with customer counts, ordered by lowest first
        const result = await pool.request().query(`
      SELECT
        c.CityID,
        c.CityName,
        sp.StateProvinceName,
        sp.StateProvinceCode,
        co.CountryName,
        COUNT(DISTINCT cust.CustomerID) as CustomerCount
      FROM Application.Cities c
      LEFT JOIN Application.StateProvinces sp ON c.StateProvinceID = sp.StateProvinceID
      LEFT JOIN Application.Countries co ON sp.CountryID = co.CountryID
      LEFT JOIN Sales.Customers cust ON c.CityID = cust.DeliveryCityID OR c.CityID = cust.PostalCityID
      GROUP BY c.CityID, c.CityName, sp.StateProvinceName, sp.StateProvinceCode, co.CountryName
      ORDER BY CustomerCount ASC, c.CityName ASC
    `);
        console.log('=== CITIES WITH LOWEST CUSTOMER COUNT ===\n');
        console.log(`Total unique cities: ${result.recordset.length}\n`);
        // Count how many have 0, 1, 2, etc customers
        const countDistribution = {};
        for (const row of result.recordset) {
            const count = row.CustomerCount;
            countDistribution[count] = (countDistribution[count] || 0) + 1;
        }
        console.log('Distribution of customer counts:');
        const sortedCounts = Object.keys(countDistribution)
            .map((k) => parseInt(k, 10))
            .sort((a, b) => a - b)
            .slice(0, 20);
        for (const count of sortedCounts) {
            console.log(`  ${count} customers: ${countDistribution[count]} cities`);
        }
        console.log('\n\n=== FIRST 100 CITIES WITH LOWEST CUSTOMERS ===\n');
        console.log(`${'City'.padEnd(30)} | ${'State/Province'.padEnd(20)} | ${'Country'.padEnd(25)} | Customers`);
        console.log('-'.repeat(100));
        const recordSet = result.recordset;
        for (let i = 0; i < Math.min(100, recordSet.length); i++) {
            const row = recordSet[i];
            console.log(`${(row.CityName || 'N/A').padEnd(30)} | ${(row.StateProvinceName || 'N/A').padEnd(20)} | ${(row.CountryName || 'N/A').padEnd(25)} | ${row.CustomerCount}`);
        }
        // Get cities with exactly 0 customers
        console.log('\n\n=== CITIES WITH ZERO CUSTOMERS ===\n');
        const zeroCities = recordSet.filter((r) => r.CustomerCount === 0);
        console.log(`Total cities with 0 customers: ${zeroCities.length}\n`);
        if (zeroCities.length > 0) {
            console.log(`${'City'.padEnd(30)} | ${'State/Province'.padEnd(20)} | ${'Country'.padEnd(25)}`);
            console.log('-'.repeat(100));
            for (let i = 0; i < Math.min(50, zeroCities.length); i++) {
                const row = zeroCities[i];
                console.log(`${(row.CityName || 'N/A').padEnd(30)} | ${(row.StateProvinceName || 'N/A').padEnd(20)} | ${(row.CountryName || 'N/A').padEnd(25)}`);
            }
            if (zeroCities.length > 50) {
                console.log(`\n... and ${zeroCities.length - 50} more cities with 0 customers`);
            }
        }
        // Statistics
        console.log('\n\n=== STATISTICS ===\n');
        const customerCounts = recordSet.map((r) => r.CustomerCount);
        const avgCustomers = (customerCounts.reduce((a, b) => a + b, 0) / customerCounts.length).toFixed(2);
        const maxCustomers = Math.max(...customerCounts);
        const minCustomers = Math.min(...customerCounts);
        console.log(`Total cities: ${recordSet.length}`);
        console.log(`Average customers per city: ${avgCustomers}`);
        console.log(`Min customers: ${minCustomers}`);
        console.log(`Max customers: ${maxCustomers}`);
        console.log(`Cities with 0 customers: ${zeroCities.length}`);
        console.log(`Cities with 1+ customers: ${recordSet.length - zeroCities.length}`);
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
//# sourceMappingURL=cities-lowest-customers.js.map