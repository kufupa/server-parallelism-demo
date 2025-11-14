# Warehouse Sankey Backend

Express + MSSQL backend exposing a Sankey data endpoint for visualizing flows:
- Inputs: Purchasing (Suppliers → PurchaseOrders → PurchaseOrderLines)
- Hub: Warehouse (StockItems)
- Outputs: Sales (InvoiceLines → Customers or Customer Categories)

## Run

`node index.js` starts the server at <http://localhost:3000/>.

## Endpoints

- `GET /db/ping` — DB connectivity check.
- `GET /sankey/warehouse` — Build Sankey graph for Suppliers → StockItems → Customers.

Query params:
- `topItems` (default 20, max 200): number of stock items (ranked by sales value)
- `topSuppliers` (default 15, max 200): suppliers kept as individual nodes; the rest aggregated
- `topCustomers` (default 20, max 200): customers or categories kept as individual nodes; the rest aggregated
- `outputGrouping` (`customer` | `category`, default `customer`)
- `valueMetric` (`salesValue` | `quantity`, default `salesValue`) for item→output link weights

Example:
```
GET /sankey/warehouse?topItems=25&topSuppliers=10&topCustomers=25&outputGrouping=customer&valueMetric=salesValue
```

Response shape:
```
{
  "ok": true,
  "nodes": [
    { "id": "Purchasing", "label": "Purchasing", "group": "inputs", "color": "#2E7D32" },
    { "id": "Warehouse", "label": "Warehouse", "group": "warehouse", "color": "#0D47A1" },
    { "id": "Sales", "label": "Sales", "group": "outputs", "color": "#C62828" },
    { "id": "supplier:1", "label": "Contoso Ltd", "group": "inputs", "color": "#6A1B9A" },
    { "id": "item:123", "label": "Chocolate Biscuits 12 pack", "group": "warehouse", "color": "#3366CC" },
    { "id": "customer:42", "label": "Tailspin Toys", "group": "outputs", "color": "#F57C00" }
    ...
  ],
  "links": [
    { "source": "Purchasing", "target": "supplier:1", "value": 1200, "label": "Purchases" },
    { "source": "supplier:1", "target": "item:123", "value": 250, "label": "Supply Qty" },
    { "source": "Warehouse", "target": "item:123", "value": 250, "label": "Inventory In" },
    { "source": "item:123", "target": "customer:42", "value": 5000.25, "label": "salesValue" }
  ],
  "meta": {
    "topItems": 25,
    "topSuppliers": 10,
    "topCustomers": 25,
    "outputGrouping": "customer",
    "valueMetric": "salesValue",
    "itemCount": 25,
    "supplierCount": 10,
    "outputCount": 25
  }
}
```

Notes:
- Supplier→Item link value is purchase quantity (`ReceivedOuters` fallback to `OrderedOuters`).
- Item→Output link value uses `valueMetric`.
- Non-top suppliers/customers are grouped into "Other Suppliers" / "Other Customers" nodes.
- Item colors come from a curated palette for consistent, readable visuals.
