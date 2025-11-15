/**
 * Data Transformation Layer
 * Converts SQLite data format → Frontend Location format
 */

/**
 * Transform supplier row to Location format
 */
function transformSupplier(row) {
  return {
    id: row.id,
    name: row.name,
    state: row.state,
    stateName: row.state_name,
    country: row.country,
    city: row.city,
    coordinates: {
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude)
    },
    population: 0, // Not available for suppliers
    metrics: {
      revenue: parseFloat(row.revenue || 0),
      profit: 0, // Not tracked for suppliers
      profitMargin: 0,
      customerCount: row.customers_served
    },
    type: 'supplier',
    connections: [] // Will be populated separately
  };
}

/**
 * Transform customer row to Location format
 */
function transformCustomer(row) {
  return {
    id: row.id,
    name: row.name,
    state: row.state,
    stateName: row.state_name,
    country: row.country,
    city: row.city,
    coordinates: {
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude)
    },
    population: 0, // Not available in current schema
    metrics: {
      revenue: parseFloat(row.revenue || 0),
      profit: parseFloat(row.profit || 0),
      profitMargin: parseFloat(row.profit_margin || 0),
      customerCount: 1 // Each customer is one "customer"
    },
    type: 'customer',
    connections: [] // Will be populated separately
  };
}

/**
 * Transform connection row to Connection format
 */
function transformConnection(row) {
  return {
    targetId: row.to_id,
    volume: parseFloat(row.volume || 0),
    products: row.product_count,
    invoices: row.transaction_count
  };
}

/**
 * Attach connections to locations
 */
function attachConnectionsToLocations(locations, connections) {
  const locationMap = new Map(locations.map(loc => [loc.id, loc]));

  connections.forEach(conn => {
    const supplier = locationMap.get(conn.from_id);
    if (supplier && supplier.type === 'supplier') {
      supplier.connections.push({
        targetId: conn.to_id,
        volume: parseFloat(conn.volume || 0),
        products: conn.product_count,
        invoices: conn.transaction_count
      });
    }
  });

  return locations;
}

module.exports = {
  transformSupplier,
  transformCustomer,
  transformConnection,
  attachConnectionsToLocations
};
