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

/**
 * Sankey: Suppliers -> StockItems -> Customers (or Customer Categories)
 * Query params:
 *  - topItems: limit of stock items by sales value (default 20, max 200)
 *  - topSuppliers: limit of suppliers by purchased qty across selected items (default 15, max 200)
 *  - topCustomers: limit of customers or categories by sales value across selected items (default 20, max 200)
 *  - outputGrouping: 'customer' | 'category' (default 'customer')
 *  - valueMetric: 'salesValue' | 'quantity' (default 'salesValue') for item->customer link values
 */
app.get('/sankey/warehouse', async (req, res) => {
  const topItems = Math.min(parseInt(req.query.topItems || '20', 10), 200);
  const topSuppliers = Math.min(parseInt(req.query.topSuppliers || '15', 10), 200);
  const topCustomers = Math.min(parseInt(req.query.topCustomers || '20', 10), 200);
  const outputGrouping = (req.query.outputGrouping || 'customer').toLowerCase() === 'category' ? 'category' : 'customer';
  const valueMetric = (req.query.valueMetric || 'salesValue').toLowerCase() === 'quantity' ? 'quantity' : 'salesValue';

  try {
    if (!pool) {
      return res.status(503).json({ ok: false, error: 'DB pool not initialized' });
    }

    const reqTop = pool.request();
    reqTop.input('topItems', sql.Int, topItems);

    // Top stock items by sales value (across all time)
    const topItemsQuery = `
      SELECT TOP (@topItems)
        li.StockItemID,
        si.StockItemName,
        si.ColorID,
        SUM(li.ExtendedPrice) AS salesValue,
        SUM(li.Quantity) AS quantity
      FROM Sales.InvoiceLines li
      JOIN Warehouse.StockItems si ON li.StockItemID = si.StockItemID
      GROUP BY li.StockItemID, si.StockItemName, si.ColorID
      ORDER BY salesValue DESC;
    `;
    const topItemsResult = await reqTop.query(topItemsQuery);
    const topItemsRows = topItemsResult.recordset;

    if (!topItemsRows.length) {
      return res.json({ ok: true, nodes: [], links: [], meta: { topItems, topSuppliers, topCustomers, outputGrouping, valueMetric } });
    }

    const itemIds = topItemsRows.map(r => parseInt(r.StockItemID, 10)).filter(Number.isFinite);
    const itemIdList = itemIds.join(',');

    // Purchasing flows: Supplier -> StockItem by received outers (fallback to ordered outers)
    const purchasingQuery = `
      SELECT
        pol.StockItemID,
        s.SupplierID,
        s.SupplierName,
        SUM(COALESCE(pol.ReceivedOuters, pol.OrderedOuters)) AS qty
      FROM Purchasing.PurchaseOrderLines pol
      JOIN Purchasing.PurchaseOrders po ON pol.PurchaseOrderID = po.PurchaseOrderID
      JOIN Purchasing.Suppliers s ON po.SupplierID = s.SupplierID
      WHERE pol.StockItemID IN (${itemIdList})
      GROUP BY pol.StockItemID, s.SupplierID, s.SupplierName;
    `;
    const purchasingResult = await pool.request().query(purchasingQuery);

    // Sales flows: StockItem -> Customer or Category
    const salesQuery =
      outputGrouping === 'category'
        ? `
      SELECT
        li.StockItemID,
        c.CustomerCategoryID AS GroupID,
        cc.CustomerCategoryName AS GroupName,
        SUM(li.ExtendedPrice) AS salesValue,
        SUM(li.Quantity) AS quantity
      FROM Sales.InvoiceLines li
      JOIN Sales.Invoices i ON li.InvoiceID = i.InvoiceID
      JOIN Sales.Customers c ON i.CustomerID = c.CustomerID
      JOIN Sales.CustomerCategories cc ON c.CustomerCategoryID = cc.CustomerCategoryID
      WHERE li.StockItemID IN (${itemIdList})
      GROUP BY li.StockItemID, c.CustomerCategoryID, cc.CustomerCategoryName;
    `
        : `
      SELECT
        li.StockItemID,
        c.CustomerID AS GroupID,
        c.CustomerName AS GroupName,
        SUM(li.ExtendedPrice) AS salesValue,
        SUM(li.Quantity) AS quantity
      FROM Sales.InvoiceLines li
      JOIN Sales.Invoices i ON li.InvoiceID = i.InvoiceID
      JOIN Sales.Customers c ON i.CustomerID = c.CustomerID
      WHERE li.StockItemID IN (${itemIdList})
      GROUP BY li.StockItemID, c.CustomerID, c.CustomerName;
    `;
    const salesResult = await pool.request().query(salesQuery);

    // Reduce suppliers to top N by total qty
    const supplierAgg = {};
    for (const r of purchasingResult.recordset) {
      const sid = parseInt(r.SupplierID, 10);
      if (!Number.isFinite(sid)) continue;
      supplierAgg[sid] = (supplierAgg[sid] || 0) + (Number(r.qty) || 0);
    }
    const topSupplierIds = Object.entries(supplierAgg)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topSuppliers)
      .map(([sid]) => parseInt(sid, 10));

    // Reduce outputs to top N groups by selected metric
    const outputAgg = {};
    for (const r of salesResult.recordset) {
      const gid = parseInt(r.GroupID, 10);
      if (!Number.isFinite(gid)) continue;
      const val = valueMetric === 'quantity' ? Number(r.quantity) || 0 : Number(r.salesValue) || 0;
      outputAgg[gid] = (outputAgg[gid] || 0) + val;
    }
    const topOutputIds = Object.entries(outputAgg)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topCustomers)
      .map(([gid]) => parseInt(gid, 10));

    // Build nodes
    const nodes = [];
    const nodeIndex = new Map();

    const palette = [
      '#3366CC', '#DC3912', '#FF9900', '#109618', '#990099',
      '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395',
      '#994499', '#22AA99', '#AAAA11', '#6633CC', '#E67300',
      '#8B0707', '#651067', '#329262', '#5574A6', '#3B3EAC'
    ];
    const pickColor = (id) => palette[Math.abs(id) % palette.length];

    const addNode = (id, label, group, color) => {
      if (nodeIndex.has(id)) return;
      nodeIndex.set(id, nodes.length);
      nodes.push({ id, label, group, color });
    };

    addNode('Purchasing', 'Purchasing', 'inputs', '#2E7D32');
    addNode('Warehouse', 'Warehouse', 'warehouse', '#0D47A1');
    addNode('Sales', 'Sales', 'outputs', '#C62828');

    // Stock items as the hub
    for (const r of topItemsRows) {
      const id = `item:${r.StockItemID}`;
      addNode(id, r.StockItemName, 'warehouse', pickColor(parseInt(r.StockItemID, 10)));
    }

    // Suppliers (top only + aggregated 'Other Suppliers')
    const supplierNames = {};
    for (const r of purchasingResult.recordset) {
      const sid = parseInt(r.SupplierID, 10);
      supplierNames[sid] = r.SupplierName;
    }
    for (const sid of topSupplierIds) {
      addNode(`supplier:${sid}`, supplierNames[sid] || `Supplier ${sid}`, 'inputs', '#6A1B9A');
    }
    addNode('supplier:other', 'Other Suppliers', 'inputs', '#9E9E9E');

    // Outputs (customers or categories)
    const outputNames = {};
    for (const r of salesResult.recordset) {
      const gid = parseInt(r.GroupID, 10);
      outputNames[gid] = r.GroupName;
    }
    for (const gid of topOutputIds) {
      const label = outputNames[gid] || (outputGrouping === 'category' ? `Category ${gid}` : `Customer ${gid}`);
      addNode(`${outputGrouping}:${gid}`, label, 'outputs', '#F57C00');
    }
    addNode(`${outputGrouping}:other`, `Other ${outputGrouping === 'category' ? 'Categories' : 'Customers'}`, 'outputs', '#BDBDBD');

    // Build links
    const links = [];

    const pushLink = (source, target, value, label) => {
      if (!value || value <= 0) return;
      links.push({ source, target, value, label });
    };

    // Purchasing -> Supplier links
    for (const sid of topSupplierIds) {
      pushLink('Purchasing', `supplier:${sid}`, supplierAgg[sid], 'Purchases');
    }
    const otherSupplierTotal = Object.entries(supplierAgg)
      .filter(([sid]) => !topSupplierIds.includes(parseInt(sid, 10)))
      .reduce((acc, [, v]) => acc + v, 0);
    pushLink('Purchasing', 'supplier:other', otherSupplierTotal, 'Purchases');

    // Supplier -> StockItem
    for (const r of purchasingResult.recordset) {
      const sid = parseInt(r.SupplierID, 10);
      const iid = parseInt(r.StockItemID, 10);
      const itemNode = `item:${iid}`;
      const supplierNode = topSupplierIds.includes(sid) ? `supplier:${sid}` : 'supplier:other';
      if (nodeIndex.has(itemNode)) {
        pushLink(supplierNode, itemNode, Number(r.qty) || 0, 'Supply Qty');
      }
    }

    // StockItem -> Sales group (customers/categories)
    const topSet = new Set(topOutputIds);
    const totalsOther = {};

    for (const r of salesResult.recordset) {
      const iid = parseInt(r.StockItemID, 10);
      const itemNode = `item:${iid}`;
      if (!nodeIndex.has(itemNode)) continue;

      const gid = parseInt(r.GroupID, 10);
      const val = valueMetric === 'quantity' ? Number(r.quantity) || 0 : Number(r.salesValue) || 0;

      if (topSet.has(gid)) {
        const outputNode = `${outputGrouping}:${gid}`;
        pushLink(itemNode, outputNode, val, valueMetric);
      } else {
        totalsOther[itemNode] = (totalsOther[itemNode] || 0) + val;
      }
    }

    for (const [itemNode, v] of Object.entries(totalsOther)) {
      pushLink(itemNode, `${outputGrouping}:other`, v, valueMetric);
    }

    // Optional: Warehouse aggregator to item (for visual grouping, weight by total)]
    const itemTotals = {};
    for (const l of links) {
      if (l.target.startsWith('item:')) {
        itemTotals[l.target] = (itemTotals[l.target] || 0) + l.value;
      }
    }
    for (const [itemNode, v] of Object.entries(itemTotals)) {
      pushLink('Warehouse', itemNode, v, 'Inventory In');
    }

    res.json({
      ok: true,
      nodes,
      links,
      meta: {
        topItems,
        topSuppliers,
        topCustomers,
        outputGrouping,
        valueMetric,
        itemCount: topItemsRows.length,
        supplierCount: topSupplierIds.length,
        outputCount: topOutputIds.length
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  initDb();
});
