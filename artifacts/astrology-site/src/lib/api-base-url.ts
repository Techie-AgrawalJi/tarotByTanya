const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);
const LOCAL_API_BASE = "http://localhost:5000";

function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost");
}

function isLocalConfiguredBase(base: string): boolean {
  try {
    const url = new URL(base, "http://localhost");
    return isLocalHostname(url.hostname);
  } catch {
    return /localhost|127\.0\.0\.1|::1/i.test(base);
  }
}

export function getApiBaseUrl(): string {
  const configuredBase = String((import.meta as any).env?.VITE_API_BASE_URL ?? (import.meta as any).env?.VITE_API_BASE ?? "")
    .trim()
    .replace(/\/+$/, "");

  if (configuredBase) {
    if (typeof window === "undefined") {
      return configuredBase;
    }

    const currentHostname = window.location.hostname;
    const currentIsLocal = isLocalHostname(currentHostname);
    const configuredIsLocal = isLocalConfiguredBase(configuredBase);

    if (configuredIsLocal && !currentIsLocal) {
      return window.location.origin.replace(/\/+$/, "");
    }

    return configuredBase;
  }

  if (typeof window !== "undefined") {
    if (isLocalHostname(window.location.hostname)) {
      return LOCAL_API_BASE;
    }

    return window.location.origin.replace(/\/+$/, "");
  }

  return LOCAL_API_BASE;
}