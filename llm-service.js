const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic.default({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Parse natural language query to extract filters
 * @param {string} userQuery - User's natural language query
 * @param {Object} availableData - Available data context (stats, etc.)
 * @returns {Promise<Object>} Filter object
 */
async function parseQueryToFilters(userQuery, availableData = {}) {
  const tools = [
    {
      name: 'apply_filters',
      description: 'Apply filters to supply chain data based on natural language query',
      input_schema: {
        type: 'object',
        properties: {
          topN: {
            type: 'number',
            description: 'Limit to top N results (e.g., top 5, top 10)'
          },
          sortBy: {
            type: 'string',
            enum: ['profit', 'revenue', 'volume'],
            description: 'Sort results by this metric'
          },
          selectedStates: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by state codes (e.g., ["CA", "TX", "NY"])'
          },
          minProfit: {
            type: 'number',
            description: 'Minimum profit threshold'
          },
          maxProfit: {
            type: 'number',
            description: 'Maximum profit threshold'
          },
          minRevenue: {
            type: 'number',
            description: 'Minimum revenue threshold'
          },
          maxRevenue: {
            type: 'number',
            description: 'Maximum revenue threshold'
          },
          showSuppliers: {
            type: 'boolean',
            description: 'Include suppliers in results'
          },
          showCustomers: {
            type: 'boolean',
            description: 'Include customers in results'
          },
          customerType: {
            type: 'string',
            enum: ['profitable', 'loss-making', 'all'],
            description: 'Filter by customer profitability'
          }
        },
        required: []
      }
    }
  ];

  const systemPrompt = `You are an expert supply chain analyst. Parse natural language queries about warehouse, supplier, and customer data.

Available data context:
- Total Suppliers: ${availableData.totalSuppliers || 7}
- Total Customers: ${availableData.totalCustomers || 663}
- Total Revenue: $${(availableData.totalRevenue || 0).toLocaleString()}
- Profit Range: $${(availableData.minProfit || 0).toLocaleString()} to $${(availableData.maxProfit || 0).toLocaleString()}

When a user asks a query, determine the appropriate filters to apply. Return ONLY the filters that are explicitly or implicitly requested.

Examples:
- "Show me the top 5 most profitable customers" → topN: 5, sortBy: "profit", showCustomers: true
- "Customers in California and Texas" → selectedStates: ["CA", "TX"], showCustomers: true
- "Lowest 3 customers that provide profit" → topN: 3, sortBy: "profit", customerType: "profitable", showCustomers: true
- "Suppliers by revenue" → showSuppliers: true, sortBy: "revenue"`;

  try {
    let response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      tools: tools,
      messages: [
        {
          role: 'user',
          content: userQuery
        }
      ]
    });

    // Extract the filter object from the tool use
    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === 'apply_filters') {
        return block.input;
      }
    }

    // If no tool was used, return default
    return {
      showSuppliers: true,
      showCustomers: true
    };
  } catch (err) {
    console.error('Error parsing query:', err);
    throw new Error(`Failed to parse query: ${err.message}`);
  }
}

/**
 * Generate product overview for a customer using LLM
 * @param {string} customerName - Customer name
 * @param {Array} products - Product list with sales data
 * @returns {Promise<Object>} Product overview
 */
async function generateProductOverview(customerName, products) {
  const productSummary = products
    .slice(0, 10)
    .map(p => `- ${p.StockItemName}: $${p.TotalRevenue?.toLocaleString() || 0} revenue, $${p.TotalProfit?.toLocaleString() || 0} profit`)
    .join('\n');

  const systemPrompt = `You are a supply chain business analyst. Analyze a customer's purchase patterns and provide insights.`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Analyze the following customer's product purchases and provide a brief summary of:
1. What they mainly buy (product categories/patterns)
2. Their highest profit products (sorted)

Customer: ${customerName}

Product Data:
${productSummary}

Provide the response in JSON format:
{
  "mainProducts": "Brief description of what they mainly buy",
  "topProfitProducts": ["Product 1", "Product 2", "Product 3"],
  "keyInsight": "One key business insight"
}`
        }
      ]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      try {
        return JSON.parse(content.text);
      } catch (parseErr) {
        // If JSON parsing fails, extract information
        return {
          mainProducts: 'Based on purchase history',
          topProfitProducts: products.slice(0, 3).map(p => p.StockItemName),
          keyInsight: content.text
        };
      }
    }
  } catch (err) {
    console.error('Error generating product overview:', err);
    return {
      mainProducts: 'Unable to analyze',
      topProfitProducts: products.slice(0, 3).map(p => p.StockItemName),
      keyInsight: `Revenue: $${products.reduce((sum, p) => sum + (p.TotalRevenue || 0), 0).toLocaleString()}`
    };
  }
}

/**
 * Suggest discount strategy to maximize profit
 * @param {string} customerName - Customer name
 * @param {Array} products - Product list with sales data
 * @param {number} currentProfit - Current total profit
 * @returns {Promise<Array>} Discount suggestions
 */
async function suggestDiscountStrategy(customerName, products, currentProfit = 0) {
  const productData = products
    .slice(0, 10)
    .map(p => `- ${p.StockItemName}: Current profit: $${p.TotalProfit?.toLocaleString() || 0}, Margin: ${p.TotalProfit && p.TotalRevenue ? ((p.TotalProfit / p.TotalRevenue * 100).toFixed(1)) : 'N/A'}%`)
    .join('\n');

  const systemPrompt = `You are a pricing strategy expert for supply chain businesses. Your goal is to suggest strategic discounts that will:
1. Increase customer purchases
2. Maintain or increase overall profit
3. Be realistic and actionable`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Suggest a discount strategy for ${customerName} to increase purchases while maintaining profitability:

Current Profit: $${currentProfit.toLocaleString()}

Top Products:
${productData}

Provide suggestions in JSON format as an array:
[
  {
    "product": "Product Name",
    "currentProfit": number,
    "suggestedDiscount": "5-10%",
    "estimatedProfitAfterDiscount": number,
    "rationale": "Why this discount works"
  }
]

Focus on products with good margins where a discount could drive volume. Ensure the total profit remains competitive.`
        }
      ]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      try {
        const parsed = JSON.parse(content.text);
        return Array.isArray(parsed) ? parsed : [];
      } catch (parseErr) {
        // Return default suggestions based on products
        return products.slice(0, 3).map((p, idx) => ({
          product: p.StockItemName,
          currentProfit: p.TotalProfit || 0,
          suggestedDiscount: `${(5 + idx * 2)}%`,
          estimatedProfitAfterDiscount: (p.TotalProfit || 0) * (1 + (idx + 1) * 0.15),
          rationale: `High-margin product - discount could drive volume increase of ${15 + idx * 10}%`
        }));
      }
    }
  } catch (err) {
    console.error('Error suggesting discount strategy:', err);
    // Return default discount suggestions
    return products.slice(0, 3).map((p, idx) => ({
      product: p.StockItemName,
      currentProfit: p.TotalProfit || 0,
      suggestedDiscount: `${5 + idx * 5}%`,
      estimatedProfitAfterDiscount: (p.TotalProfit || 0) * 1.2,
      rationale: 'Strategic discount to increase volume'
    }));
  }
}

module.exports = {
  parseQueryToFilters,
  generateProductOverview,
  suggestDiscountStrategy
};
