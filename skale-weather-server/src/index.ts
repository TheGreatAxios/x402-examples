import { Hono } from "hono";
import { paymentMiddleware, Network } from "x402-hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

const app = new Hono();
app.use(cors({
  origin: "*"
}));
app.use(logger());
app.use(prettyJSON());
// Configure the payment middleware
app.use(paymentMiddleware(
  "0x71dc0bc68e7f0e2c5aace661b0f3fb995a80aaf4", // your receiving wallet address
  {  // Route configurations for protected endpoints
    "/weather": {
      price: "$0.001",
      network: "skale-base-sepolia",
      config: {
        description: "Get the weather for a given location",
      }
    }
  },
  {
    url: "http://localhost:8787",
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