import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Security middleware
// Use Helmet to set secure HTTP headers
// Helmet with sensible defaults; add CSP that allows scripts/styles from self and trusted CDNs if needed.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
      },
    },
  })
);

// Global rate limiter (tunable)
const limiter = rateLimit({ windowMs: 60_000, max: 120 });
app.use(limiter);

// CORS allowlist: set comma-separated origins in CORS_ORIGINS
const rawOrigins = process.env.CORS_ORIGINS || "";
const allowedOrigins = rawOrigins.split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow non-browser requests like curl

      // If no CORS_ORIGINS configured:
      // - In development, allow all origins to make local testing easier.
      // - In production, block and log a warning so operator can configure allowed origins.
      if (allowedOrigins.length === 0) {
        if (process.env.NODE_ENV === "production") {
          // eslint-disable-next-line no-console
          console.warn("CORS_ORIGINS not set in production — blocking browser requests. Set CORS_ORIGINS to your frontend origin(s).");
          return cb(null, false);
        }

        // non-production default: allow all origins for convenience
        return cb(null, true);
      }

      cb(null, allowedOrigins.includes(origin));
    },
  })
);

// Limit JSON body size to reduce DoS risk (adjust to app needs)
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.use("/api", router);

export default app;
