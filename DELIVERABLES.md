# Business Entity Visualization - Deliverables Summary

## Overview

You now have a complete data interface for visualizing supply chain business entities (suppliers, customers, and their geographic connections) on a map. This document summarizes all deliverables and how to use them.

---

## What You Have

### 1. Data Extraction Script
**File**: `extract-business-entities.js`

This script queries the remote database and extracts all business entities. It has already been run and generated the JSON files below.

**Usage**:
```bash
node extract-business-entities.js
```

**Output**: 4 JSON files with real data from the manufacturing database

---

### 2. JSON Data Exports

All data has been extracted and saved as JSON files in the project directory:

#### **suppliers.json** (7 suppliers)
Contains all 7 suppliers with:
- Location (city, state, country, lat/lon)
- Metrics (revenue, customers served, products, market share)
- Visualization properties (marker type, size, color)

**Example**: Litware Inc in California with $116.2M revenue (58.4% market share)

#### **customers.json** (50 customers)
Contains top 50 customers by revenue with:
- Location (city, state, country, lat/lon)
- Metrics (revenue, profit, cost, profit margin, invoices, products)
- Visualization properties (marker size based on revenue, color based on profit margin)

**Example**: Customer-149 in Minnesota with $439.4K revenue, 43.1% profit margin

#### **connections.json** (30 connections)
Contains top supplier-to-customer connections with:
- Source: Supplier location and ID
- Destination: Customer location and ID
- Metrics: Volume, transaction count, product count, strength (0-1)
- Visualization properties: Line width, color, opacity, tooltip label

**Example**: Litware Inc → Customer-149 with $312K volume

#### **trade-routes.json** (20 routes)
Contains state-to-state trade flows with:
- Source/Destination: State codes and names
- Metrics: Volume, transaction count, customer count, product count, strength
- Visualization properties: Line styling and tooltip

**Example**: CA → TX with $8.0M volume, 46 customers

---

### 3. Interface Documentation
**File**: `BUSINESS_ENTITIES_INTERFACE.md`

Comprehensive guide containing:
- Data structures (TypeScript interfaces)
- 3 real examples for each entity type
- Color/size mapping rules
- Frontend implementation examples (React, D3.js)
- Best practices for visualization and interactivity
- Filtering and querying options

**Read this first to understand the data structure**

---

### 4. Local SQLite Database
**File**: `local-map-data.db`

All business entities have been synced to the local SQLite database with the following tables:

#### **suppliers table**
- Fields: id, name, city, state, state_name, country, latitude, longitude
- Metrics: revenue, customers_served, product_count, transaction_count, market_share
- Visualization: marker_type, marker_size, marker_color, opacity
- Indexes: on state, revenue

#### **customers table**
- Fields: id, name, city, state, state_name, country, latitude, longitude
- Metrics: revenue, profit, cost, profit_margin, invoice_count, products_ordered
- Visualization: marker_type, marker_size, marker_color, opacity
- Indexes: on state, revenue, profit_margin

#### **connections table**
- Fields: id, type, from_id, from_type, from_name, from_city, from_state, from_latitude, from_longitude, to_id, to_type, to_name, to_city, to_state, to_latitude, to_longitude
- Metrics: volume, transaction_count, product_count, strength
- Visualization: line_width, line_color, opacity, label
- Indexes: on from_id, to_id, volume

#### **trade_routes table**
- Fields: id, type, from_code, from_name, to_code, to_name
- Metrics: volume, transaction_count, customer_count, product_count, strength
- Visualization: line_width, line_color, opacity, label
- Indexes: on from_code, to_code, volume

**Sync Script**: `sync-business-entities-to-sqlite.js` (already run)

---

### 5. Sync Script
**File**: `sync-business-entities-to-sqlite.js`

This script imports data from the JSON files into the SQLite database. It creates tables, loads data, and creates indexes for fast querying.

**Usage** (already done, but can be re-run):
```bash
node sync-business-entities-to-sqlite.js
```

---

## Key Statistics

| Metric | Value |
|--------|-------|
| **Total Suppliers** | 7 |
| **Total Customers** (in system) | 663 |
| **Top Customers** (extracted) | 50 |
| **Supplier-to-Customer Connections** | 30 |
| **State-to-State Trade Routes** | 20 |
| **Total Supplier Revenue** | $198.8M |
| **Top 50 Customer Revenue** | $19.7M |
| **Inter-State Trade Volume** | $74.6M |
| **Largest Supplier** | Litware Inc (58.4% market share, $116.2M) |
| **Largest Trade Route** | CA → TX ($8.0M, 46 customers) |

---

## How to Use This Data

### Option 1: Load from JSON Files

```javascript
// Load suppliers
const suppliers = JSON.parse(fs.readFileSync('suppliers.json'));

// Load customers
const customers = JSON.parse(fs.readFileSync('customers.json'));

// Load connections
const connections = JSON.parse(fs.readFileSync('connections.json'));

// Load trade routes
const tradeRoutes = JSON.parse(fs.readFileSync('trade-routes.json'));
```

### Option 2: Query from SQLite Database

```javascript
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('local-map-data.db');

// Get all suppliers
db.all('SELECT * FROM suppliers', (err, rows) => {
  console.log(rows);
});

// Get customers in a specific state
db.all('SELECT * FROM customers WHERE state = ?', ['CA'], (err, rows) => {
  console.log(rows);
});

// Get connections by volume
db.all('SELECT * FROM connections ORDER BY volume DESC LIMIT 10', (err, rows) => {
  console.log(rows);
});
```

### Option 3: Create REST API Endpoints

Add these to your Express server:

```javascript
const express = require('express');
const sqlite3 = require('sqlite3');
const router = express.Router();
const db = new sqlite3.Database('./local-map-data.db');

// GET all suppliers
router.get('/suppliers', (req, res) => {
  db.all('SELECT * FROM suppliers ORDER BY revenue DESC', (err, rows) => {
    res.json({ success: !err, data: rows });
  });
});

// GET all customers (with optional filtering)
router.get('/customers', (req, res) => {
  const { state, minRevenue, limit = 50 } = req.query;
  let query = 'SELECT * FROM customers WHERE 1=1';
  const params = [];

  if (state) {
    query += ' AND state = ?';
    params.push(state);
  }
  if (minRevenue) {
    query += ' AND revenue >= ?';
    params.push(parseFloat(minRevenue));
  }

  query += ' ORDER BY revenue DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(query, params, (err, rows) => {
    res.json({ success: !err, data: rows });
  });
});

// GET supplier-to-customer connections
router.get('/connections', (req, res) => {
  const { supplierId, customerId, minVolume } = req.query;
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

  query += ' ORDER BY volume DESC';

  db.all(query, params, (err, rows) => {
    res.json({ success: !err, data: rows });
  });
});

// GET state-to-state trade routes
router.get('/trade-routes', (req, res) => {
  const { fromState, toState, minVolume } = req.query;
  let query = 'SELECT * FROM trade_routes WHERE 1=1';
  const params = [];

  if (fromState) {
    query += ' AND from_code = ?';
    params.push(fromState);
  }
  if (toState) {
    query += ' AND to_code = ?';
    params.push(toState);
  }
  if (minVolume) {
    query += ' AND volume >= ?';
    params.push(parseFloat(minVolume));
  }

  query += ' ORDER BY volume DESC';

  db.all(query, params, (err, rows) => {
    res.json({ success: !err, data: rows });
  });
});

module.exports = router;
```

Then use in your main server:
```javascript
app.use('/api/business', require('./business-api-routes'));
```

---

## Frontend Integration Examples

### React with Mapbox GL

```jsx
import { useEffect, useState } from 'react';
import MapboxGL from '@mapbox/mapbox-gl';

export function SupplyChainMap() {
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/business/suppliers').then(r => r.json()),
      fetch('/api/business/customers').then(r => r.json()),
      fetch('/api/business/connections').then(r => r.json())
    ]).then(([supp, cust, conn]) => {
      setSuppliers(supp.data);
      setCustomers(cust.data);
      setConnections(conn.data);
    });
  }, []);

  return (
    <div className="map-container">
      {/* Draw connections as lines */}
      {connections.map(conn => (
        <svg key={conn.id}>
          <line
            x1={/* from latitude */}
            y1={/* from longitude */}
            x2={/* to latitude */}
            y2={/* to longitude */}
            stroke={conn.line_color}
            strokeWidth={conn.line_width}
            opacity={conn.opacity}
          />
        </svg>
      ))}

      {/* Draw customer markers */}
      {customers.map(customer => (
        <Marker key={customer.id}
          lat={customer.latitude}
          lng={customer.longitude}
          color={customer.marker_color}
          size={customer.marker_size}
          tooltip={`${customer.name}: ${customer.profit_margin.toFixed(1)}% margin`}
        />
      ))}

      {/* Draw supplier markers (on top) */}
      {suppliers.map(supplier => (
        <Marker key={supplier.id}
          lat={supplier.latitude}
          lng={supplier.longitude}
          color={supplier.marker_color}
          size={supplier.marker_size}
          shape="star"
          tooltip={`${supplier.name}: $${(supplier.revenue/1000000).toFixed(1)}M`}
        />
      ))}
    </div>
  );
}
```

### D3.js with SVG

```javascript
const suppliers = await fetch('/api/business/suppliers').then(r => r.json()).then(r => r.data);
const customers = await fetch('/api/business/customers').then(r => r.json()).then(r => r.data);
const connections = await fetch('/api/business/connections').then(r => r.json()).then(r => r.data);

const projection = d3.geoMercator().fitSize([1200, 800], /* bounds */);
const svg = d3.select('svg');

// Draw connections
svg.selectAll('line.connection')
  .data(connections)
  .enter()
  .append('line')
  .attr('x1', d => projection([d.from_longitude, d.from_latitude])[0])
  .attr('y1', d => projection([d.from_longitude, d.from_latitude])[1])
  .attr('x2', d => projection([d.to_longitude, d.to_latitude])[0])
  .attr('y2', d => projection([d.to_longitude, d.to_latitude])[1])
  .attr('stroke', d => d.line_color)
  .attr('stroke-width', d => d.line_width)
  .attr('opacity', d => d.opacity);

// Draw customer circles
svg.selectAll('circle.customer')
  .data(customers)
  .enter()
  .append('circle')
  .attr('cx', d => projection([d.longitude, d.latitude])[0])
  .attr('cy', d => projection([d.longitude, d.latitude])[1])
  .attr('r', d => sizeMap[d.marker_size])
  .attr('fill', d => d.marker_color)
  .attr('opacity', 0.8);

// Draw supplier stars
svg.selectAll('polygon.supplier')
  .data(suppliers)
  .enter()
  .append('polygon')
  .attr('points', d => {
    const [x, y] = projection([d.longitude, d.latitude]);
    return starPoints(x, y, 12);
  })
  .attr('fill', d => d.marker_color)
  .attr('opacity', 0.9);
```

---

## Visualization Guidelines

### Marker Types
- **Suppliers**: Red stars (always xl size)
- **Customers**: Circles (size and color based on metrics)

### Color Schemes

**Customers (by profit margin)**:
- Green (#00aa00): >50% margin (very healthy)
- Yellow (#ffcc00): 40-50% margin (good)
- Orange (#ff6600): 20-40% margin (fair)
- Red (#cc0000): <20% margin (low)

**Connections (by strength)**:
- Orange (#ff6600): 0.6-1.0 strength (thick, opaque)
- Yellow (#ffcc00): 0.3-0.6 strength (medium)
- Gray (#cccccc): 0.0-0.3 strength (thin, faint)

### Size Schemes

**Customer Markers (by revenue)**:
- xl: >$1,000,000
- large: $500,000-$1,000,000
- medium: $100,000-$500,000
- small: <$100,000

**Connection Lines (by strength)**:
- Line width: 2-12 pixels (scaled by strength)
- Opacity: 0.4-1.0 (scaled by strength)

---

## Next Steps

1. **Read BUSINESS_ENTITIES_INTERFACE.md** - Complete data structure reference
2. **Choose data loading method** - JSON files vs SQLite vs API
3. **Implement visualization** - Use the React/D3.js examples as templates
4. **Add interactivity** - Hover tooltips, click filtering, zooming
5. **Deploy** - Use the generated data files with your frontend

---

## File Manifest

| File | Purpose |
|------|---------|
| `extract-business-entities.js` | Query script to extract entities from database |
| `suppliers.json` | 7 suppliers with full metrics |
| `customers.json` | 50 top customers with full metrics |
| `connections.json` | 30 supplier-to-customer connections |
| `trade-routes.json` | 20 state-to-state trade routes |
| `sync-business-entities-to-sqlite.js` | Script to load JSON into SQLite |
| `local-map-data.db` | SQLite database with all entities (already synced) |
| `BUSINESS_ENTITIES_INTERFACE.md` | Complete interface documentation |
| `DELIVERABLES.md` | This file |

---

## Support & Questions

- **Data structure questions**: See `BUSINESS_ENTITIES_INTERFACE.md`
- **Implementation examples**: See React/D3.js sections in this document
- **Data accuracy**: All data is extracted directly from the manufacturing database
- **Real-time updates**: Re-run `extract-business-entities.js` to refresh data

---

**Generated**: 2025-11-15
**Database**: WideWorldImporters_Base (AWS RDS)
**Status**: Ready for frontend integration
