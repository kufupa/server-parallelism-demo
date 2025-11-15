/**
 * Quick integration test script
 * Tests backend API endpoints and verifies data structure
 */

const http = require('http');

// Helper function to make HTTP requests
function makeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = new URL(url);
    options.method = method;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Test suite
async function runTests() {
  console.log('🧪 Running Integration Tests...\n');

  let passCount = 0;
  let failCount = 0;

  // Test 1: Health Check
  try {
    console.log('Test 1: GET /api/health');
    const res = await makeRequest('http://localhost:3000/api/health');
    if (res.status === 200 && res.data.status === 'ok') {
      console.log('✅ PASS: Health check responding\n');
      passCount++;
    } else {
      console.log(`❌ FAIL: Expected status 200 and status='ok', got ${res.status}\n`);
      failCount++;
    }
  } catch (e) {
    console.log(`❌ FAIL: ${e.message}\n`);
    failCount++;
  }

  // Test 2: Get all locations
  try {
    console.log('Test 2: GET /api/locations?limit=5');
    const res = await makeRequest('http://localhost:3000/api/locations?limit=5');
    if (res.status === 200 && res.data.locations && res.data.locations.length > 0) {
      const loc = res.data.locations[0];
      const hasRequired = loc.id && loc.name && loc.type && loc.coordinates;
      if (hasRequired) {
        console.log(`✅ PASS: Got ${res.data.count} locations, sample location:`);
        console.log(`   ID: ${loc.id}, Name: ${loc.name}, Type: ${loc.type}`);
        console.log(`   Coordinates: [${loc.coordinates.latitude}, ${loc.coordinates.longitude}]\n`);
        passCount++;
      } else {
        console.log(`❌ FAIL: Location missing required fields\n`);
        failCount++;
      }
    } else {
      console.log(`❌ FAIL: Expected locations array\n`);
      failCount++;
    }
  } catch (e) {
    console.log(`❌ FAIL: ${e.message}\n`);
    failCount++;
  }

  // Test 3: Get suppliers only
  try {
    console.log('Test 3: GET /api/locations?type=supplier');
    const res = await makeRequest('http://localhost:3000/api/locations?type=supplier');
    if (res.status === 200 && res.data.locations && res.data.count === 7) {
      console.log(`✅ PASS: Got ${res.data.count} suppliers (expected 7)\n`);
      passCount++;
    } else {
      console.log(`❌ FAIL: Expected 7 suppliers, got ${res.data.count}\n`);
      failCount++;
    }
  } catch (e) {
    console.log(`❌ FAIL: ${e.message}\n`);
    failCount++;
  }

  // Test 4: Get stats
  try {
    console.log('Test 4: GET /api/stats');
    const res = await makeRequest('http://localhost:3000/api/stats');
    if (res.status === 200 && res.data.stats) {
      const s = res.data.stats;
      console.log(`✅ PASS: Stats retrieved`);
      console.log(`   Total Locations: ${s.totalLocations}`);
      console.log(`   Suppliers: ${s.totalSuppliers}, Customers: ${s.totalCustomers}`);
      console.log(`   Trade Volume: $${s.totalTradeVolume.toFixed(2)}\n`);
      passCount++;
    } else {
      console.log(`❌ FAIL: Stats not available\n`);
      failCount++;
    }
  } catch (e) {
    console.log(`❌ FAIL: ${e.message}\n`);
    failCount++;
  }

  // Test 5: Get single location with connections
  try {
    console.log('Test 5: GET /api/locations/:id (first supplier)');
    const res = await makeRequest('http://localhost:3000/api/locations/7');
    if (res.status === 200 && res.data.location) {
      const loc = res.data.location;
      console.log(`✅ PASS: Location retrieved - ${loc.name}`);
      console.log(`   Type: ${loc.type}`);
      console.log(`   Connections: ${loc.connections ? loc.connections.length : 0}\n`);
      passCount++;
    } else {
      console.log(`❌ FAIL: Location not found\n`);
      failCount++;
    }
  } catch (e) {
    console.log(`❌ FAIL: ${e.message}\n`);
    failCount++;
  }

  // Test 6: Get connections
  try {
    console.log('Test 6: GET /api/connections?limit=3');
    const res = await makeRequest('http://localhost:3000/api/connections?limit=3');
    if (res.status === 200 && res.data.connections) {
      console.log(`✅ PASS: Got ${res.data.count} connections (limit 3, showing first 3):`);
      res.data.connections.slice(0, 3).forEach((conn, i) => {
        console.log(`   ${i+1}. Supplier ${conn.from_id} → Customer ${conn.to_id}: $${conn.volume.toFixed(2)}`);
      });
      console.log('');
      passCount++;
    } else {
      console.log(`❌ FAIL: Connections not available\n`);
      failCount++;
    }
  } catch (e) {
    console.log(`❌ FAIL: ${e.message}\n`);
    failCount++;
  }

  // Test 7: Verify CORS headers
  try {
    console.log('Test 7: CORS Headers Check');
    const res = await makeRequest('http://localhost:3000/api/health');
    const hasACO = res.headers['access-control-allow-origin'];
    if (hasACO) {
      console.log(`✅ PASS: CORS enabled (Access-Control-Allow-Origin: ${hasACO})\n`);
      passCount++;
    } else {
      console.log(`❌ FAIL: CORS not properly configured\n`);
      failCount++;
    }
  } catch (e) {
    console.log(`❌ FAIL: ${e.message}\n`);
    failCount++;
  }

  // Summary
  console.log('━'.repeat(50));
  console.log(`\n📊 Test Results: ${passCount} passed, ${failCount} failed`);
  if (failCount === 0) {
    console.log('✅ All tests passed! Integration is working correctly.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
