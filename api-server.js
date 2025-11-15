const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const { transformSupplier, transformCustomer, attachConnectionsToLocations } = require('./api-transform');

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
  console.log('Connected to SQLite database\n');
});

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

        const location = transformCustomer(customer);
        res.json({ location });
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
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', port: PORT });
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
  console.log(`   GET /api/locations - All locations (suppliers + customers)`);
  console.log(`   GET /api/locations?type=supplier - Suppliers only`);
  console.log(`   GET /api/locations?type=customer&limit=100 - Top 100 customers`);
  console.log(`   GET /api/locations/:id - Single location`);
  console.log(`   GET /api/connections - All connections`);
  console.log(`   GET /api/connections?type=state_to_state - Trade routes`);
  console.log(`   GET /api/stats - Overall statistics`);
  console.log(`   GET /api/health - Health check\n`);
});

process.on('SIGINT', () => {
  db.close((err) => {
    if (err) console.error('Database close error:', err);
    console.log('\n✓ Database closed');
    process.exit(0);
  });
});
