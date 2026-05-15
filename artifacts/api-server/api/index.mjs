import "dotenv/config";
import { access } from "node:fs/promises";

let cachedHandler = null;

const APP_BUNDLE_CANDIDATES = [
  new URL("../dist/app.cjs", import.meta.url),
  new URL("../../dist/app.cjs", import.meta.url),
  new URL("../../../dist/app.cjs", import.meta.url),
];

async function resolveAppBundleUrl() {
  for (const candidate of APP_BUNDLE_CANDIDATES) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try next candidate path.
    }
  }

  throw new Error(
    `Unable to locate app bundle. Checked: ${APP_BUNDLE_CANDIDATES.map((u) => u.pathname).join(", ")}`,
  );
}

async function getHandler() {
  if (cachedHandler) {
    return cachedHandler;
  }

  const appBundleUrl = await resolveAppBundleUrl();
  const appModule = await import(appBundleUrl.href);
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
