import * as sql from 'mssql';
import dotenv from 'dotenv';
import { getDefaultSqlConfig, connectToDatabase, closeConnection } from './utils/db';

dotenv.config();

interface TopSalesItem {
  StockItemID: number;
  StockItemName: string;
  Brand: string;
  Size: string;
  TotalQuantitySold: number;
  TotalSalesValue: number;
  NumberOfOrders: number;
  CurrentUnitPrice: number;
  SupplierID: number;
}

interface TopPurchaseItem {
  StockItemID: number;
  StockItemName: string;
  Brand: string;
  Size: string;
  TotalOutersOrdered: number;
  NumberOfPurchaseOrders: number;
  UnitPrice: number;
  AvgOutersPerOrder: number;
}

interface Brand {
  Brand: string;
  NumberOfProducts: number;
  NumberOfSuppliers: number;
  AvgUnitPrice: number;
  MinPrice: number;
  MaxPrice: number;
}

interface InventoryStats {
  TotalProducts: number;
  TotalUnitsInStock: number;
  AvgProductPrice: number;
  CheapestProduct: number;
  MostExpensiveProduct: number;
  TotalInventoryValue: number;
}

interface Product {
  StockItemID: number;
  StockItemName: string;
  Brand: string;
  Size: string;
  UnitPrice: number;
  IsChillerStock: boolean;
}

interface OrderSummary {
  TotalOrders: number;
  UniqueCustomers: number;
  TotalItemsSold: number;
  TotalSalesValue: number;
}

(async (): Promise<void> => {
  let pool: sql.ConnectionPool | null = null;

  try {
    const sqlConfig = getDefaultSqlConfig();
    pool = await connectToDatabase(sqlConfig);
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

    console.table((salesResult.recordset as unknown[]) as TopSalesItem[]);

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

    console.table((purchaseResult.recordset as unknown[]) as TopPurchaseItem[]);

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

    console.table((brandResult.recordset as unknown[]) as Brand[]);

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

    console.table((statsResult.recordset as unknown[]) as InventoryStats[]);

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

    console.table((sampleResult.recordset as unknown[]) as Product[]);

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

    console.table((chemicalResult.recordset as unknown[]) as Product[]);

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

    console.table((orderSummary.recordset as unknown[]) as OrderSummary[]);

    if (pool) {
      await closeConnection(pool);
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('Error:', error);
    process.exit(1);
  }
})();
