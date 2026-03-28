import "dotenv/config";
import express from "express";
import cors from "cors";

import { handleDemo } from "./routes/demo";
import { handleTokenUsage } from "./routes/token-usage";

/* ----------------------------------------------------
   Express App Factory (USED BY VITE + DEV)
---------------------------------------------------- */
export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.status(200).json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/token-usage", handleTokenUsage);

  return app;
}

/* ----------------------------------------------------
   Vercel Serverless Handler
---------------------------------------------------- */
const app = createServer();

// ✅ NO @vercel/node types needed
export default function handler(req: any, res: any) {
  return app(req, res);
}
