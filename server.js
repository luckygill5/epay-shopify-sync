// server.js
import express from "express";
import dotenv from "dotenv";

import epaySelect from "./api/epay-select.js";
import resolveCurrency from "./api/resolve-currency.js";

dotenv.config();

const app = express();
app.use(express.json());

// mimic Vercel API routes
app.post("/api/epay-select", epaySelect);
app.post("/api/resolve-currency", resolveCurrency);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Local API running at http://localhost:${PORT}`);
});
