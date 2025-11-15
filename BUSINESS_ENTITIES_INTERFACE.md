# Business Entities Interface Guide

## Overview

This document describes the data structures for visualizing **business entities** in the supply chain: suppliers, customers, and their geographic connections. This is the interface your frontend should implement to display supplier networks, customer hubs, and trade flows.

---

## 1. Suppliers

Suppliers are the source of all products in the supply chain. They have fixed delivery locations and serve multiple customers across geographic regions.

### Data Structure

```typescript
interface Supplier {
  id: number;                    // Unique supplier ID
  name: string;                  // Supplier company name
  location: {
    city: string;
    state: string;              // State code (e.g., "CA")
    stateName: string;          // Full state name
    country: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  metrics: {
    revenue: number;            // Total revenue ($)
    customersServed: number;    // Total unique customers
    productCount: number;       // Unique products offered
    transactionCount: number;   // Total invoices shipped
    marketShare: number;        // % of total market revenue
  };
  visualization: {
    markerType: "star";         // Always star for suppliers
    markerSize: "xl";           // Always extra-large
    markerColor: "#ff0000";     // Always red
    opacity: 0.9;
  };
}
```

### Example Supplier (Real Data)

```json
{
  "id": 7,
  "name": "Litware, Inc.",
  "location": {
    "city": "Mokelumne Hill",
    "state": "CA",
    "stateName": "California",
    "country": "United States",
    "coordinates": {
      "latitude": 38.3004709,
      "longitude": -120.7063219
    }
  },
  "metrics": {
    "revenue": 116179331.95,
    "customersServed": 663,
    "productCount": 67,
    "transactionCount": 46586,
    "marketShare": 58.4453151625269
  },
  "visualization": {
    "markerType": "star",
    "markerSize": "xl",
    "markerColor": "#ff0000",
    "opacity": 0.9
  }
}
```

### Example Supplier #2 (Real Data)

```json
{
  "id": 4,
  "name": "Fabrikam, Inc.",
  "location": {
    "city": "Lakeview Heights",
    "state": "KY",
    "stateName": "Kentucky",
    "country": "United States",
    "coordinates": {
      "latitude": 38.1514705,
      "longitude": -83.5043529
    }
  },
  "metrics": {
    "revenue": 53609896.15,
    "customersServed": 663,
    "productCount": 74,
    "transactionCount": 50190,
    "marketShare": 26.969059158177465
  },
  "visualization": {
    "markerType": "star",
    "markerSize": "xl",
    "markerColor": "#ff0000",
    "opacity": 0.9
  }
}
```

### Key Insights

- **7 total suppliers** in the database
- **Litware, Inc.** dominates with 58.4% market share ($116.2M revenue)
- **Fabrikam, Inc.** is second with 27% market share ($53.6M revenue)
- Both serve all 663 customers in the system
- All suppliers are visualization-heavy: red stars, full opacity, positioned at their delivery locations

---

## 2. Customers

Customers are the endpoints of the supply chain. Each customer has a delivery location and receives shipments from one or more suppliers.

### Data Structure

```typescript
interface Customer {
  id: number;                    // Unique customer ID
  name: string;                  // Customer name
  location: {
    city: string;
    state: string;              // Delivery state
    stateName: string;
    country: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  metrics: {
    revenue: number;            // Total revenue from this customer ($)
    profit: number;             // Total profit ($)
    cost: number;               // Total cost of goods ($)
    profitMargin: number;       // Profit margin (%)
    invoiceCount: number;       // Number of invoices received
    productsOrdered: number;    // Unique products ordered
  };
  visualization: {
    markerType: "circle";       // Always circle for customers
    markerSize: "small" | "medium" | "large" | "xl";  // Based on revenue
    markerColor: string;        // Based on profit margin
    opacity: 0.8;
  };
}
```

### Color Scheme (Profit Margin)

```
Green  (#00aa00)  = >50% margin  (Very healthy)
Yellow (#ffcc00)  = 40-50% margin (Good)
Orange (#ff6600)  = 20-40% margin (Fair)
Red    (#cc0000)  = <20% margin   (Low)
```

### Size Scheme (Revenue)

```
xl     = >$1,000,000
large  = $500,000 - $1,000,000
medium = $100,000 - $500,000
small  = <$100,000
```

### Example Customer #1 (Real Data)

```json
{
  "id": 149,
  "name": "Customer-149-8-192",
  "location": {
    "city": "Inguadona",
    "state": "MN",
    "stateName": "Minnesota",
    "country": "United States",
    "coordinates": {
      "latitude": 46.9832886,
      "longitude": -94.1302482
    }
  },
  "metrics": {
    "revenue": 439424.89,
    "profit": 189521.05,
    "cost": 249903.84,
    "profitMargin": 43.1293,
    "invoiceCount": 127,
    "productsOrdered": 187
  },
  "visualization": {
    "markerType": "circle",
    "markerSize": "medium",
    "markerColor": "#ffcc00",
    "opacity": 0.8
  }
}
```

### Example Customer #2 (Real Data)

```json
{
  "id": 977,
  "name": "Customer-977-8-816",
  "location": {
    "city": "North Eaton",
    "state": "OH",
    "stateName": "Ohio",
    "country": "United States",
    "coordinates": {
      "latitude": 41.3133839,
      "longitude": -81.9812516
    }
  },
  "metrics": {
    "revenue": 427846.75,
    "profit": 173757.1,
    "cost": 254089.65,
    "profitMargin": 40.6119,
    "invoiceCount": 116,
    "productsOrdered": 175
  },
  "visualization": {
    "markerType": "circle",
    "markerSize": "medium",
    "markerColor": "#ffcc00",
    "opacity": 0.8
  }
}
```

### Key Insights

- **663 total customers** across all states
- **Top 50 customers** represent $19.7M in revenue (top tier only)
- Most customers have **40-50% profit margins** (yellow circle markers)
- Customer size distribution skews toward "medium" ($100K-$500K)
- Customers are distributed geographically (not concentrated in one region)

---

## 3. Supplier-to-Customer Connections

These represent the actual supply chain flows from suppliers to customers. Each connection shows volume, strength, and visualization properties for drawing lines on the map.

### Data Structure

```typescript
interface Connection {
  id: string;                    // Unique connection ID
  type: "supplier_to_customer";
  from: {
    type: "supplier";
    id: number;
    name: string;
    city: string;
    state: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  to: {
    type: "customer";
    id: number;
    name: string;
    city: string;
    state: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  metrics: {
    volume: number;            // Revenue for this specific connection ($)
    transactionCount: number;  // Number of invoices on this route
    productCount: number;      // Unique products on this route
    strength: number;          // 0-1 scale (volume / max volume)
  };
  visualization: {
    lineWidth: number;         // SVG stroke width (2-12px)
    lineColor: string;         // Hex color based on strength
    opacity: number;           // 0-1 opacity based on strength
    dashArray: null;           // null = solid line
    label: string;             // Tooltip text
  };
}
```

### Strength-Based Visualization

```
Strength: 0.0-0.3   → Gray (#cccccc)      thin line (2-4px)   opacity 0.4-0.6
Strength: 0.3-0.6   → Yellow (#ffcc00)    medium line (5-8px) opacity 0.6-0.8
Strength: 0.6-1.0   → Orange (#ff6600)    thick line (8-12px) opacity 0.8-1.0
```

### Example Connection #1 (Real Data)

```json
{
  "id": "supplier-7-customer-149-0",
  "type": "supplier_to_customer",
  "from": {
    "type": "supplier",
    "id": 7,
    "name": "Litware, Inc.",
    "city": "Mokelumne Hill",
    "state": "CA",
    "coordinates": {
      "latitude": 38.3004709,
      "longitude": -120.7063219
    }
  },
  "to": {
    "type": "customer",
    "id": 149,
    "name": "Customer-149-8-192",
    "city": "Inguadona",
    "state": "MN",
    "coordinates": {
      "latitude": 46.9832886,
      "longitude": -94.1302482
    }
  },
  "metrics": {
    "volume": 312211.64,
    "transactionCount": 86,
    "productCount": 58,
    "strength": 1
  },
  "visualization": {
    "lineWidth": 12,
    "lineColor": "#ff6600",
    "opacity": 1,
    "dashArray": null,
    "label": "Litware, Inc. → Customer-149-8-192 | $0.3M"
  }
}
```

### Example Connection #2 (Real Data)

```json
{
  "id": "supplier-7-customer-977-1",
  "type": "supplier_to_customer",
  "from": {
    "type": "supplier",
    "id": 7,
    "name": "Litware, Inc.",
    "city": "Mokelumne Hill",
    "state": "CA",
    "coordinates": {
      "latitude": 38.3004709,
      "longitude": -120.7063219
    }
  },
  "to": {
    "type": "customer",
    "id": 977,
    "name": "Customer-977-8-816",
    "city": "North Eaton",
    "state": "OH",
    "coordinates": {
      "latitude": 41.3133839,
      "longitude": -81.9812516
    }
  },
  "metrics": {
    "volume": 299271.57,
    "transactionCount": 80,
    "productCount": 56,
    "strength": 0.9585535311880108
  },
  "visualization": {
    "lineWidth": 12,
    "lineColor": "#ff6600",
    "opacity": 0.9751321187128065,
    "dashArray": null,
    "label": "Litware, Inc. → Customer-977-8-816 | $0.3M"
  }
}
```

### Key Insights

- **30 supplier-to-customer connections** (sampled from top flows)
- Most connections are **high-strength** (0.9+) with thick orange lines
- Individual connection volumes range from $0.1M to $0.3M
- Each supplier serves multiple customers across different states
- Lines can span coast-to-coast (CA to NE/OH)

---

## 4. State-to-State Trade Routes

These are aggregated connections showing trade volume between states. Useful for high-level geographic views of supply chain flows.

### Data Structure

```typescript
interface TradeRoute {
  id: string;                    // Unique route ID (e.g., "CA-TX-0")
  type: "state_to_state";
  from: {
    type: "state";
    code: string;               // State code (e.g., "CA")
    name: string;               // Full state name
  };
  to: {
    type: "state";
    code: string;
    name: string;
  };
  metrics: {
    volume: number;            // Total trade volume ($)
    transactionCount: number;  // Total invoices
    customerCount: number;     // Unique customers in destination
    productCount: number;      // Unique products on this route
    strength: number;          // 0-1 scale
  };
  visualization: {
    lineWidth: number;         // SVG stroke width
    lineColor: string;         // Hex color
    opacity: number;
    dashArray: null;
    label: string;
  };
}
```

### Example Trade Route #1 (Real Data)

```json
{
  "id": "CA-TX-0",
  "type": "state_to_state",
  "from": {
    "type": "state",
    "code": "CA",
    "name": "California"
  },
  "to": {
    "type": "state",
    "code": "TX",
    "name": "Texas"
  },
  "metrics": {
    "volume": 8038785.58,
    "transactionCount": 3252,
    "customerCount": 46,
    "productCount": 67,
    "strength": 1
  },
  "visualization": {
    "lineWidth": 12,
    "lineColor": "#ff6600",
    "opacity": 1,
    "dashArray": null,
    "label": "CA → TX | $8.0M | 46 customers"
  }
}
```

### Example Trade Route #2 (Real Data)

```json
{
  "id": "CA-PA-1",
  "type": "state_to_state",
  "from": {
    "type": "state",
    "code": "CA",
    "name": "California"
  },
  "to": {
    "type": "state",
    "code": "PA",
    "name": "Pennsylvania"
  },
  "metrics": {
    "volume": 6600832.2,
    "transactionCount": 2609,
    "customerCount": 37,
    "productCount": 67,
    "strength": 0.8211230582418396
  },
  "visualization": {
    "lineWidth": 10,
    "lineColor": "#ff6600",
    "opacity": 0.8926738349451038,
    "dashArray": null,
    "label": "CA → PA | $6.6M | 37 customers"
  }
}
```

### Key Insights

- **20 major state-to-state routes** captured
- **California is the hub**: 45% of all inter-state volume originates from CA
- **Top 5 routes**:
  - CA → TX: $8.0M (46 customers)
  - CA → PA: $6.6M (37 customers)
  - CA → NY: $6.1M (35 customers)
  - CA → FL: $4.0M (21 customers)
  - CA → OH: $3.9M (21 customers)
- Trade routes are uni-directional (supplier state → customer state)
- Total inter-state trade volume: $74.6M

---

## 5. Frontend Implementation Guide

### React Component Example

```jsx
import { useEffect, useState } from 'react';
import MapboxGL from '@mapbox/mapbox-gl';

export function SupplyChainMap() {
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [tradeRoutes, setTradeRoutes] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/business/suppliers').then(r => r.json()),
      fetch('/api/business/customers?limit=50').then(r => r.json()),
      fetch('/api/business/connections').then(r => r.json()),
      fetch('/api/business/trade-routes').then(r => r.json())
    ]).then(([supp, cust, conn, routes]) => {
      setSuppliers(supp.data);
      setCustomers(cust.data);
      setConnections(conn.data);
      setTradeRoutes(routes.data);
    });
  }, []);

  return (
    <div>
      <h1>Supply Chain Network</h1>

      {/* Draw state-to-state routes first (background) */}
      {tradeRoutes.map(route => (
        <TradeRouteLine key={route.id} route={route} />
      ))}

      {/* Draw supplier-to-customer connections (middle) */}
      {connections.map(conn => (
        <ConnectionLine key={conn.id} connection={conn} />
      ))}

      {/* Draw customer markers (foreground) */}
      {customers.map(customer => (
        <CustomerMarker key={customer.id} customer={customer} />
      ))}

      {/* Draw supplier markers (top layer) */}
      {suppliers.map(supplier => (
        <SupplierMarker key={supplier.id} supplier={supplier} />
      ))}
    </div>
  );
}

function SupplierMarker({ supplier }) {
  return (
    <Marker
      latitude={supplier.location.coordinates.latitude}
      longitude={supplier.location.coordinates.longitude}
      type="star"
      size="xl"
      color={supplier.visualization.markerColor}
      opacity={supplier.visualization.opacity}
      tooltip={`${supplier.name} - $${(supplier.metrics.revenue / 1000000).toFixed(1)}M`}
    />
  );
}

function CustomerMarker({ customer }) {
  return (
    <Marker
      latitude={customer.location.coordinates.latitude}
      longitude={customer.location.coordinates.longitude}
      type="circle"
      size={customer.visualization.markerSize}
      color={customer.visualization.markerColor}
      opacity={customer.visualization.opacity}
      tooltip={`${customer.name} - ${customer.metrics.profitMargin.toFixed(1)}% margin`}
    />
  );
}

function ConnectionLine({ connection }) {
  return (
    <Line
      from={[connection.from.coordinates.latitude, connection.from.coordinates.longitude]}
      to={[connection.to.coordinates.latitude, connection.to.coordinates.longitude]}
      strokeWidth={connection.visualization.lineWidth}
      strokeColor={connection.visualization.lineColor}
      opacity={connection.visualization.opacity}
      tooltip={connection.visualization.label}
    />
  );
}

function TradeRouteLine({ route }) {
  // Use state center coordinates (pre-computed)
  const stateCoords = {
    CA: { lat: 37.2577, lon: -119.4674 },
    TX: { lat: 31.9686, lon: -99.9018 },
    // ... more states
  };

  const from = stateCoords[route.from.code];
  const to = stateCoords[route.to.code];

  return (
    <Line
      from={[from.lat, from.lon]}
      to={[to.lat, to.lon]}
      strokeWidth={route.visualization.lineWidth}
      strokeColor={route.visualization.lineColor}
      opacity={route.visualization.opacity}
      tooltip={route.visualization.label}
    />
  );
}
```

### D3.js Implementation

```javascript
const suppliers = await fetch('/api/business/suppliers').then(r => r.json()).then(r => r.data);
const customers = await fetch('/api/business/customers?limit=50').then(r => r.json()).then(r => r.data);
const connections = await fetch('/api/business/connections').then(r => r.json()).then(r => r.data);

const svg = d3.select('svg');
const projection = d3.geoMercator().fitSize([1200, 800], /* USA bounds */);

// Draw connections as lines
svg.selectAll('line.connection')
  .data(connections)
  .enter()
  .append('line')
  .attr('class', 'connection')
  .attr('x1', d => projection([d.from.coordinates.longitude, d.from.coordinates.latitude])[0])
  .attr('y1', d => projection([d.from.coordinates.longitude, d.from.coordinates.latitude])[1])
  .attr('x2', d => projection([d.to.coordinates.longitude, d.to.coordinates.latitude])[0])
  .attr('y2', d => projection([d.to.coordinates.longitude, d.to.coordinates.latitude])[1])
  .attr('stroke', d => d.visualization.lineColor)
  .attr('stroke-width', d => d.visualization.lineWidth)
  .attr('opacity', d => d.visualization.opacity);

// Draw customer markers
svg.selectAll('circle.customer')
  .data(customers)
  .enter()
  .append('circle')
  .attr('class', 'customer')
  .attr('cx', d => projection([d.location.coordinates.longitude, d.location.coordinates.latitude])[0])
  .attr('cy', d => projection([d.location.coordinates.longitude, d.location.coordinates.latitude])[1])
  .attr('r', d => sizeMap[d.visualization.markerSize])
  .attr('fill', d => d.visualization.markerColor)
  .attr('opacity', d => d.visualization.opacity);

// Draw supplier markers (stars)
svg.selectAll('polygon.supplier')
  .data(suppliers)
  .enter()
  .append('polygon')
  .attr('class', 'supplier')
  .attr('points', d => {
    const [x, y] = projection([d.location.coordinates.longitude, d.location.coordinates.latitude]);
    return starPoints(x, y, 12);  // 12px star
  })
  .attr('fill', d => d.visualization.markerColor)
  .attr('opacity', d => d.visualization.opacity);
```

---

## 6. Data Files

All extracted data is available as JSON files:

- **suppliers.json** - 7 supplier records with full metrics
- **customers.json** - 50 customer records (top by revenue)
- **connections.json** - 30 supplier-to-customer connections
- **trade-routes.json** - 20 state-to-state trade routes

Load these directly into your visualization or fetch via API endpoints.

---

## 7. Visualization Best Practices

### Layer Order (Bottom to Top)
1. State-to-state trade routes (thin, faded lines)
2. Supplier-to-customer connections (medium lines)
3. Customer markers (circles, various colors)
4. Supplier markers (stars, red, always on top)

### Interactivity
- **Hover supplier marker**: Show company name, revenue, market share
- **Hover customer marker**: Show customer name, profit margin, invoice count
- **Hover connection line**: Show volume, transaction count, product count
- **Click supplier**: Highlight all connections originating from that supplier
- **Click customer**: Highlight all connections feeding into that customer

### Filtering Options
- Filter by state
- Filter by minimum revenue
- Filter by profit margin range
- Show/hide trade routes
- Show only top N suppliers/customers

---

## 8. TypeScript Interfaces

```typescript
interface Supplier {
  id: number;
  name: string;
  location: {
    city: string;
    state: string;
    stateName: string;
    country: string;
    coordinates: { latitude: number; longitude: number };
  };
  metrics: {
    revenue: number;
    customersServed: number;
    productCount: number;
    transactionCount: number;
    marketShare: number;
  };
  visualization: {
    markerType: 'star';
    markerSize: 'xl';
    markerColor: '#ff0000';
    opacity: 0.9;
  };
}

interface Customer {
  id: number;
  name: string;
  location: {
    city: string;
    state: string;
    stateName: string;
    country: string;
    coordinates: { latitude: number; longitude: number };
  };
  metrics: {
    revenue: number;
    profit: number;
    cost: number;
    profitMargin: number;
    invoiceCount: number;
    productsOrdered: number;
  };
  visualization: {
    markerType: 'circle';
    markerSize: 'small' | 'medium' | 'large' | 'xl';
    markerColor: string;
    opacity: 0.8;
  };
}

interface Connection {
  id: string;
  type: 'supplier_to_customer';
  from: {
    type: 'supplier';
    id: number;
    name: string;
    city: string;
    state: string;
    coordinates: { latitude: number; longitude: number };
  };
  to: {
    type: 'customer';
    id: number;
    name: string;
    city: string;
    state: string;
    coordinates: { latitude: number; longitude: number };
  };
  metrics: {
    volume: number;
    transactionCount: number;
    productCount: number;
    strength: number;
  };
  visualization: {
    lineWidth: number;
    lineColor: string;
    opacity: number;
    dashArray: null;
    label: string;
  };
}

interface TradeRoute {
  id: string;
  type: 'state_to_state';
  from: { type: 'state'; code: string; name: string };
  to: { type: 'state'; code: string; name: string };
  metrics: {
    volume: number;
    transactionCount: number;
    customerCount: number;
    productCount: number;
    strength: number;
  };
  visualization: {
    lineWidth: number;
    lineColor: string;
    opacity: number;
    dashArray: null;
    label: string;
  };
}
```

---

## Summary Statistics

- **Total Suppliers**: 7
- **Total Customers** (in system): 663
- **Top Customers** (extracted): 50
- **Supplier-to-Customer Connections**: 30
- **State-to-State Trade Routes**: 20
- **Total Supplier Revenue**: $198.8M
- **Total Customer Revenue** (Top 50): $19.7M
- **Total Inter-State Trade Volume**: $74.6M
- **Market Concentration**: Litware, Inc. dominates with 58.4% share
