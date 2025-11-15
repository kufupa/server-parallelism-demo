const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const localDbPath = path.join(__dirname, 'local-map-data.db');

class LocalMapAPI {
  constructor() {
    this.db = new sqlite3.Database(localDbPath);
  }

  all(query) {
    return new Promise((resolve, reject) => {
      this.db.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  get(query) {
    return new Promise((resolve, reject) => {
      this.db.get(query, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getTopCitiesByRevenue(limit = 50) {
    return this.all(`
      SELECT * FROM map_data
      WHERE customer_count > 0
      ORDER BY revenue DESC
      LIMIT ${limit}
    `);
  }

  async getTopCitiesByProfit(limit = 50) {
    return this.all(`
      SELECT * FROM map_data
      WHERE customer_count > 0
      ORDER BY profit DESC
      LIMIT ${limit}
    `);
  }

  async getCitiesByState(stateCode) {
    return this.all(`
      SELECT * FROM map_data
      WHERE state_code = '${stateCode}' AND customer_count > 0
      ORDER BY revenue DESC
    `);
  }

  async getCitiesByCountry(countryName) {
    return this.all(`
      SELECT * FROM map_data
      WHERE country_name = '${countryName}' AND customer_count > 0
      ORDER BY revenue DESC
    `);
  }

  async searchByCity(cityName) {
    return this.all(`
      SELECT * FROM map_data
      WHERE city_name LIKE '%${cityName}%'
      ORDER BY revenue DESC
    `);
  }

  async getCityById(cityId) {
    return this.get(`SELECT * FROM map_data WHERE city_id = ${cityId}`);
  }

  async getStats() {
    return this.get(`
      SELECT
        COUNT(*) as total_cities,
        COUNT(CASE WHEN customer_count > 0 THEN 1 END) as cities_with_customers,
        SUM(revenue) as total_revenue,
        SUM(profit) as total_profit,
        AVG(revenue) as avg_revenue,
        MAX(revenue) as max_revenue,
        MIN(revenue) as min_revenue,
        AVG(profit_margin) as avg_profit_margin
      FROM map_data
    `);
  }

  async getMapGeometry() {
    // Get all cities with coordinates for map rendering
    return this.all(`
      SELECT
        city_id,
        city_name,
        state_code,
        latitude,
        longitude,
        population,
        revenue,
        profit,
        profit_margin,
        customer_count
      FROM map_data
      WHERE customer_count > 0
      ORDER BY revenue DESC
    `);
  }

  close() {
    this.db.close();
  }
}

// Example usage
(async () => {
  const api = new LocalMapAPI();

  console.log('=== LOCAL MAP API ===\n');

  // Get stats
  const stats = await api.getStats();
  console.log('Stats:', stats);

  // Get top 5 by revenue
  console.log('\nTop 5 by revenue:');
  const topRevenue = await api.getTopCitiesByRevenue(5);
  topRevenue.forEach(city => {
    console.log(`  ${city.city_name} (${city.state_code}): $${city.revenue.toFixed(2)}`);
  });

  // Get top 5 by profit
  console.log('\nTop 5 by profit:');
  const topProfit = await api.getTopCitiesByProfit(5);
  topProfit.forEach(city => {
    console.log(`  ${city.city_name} (${city.state_code}): $${city.profit.toFixed(2)}`);
  });

  // Search
  console.log('\nSearch "Trilby":');
  const search = await api.searchByCity('Trilby');
  search.forEach(city => {
    console.log(`  ${city.city_name} (${city.state_code}): $${city.revenue.toFixed(2)} revenue`);
  });

  api.close();
})();

module.exports = LocalMapAPI;
