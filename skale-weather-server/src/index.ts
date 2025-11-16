import { Hono } from "hono";
import { paymentMiddleware, Network } from "x402-hono";
// import { facilitator } from "@coinbase/x402"; // For mainnet

const app = new Hono();

// Configure the payment middleware
app.use(paymentMiddleware(
  "0x71dc0bc68e7f0e2c5aace661b0f3fb995a80aaf4", // your receiving wallet address
  {  // Route configurations for protected endpoints
    "/weather": {
      price: "$0.001",
      network: "skale-base-sepolia",
      asset: {
        address: "0x2e08028E3C4c2356572E096d8EF835cD5C6030bD",
        decimals: 6,
        eip712: {
          name: "Bridged USDC (SKALE Bridge)",
          version: "2"
        }
      },
      config: {
        description: "Get the weather for a given location",
      }
    }
  },
  {
    url: "https://facilitator.chaoscha.in",
  }
));

// Implement your route
app.get("/weather", (c) => {
  return c.json({ message: "the weather is sunny and 75 degrees fahrenheit" });
});

export default {
  fetch: app.fetch,
  port: 3000
};