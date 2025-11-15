# Quick Start Guide - Supply Chain Map Visualization

## TL;DR - What You Have

✓ **7 suppliers** with locations and revenue data
✓ **50 top customers** with locations and profit metrics
✓ **30 connections** showing supplier→customer flows
✓ **20 trade routes** showing state-to-state flows
✓ All data ready to visualize on a map

---

## 5-Minute Setup

### 1. Load the Data

**Option A: Use JSON files directly**
```javascript
const suppliers = require('./suppliers.json');
const customers = require('./customers.json');
const connections = require('./connections.json');
const tradeRoutes = require('./trade-routes.json');
```

**Option B: Use SQLite (already populated)**
```javascript
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./local-map-data.db');

db.all('SELECT * FROM suppliers', (err, suppliers) => {
  // Use suppliers
});
```

### 2. Get a Sample Supplier

```json
{
  "id": 7,
  "name": "Litware, Inc.",
  "location": {
    "coordinates": {
      "latitude": 38.3004709,
      "longitude": -120.7063219
    }
  },
  "metrics": {
    "revenue": 116179331.95,
    "customersServed": 663
  },
  "visualization": {
    "markerType": "star",
    "markerSize": "xl",
    "markerColor": "#ff0000"
  }
}
```

### 3. Get a Sample Customer

```json
{
  "id": 149,
  "name": "Customer-149-8-192",
  "location": {
    "coordinates": {
      "latitude": 46.9832886,
      "longitude": -94.1302482
    }
  },
  "metrics": {
    "revenue": 439424.89,
    "profitMargin": 43.1293
  },
  "visualization": {
    "markerType": "circle",
    "markerSize": "medium",
    "markerColor": "#ffcc00"
  }
}
```

### 4. Get a Sample Connection

```json
{
  "id": "supplier-7-customer-149-0",
  "type": "supplier_to_customer",
  "from": {
    "name": "Litware, Inc.",
    "coordinates": { "latitude": 38.3004709, "longitude": -120.7063219 }
  },
  "to": {
    "name": "Customer-149-8-192",
    "coordinates": { "latitude": 46.9832886, "longitude": -94.1302482 }
  },
  "metrics": {
    "volume": 312211.64,
    "strength": 1
  },
  "visualization": {
    "lineWidth": 12,
    "lineColor": "#ff6600",
    "opacity": 1,
    "label": "Litware, Inc. → Customer-149-8-192 | $0.3M"
  }
}
```

### 5. Simple React Component

```jsx
import { useEffect, useState } from 'react';

export function MapVisualization() {
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    setSuppliers(require('./suppliers.json'));
    setCustomers(require('./customers.json'));
    setConnections(require('./connections.json'));
  }, []);

  return (
    <div className="map">
      {/* Draw lines first */}
      {connections.map(conn => (
        <svg key={conn.id} style={{ position: 'absolute' }}>
          <line
            x1={conn.from.coordinates.longitude}
            y1={conn.from.coordinates.latitude}
            x2={conn.to.coordinates.longitude}
            y2={conn.to.coordinates.latitude}
            stroke={conn.visualization.lineColor}
            strokeWidth={conn.visualization.lineWidth}
            opacity={conn.visualization.opacity}
          />
        </svg>
      ))}

      {/* Draw suppliers (red stars) */}
      {suppliers.map(s => (
        <Marker
          key={s.id}
          lat={s.location.coordinates.latitude}
          lng={s.location.coordinates.longitude}
          color={s.visualization.markerColor}
          title={s.name}
          size="large"
        />
      ))}

      {/* Draw customers (colored circles) */}
      {customers.map(c => (
        <Marker
          key={c.id}
          lat={c.location.coordinates.latitude}
          lng={c.location.coordinates.longitude}
          color={c.visualization.markerColor}
          title={c.name}
          size={c.visualization.markerSize}
        />
      ))}
    </div>
  );
}
```

---

## Files Reference

| File | Purpose | Size |
|------|---------|------|
| `suppliers.json` | 7 suppliers | 4.2 KB |
| `customers.json` | 50 customers | 31 KB |
| `connections.json` | 30 connections | 27 KB |
| `trade-routes.json` | 20 state routes | 12 KB |
| `BUSINESS_ENTITIES_INTERFACE.md` | Full documentation | 23 KB |
| `DELIVERABLES.md` | Implementation guide | 15 KB |
| `local-map-data.db` | SQLite database | 3.2 MB |

---

## Key Numbers

- **Suppliers**: 7 (all have lat/lon)
- **Customers**: 50 shown (663 total in system)
- **Connections**: 30 shown (many more exist)
- **Trade Routes**: 20 major state-to-state routes
- **Total Revenue**: $198.8M (supplier perspective)
- **Biggest Supplier**: Litware Inc (58% market share)
- **Biggest Route**: CA → TX ($8.0M)

---

## Color Rules

**For Customers** (based on profit margin):
- 🟢 Green (#00aa00): >50% margin
- 🟡 Yellow (#ffcc00): 40-50% margin
- 🟠 Orange (#ff6600): 20-40% margin
- 🔴 Red (#cc0000): <20% margin

**For Connections** (based on strength):
- 🟠 Orange: Strong (0.6-1.0)
- 🟡 Yellow: Medium (0.3-0.6)
- ⚫ Gray: Weak (0.0-0.3)

**For Suppliers**:
- 🔴 Always red stars

---

## Size Rules

**For Customers** (based on revenue):
- xl: >$1M
- large: $500K-$1M
- medium: $100K-$500K
- small: <$100K

**For Lines** (based on strength):
- Thick: High volume (0.6-1.0)
- Medium: Moderate volume (0.3-0.6)
- Thin: Low volume (0.0-0.3)

---

## Data Layer Order (Bottom to Top)

1. **Background**: State boundaries (not included, add separately)
2. **Trade routes**: Faint state-to-state lines
3. **Connections**: Supplier→customer lines
4. **Customer markers**: Circles (various colors/sizes)
5. **Supplier markers**: Red stars (always on top)

---

## Common Use Cases

### Show all major supplier routes
```javascript
connections.filter(c => c.metrics.strength > 0.7)
```

### Show high-profit customers only
```javascript
customers.filter(c => c.metrics.profitMargin > 50)
```

### Show what a supplier ships to
```javascript
const supplierId = 7; // Litware
connections.filter(c => c.from.id === supplierId)
```

### Show what feeds into a state
```javascript
const destState = 'TX';
tradeRoutes.filter(t => t.to.code === destState)
```

### Get supplier contact info
```javascript
const supplier = suppliers[0];
console.log(`${supplier.name} in ${supplier.location.city}, ${supplier.location.state}`);
console.log(`Revenue: $${supplier.metrics.revenue.toLocaleString()}`);
console.log(`Serves: ${supplier.metrics.customersServed} customers`);
```

---

## API Endpoints (If Implemented)

```bash
# Get all suppliers
GET /api/business/suppliers

# Get all customers
GET /api/business/customers?limit=50&state=CA

# Get connections from a supplier
GET /api/business/connections?supplierId=7

# Get trade routes
GET /api/business/trade-routes?fromState=CA
```

---

## Next Steps

1. **Read BUSINESS_ENTITIES_INTERFACE.md** for complete data structures
2. **Choose visualization library**: Mapbox GL, D3.js, or Leaflet
3. **Implement marker rendering** using the sample components
4. **Add interactivity**: Hover, click, filter
5. **Deploy** and wire to your frontend

---

## Need More Info?

- **Data structures**: See `BUSINESS_ENTITIES_INTERFACE.md`
- **Implementation examples**: See `DELIVERABLES.md`
- **Raw data**: Use the JSON files or query `local-map-data.db`
- **TypeScript interfaces**: See `BUSINESS_ENTITIES_INTERFACE.md` section 8

---

**Ready to build? Start with the React component example above!**
