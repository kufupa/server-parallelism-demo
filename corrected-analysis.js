const sql = require('mssql');
require('dotenv').config();

const sqlConfig = {
  user: process.env.DB_USER || 'hackathon_ro_05',
  password: process.env.DB_PASSWORD || 'B8^cNp1%',
  server: process.env.DB_HOST || 'pepsaco-db-standard.c1oqimeoszvd.eu-west-2.rds.amazonaws.com',
  database: process.env.DB_NAME || 'WideWorldImporters_Base',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

(async () => {
  try {
    const pool = await sql.connect(sqlConfig);
    console.log('✓ Connected to database\n');

    console.log('═══════════════════════════════════════════════════════════════════════════════════');
    console.log('⚠️  DATA CORRECTION & CLARIFICATION');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    console.log('IMPORTANT FINDING:');
    console.log('─────────────────────────────────────────────────────────────────────────────────\n');
    console.log('1. THE DATABASE HAS NO "COST" FIELD');
    console.log('   - StockItems.UnitPrice = Current standard selling price (NOT cost)');
    console.log('   - OrderLines.UnitPrice = What customer actually paid for this order\n');

    console.log('2. PRICE VARIANCE ANALYSIS:');
    console.log('   - 231,699 order lines: Sold at STANDARD PRICE (0% discount)');
    console.log('   - 530 order lines: Sold at DISCOUNT (below standard price)\n');

    console.log('3. WHEN DISCOUNTS OCCUR - Examples of discounted items:\n');

    const discountedItemsResult = await pool.request().query(`
      SELECT
        si.StockItemName,
        ol.UnitPrice as DiscountedPrice,
        si.UnitPrice as StandardPrice,
        CAST((ol.UnitPrice - si.UnitPrice) / si.UnitPrice * 100 AS DECIMAL(5,2)) as DiscountPercent,
        COUNT(*) as TimesDiscounted,
        SUM(ol.Quantity) as TotalQtyAtDiscount
      FROM Sales.OrderLines ol
      JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
      WHERE ol.UnitPrice <> si.UnitPrice
      GROUP BY si.StockItemName, ol.UnitPrice, si.UnitPrice
      ORDER BY CAST((ol.UnitPrice - si.UnitPrice) / si.UnitPrice * 100 AS DECIMAL(5,2))
    `);

    console.table(discountedItemsResult.recordset.slice(0, 15));

    console.log('\n\n═══════════════════════════════════════════════════════════════════════════════════');
    console.log('CORRECTED TOP 5 CUSTOMERS ANALYSIS');
    console.log('(Using Price Variance, not actual profit since cost data is unavailable)');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    // Get top 5 customers by revenue again
    const topCustomersResult = await pool.request().query(`
      SELECT TOP 5
        c.CustomerID,
        c.CustomerName,
        COUNT(DISTINCT o.OrderID) as TotalOrders,
        SUM(ol.Quantity) as TotalUnitsOrdered,
        SUM(ol.Quantity * ol.UnitPrice) as TotalRevenue
      FROM Sales.Customers c
      JOIN Sales.Orders o ON c.CustomerID = o.CustomerID
      JOIN Sales.OrderLines ol ON o.OrderID = ol.OrderID
      GROUP BY c.CustomerID, c.CustomerName
      ORDER BY TotalRevenue DESC
    `);

    const topCustomers = topCustomersResult.recordset;

    // For each top customer, analyze pricing strategy
    for (let i = 0; i < topCustomers.length; i++) {
      const customer = topCustomers[i];

      console.log(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
      console.log(`║ CUSTOMER #${i + 1}: ${customer.CustomerName.padEnd(69)} ║`);
      console.log(`╚══════════════════════════════════════════════════════════════════════════════╝`);

      // Get pricing details
      const pricingResult = await pool.request().query(`
        SELECT
          COUNT(*) as TotalLineItems,
          SUM(CASE WHEN ol.UnitPrice = si.UnitPrice THEN 1 ELSE 0 END) as AtStandardPrice,
          SUM(CASE WHEN ol.UnitPrice < si.UnitPrice THEN 1 ELSE 0 END) as Discounted,
          SUM(CASE WHEN ol.UnitPrice > si.UnitPrice THEN 1 ELSE 0 END) as Premium,
          SUM(ol.Quantity * ol.UnitPrice) as TotalActualRevenue,
          SUM(ol.Quantity * si.UnitPrice) as RevenueAtStandardPrice,
          SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * si.UnitPrice) as RevenueVariance,
          CAST((SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * si.UnitPrice)) / SUM(ol.Quantity * ol.UnitPrice) * 100 AS DECIMAL(5,2)) as VariancePercent
        FROM Sales.OrderLines ol
        JOIN Sales.Orders o ON ol.OrderID = o.OrderID
        JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
        WHERE o.CustomerID = ${customer.CustomerID}
      `);

      const pricing = pricingResult.recordset[0];

      console.log('\nPRICING STRATEGY FOR THIS CUSTOMER:');
      console.log(`  Total Line Items: ${pricing.TotalLineItems}`);
      console.log(`  - At Standard Price: ${pricing.AtStandardPrice} items (${(pricing.AtStandardPrice/pricing.TotalLineItems*100).toFixed(1)}%)`);
      console.log(`  - Discounted: ${pricing.Discounted} items (${(pricing.Discounted/pricing.TotalLineItems*100).toFixed(1)}%)`);
      console.log(`  - Premium Priced: ${pricing.Premium} items (${(pricing.Premium/pricing.TotalLineItems*100).toFixed(1)}%)`);

      console.log(`\nREVENUE IMPACT:`);
      console.log(`  Actual Revenue (what they paid): $${pricing.TotalActualRevenue.toFixed(2)}`);
      console.log(`  Standard Price Revenue: $${pricing.RevenueAtStandardPrice.toFixed(2)}`);
      console.log(`  Revenue Variance: $${pricing.RevenueVariance.toFixed(2)}`);
      console.log(`  Variance %: ${pricing.VariancePercent}%`);

      if (pricing.Discounted > 0) {
        console.log(`\n  ⚠️  This customer received ${pricing.Discounted} discounted items!`);

        // Show what they got discounted
        const discountsResult = await pool.request().query(`
          SELECT TOP 5
            si.StockItemName,
            ol.UnitPrice as DiscountedPrice,
            si.UnitPrice as NormalPrice,
            CAST((ol.UnitPrice - si.UnitPrice) / si.UnitPrice * 100 AS DECIMAL(5,2)) as DiscountPercent,
            SUM(ol.Quantity) as Qty,
            SUM(ol.Quantity * (ol.UnitPrice - si.UnitPrice)) as ValueDifference
          FROM Sales.OrderLines ol
          JOIN Sales.Orders o ON ol.OrderID = o.OrderID
          JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
          WHERE o.CustomerID = ${customer.CustomerID} AND ol.UnitPrice < si.UnitPrice
          GROUP BY si.StockItemName, ol.UnitPrice, si.UnitPrice
          ORDER BY (ol.UnitPrice - si.UnitPrice)
        `);

        console.log('\n  Discounted Items for This Customer:');
        discountsResult.recordset.forEach((item, idx) => {
          console.log(`    ${idx + 1}. ${item.StockItemName}: ${item.Qty} units @ $${item.DiscountedPrice.toFixed(2)} (normal $${item.NormalPrice.toFixed(2)}, ${item.DiscountPercent}%)`);
        });
      }

      // Top 10 products by revenue
      const topProductsResult = await pool.request().query(`
        SELECT TOP 10
          si.StockItemName,
          SUM(ol.Quantity) as TotalQty,
          ol.UnitPrice as ActualPrice,
          si.UnitPrice as StandardPrice,
          SUM(ol.Quantity * ol.UnitPrice) as ActualRevenue,
          SUM(ol.Quantity * si.UnitPrice) as StandardRevenue,
          CASE
            WHEN ol.UnitPrice = si.UnitPrice THEN 'STANDARD'
            WHEN ol.UnitPrice > si.UnitPrice THEN 'PREMIUM'
            ELSE 'DISCOUNTED'
          END as PricingType
        FROM Sales.OrderLines ol
        JOIN Sales.Orders o ON ol.OrderID = o.OrderID
        JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
        WHERE o.CustomerID = ${customer.CustomerID}
        GROUP BY si.StockItemName, ol.UnitPrice, si.UnitPrice
        ORDER BY SUM(ol.Quantity * ol.UnitPrice) DESC
      `);

      console.log('\nTOP 10 PRODUCTS BY REVENUE:\n');
      console.log('┌────┬──────────────────────────────────┬──────┬──────────┬──────────┬─────────────┬───────────────┐');
      console.log('│ Rk │ Product Name                     │  Qty │ Price $  │ Std $ │ Actual Rev  │ Type          │');
      console.log('├────┼──────────────────────────────────┼──────┼──────────┼──────────┼─────────────┼───────────────┤');

      topProductsResult.recordset.forEach((product, idx) => {
        const rank = (idx + 1).toString().padEnd(2);
        const name = product.StockItemName.substring(0, 32).padEnd(32);
        const qty = product.TotalQty.toString().padEnd(4);
        const price = product.ActualPrice.toFixed(2).padStart(8);
        const stdPrice = product.StandardPrice.toFixed(2).padStart(8);
        const revenue = product.ActualRevenue.toFixed(2).padStart(11);
        const type = product.PricingType.padEnd(13);

        console.log(`│ ${rank} │ ${name} │ ${qty} │ ${price} │ ${stdPrice} │ ${revenue} │ ${type} │`);
      });

      console.log('└────┴──────────────────────────────────┴──────┴──────────┴──────────┴─────────────┴───────────────┘');
    }

    // Overall summary
    console.log('\n\n═══════════════════════════════════════════════════════════════════════════════════');
    console.log('MARKET-WIDE PRICING STRATEGY');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    const marketPricingResult = await pool.request().query(`
      SELECT
        COUNT(*) as TotalLineItems,
        COUNT(CASE WHEN ol.UnitPrice = si.UnitPrice THEN 1 END) as StandardPrice,
        COUNT(CASE WHEN ol.UnitPrice < si.UnitPrice THEN 1 END) as Discounted,
        COUNT(CASE WHEN ol.UnitPrice > si.UnitPrice THEN 1 END) as Premium,
        CAST(COUNT(CASE WHEN ol.UnitPrice = si.UnitPrice THEN 1 END) / CAST(COUNT(*) AS FLOAT) * 100 AS DECIMAL(5,2)) as StandardPricePercent,
        CAST(COUNT(CASE WHEN ol.UnitPrice < si.UnitPrice THEN 1 END) / CAST(COUNT(*) AS FLOAT) * 100 AS DECIMAL(5,2)) as DiscountedPercent,
        CAST(COUNT(CASE WHEN ol.UnitPrice > si.UnitPrice THEN 1 END) / CAST(COUNT(*) AS FLOAT) * 100 AS DECIMAL(5,2)) as PremiumPercent,
        SUM(ol.Quantity * ol.UnitPrice) as TotalActualRevenue,
        SUM(ol.Quantity * si.UnitPrice) as TotalStandardRevenue,
        SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * si.UnitPrice) as TotalVariance
      FROM Sales.OrderLines ol
      JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
    `);

    const marketPricing = marketPricingResult.recordset[0];

    console.log(`Total Order Lines: ${marketPricing.TotalLineItems}`);
    console.log(`\nPRICING BREAKDOWN:`);
    console.log(`  At Standard Price: ${marketPricing.StandardPrice} items (${marketPricing.StandardPricePercent}%)`);
    console.log(`  Discounted: ${marketPricing.Discounted} items (${marketPricing.DiscountedPercent}%)`);
    console.log(`  Premium Priced: ${marketPricing.Premium} items (${marketPricing.PremiumPercent}%)`);

    console.log(`\nREVENUE:`);
    console.log(`  Actual Revenue Received: $${marketPricing.TotalActualRevenue.toFixed(2)}`);
    console.log(`  If All Sold at Standard Price: $${marketPricing.TotalStandardRevenue.toFixed(2)}`);
    console.log(`  Variance: $${marketPricing.TotalVariance.toFixed(2)}`);

    console.log(`\n📊 CONCLUSION:`);
    console.log(`────────────────────────────────────────────────────────────────────────────────────`);
    console.log(`The database shows PRICING STRATEGY but NOT actual profit/cost.`);
    console.log(`- StockItems.UnitPrice = Standard selling price (not cost)\n- OrderLines.UnitPrice = What customer actually paid\n- Most customers pay standard price (99.77%)\n- Small percentage receive discounts (0.23%)`);

    pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
