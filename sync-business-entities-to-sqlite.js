const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'local-map-data.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database\n');
});

db.serialize(() => {
  // ===== 1. CREATE SUPPLIERS TABLE =====
  console.log('Creating suppliers table...');
  db.run(`
    DROP TABLE IF EXISTS suppliers
  `, () => {
    db.run(`
      CREATE TABLE suppliers (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        city TEXT,
        state TEXT,
        state_name TEXT,
        country TEXT,
        latitude REAL,
        longitude REAL,
        revenue REAL,
        customers_served INTEGER,
        product_count INTEGER,
        transaction_count INTEGER,
        market_share REAL,
        marker_type TEXT,
        marker_size TEXT,
        marker_color TEXT,
        opacity REAL
      )
    `, (err) => {
      if (err) console.error('Error creating suppliers table:', err);
      else console.log('  ✓ suppliers table created');
    });
  });

  // ===== 2. CREATE CUSTOMERS TABLE =====
  console.log('Creating customers table...');
  db.run(`
    DROP TABLE IF EXISTS customers
  `, () => {
    db.run(`
      CREATE TABLE customers (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        city TEXT,
        state TEXT,
        state_name TEXT,
        country TEXT,
        latitude REAL,
        longitude REAL,
        revenue REAL,
        profit REAL,
        cost REAL,
        profit_margin REAL,
        invoice_count INTEGER,
        products_ordered INTEGER,
        marker_type TEXT,
        marker_size TEXT,
        marker_color TEXT,
        opacity REAL
      )
    `, (err) => {
      if (err) console.error('Error creating customers table:', err);
      else console.log('  ✓ customers table created');
    });
  });

  // ===== 3. CREATE CONNECTIONS TABLE =====
  console.log('Creating connections table...');
  db.run(`
    DROP TABLE IF EXISTS connections
  `, () => {
    db.run(`
      CREATE TABLE connections (
        id TEXT PRIMARY KEY,
        type TEXT,
        from_id INTEGER,
        from_type TEXT,
        from_name TEXT,
        from_city TEXT,
        from_state TEXT,
        from_latitude REAL,
        from_longitude REAL,
        to_id INTEGER,
        to_type TEXT,
        to_name TEXT,
        to_city TEXT,
        to_state TEXT,
        to_latitude REAL,
        to_longitude REAL,
        volume REAL,
        transaction_count INTEGER,
        product_count INTEGER,
        strength REAL,
        line_width INTEGER,
        line_color TEXT,
        opacity REAL,
        label TEXT
      )
    `, (err) => {
      if (err) console.error('Error creating connections table:', err);
      else console.log('  ✓ connections table created');
    });
  });

  // ===== 4. CREATE TRADE_ROUTES TABLE =====
  console.log('Creating trade_routes table...');
  db.run(`
    DROP TABLE IF EXISTS trade_routes
  `, () => {
    db.run(`
      CREATE TABLE trade_routes (
        id TEXT PRIMARY KEY,
        type TEXT,
        from_code TEXT,
        from_name TEXT,
        to_code TEXT,
        to_name TEXT,
        volume REAL,
        transaction_count INTEGER,
        customer_count INTEGER,
        product_count INTEGER,
        strength REAL,
        line_width INTEGER,
        line_color TEXT,
        opacity REAL,
        label TEXT
      )
    `, (err) => {
      if (err) console.error('Error creating trade_routes table:', err);
      else console.log('  ✓ trade_routes table created\n');
    });
  });

  // ===== 5. LOAD SUPPLIERS DATA =====
  setTimeout(() => {
    console.log('Loading suppliers data...');
    const suppliersData = JSON.parse(fs.readFileSync(path.join(__dirname, 'suppliers.json'), 'utf8'));

    const stmt = db.prepare(`
      INSERT INTO suppliers (
        id, name, city, state, state_name, country, latitude, longitude,
        revenue, customers_served, product_count, transaction_count, market_share,
        marker_type, marker_size, marker_color, opacity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    suppliersData.forEach(supplier => {
      stmt.run(
        supplier.id,
        supplier.name,
        supplier.location.city,
        supplier.location.state,
        supplier.location.stateName,
        supplier.location.country,
        supplier.location.coordinates.latitude,
        supplier.location.coordinates.longitude,
        supplier.metrics.revenue,
        supplier.metrics.customersServed,
        supplier.metrics.productCount,
        supplier.metrics.transactionCount,
        supplier.metrics.marketShare,
        supplier.visualization.markerType,
        supplier.visualization.markerSize,
        supplier.visualization.markerColor,
        supplier.visualization.opacity
      );
    });

    stmt.finalize(() => {
      console.log(`  ✓ Loaded ${suppliersData.length} suppliers\n`);
    });
  }, 500);

  // ===== 6. LOAD CUSTOMERS DATA =====
  setTimeout(() => {
    console.log('Loading customers data...');
    const customersData = JSON.parse(fs.readFileSync(path.join(__dirname, 'customers.json'), 'utf8'));

    const stmt = db.prepare(`
      INSERT INTO customers (
        id, name, city, state, state_name, country, latitude, longitude,
        revenue, profit, cost, profit_margin, invoice_count, products_ordered,
        marker_type, marker_size, marker_color, opacity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    customersData.forEach(customer => {
      stmt.run(
        customer.id,
        customer.name,
        customer.location.city,
        customer.location.state,
        customer.location.stateName,
        customer.location.country,
        customer.location.coordinates.latitude,
        customer.location.coordinates.longitude,
        customer.metrics.revenue,
        customer.metrics.profit,
        customer.metrics.cost,
        customer.metrics.profitMargin,
        customer.metrics.invoiceCount,
        customer.metrics.productsOrdered,
        customer.visualization.markerType,
        customer.visualization.markerSize,
        customer.visualization.markerColor,
        customer.visualization.opacity
      );
    });

    stmt.finalize(() => {
      console.log(`  ✓ Loaded ${customersData.length} customers\n`);
    });
  }, 1000);

  // ===== 7. LOAD CONNECTIONS DATA =====
  setTimeout(() => {
    console.log('Loading connections data...');
    const connectionsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'connections.json'), 'utf8'));

    const stmt = db.prepare(`
      INSERT INTO connections (
        id, type, from_id, from_type, from_name, from_city, from_state,
        from_latitude, from_longitude, to_id, to_type, to_name, to_city, to_state,
        to_latitude, to_longitude, volume, transaction_count, product_count, strength,
        line_width, line_color, opacity, label
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    connectionsData.forEach(conn => {
      stmt.run(
        conn.id,
        conn.type,
        conn.from.id,
        conn.from.type,
        conn.from.name,
        conn.from.city,
        conn.from.state,
        conn.from.coordinates.latitude,
        conn.from.coordinates.longitude,
        conn.to.id,
        conn.to.type,
        conn.to.name,
        conn.to.city,
        conn.to.state,
        conn.to.coordinates.latitude,
        conn.to.coordinates.longitude,
        conn.metrics.volume,
        conn.metrics.transactionCount,
        conn.metrics.productCount,
        conn.metrics.strength,
        conn.visualization.lineWidth,
        conn.visualization.lineColor,
        conn.visualization.opacity,
        conn.visualization.label
      );
    });

    stmt.finalize(() => {
      console.log(`  ✓ Loaded ${connectionsData.length} connections\n`);
    });
  }, 1500);

  // ===== 8. LOAD TRADE ROUTES DATA =====
  setTimeout(() => {
    console.log('Loading trade routes data...');
    const tradeRoutesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'trade-routes.json'), 'utf8'));

    const stmt = db.prepare(`
      INSERT INTO trade_routes (
        id, type, from_code, from_name, to_code, to_name,
        volume, transaction_count, customer_count, product_count, strength,
        line_width, line_color, opacity, label
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    tradeRoutesData.forEach(route => {
      stmt.run(
        route.id,
        route.type,
        route.from.code,
        route.from.name,
        route.to.code,
        route.to.name,
        route.metrics.volume,
        route.metrics.transactionCount,
        route.metrics.customerCount,
        route.metrics.productCount,
        route.metrics.strength,
        route.visualization.lineWidth,
        route.visualization.lineColor,
        route.visualization.opacity,
        route.visualization.label
      );
    });

    stmt.finalize(() => {
      console.log(`  ✓ Loaded ${tradeRoutesData.length} trade routes\n`);
    });
  }, 2000);

  // ===== 9. CREATE INDEXES =====
  setTimeout(() => {
    console.log('Creating indexes...');

    db.run('CREATE INDEX idx_suppliers_state ON suppliers(state)');
    db.run('CREATE INDEX idx_suppliers_revenue ON suppliers(revenue DESC)');
    db.run('CREATE INDEX idx_customers_state ON customers(state)');
    db.run('CREATE INDEX idx_customers_revenue ON customers(revenue DESC)');
    db.run('CREATE INDEX idx_customers_profit_margin ON customers(profit_margin)');
    db.run('CREATE INDEX idx_connections_from ON connections(from_id)');
    db.run('CREATE INDEX idx_connections_to ON connections(to_id)');
    db.run('CREATE INDEX idx_connections_volume ON connections(volume DESC)');
    db.run('CREATE INDEX idx_trade_routes_from ON trade_routes(from_code)');
    db.run('CREATE INDEX idx_trade_routes_to ON trade_routes(to_code)');
    db.run('CREATE INDEX idx_trade_routes_volume ON trade_routes(volume DESC)', () => {
      console.log('  ✓ Indexes created\n');
    });
  }, 2500);

  // ===== 10. DISPLAY SUMMARY =====
  setTimeout(() => {
    console.log('=== BUSINESS ENTITIES SYNC SUMMARY ===\n');

    db.get('SELECT COUNT(*) as count FROM suppliers', (err, row) => {
      console.log(`Suppliers:        ${row.count}`);
    });

    db.get('SELECT COUNT(*) as count FROM customers', (err, row) => {
      console.log(`Customers:        ${row.count}`);
    });

    db.get('SELECT COUNT(*) as count FROM connections', (err, row) => {
      console.log(`Connections:      ${row.count}`);
    });

    db.get('SELECT COUNT(*) as count FROM trade_routes', (err, row) => {
      console.log(`Trade Routes:     ${row.count}\n`);
    });

    db.get('SELECT SUM(revenue) as total FROM suppliers', (err, row) => {
      console.log(`Total Supplier Revenue:     $${(row.total || 0).toLocaleString('en-US', {maximumFractionDigits: 2})}`);
    });

    db.get('SELECT SUM(revenue) as total FROM customers', (err, row) => {
      console.log(`Total Customer Revenue:     $${(row.total || 0).toLocaleString('en-US', {maximumFractionDigits: 2})}`);
    });

    db.get('SELECT SUM(volume) as total FROM trade_routes', (err, row) => {
      console.log(`Total Trade Volume:         $${(row.total || 0).toLocaleString('en-US', {maximumFractionDigits: 2})}\n`);

      console.log('✓ Business entities synced to local SQLite database!');
      db.close();
    });
  }, 3500);
});
