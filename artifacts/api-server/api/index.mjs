import "dotenv/config";

let cachedHandler = null;

async function getHandler() {
  if (cachedHandler) {
    return cachedHandler;
  }

  const appModule = await import("../dist/app.mjs");
  cachedHandler = appModule.default;
  return cachedHandler;
}

export default async function handler(req, res) {
  try {
    const app = await getHandler();
    return app(req, res);
  } catch (err) {
    console.error("Failed to initialize API handler", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "API initialization failed." }));
    return;
  }
}
