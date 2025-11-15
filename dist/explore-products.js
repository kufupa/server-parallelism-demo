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
        // Get top selling items by quantity
        console.log('=== TOP SELLING ITEMS (by quantity sold) ===\n');
        const salesResult = await pool.request().query(`
      SELECT TOP 20
        si.StockItemID,
        si.StockItemName,
        si.Brand,
        si.Size,
        SUM(ol.Quantity) as TotalQuantitySold,
        SUM(ol.Quantity * ol.UnitPrice) as TotalSalesValue,
        COUNT(DISTINCT ol.OrderID) as NumberOfOrders,
        si.UnitPrice as CurrentUnitPrice,
        si.SupplierID
      FROM Warehouse.StockItems si
      LEFT JOIN Sales.OrderLines ol ON si.StockItemID = ol.StockItemID
      GROUP BY si.StockItemID, si.StockItemName, si.Brand, si.Size, si.UnitPrice, si.SupplierID
      ORDER BY TotalQuantitySold DESC
    `);
        console.table(salesResult.recordset);
        // Get top purchased items
        console.log('\n\n=== TOP PURCHASED ITEMS (by quantity purchased) ===\n');
        const purchaseResult = await pool.request().query(`
      SELECT TOP 20
        si.StockItemID,
        si.StockItemName,
        si.Brand,
        si.Size,
        SUM(pol.OrderedOuters) as TotalOutersOrdered,
        COUNT(DISTINCT pol.PurchaseOrderID) as NumberOfPurchaseOrders,
        si.UnitPrice,
        AVG(pol.OrderedOuters) as AvgOutersPerOrder
      FROM Warehouse.StockItems si
      LEFT JOIN Purchasing.PurchaseOrderLines pol ON si.StockItemID = pol.StockItemID
      GROUP BY si.StockItemID, si.StockItemName, si.Brand, si.Size, si.UnitPrice
      HAVING COUNT(DISTINCT pol.PurchaseOrderID) > 0
      ORDER BY SUM(pol.OrderedOuters) DESC
    `);
        console.table(purchaseResult.recordset);
        // Product categories/brands analysis
        console.log('\n\n=== PRODUCT CATEGORIES (by brand) ===\n');
        const brandResult = await pool.request().query(`
      SELECT TOP 30
        Brand,
        COUNT(DISTINCT StockItemID) as NumberOfProducts,
        COUNT(DISTINCT SupplierID) as NumberOfSuppliers,
        AVG(UnitPrice) as AvgUnitPrice,
        MIN(UnitPrice) as MinPrice,
        MAX(UnitPrice) as MaxPrice
      FROM Warehouse.StockItems
      WHERE StockItemID IN (SELECT DISTINCT StockItemID FROM Sales.OrderLines)
      GROUP BY Brand
      ORDER BY COUNT(DISTINCT StockItemID) DESC
    `);
        console.table(brandResult.recordset);
        // Overall inventory stats
        console.log('\n\n=== OVERALL INVENTORY STATISTICS ===\n');
        const statsResult = await pool.request().query(`
      SELECT
        COUNT(*) as TotalProducts,
        SUM(CAST(sih.QuantityOnHand AS BIGINT)) as TotalUnitsInStock,
        AVG(UnitPrice) as AvgProductPrice,
        MIN(UnitPrice) as CheapestProduct,
        MAX(UnitPrice) as MostExpensiveProduct,
        SUM(CAST(sih.QuantityOnHand AS BIGINT) * si.UnitPrice) as TotalInventoryValue
      FROM Warehouse.StockItems si
      LEFT JOIN Warehouse.StockItemHoldings sih ON si.StockItemID = sih.StockItemID
    `);
        console.table(statsResult.recordset);
        // Sample of actual items being sold
        console.log('\n\n=== SAMPLE OF PRODUCTS (50 Items) ===\n');
        const sampleResult = await pool.request().query(`
      SELECT TOP 50
        StockItemID,
        StockItemName,
        Brand,
        Size,
        UnitPrice,
        IsChillerStock
      FROM Warehouse.StockItems si
      ORDER BY StockItemID
    `);
        console.table(sampleResult.recordset);
        // Chemical/compound focus
        console.log('\n\n=== PRODUCT TYPES/CHEMICALS IN INVENTORY ===\n');
        const chemicalResult = await pool.request().query(`
      SELECT DISTINCT
        StockItemName,
        Brand,
        Size,
        UnitPrice,
        IsChillerStock
      FROM Warehouse.StockItems
      WHERE StockItemName LIKE '%Alpha' OR StockItemName LIKE '%Beta' OR IsChillerStock = 1
      ORDER BY StockItemName
      OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY
    `);
        console.table(chemicalResult.recordset);
        // Summary by order type
        console.log('\n\n=== SALES SUMMARY ===\n');
        const orderSummary = await pool.request().query(`
      SELECT
        COUNT(DISTINCT o.OrderID) as TotalOrders,
        COUNT(DISTINCT c.CustomerID) as UniqueCustomers,
        SUM(ol.Quantity) as TotalItemsSold,
        SUM(ol.Quantity * ol.UnitPrice) as TotalSalesValue
      FROM Sales.Orders o
      JOIN Sales.OrderLines ol ON o.OrderID = ol.OrderID
      JOIN Sales.Customers c ON o.CustomerID = c.CustomerID
    `);
        console.table(orderSummary.recordset);
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
//# sourceMappingURL=explore-products.js.map