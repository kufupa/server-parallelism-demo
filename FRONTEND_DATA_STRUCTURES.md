# Frontend Data Structures

## 1. Cities (Markers)

```javascript
const cities = [
  {
    id: 31685,
    name: "Sinclair",
    state: "WY",
    stateName: "Wyoming",
    country: "United States",
    coordinates: {
      latitude: 41.7749592,
      longitude: -107.113103
    },
    population: 433,
    metrics: {
      revenue: 648919.36,
      profit: 288943.40,
      profitMargin: 44.53,
      customerCount: 2,
      invoiceCount: 234
    },
    visualization: {
      markerSize: "large",        // large|medium|small|xl
      markerColor: "#00aa00",     // Green (44.53% margin)
      opacity: 0.8
    }
  },
  {
    id: 33832,
    name: "Teutopolis",
    state: "IL",
    stateName: "Illinois",
    country: "United States",
    coordinates: {
      latitude: 39.1330967,
      longitude: -88.4719918
    },
    population: 1530,
    metrics: {
      revenue: 642559.07,
      profit: 269123.05,
      profitMargin: 41.88,
      customerCount: 2,
      invoiceCount: 214
    },
    visualization: {
      markerSize: "large",
      markerColor: "#ffcc00",     // Yellow (41.88% margin)
      opacity: 0.8
    }
  },
  {
    id: 9791,
    name: "East Fultonham",
    state: "OH",
    stateName: "Ohio",
    country: "United States",
    coordinates: {
      latitude: 39.8500679,
      longitude: -82.1220868
    },
    population: 335,
    metrics: {
      revenue: 628838.61,
      profit: 280544.80,
      profitMargin: 44.61,
      customerCount: 2,
      invoiceCount: 226
    },
    visualization: {
      markerSize: "large",
      markerColor: "#00aa00",     // Green
      opacity: 0.8
    }
  }
]
```

---

## 2. Connections (Lines/Edges)

```javascript
const connections = [
  {
    id: "CA-TX-001",
    type: "state_to_state",
    from: {
      name: "California",
      code: "CA",
      centerLatitude: 37.2577,
      centerLongitude: -119.4674,
      entityType: "state"
    },
    to: {
      name: "Texas",
      code: "TX",
      centerLatitude: 31.9686,
      centerLongitude: -99.9018,
      entityType: "state"
    },
    metrics: {
      volume: 8038785.58,
      transactionCount: 3252,
      customerCount: 46,
      productCount: 67,
      strength: 0.95                // 0-1 scale, higher = stronger flow
    },
    visualization: {
      lineWidth: 8,                 // pixels
      lineColor: "#ff6600",         // Orange
      opacity: 0.7,
      dashArray: null,              // solid line
      label: "CA → TX | $8.0M | 46 customers"
    }
  },
  {
    id: "CA-PA-001",
    type: "state_to_state",
    from: {
      name: "California",
      code: "CA",
      centerLatitude: 37.2577,
      centerLongitude: -119.4674,
      entityType: "state"
    },
    to: {
      name: "Pennsylvania",
      code: "PA",
      centerLatitude: 40.8258,
      centerLongitude: -77.0369,
      entityType: "state"
    },
    metrics: {
      volume: 6600832.20,
      transactionCount: 2609,
      customerCount: 37,
      productCount: 60,
      strength: 0.82
    },
    visualization: {
      lineWidth: 6,
      lineColor: "#ff9900",         // Orange
      opacity: 0.6,
      dashArray: null,
      label: "CA → PA | $6.6M | 37 customers"
    }
  },
  {
    id: "CA-NY-001",
    type: "state_to_state",
    from: {
      name: "California",
      code: "CA",
      centerLatitude: 37.2577,
      centerLongitude: -119.4674,
      entityType: "state"
    },
    to: {
      name: "New York",
      code: "NY",
      centerLatitude: 42.1657,
      centerLongitude: -74.9481,
      entityType: "state"
    },
    metrics: {
      volume: 6070205.42,
      transactionCount: 2380,
      customerCount: 35,
      productCount: 55,
      strength: 0.76
    },
    visualization: {
      lineWidth: 5,
      lineColor: "#ffcc00",         // Yellow
      opacity: 0.55,
      dashArray: null,
      label: "CA → NY | $6.1M | 35 customers"
    }
  },
  {
    id: "CA-FL-001",
    type: "state_to_state",
    from: {
      name: "California",
      code: "CA",
      centerLatitude: 37.2577,
      centerLongitude: -119.4674,
      entityType: "state"
    },
    to: {
      name: "Florida",
      code: "FL",
      centerLatitude: 27.9947,
      centerLongitude: -81.7603,
      entityType: "state"
    },
    metrics: {
      volume: 3983373.28,
      transactionCount: 1550,
      customerCount: 21,
      productCount: 45,
      strength: 0.50
    },
    visualization: {
      lineWidth: 3,
      lineColor: "#ffcc99",         // Light orange
      opacity: 0.45,
      dashArray: null,
      label: "CA → FL | $4.0M | 21 customers"
    }
  }
]
```

---

## 3. Statistics

```javascript
const stats = {
  totalCities: 37940,
  citiesWithCustomers: 655,
  totalRevenue: 198782967.68,
  totalProfit: 86033349.85,
  averageRevenue: 5239.40,
  maxRevenue: 648919.36,
  averageProfitMargin: 0.75,
  supplierCount: 7,
  statePairs: 45,
  topState: {
    name: "California",
    code: "CA",
    revenue: 116179331.95
  },
  topCity: {
    name: "Sinclair",
    state: "WY",
    revenue: 648919.36
  }
}
```

---

## 4. Search Results

```javascript
const searchResults = [
  {
    type: "city",
    id: 31685,
    name: "Sinclair, WY",
    coordinates: {
      latitude: 41.7749592,
      longitude: -107.113103
    },
    metrics: {
      revenue: 648919.36,
      customerCount: 2
    }
  },
  {
    type: "city",
    id: 33832,
    name: "Teutopolis, IL",
    coordinates: {
      latitude: 39.1330967,
      longitude: -88.4719918
    },
    metrics: {
      revenue: 642559.07,
      customerCount: 2
    }
  }
]
```

---

## 5. State Details

```javascript
const stateDetails = {
  state: {
    code: "CA",
    name: "California"
  },
  citiesCount: 12,
  cities: [
    {
      city_id: 31685,
      city_name: "Sinclair",
      state_code: "CA",
      revenue: 648919.36,
      profit: 288943.40,
      customer_count: 2
    },
    // ... more cities
  ],
  metrics: {
    totalRevenue: 116179331.95,
    totalCustomers: 663
  }
}
```

---

## Color Mapping Reference

```javascript
const colorMap = {
  profitMarginToColor: (margin) => {
    if (margin < 20) return "#cc0000";    // Red
    if (margin < 40) return "#ff6600";    // Orange
    if (margin < 50) return "#ffcc00";    // Yellow
    return "#00aa00";                     // Green
  },

  strengthToColor: (strength) => {
    if (strength < 0.3) return "#cccccc";    // Gray
    if (strength < 0.6) return "#ffcc00";    // Yellow
    return "#ff6600";                        // Orange
  }
}
```

---

## Size Mapping Reference

```javascript
const sizeMap = {
  markerSize: (revenue) => {
    if (revenue > 1000000) return "xl";
    if (revenue > 500000) return "large";
    if (revenue > 100000) return "medium";
    return "small";
  },

  markerPixels: {
    small: 4,
    medium: 8,
    large: 12,
    xl: 16
  },

  lineWidth: (strength, maxWidth = 12) => {
    return Math.max(2, Math.ceil(strength * maxWidth));
  }
}
```

---

## Usage Examples for Frontend

### Render a city marker
```javascript
city.coordinates.latitude   // Use for Y positioning
city.coordinates.longitude  // Use for X positioning
city.visualization.markerSize    // small|medium|large|xl
city.visualization.markerColor   // #hex color
city.metrics.revenue        // Show in tooltip
city.metrics.profitMargin   // Show in tooltip
```

### Render a connection line
```javascript
// Start point
connection.from.centerLatitude
connection.from.centerLongitude

// End point
connection.to.centerLatitude
connection.to.centerLongitude

// Styling
connection.visualization.lineWidth      // SVG/Canvas stroke width
connection.visualization.lineColor      // SVG/Canvas stroke color
connection.visualization.opacity        // SVG/Canvas opacity
connection.visualization.label          // Hover tooltip text
connection.metrics.volume               // Dollar amount for formatting
```

### Color and size selection
```javascript
// For cities, use profit margin to color
const color = profitMarginToColor(city.metrics.profitMargin);

// For lines, use strength to color
const color = strengthToColor(connection.metrics.strength);

// For sizing, convert metric to pixel size
const pixels = sizeMap.markerPixels[city.visualization.markerSize];
```

---

## TypeScript Interfaces (if using TS)

```typescript
interface City {
  id: number;
  name: string;
  state: string;
  stateName: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  population: number;
  metrics: {
    revenue: number;
    profit: number;
    profitMargin: number;
    customerCount: number;
    invoiceCount?: number;
  };
  visualization: {
    markerSize: "small" | "medium" | "large" | "xl";
    markerColor: string;  // hex color
    opacity: number;      // 0-1
  };
}

interface Connection {
  id: string;
  type: "state_to_state" | "supplier_to_customer" | "customer_hub";
  from: {
    name: string;
    code: string;
    centerLatitude: number;
    centerLongitude: number;
    entityType: "state" | "supplier" | "city";
  };
  to: {
    name: string;
    code: string;
    centerLatitude: number;
    centerLongitude: number;
    entityType: "state" | "customer" | "city";
  };
  metrics: {
    volume: number;
    transactionCount: number;
    customerCount: number;
    productCount: number;
    strength: number;  // 0-1
  };
  visualization: {
    lineWidth: number;
    lineColor: string;    // hex color
    opacity: number;      // 0-1
    dashArray: string | null;
    label: string;
  };
}

interface Stats {
  totalCities: number;
  citiesWithCustomers: number;
  totalRevenue: number;
  totalProfit: number;
  averageRevenue: number;
  maxRevenue: number;
  averageProfitMargin: number;
  supplierCount: number;
  statePairs: number;
  topState: {
    name: string;
    code: string;
    revenue: number;
  };
  topCity: {
    name: string;
    state: string;
    revenue: number;
  };
}
```
