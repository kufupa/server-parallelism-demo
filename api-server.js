require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const { transformSupplier, transformCustomer, attachConnectionsToLocations } = require('./api-transform');
const { initializePool, getCustomerOrders, getCustomerProducts, getCustomerInvoices, closePool } = require('./sql-server-client');
const { parseQueryToFilters, generateProductOverview, suggestDiscountStrategy } = require('./llm-service');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// SQLite Database
const dbPath = path.join(__dirname, 'local-map-data.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// SQL Server Connection Pool (initialize when server starts)
let sqlPoolReady = false;
(async () => {
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      // Only initialize if Anthropic key is available
      // SQL Server is optional for basic functionality
      // await initializePool();
      // sqlPoolReady = true;
      console.log('✓ SQL Server initialization deferred (activate manually if needed)');
    }
  } catch (err) {
    console.warn('SQL Server pool initialization failed (optional feature):', err.message);
  }
})();

/**
 * GET /api/locations
 * Fetch all locations (suppliers + customers)
 * Query params:
 *   - type: 'supplier' | 'customer' (filter by type)
 *   - limit: number (max results, default 100 for customers)
 *   - state: string (filter by state code)
 */
app.get('/api/locations', (req, res) => {
  const { type, limit = 100, state } = req.query;
  let query = '';
  const params = [];

  if (type === 'supplier') {
    query = 'SELECT * FROM suppliers';
    if (state) {
      query += ' WHERE state = ?';
      params.push(state);
    }
    query += ' ORDER BY revenue DESC';

    db.all(query, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const locations = rows.map(transformSupplier);
      res.json({ locations, count: locations.length });
    });
  } else if (type === 'customer') {
    query = 'SELECT * FROM customers';
    if (state) {
      query += ' WHERE state = ?';
      params.push(state);
    }
    query += ' ORDER BY revenue DESC LIMIT ?';
    params.push(parseInt(limit));

    db.all(query, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const locations = rows.map(transformCustomer);
      res.json({ locations, count: locations.length });
    });
  } else {
    // Return both suppliers and customers
    db.all('SELECT * FROM suppliers ORDER BY revenue DESC', (err1, suppliers) => {
      if (err1) return res.status(500).json({ error: err1.message });

      let customerQuery = 'SELECT * FROM customers ORDER BY revenue DESC';
      if (limit) {
        customerQuery += ` LIMIT ${parseInt(limit)}`;
      }

      db.all(customerQuery, (err2, customers) => {
        if (err2) return res.status(500).json({ error: err2.message });

        const allLocations = [
          ...suppliers.map(transformSupplier),
          ...customers.map(transformCustomer)
        ];

        res.json({ locations: allLocations, count: allLocations.length });
      });
    });
  }
});

/**
 * GET /api/locations/:id
 * Fetch a single location by ID
 */
app.get('/api/locations/:id', (req, res) => {
  const { id } = req.params;

  // Try suppliers first
  db.get('SELECT * FROM suppliers WHERE id = ?', [id], (err, supplier) => {
    if (err) return res.status(500).json({ error: err.message });

    if (supplier) {
      // Get connections for this supplier
      db.all('SELECT * FROM connections WHERE from_id = ?', [id], (err2, connections) => {
        if (err2) return res.status(500).json({ error: err2.message });

        const location = transformSupplier(supplier);
        location.connections = connections.map(c => ({
          targetId: c.to_id,
          volume: parseFloat(c.volume || 0),
          products: c.product_count,
          invoices: c.transaction_count
        }));

        res.json({ location });
      });
    } else {
      // Try customers
      db.get('SELECT * FROM customers WHERE id = ?', [id], (err2, customer) => {
        if (err2) return res.status(500).json({ error: err2.message });
        if (!customer) return res.status(404).json({ error: 'Location not found' });

        // Get incoming connections for this customer
        db.all('SELECT * FROM connections WHERE to_id = ?', [id], (err3, connections) => {
          if (err3) return res.status(500).json({ error: err3.message });

          const location = transformCustomer(customer);
          location.connections = connections.map(c => ({
            sourceId: c.from_id,
            volume: parseFloat(c.volume || 0),
            products: c.product_count,
            invoices: c.transaction_count
          }));

          res.json({ location });
        });
      });
    }
  });
});

/**
 * GET /api/connections
 * Fetch connections between locations
 * Query params:
 *   - type: 'supplier_to_customer' | 'state_to_state' (filter by type)
 *   - supplierId: number (filter by supplier)
 *   - customerId: number (filter by customer)
 *   - minVolume: number (filter by minimum volume)
 *   - limit: number (max results, default 50)
 */
app.get('/api/connections', (req, res) => {
  const { type, supplierId, customerId, minVolume, limit = 50 } = req.query;

  if (type === 'state_to_state') {
    let query = 'SELECT * FROM trade_routes WHERE 1=1';
    const params = [];

    if (minVolume) {
      query += ' AND volume >= ?';
      params.push(parseFloat(minVolume));
    }

    query += ` ORDER BY volume DESC LIMIT ${parseInt(limit)}`;

    db.all(query, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ connections: rows, count: rows.length });
    });
  } else {
    // supplier_to_customer connections
    let query = 'SELECT * FROM connections WHERE 1=1';
    const params = [];

    if (supplierId) {
      query += ' AND from_id = ?';
      params.push(supplierId);
    }
    if (customerId) {
      query += ' AND to_id = ?';
      params.push(customerId);
    }
    if (minVolume) {
      query += ' AND volume >= ?';
      params.push(parseFloat(minVolume));
    }

    query += ` ORDER BY volume DESC LIMIT ${parseInt(limit)}`;

    db.all(query, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ connections: rows, count: rows.length });
    });
  }
});

/**
 * GET /api/stats
 * Overall statistics
 */
app.get('/api/stats', (req, res) => {
  db.get('SELECT COUNT(*) as totalSuppliers, SUM(revenue) as supplierRevenue FROM suppliers', (err1, supplierStats) => {
    if (err1) return res.status(500).json({ error: err1.message });

    db.get('SELECT COUNT(*) as totalCustomers, SUM(revenue) as customerRevenue FROM customers', (err2, customerStats) => {
      if (err2) return res.status(500).json({ error: err2.message });

      db.get('SELECT SUM(volume) as totalTradeVolume FROM trade_routes', (err3, tradeStats) => {
        if (err3) return res.status(500).json({ error: err3.message });

        res.json({
          stats: {
            totalSuppliers: supplierStats.totalSuppliers || 0,
            totalCustomers: customerStats.totalCustomers || 0,
            supplierRevenue: parseFloat(supplierStats.supplierRevenue || 0),
            customerRevenue: parseFloat(customerStats.customerRevenue || 0),
            totalTradeVolume: parseFloat(tradeStats.totalTradeVolume || 0),
            totalLocations: (supplierStats.totalSuppliers || 0) + (customerStats.totalCustomers || 0)
          }
        });
      });
    });
  });
});

/**
 * GET /api/supplier-exclusivity
 * Get supplier count for each customer (for connection reliability scoring)
 * Red (exclusive/1 supplier) → Green (many suppliers)
 */
app.get('/api/supplier-exclusivity', (req, res) => {
  db.all(`
    SELECT
      to_id as customer_id,
      COUNT(DISTINCT from_id) as supplier_count,
      MAX(volume) as max_volume
    FROM connections
    GROUP BY to_id
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Create a map for fast lookup
    const exclusivityMap = {};
    rows.forEach(row => {
      exclusivityMap[row.customer_id] = {
        supplierCount: row.supplier_count,
        maxVolume: row.max_volume
      };
    });

    res.json({
      exclusivity: exclusivityMap,
      count: rows.length,
      totalConnections: rows.reduce((sum, row) => sum + row.supplier_count, 0)
    });
  });
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', port: PORT });
});

// ============================================
// NEW LLM & SQL SERVER ENDPOINTS
// ============================================

/**
 * POST /api/llm/parse-query
 * Parse natural language query to extract filters
 * Body: { query: string }
 * Returns: { filters: Object }
 */
app.post('/api/llm/parse-query', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'LLM service not configured (missing ANTHROPIC_API_KEY)' });
    }

    // Get stats for context
    db.get('SELECT COUNT(*) as totalSuppliers FROM suppliers', (err1, supplierStats) => {
      if (err1) return res.status(500).json({ error: err1.message });

      db.get('SELECT COUNT(*) as totalCustomers FROM customers', (err2, customerStats) => {
        if (err2) return res.status(500).json({ error: err2.message });

        const availableData = {
          totalSuppliers: supplierStats?.totalSuppliers || 0,
          totalCustomers: customerStats?.totalCustomers || 0
        };

        parseQueryToFilters(query, availableData)
          .then(filters => res.json({ filters }))
          .catch(err => {
            console.error('LLM query parsing error:', err);
            res.status(500).json({ error: `Failed to parse query: ${err.message}` });
          });
      });
    });
  } catch (err) {
    console.error('Error in /api/llm/parse-query:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/customers/:id/orders
 * Fetch order history for a customer from SQL Server
 * Query params:
 *   - limit: number (default 50)
 * Returns: { orders: Array }
 */
app.get('/api/customers/:id/orders', async (req, res) => {
  try {
    const { id } = req.params;

    if (!sqlPoolReady && !process.env.DB_HOST) {
      // Fallback: return mock data or SQLite aggregates
      return res.json({
        orders: [],
        message: 'SQL Server not available - returning cached data',
        note: 'To enable full order history, configure SQL Server connection'
      });
    }

    // Try SQL Server first
    try {
      const orders = await getCustomerOrders(parseInt(id));
      return res.json({ orders, source: 'SQL Server' });
    } catch (sqlErr) {
      console.warn('SQL Server query failed, using fallback:', sqlErr.message);
      // Fallback to SQLite aggregates
      db.all(
        `SELECT * FROM connections WHERE to_id = ? ORDER BY volume DESC LIMIT 50`,
        [id],
        (err, connections) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({
            orders: connections.map(c => ({
              connectionId: c.from_id,
              volume: c.volume,
              products: c.product_count,
              transactions: c.transaction_count
            })),
            source: 'SQLite (cached)'
          });
        }
      );
    }
  } catch (err) {
    console.error('Error in /api/customers/:id/orders:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/customers/:id/products
 * Fetch product breakdown for a customer with profit data
 * Returns: { products: Array }
 */
app.get('/api/customers/:id/products', async (req, res) => {
  try {
    const { id } = req.params;

    if (!sqlPoolReady && !process.env.DB_HOST) {
      // Fallback
      return res.json({
        products: [],
        message: 'SQL Server not available',
        note: 'Configure ANTHROPIC_API_KEY and SQL Server connection to enable this feature'
      });
    }

    // Try SQL Server first
    try {
      const products = await getCustomerProducts(parseInt(id));
      return res.json({ products, source: 'SQL Server' });
    } catch (sqlErr) {
      console.warn('SQL Server query failed:', sqlErr.message);
      // Fallback: return empty array with message
      res.json({
        products: [],
        source: 'SQLite (limited)',
        message: 'Detailed product breakdown requires SQL Server connection'
      });
    }
  } catch (err) {
    console.error('Error in /api/customers/:id/products:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/llm/product-overview
 * Generate LLM-based product overview for a customer
 * Body: { customerId: number, customerName: string, products: Array }
 * Returns: { overview: Object }
 */
app.post('/api/llm/product-overview', async (req, res) => {
  try {
    const { customerName, products } = req.body;

    if (!customerName || !products) {
      return res.status(400).json({ error: 'customerName and products are required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'LLM service not configured' });
    }

    generateProductOverview(customerName, products)
      .then(overview => res.json({ overview }))
      .catch(err => {
        console.error('Product overview generation error:', err);
        res.status(500).json({ error: `Failed to generate overview: ${err.message}` });
      });
  } catch (err) {
    console.error('Error in /api/llm/product-overview:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/llm/discount-strategy
 * Suggest discount strategy using LLM to maximize profit
 * Body: { customerId: number, customerName: string, products: Array, currentProfit: number }
 * Returns: { suggestions: Array }
 */
app.post('/api/llm/discount-strategy', async (req, res) => {
  try {
    const { customerName, products, currentProfit = 0 } = req.body;

    if (!customerName || !products) {
      return res.status(400).json({ error: 'customerName and products are required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'LLM service not configured' });
    }

    suggestDiscountStrategy(customerName, products, currentProfit)
      .then(suggestions => res.json({ suggestions }))
      .catch(err => {
        console.error('Discount strategy error:', err);
        res.status(500).json({ error: `Failed to generate suggestions: ${err.message}` });
      });
  } catch (err) {
    console.error('Error in /api/llm/discount-strategy:', err);
    res.status(500).json({ error: err.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Supply Chain API Server running on http://localhost:${PORT}`);
  console.log('\n📍 Available endpoints:');
  console.log('\n   EXISTING ENDPOINTS:');
  console.log(`   GET /api/locations - All locations (suppliers + customers)`);
  console.log(`   GET /api/locations?type=supplier - Suppliers only`);
  console.log(`   GET /api/locations?type=customer&limit=100 - Top 100 customers`);
  console.log(`   GET /api/locations/:id - Single location`);
  console.log(`   GET /api/connections - All connections`);
  console.log(`   GET /api/connections?type=state_to_state - Trade routes`);
  console.log(`   GET /api/supplier-exclusivity - Supplier count per customer`);
  console.log(`   GET /api/stats - Overall statistics`);
  console.log(`   GET /api/health - Health check`);

  console.log('\n   NEW LLM & CUSTOMER INTELLIGENCE ENDPOINTS:');
  console.log(`   POST /api/llm/parse-query - Parse natural language to filters`);
  console.log(`   GET /api/customers/:id/orders - Customer order history`);
  console.log(`   GET /api/customers/:id/products - Product breakdown with profit`);
  console.log(`   POST /api/llm/product-overview - Generate product overview`);
  console.log(`   POST /api/llm/discount-strategy - Get discount recommendations\n`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('⚠️  ANTHROPIC_API_KEY not set - LLM features disabled');
    console.log('   Set ANTHROPIC_API_KEY in .env to enable natural language queries\n');
  }
});

process.on('SIGINT', () => {
  db.close((err) => {
    if (err) console.error('Database close error:', err);
    console.log('\n✓ Database closed');
    process.exit(0);
  });
});
