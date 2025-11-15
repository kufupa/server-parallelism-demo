# Frontend Integration Guide

## Quick Start for Frontend Developer

### 1. Add Map Routes to Express Server

In your `index.js`:

```javascript
const mapRoutes = require('./map-api-routes');

// Add this before app.listen()
app.use('/api/map', mapRoutes);

// Now you have:
// GET /api/map/cities
// GET /api/map/connections
// GET /api/map/stats
// GET /api/map/search
// GET /api/map/states/:stateCode
```

---

## 2. Frontend Setup Example (React + Mapbox)

```jsx
import { useEffect, useState } from 'react';
import MapboxGL from '@mapbox/mapbox-gl';

export function MapVisualization() {
  const [cities, setCities] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch map data
    Promise.all([
      fetch('/api/map/cities?limit=100').then(r => r.json()),
      fetch('/api/map/connections?type=state_to_state').then(r => r.json()),
      fetch('/api/map/stats').then(r => r.json())
    ]).then(([citiesData, connectionsData, statsData]) => {
      setCities(citiesData.data);
      setConnections(connectionsData.data);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h2>Supply Chain Map</h2>
      <p>Cities: {cities.length} | Connections: {connections.length}</p>

      {/* Plot cities as markers */}
      {cities.map(city => (
        <Marker
          key={city.id}
          latitude={city.coordinates.latitude}
          longitude={city.coordinates.longitude}
          size={city.visualization.markerSize}
          color={city.visualization.markerColor}
          label={`${city.name}: $${city.metrics.revenue.toLocaleString()}`}
        />
      ))}

      {/* Draw connections as lines */}
      {connections.map(conn => (
        <Line
          key={conn.id}
          from={[conn.from.centerLatitude, conn.from.centerLongitude]}
          to={[conn.to.centerLatitude, conn.to.centerLongitude]}
          width={conn.visualization.lineWidth}
          color={conn.visualization.lineColor}
          label={conn.visualization.label}
        />
      ))}
    </div>
  );
}
```

---

## 3. Using D3.js Instead

```javascript
// Fetch all data
const citiesResp = await fetch('/api/map/cities?limit=200');
const connectionsResp = await fetch('/api/map/connections');
const cities = (await citiesResp.json()).data;
const connections = (await connectionsResp.json()).data;

// Plot cities as circles
d3.select('svg')
  .selectAll('circle.city')
  .data(cities)
  .enter()
  .append('circle')
  .attr('class', 'city')
  .attr('cx', d => projection([d.coordinates.longitude, d.coordinates.latitude])[0])
  .attr('cy', d => projection([d.coordinates.longitude, d.coordinates.latitude])[1])
  .attr('r', d => {
    const sizes = { small: 3, medium: 6, large: 10, xl: 15 };
    return sizes[d.visualization.markerSize] || 5;
  })
  .attr('fill', d => d.visualization.markerColor)
  .attr('opacity', d => d.visualization.opacity)
  .on('mouseover', d => showTooltip(d))
  .on('mouseout', hideTooltip);

// Draw connections as paths
d3.select('svg')
  .selectAll('line.connection')
  .data(connections)
  .enter()
  .append('line')
  .attr('class', 'connection')
  .attr('x1', d => projection([d.from.centerLongitude, d.from.centerLatitude])[0])
  .attr('y1', d => projection([d.from.centerLatitude, d.from.centerLatitude])[1])
  .attr('x2', d => projection([d.to.centerLongitude, d.to.centerLatitude])[0])
  .attr('y2', d => projection([d.to.centerLatitude, d.to.centerLatitude])[1])
  .attr('stroke', d => d.visualization.lineColor)
  .attr('stroke-width', d => d.visualization.lineWidth)
  .attr('opacity', d => d.visualization.opacity);
```

---

## 4. What Data You Get

### Cities (Markers)
```
✓ Latitude/Longitude (for positioning)
✓ Revenue & Profit (for sizing/coloring)
✓ Profit Margin (for color coding: red/orange/yellow/green)
✓ Customer Count (for labels)
✓ Population (for sizing alternative)
✓ State & Country (for grouping)
```

### Connections (Lines)
```
✓ From/To State coordinates (for line endpoints)
✓ Trade Volume (for line width)
✓ Customer Count (for labeling)
✓ Transaction Count (for labeling)
✓ Strength (0-1 scale, derived from volume)
✓ Pre-calculated line width, color, opacity
```

### Stats (Dashboard)
```
✓ Total metrics for KPIs
✓ Top state & top city
✓ Overall statistics
```

---

## 5. Filtering Examples

```javascript
// Get top 20 cities by revenue
fetch('/api/map/cities?limit=20&sortBy=revenue')

// Get cities in California
fetch('/api/map/cities?state=CA')

// Get high-revenue cities
fetch('/api/map/cities?minRevenue=500000')

// Get connections from California
fetch('/api/map/connections?fromState=CA')

// Get major connections only
fetch('/api/map/connections?minVolume=5000000')

// Search for a city
fetch('/api/map/search?q=sinclair')

// Get state details
fetch('/api/map/states/CA')
```

---

## 6. Visualization Tips

### Color Scheme
```
Green (#00aa00)   = Healthy (>50% margin)
Yellow (#ffcc00)  = Good (40-50% margin)
Orange (#ff6600)  = Fair (20-40% margin)
Red (#cc0000)     = Low (<20% margin)
```

### Marker Sizes
```
xl      = Supplier hubs (>$1M revenue)
large   = Major hubs ($500K-$1M)
medium  = Active cities ($100K-$500K)
small   = Lesser volume (<$100K)
```

### Connection Strength
```
Thick, Opaque     = Strong flows ($5M+)
Medium            = Moderate flows ($1M-$5M)
Thin, Transparent = Weak flows (<$1M)
```

---

## 7. Sample Frontend Code Snippets

### React Hook for Fetching
```javascript
export function useMapData() {
  const [data, setData] = useState({
    cities: [],
    connections: [],
    stats: {}
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/map/cities?limit=150').then(r => r.json()),
      fetch('/api/map/connections').then(r => r.json()),
      fetch('/api/map/stats').then(r => r.json())
    ]).then(([cities, connections, stats]) => {
      setData({
        cities: cities.data,
        connections: connections.data,
        stats: stats.data
      });
    });
  }, []);

  return data;
}
```

### Vue.js Component
```vue
<template>
  <div class="map-container">
    <h1>Supply Chain Visualization</h1>
    <div v-if="loading">Loading...</div>
    <svg v-else ref="map" width="1200" height="800"></svg>
  </div>
</template>

<script>
export default {
  data() {
    return {
      cities: [],
      connections: [],
      loading: true
    }
  },
  mounted() {
    Promise.all([
      fetch('/api/map/cities?limit=150').then(r => r.json()),
      fetch('/api/map/connections').then(r => r.json())
    ]).then(([c, conn]) => {
      this.cities = c.data;
      this.connections = conn.data;
      this.loading = false;
      this.render();
    });
  }
}
</script>
```

---

## Files You Have

- `MAP_API_SPEC.md` - Complete API specification
- `map-api-routes.js` - Express endpoints (add to your server)
- `local-map-api.js` - SQLite query interface
- `local-map-data.db` - All 37,940 cities locally cached
- `map-data-export.csv` - CSV export if needed

Everything is local - no remote DB calls needed!
