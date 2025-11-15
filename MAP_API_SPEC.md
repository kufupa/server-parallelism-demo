# Map Data API Specification

## Overview
REST API for geographic business intelligence visualization. All data is sourced from local SQLite database (no remote calls).

---

## Base URL
```
http://localhost:3000/api/map
```

---

## 1. Cities Endpoint

### GET `/cities`
Fetch all cities with customer presence for map markers.

**Query Parameters:**
```
?state=TX              // Filter by state code (e.g., TX, CA, NY)
?country=USA           // Filter by country
?minRevenue=100000     // Filter by minimum revenue
?maxRevenue=1000000    // Filter by maximum revenue
?limit=50              // Limit results (default: all)
?sortBy=revenue|profit|population  // Sort field
```

**Response:**
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "id": 31685,
      "name": "Sinclair",
      "state": "WY",
      "stateName": "Wyoming",
      "country": "United States",
      "coordinates": {
        "latitude": 41.7749592,
        "longitude": -107.113103
      },
      "population": 433,
      "metrics": {
        "revenue": 648919.36,
        "profit": 288943.40,
        "profitMargin": 44.53,
        "customerCount": 2,
        "invoiceCount": 234
      },
      "visualization": {
        "markerSize": "large",        // small|medium|large based on revenue
        "markerColor": "#00aa00",     // Green gradient based on profit margin
        "opacity": 0.8
      }
    },
    ...
  ]
}
```

**Example Usage:**
```bash
# Top 20 cities by revenue
GET /api/map/cities?limit=20&sortBy=revenue

# California cities
GET /api/map/cities?state=CA&limit=100

# High revenue cities
GET /api/map/cities?minRevenue=500000&sortBy=profit
```

---

## 2. Connections Endpoint

### GET `/connections`
Fetch supply chain and geographic connections as lines/edges for visualization.

**Query Parameters:**
```
?type=supplier_to_customer|state_to_state  // Connection type
?minVolume=1000000                          // Filter by min trade volume
?maxConnections=30                          // Limit connections
?fromState=CA                               // Filter by source state
?toState=TX                                 // Filter by dest state
```

**Response:**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "id": "CA-TX-001",
      "type": "state_to_state",
      "from": {
        "name": "California",
        "code": "CA",
        "centerLatitude": 37.2577,
        "centerLongitude": -119.4674,
        "entityType": "state"
      },
      "to": {
        "name": "Texas",
        "code": "TX",
        "centerLatitude": 31.9686,
        "centerLongitude": -99.9018,
        "entityType": "state"
      },
      "metrics": {
        "volume": 8038785.58,
        "transactionCount": 3252,
        "customerCount": 46,
        "productCount": 67,
        "strength": 0.95    // 0-1 scale
      },
      "visualization": {
        "lineWidth": 8,
        "lineColor": "#ff6600",
        "opacity": 0.7,
        "dashArray": null,
        "label": "CA → TX | $8.0M | 46 customers"
      }
    },
    {
      "id": "CA-PA-001",
      "type": "state_to_state",
      "from": { "name": "California", "code": "CA", ... },
      "to": { "name": "Pennsylvania", "code": "PA", ... },
      "metrics": {
        "volume": 6600832.20,
        "transactionCount": 2609,
        "customerCount": 37,
        "productCount": 60,
        "strength": 0.82
      },
      "visualization": {
        "lineWidth": 6,
        "lineColor": "#ff9900",
        "opacity": 0.6,
        "label": "CA → PA | $6.6M | 37 customers"
      }
    }
  ]
}
```

**Example Usage:**
```bash
# All inter-state flows
GET /api/map/connections?type=state_to_state

# Major flows only (>$5M)
GET /api/map/connections?type=state_to_state&minVolume=5000000

# What flows OUT of California
GET /api/map/connections?fromState=CA&type=state_to_state&limit=15

# What flows INTO Texas
GET /api/map/connections?toState=TX&type=state_to_state
```

---

## 3. Suppliers Endpoint

### GET `/suppliers`
Get supplier locations and their geographic reach.

**Query Parameters:**
```
?state=CA              // Filter by supplier state
?minCustomers=100      // Filter by customer reach
?sortBy=revenue|customerCount
```

**Response:**
```json
{
  "success": true,
  "count": 7,
  "data": [
    {
      "id": 1,
      "name": "Litware, Inc.",
      "city": "Mokelumne Hill",
      "state": "CA",
      "coordinates": {
        "latitude": 38.3141,
        "longitude": -120.8216
      },
      "metrics": {
        "revenue": 116179331.95,
        "customerServed": 663,
        "productCount": 67,
        "marketShare": 0.585    // Percentage of total market
      },
      "visualization": {
        "markerType": "star",
        "markerSize": "xl",
        "markerColor": "#cc0000"
      }
    }
  ]
}
```

---

## 4. Statistics Endpoint

### GET `/stats`
Overall metrics for dashboard/legend.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCities": 37940,
    "citiesWithCustomers": 655,
    "totalRevenue": 198782967.68,
    "totalProfit": 86033349.85,
    "averageRevenue": 5239.40,
    "maxRevenue": 648919.36,
    "averageProfitMargin": 0.75,
    "supplierCount": 7,
    "statePairs": 45,
    "topState": {
      "name": "California",
      "code": "CA",
      "revenue": 68000000.00
    },
    "topCity": {
      "name": "Sinclair",
      "state": "WY",
      "revenue": 648919.36
    }
  }
}
```

---

## 5. Search Endpoint

### GET `/search`
Search for cities or suppliers.

**Query Parameters:**
```
?q=sinclair            // Search query
?type=city|supplier    // Entity type
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "type": "city",
      "id": 31685,
      "name": "Sinclair, WY",
      "coordinates": {
        "latitude": 41.7749592,
        "longitude": -107.113103
      },
      "metrics": {
        "revenue": 648919.36,
        "customerCount": 2
      }
    }
  ]
}
```

---

## 6. State Details Endpoint

### GET `/states/:stateCode`
Get all cities and connections for a specific state.

**Response:**
```json
{
  "success": true,
  "state": {
    "code": "CA",
    "name": "California",
    "centerLatitude": 37.2577,
    "centerLongitude": -119.4674
  },
  "cities": [
    { "id": 1, "name": "Mokelumne Hill", "revenue": 116179331.95, ... }
  ],
  "outboundConnections": [
    { "toState": "TX", "volume": 8038785.58, "customerCount": 46, ... }
  ],
  "inboundConnections": [],
  "metrics": {
    "totalRevenue": 116000000.00,
    "totalCustomers": 663
  }
}
```

---

## Data Types & Enumerations

### Visualization Strength (0-1 scale)
```
0.0 - 0.3  = Weak    (thin line, low opacity)
0.3 - 0.6  = Medium  (medium line, medium opacity)
0.6 - 1.0  = Strong  (thick line, high opacity)
```

### Marker Sizes
```
small   = < $100K revenue
medium  = $100K - $500K
large   = $500K - $1M
xl      = > $1M (suppliers)
```

### Colors (Profit Margin Based)
```
Red    (#cc0000)    = < 20% margin
Orange (#ff6600)    = 20-40% margin
Yellow (#ffcc00)    = 40-50% margin
Green  (#00aa00)    = > 50% margin
Gray   (#cccccc)    = No customers
```

---

## Frontend Implementation Example

### Using D3.js / Mapbox
```javascript
// Fetch cities
const citiesResp = await fetch('/api/map/cities?limit=100');
const cities = await citiesResp.json();

// Plot on map
cities.data.forEach(city => {
  addMarker({
    lat: city.coordinates.latitude,
    lng: city.coordinates.longitude,
    size: city.visualization.markerSize,
    color: city.visualization.markerColor,
    popup: `${city.name}, ${city.state} - $${city.metrics.revenue.toLocaleString()}`
  });
});

// Fetch connections
const connResp = await fetch('/api/map/connections?type=state_to_state');
const connections = await connResp.json();

// Draw lines
connections.data.forEach(conn => {
  drawLine({
    from: [conn.from.centerLatitude, conn.from.centerLongitude],
    to: [conn.to.centerLatitude, conn.to.centerLongitude],
    width: conn.visualization.lineWidth,
    color: conn.visualization.lineColor,
    label: conn.visualization.label
  });
});
```

---

## Filtering Examples

**Show only high-value cities:**
```
GET /api/map/cities?minRevenue=500000&limit=30
```

**Show California supply chains:**
```
GET /api/map/connections?fromState=CA&type=state_to_state
```

**Search for a specific city:**
```
GET /api/map/search?q=sinclair&type=city
```

**Get Texas customer hubs:**
```
GET /api/map/cities?state=TX&sortBy=revenue&limit=20
```

---

## Performance Notes
- All queries run locally on SQLite (no remote DB calls)
- Response times < 100ms
- Data is cached; refresh with sync script if needed
- Max 37,940 cities total; recommend filtering for web rendering
