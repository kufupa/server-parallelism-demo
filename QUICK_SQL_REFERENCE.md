# SQL Query Reference - Copy & Paste Ready

## ✅ The Core Query (Use This!)

This is THE query that produces your profit data. Copy it directly into your backend API:

```sql
SELECT TOP @TopN
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
WHERE o.CustomerID = @CustomerID
GROUP BY si.StockItemID, si.StockItemName, ol.UnitPrice, si.QuantityPerOuter, pol.ExpectedUnitPricePerOuter, si.UnitPrice
ORDER BY TotalProfit DESC
```

### **What to Change:**
- `@TopN` = Number of results (e.g., 15, 50, 100)
- `@CustomerID` = Customer ID from your frontend

### **Using with mssql library (Node.js):**
```javascript
const request = pool.request();
request.input('TopN', sql.Int, 15);
request.input('CustomerID', sql.Int, 977);
const result = await request.query(`
  SELECT TOP @TopN
  si.StockItemID,
  si.StockItemName,
  -- ... rest of query above
  WHERE o.CustomerID = @CustomerID
  -- ... rest of query
`);
```

---

## 📊 JSON Output You'll Get

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

---

## 🔢 The Math Behind It

### **1. Cost Per Unit (from purchasing data)**
```
CostPerUnit = ExpectedUnitPricePerOuter / QuantityPerOuter
```
- We buy items in "outers" (bulk packages)
- Each outer contains multiple units
- Divide the outer price by units per outer = cost per individual unit
- Example: Buy 12 units for $96 → $96/12 = $8 per unit

### **2. Revenue (from sales data)**
```
TotalRevenue = Quantity × UnitSalePrice
```
- Quantity = Total units this customer bought from us
- UnitSalePrice = What we charged them per unit

### **3. Cost (from revenue × unit cost)**
```
TotalCost = Quantity × UnitCostPrice
```

### **4. Profit (Simple subtraction)**
```
TotalProfit = TotalRevenue - TotalCost
```

### **5. Profit Margin (as percentage)**
```
ProfitMarginPercent = (TotalProfit / TotalRevenue) × 100
```

---

## 🎯 Example Walkthrough: Sodium Bicarbonate Alpha

1. **Database Facts:**
   - StockItemID: 161
   - StockItemName: "Sodium Bicarbonate Alpha"
   - QuantityPerOuter: 1 (it's sold individually)
   - ExpectedUnitPricePerOuter: $16 (we pay $16 per unit from supplier)

2. **Customer 977 bought:**
   - Quantity: 110 units
   - UnitSalePrice: $108 per unit (what they paid)

3. **Calculations:**
   - UnitCostPrice = $16 / 1 = $16 per unit
   - TotalRevenue = 110 × $108 = $11,880
   - TotalCost = 110 × $16 = $1,760
   - TotalProfit = $11,880 - $1,760 = $10,120
   - ProfitMarginPercent = ($10,120 / $11,880) × 100 = 85.19%

---

## 🚀 Integration Checklist

- [ ] Copy the core SQL query above
- [ ] Create backend endpoint: `GET /api/customers/:customerId/top-products?limit=15`
- [ ] Test with customerID=977, limit=15
- [ ] Verify JSON response matches the structure shown
- [ ] Create React component to display the data
- [ ] Add sorting/filtering options
- [ ] Add charts (optional)
- [ ] Deploy!

---

## 🐛 Common Issues & Fixes

### **Issue: "Arithmetic overflow converting"**
- **Cause:** Division by zero (QuantityPerOuter is 0)
- **Fix:** Already handled with `COALESCE(... / CAST(NULLIF(si.QuantityPerOuter, 0)...` - query handles this

### **Issue: "No data returned"**
- **Cause:** Wrong CustomerID or no orders for that customer
- **Fix:** Check if CustomerID exists and has orders in Sales.Orders table

### **Issue: Profit looks too high/low**
- **Cause:** If cost data is missing, uses fallback: `UnitPrice * 0.3`
- **Fix:** Ensure PurchaseOrderLines has ExpectedUnitPricePerOuter values

### **Issue: Inconsistent results between queries**
- **Cause:** Not grouping/aggregating correctly
- **Fix:** Always GROUP BY: `StockItemID, StockItemName, ol.UnitPrice, si.QuantityPerOuter, pol.ExpectedUnitPricePerOuter, si.UnitPrice`

---

## 💡 Pro Tips

1. **Cache Results:** These queries are heavy (joining 4 tables). Cache results for 1 hour.

2. **Add Indexes:**
   ```sql
   CREATE INDEX idx_orderlines_customer ON Sales.OrderLines(OrderID)
   CREATE INDEX idx_orders_customer ON Sales.Orders(CustomerID, OrderID)
   CREATE INDEX idx_stockitems_id ON Warehouse.StockItems(StockItemID)
   CREATE INDEX idx_purchaseorderlines_item ON Purchasing.PurchaseOrderLines(StockItemID)
   ```

3. **Pagination:** Use TOP/OFFSET for large result sets
   ```sql
   OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
   ```

4. **Filter by Date:** Add this to WHERE clause
   ```sql
   AND o.OrderDate >= @StartDate AND o.OrderDate <= @EndDate
   ```

5. **Filter by Product Category/Brand:**
   ```sql
   AND si.Brand = @Brand
   OR si.StockItemName LIKE @SearchTerm
   ```

---

## 📱 Frontend Display Template

```html
<div class="product-profit-card">
  <h3>{{ productName }}</h3>

  <div class="metrics-row">
    <div class="metric">
      <label>Quantity</label>
      <value>{{ quantity }} units</value>
    </div>
    <div class="metric">
      <label>Unit Price</label>
      <value>${{ unitSalePrice }}</value>
    </div>
    <div class="metric">
      <label>Unit Cost</label>
      <value>${{ unitCostPrice }}</value>
    </div>
  </div>

  <div class="metrics-row">
    <div class="metric">
      <label>Revenue</label>
      <value class="text-blue">${{ totalRevenue.toFixed(2) }}</value>
    </div>
    <div class="metric">
      <label>Cost</label>
      <value class="text-red">${{ totalCost.toFixed(2) }}</value>
    </div>
    <div class="metric">
      <label>Profit</label>
      <value class="text-green">${{ totalProfit.toFixed(2) }}</value>
    </div>
  </div>

  <div class="profit-margin">
    <span>Margin: <strong>{{ profitMarginPercent }}%</strong></span>
    <div class="progress-bar" style="width: {{ profitMarginPercent }}%"></div>
  </div>
</div>
```

