# Frontend Integration Guide - Profit Analytics

## 📊 How the Data Flows

```
Database (SQL Server)
        ↓
   API Endpoints
        ↓
  JSON Response
        ↓
   Frontend UI
```

---

## 🔧 Core Data Structure

### **Product Profit Record**
```json
{
  "StockItemID": 161,
  "StockItemName": "Sodium Bicarbonate Alpha",
  "Quantity": 110,
  "UnitSalePrice": 108,
  "UnitCostPrice": 16,
  "TotalRevenue": 11880,
  "TotalCost": 1760,
  "TotalProfit": 10120,
  "ProfitMarginPercent": 85.19
}
```

### **Field Explanations**
| Field | Source | Meaning |
|-------|--------|---------|
| `StockItemID` | `Warehouse.StockItems.StockItemID` | Unique product ID |
| `StockItemName` | `Warehouse.StockItems.StockItemName` | Product name |
| `Quantity` | `SUM(Sales.OrderLines.Quantity)` | Total units sold to this customer |
| `UnitSalePrice` | `Sales.OrderLines.UnitPrice` | Price per unit sold to customer |
| `UnitCostPrice` | `Purchasing.PurchaseOrderLines.ExpectedUnitPricePerOuter / Warehouse.StockItems.QuantityPerOuter` | Cost per unit |
| `TotalRevenue` | `Quantity × UnitSalePrice` | Total revenue from this product |
| `TotalCost` | `Quantity × UnitCostPrice` | Total cost of goods sold |
| `TotalProfit` | `TotalRevenue - TotalCost` | Actual profit made |
| `ProfitMarginPercent` | `(TotalProfit / TotalRevenue) × 100` | Profit margin % |

---

## 📡 API Endpoint Suggestions

### **1. Get Top N Profitable Products for a Customer**
```
GET /api/customers/:customerId/top-products?limit=15&orderBy=profit
```

**Response:**
```json
{
  "status": "success",
  "customerId": 977,
  "customerName": "Customer-977-8-816",
  "totalProducts": 176,
  "data": [
    {
      "rank": 1,
      "StockItemID": 215,
      "StockItemName": "Iron(III) Chloride Beta",
      "Quantity": 27,
      "UnitSalePrice": 1899,
      "UnitCostPrice": 1140,
      "TotalRevenue": 51273,
      "TotalCost": 30780,
      "TotalProfit": 20493,
      "ProfitMarginPercent": 39.97
    },
    // ... more products
  ]
}
```

---

### **2. Get Customer Profit Summary**
```
GET /api/customers/:customerId/profit-summary
```

**Response:**
```json
{
  "status": "success",
  "customer": {
    "CustomerID": 977,
    "CustomerName": "Customer-977-8-816",
    "TotalOrders": 121,
    "TotalUnitsOrdered": 16274,
    "TotalRevenue": 380252.40,
    "TotalCost": 201839.30,
    "TotalProfit": 178413.10,
    "ProfitMarginPercent": 46.92
  }
}
```

---

### **3. Get Top N Customers by Profit**
```
GET /api/customers/top?limit=5&orderBy=profit
```

**Response:**
```json
{
  "status": "success",
  "count": 5,
  "data": [
    {
      "rank": 1,
      "CustomerID": 964,
      "CustomerName": "Customer-964-8-712",
      "TotalOrders": 141,
      "TotalUnitsOrdered": 15306,
      "TotalRevenue": 371397.45,
      "TotalCost": 175853.10,
      "TotalProfit": 195544.35,
      "ProfitMarginPercent": 52.65
    },
    // ... more customers
  ]
}
```

---

### **4. Get Product Performance Metrics**
```
GET /api/products/performance?orderBy=profit&limit=50
```

**Response:**
```json
{
  "status": "success",
  "count": 50,
  "data": [
    {
      "StockItemID": 161,
      "StockItemName": "Sodium Bicarbonate Alpha",
      "Brand": null,
      "Size": null,
      "NumCustomers": 250,
      "TotalQuantitySold": 15000,
      "AvgSellingPrice": 108,
      "AvgCostPrice": 16,
      "TotalRevenue": 1620000,
      "TotalCost": 240000,
      "TotalProfit": 1380000,
      "ProfitMarginPercent": 85.19
    },
    // ... more products
  ]
}
```

---

## 🛠️ Implementation Examples

### **Backend (Node.js/Express)**

```javascript
// GET /api/customers/:customerId/top-products
app.get('/api/customers/:customerId/top-products', async (req, res) => {
  const { customerId } = req.params;
  const { limit = 15 } = req.query;

  try {
    const result = await pool.request().query(`
      SELECT TOP ${limit}
        si.StockItemID,
        si.StockItemName,
        SUM(ol.Quantity) as Quantity,
        ol.UnitPrice as UnitSalePrice,
        COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3) as UnitCostPrice,
        SUM(ol.Quantity * ol.UnitPrice) as TotalRevenue,
        SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3)) as TotalCost,
        SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3)) as TotalProfit,
        CAST((SUM(ol.Quantity * ol.UnitPrice) - SUM(ol.Quantity * COALESCE(pol.ExpectedUnitPricePerOuter / CAST(NULLIF(si.QuantityPerOuter, 0) AS DECIMAL(10,2)), si.UnitPrice * 0.3))) / SUM(ol.Quantity * ol.UnitPrice) * 100 AS DECIMAL(5,2)) as ProfitMarginPercent
      FROM Sales.OrderLines ol
      JOIN Sales.Orders o ON ol.OrderID = o.OrderID
      JOIN Warehouse.StockItems si ON ol.StockItemID = si.StockItemID
      LEFT JOIN (
        SELECT StockItemID, AVG(ExpectedUnitPricePerOuter) as ExpectedUnitPricePerOuter
        FROM Purchasing.PurchaseOrderLines
        WHERE ExpectedUnitPricePerOuter > 0
        GROUP BY StockItemID
      ) pol ON si.StockItemID = pol.StockItemID
      WHERE o.CustomerID = ${customerId}
      GROUP BY si.StockItemID, si.StockItemName, ol.UnitPrice, si.QuantityPerOuter, pol.ExpectedUnitPricePerOuter, si.UnitPrice
      ORDER BY TotalProfit DESC
    `);

    res.json({
      status: 'success',
      customerId,
      data: result.recordset
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});
```

---

### **Frontend (React)**

```javascript
import React, { useState, useEffect } from 'react';

function CustomerProfitAnalysis({ customerId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopProducts();
  }, [customerId]);

  const fetchTopProducts = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}/top-products?limit=15`);
      const data = await response.json();
      setProducts(data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="profit-analysis">
      <h2>Top Profitable Products</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Product Name</th>
            <th>Qty</th>
            <th>Unit Sale</th>
            <th>Unit Cost</th>
            <th>Revenue</th>
            <th>Cost</th>
            <th>Profit</th>
            <th>Margin %</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={product.StockItemID}>
              <td>{index + 1}</td>
              <td>{product.StockItemName}</td>
              <td>{product.Quantity}</td>
              <td>${product.UnitSalePrice.toFixed(2)}</td>
              <td>${product.UnitCostPrice.toFixed(2)}</td>
              <td>${product.TotalRevenue.toFixed(2)}</td>
              <td>${product.TotalCost.toFixed(2)}</td>
              <td>${product.TotalProfit.toFixed(2)}</td>
              <td>{product.ProfitMarginPercent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CustomerProfitAnalysis;
```

---

## 📝 Key Formulas (Important!)

### **Cost Per Unit Calculation**
```
UnitCostPrice = ExpectedUnitPricePerOuter / QuantityPerOuter
```
- `ExpectedUnitPricePerOuter` = What we pay per outer package from supplier
- `QuantityPerOuter` = How many individual units are in one outer package
- Example: If we buy an outer package of 12 units for $96, the cost per unit = $96/12 = $8

### **Profit Calculation**
```
TotalProfit = TotalRevenue - TotalCost
TotalRevenue = Quantity × UnitSalePrice
TotalCost = Quantity × UnitCostPrice
```

### **Profit Margin**
```
ProfitMarginPercent = (TotalProfit / TotalRevenue) × 100
```

---

## 🎨 Frontend UI Components Needed

1. **Customer Summary Card**
   - Total Revenue
   - Total Cost
   - Total Profit
   - Profit Margin %

2. **Top Products Table**
   - Product Name
   - Quantity
   - Unit Sale Price
   - Unit Cost Price
   - Total Revenue
   - Total Cost
   - Total Profit
   - Profit Margin %

3. **Charts (Optional)**
   - Profit by Product (bar chart)
   - Revenue vs Cost (stacked bar)
   - Profit Margin Comparison (line chart)
   - Top Customers by Profit (bar chart)

4. **Filters/Sorting**
   - Sort by: Revenue, Profit, Margin %
   - Filter by: Product Name, Date Range
   - Limit results: 10, 15, 25, 50

---

## ⚠️ Important Considerations

1. **Cost Calculation Fallback**: If `ExpectedUnitPricePerOuter` is not available, we use `UnitPrice * 0.3` as a default (assuming 30% markup)

2. **Null Safety**: Always check for null values in cost calculations

3. **Decimal Precision**: Use 2 decimal places for currency, keep full precision for calculations

4. **Performance**: Consider adding indexes on:
   - `Sales.OrderLines.StockItemID`
   - `Purchasing.PurchaseOrderLines.StockItemID`
   - `Sales.Orders.CustomerID`

---

## 📊 Sample Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  Customer: Customer-977-8-816 (ID: 977)                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Revenue: $380,252.40  │  Cost: $201,839.30  │  Margin: 46.92% │
│  Profit: $178,413.10   │  Orders: 121        │  Units: 16,274  │
│                                                           │
├─────────────────────────────────────────────────────────┤
│  TOP 3 MOST PROFITABLE PRODUCTS                         │
├─────────────────────────────────────────────────────────┤
│  1. Iron(III) Chloride Beta                             │
│     Revenue: $51,273 │ Profit: $20,493 │ Margin: 39.97% │
│                                                           │
│  2. Sodium Sulfate Alpha                                │
│     Revenue: $28,000 │ Profit: $13,250 │ Margin: 47.32% │
│                                                           │
│  3. Barium Sulfate Alpha                                │
│     Revenue: $27,300 │ Profit: $15,080 │ Margin: 55.24% │
│                                                           │
├─────────────────────────────────────────────────────────┤
│  ALL PRODUCTS (Sortable Table)                          │
│  [Show 15 ▼] [Sort by: Profit ▼]                       │
├─────────────────────────────────────────────────────────┤
│ Rank │ Product      │ Qty │ Revenue │ Profit │ Margin │
│ 1    │ ...          │ ... │ ...     │ ...    │ ...    │
│ 2    │ ...          │ ... │ ...     │ ...    │ ...    │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Next Steps

1. Create backend API endpoints using the queries above
2. Add authentication/authorization
3. Implement caching for frequently accessed data
4. Build React components for the dashboard
5. Add charts using Chart.js or D3.js
6. Set up real-time updates (optional)

