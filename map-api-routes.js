const express = require('express');
const LocalMapAPI = require('./local-map-api');

const router = express.Router();
const api = new LocalMapAPI();

// Helper function to calculate visualization color based on profit margin
function getMarkerColor(profitMargin) {
  if (profitMargin < 20) return '#cc0000';    // Red
  if (profitMargin < 40) return '#ff6600';    // Orange
  if (profitMargin < 50) return '#ffcc00';    // Yellow
  return '#00aa00';                           // Green
}

// Helper function to get marker size
function getMarkerSize(revenue) {
  if (revenue > 1000000) return 'xl';
  if (revenue > 500000) return 'large';
  if (revenue > 100000) return 'medium';
  return 'small';
}

// Helper function to calculate line strength (0-1)
function calculateStrength(volume, maxVolume = 10000000) {
  return Math.min(volume / maxVolume, 1.0);
}

// Helper function to get line properties based on strength
function getLineVisualization(strength, volume) {
  const width = Math.max(2, Math.ceil(strength * 12));
  const opacity = 0.4 + (strength * 0.6);

  let color;
  if (strength < 0.3) color = '#cccccc';    // Gray
  else if (strength < 0.6) color = '#ffcc00';  // Yellow
  else color = '#ff6600';                    // Orange

  return { lineWidth: width, lineColor: color, opacity };
}

/**
 * GET /api/map/cities
 * Fetch all cities with customer presence
 */
router.get('/cities', async (req, res) => {
  try {
    const { state, country, minRevenue, maxRevenue, limit, sortBy } = req.query;

    let query = `
      SELECT * FROM map_data
      WHERE customer_count > 0
    `;

    if (state) query += ` AND state_code = '${state}'`;
    if (country) query += ` AND country_name = '${country}'`;
    if (minRevenue) query += ` AND revenue >= ${parseFloat(minRevenue)}`;
    if (maxRevenue) query += ` AND revenue <= ${parseFloat(maxRevenue)}`;

    const sortField = {
      revenue: 'revenue',
      profit: 'profit',
      population: 'population'
    }[sortBy] || 'revenue';

    query += ` ORDER BY ${sortField} DESC`;
    if (limit) query += ` LIMIT ${parseInt(limit)}`;

    const cities = await api.all(query);

    const data = cities.map(city => ({
      id: city.city_id,
      name: city.city_name,
      state: city.state_code,
      stateName: city.state_name,
      country: city.country_name,
      coordinates: {
        latitude: city.latitude,
        longitude: city.longitude
      },
      population: city.population,
      metrics: {
        revenue: parseFloat(city.revenue),
        profit: parseFloat(city.profit),
        profitMargin: parseFloat(city.profit_margin),
        customerCount: city.customer_count
      },
      visualization: {
        markerSize: getMarkerSize(city.revenue),
        markerColor: getMarkerColor(city.profit_margin),
        opacity: 0.8
      }
    }));

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/map/connections
 * Fetch supply chain connections between states
 */
router.get('/connections', async (req, res) => {
  try {
    const { minVolume, maxConnections, fromState, toState } = req.query;

    // For now, return state-to-state connections from our analysis
    let connections = [
      { from: 'CA', to: 'TX', volume: 8038785.58, customers: 46, transactions: 3252, products: 67 },
      { from: 'CA', to: 'PA', volume: 6600832.20, customers: 37, transactions: 2609, products: 60 },
      { from: 'CA', to: 'NY', volume: 6070205.42, customers: 35, transactions: 2380, products: 55 },
      { from: 'CA', to: 'FL', volume: 3983373.28, customers: 21, transactions: 1550, products: 45 },
      { from: 'CA', to: 'OH', volume: 3872999.21, customers: 21, transactions: 1536, products: 44 },
      { from: 'KY', to: 'TX', volume: 3759323.55, customers: 46, transactions: 3470, products: 74 },
      { from: 'CA', to: 'NJ', volume: 3497418.19, customers: 18, transactions: 1397, products: 40 },
      { from: 'CA', to: 'MN', volume: 3480409.16, customers: 19, transactions: 1328, products: 42 },
      { from: 'CA', to: 'MO', volume: 3341487.01, customers: 18, transactions: 1307, products: 39 },
      { from: 'CA', to: 'NM', volume: 3108295.38, customers: 18, transactions: 1301, products: 38 }
    ];

    // State coordinates (approximate centers)
    const stateCoords = {
      CA: { lat: 37.2577, lon: -119.4674 },
      TX: { lat: 31.9686, lon: -99.9018 },
      PA: { lat: 40.8258, lon: -77.0369 },
      NY: { lat: 42.1657, lon: -74.9481 },
      FL: { lat: 27.9947, lon: -81.7603 },
      OH: { lat: 40.3888, lon: -82.7649 },
      KY: { lat: 37.6681, lon: -84.6701 },
      NJ: { lat: 40.2989, lon: -74.5210 },
      MN: { lat: 45.6945, lon: -93.9196 },
      MO: { lat: 38.4561, lon: -92.2884 },
      NM: { lat: 34.5199, lon: -105.8701 }
    };

    if (minVolume) {
      connections = connections.filter(c => c.volume >= parseFloat(minVolume));
    }
    if (fromState) {
      connections = connections.filter(c => c.from === fromState.toUpperCase());
    }
    if (toState) {
      connections = connections.filter(c => c.to === toState.toUpperCase());
    }
    if (maxConnections) {
      connections = connections.slice(0, parseInt(maxConnections));
    }

    const maxVolume = Math.max(...connections.map(c => c.volume));

    const data = connections.map((conn, idx) => ({
      id: `${conn.from}-${conn.to}-${idx}`,
      type: 'state_to_state',
      from: {
        name: conn.from,
        code: conn.from,
        centerLatitude: stateCoords[conn.from]?.lat || 0,
        centerLongitude: stateCoords[conn.from]?.lon || 0,
        entityType: 'state'
      },
      to: {
        name: conn.to,
        code: conn.to,
        centerLatitude: stateCoords[conn.to]?.lat || 0,
        centerLongitude: stateCoords[conn.to]?.lon || 0,
        entityType: 'state'
      },
      metrics: {
        volume: conn.volume,
        transactionCount: conn.transactions,
        customerCount: conn.customers,
        productCount: conn.products,
        strength: calculateStrength(conn.volume, maxVolume)
      },
      visualization: {
        ...getLineVisualization(calculateStrength(conn.volume, maxVolume), conn.volume),
        dashArray: null,
        label: `${conn.from} → ${conn.to} | $${(conn.volume / 1000000).toFixed(1)}M | ${conn.customers} customers`
      }
    }));

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/map/stats
 * Overall statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await api.getStats();
    const topCities = await api.getTopCitiesByRevenue(1);
    const topRevenue = await api.all(`
      SELECT state_code, state_name, SUM(revenue) as total_revenue
      FROM map_data
      GROUP BY state_code, state_name
      ORDER BY total_revenue DESC
      LIMIT 1
    `);

    const topState = topRevenue[0];
    const topCity = topCities[0];

    res.json({
      success: true,
      data: {
        totalCities: stats.total_cities,
        citiesWithCustomers: stats.cities_with_customers,
        totalRevenue: parseFloat(stats.total_revenue),
        totalProfit: parseFloat(stats.total_profit),
        averageRevenue: parseFloat(stats.avg_revenue),
        maxRevenue: parseFloat(stats.max_revenue),
        averageProfitMargin: parseFloat(stats.avg_profit_margin),
        supplierCount: 7,
        statePairs: 15,
        topState: {
          name: topState?.state_name,
          code: topState?.state_code,
          revenue: parseFloat(topState?.total_revenue || 0)
        },
        topCity: {
          name: topCity?.city_name,
          state: topCity?.state_code,
          revenue: parseFloat(topCity?.revenue || 0)
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/map/search
 * Search for cities
 */
router.get('/search', async (req, res) => {
  try {
    const { q, type } = req.query;

    if (!q) {
      return res.json({ success: false, error: 'Query parameter required' });
    }

    const cities = await api.all(`
      SELECT * FROM map_data
      WHERE city_name LIKE '%${q}%' AND customer_count > 0
      LIMIT 20
    `);

    const results = cities.map(city => ({
      type: 'city',
      id: city.city_id,
      name: `${city.city_name}, ${city.state_code}`,
      coordinates: {
        latitude: city.latitude,
        longitude: city.longitude
      },
      metrics: {
        revenue: parseFloat(city.revenue),
        customerCount: city.customer_count
      }
    }));

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/map/states/:stateCode
 * Get details for a specific state
 */
router.get('/states/:stateCode', async (req, res) => {
  try {
    const { stateCode } = req.params;

    const cities = await api.all(`
      SELECT * FROM map_data
      WHERE state_code = '${stateCode}' AND customer_count > 0
      ORDER BY revenue DESC
    `);

    const metrics = cities.reduce((acc, city) => ({
      totalRevenue: acc.totalRevenue + parseFloat(city.revenue),
      totalCustomers: acc.totalCustomers + city.customer_count
    }), { totalRevenue: 0, totalCustomers: 0 });

    res.json({
      success: true,
      state: {
        code: stateCode,
        name: cities[0]?.state_name || stateCode
      },
      citiesCount: cities.length,
      cities: cities.slice(0, 20),
      metrics
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
