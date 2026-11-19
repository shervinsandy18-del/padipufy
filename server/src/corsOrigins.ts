const cloudflarePagesHostname = "padipufy.pages.dev";

function parseConfiguredOrigin(
  value: string,
  allowHttp: boolean
): string | undefined {
  try {
    const url = new URL(value.trim());
    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:"))
    ) {
      return undefined;
    }

    return url.origin;
  } catch {
    return undefined;
  }
}

function parseRequestOrigin(value: string): URL | undefined {
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.origin !== value ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }

    return url;
  } catch {
    return undefined;
  }
}

export function createCorsOriginValidator(
  clientUrl: string | undefined,
  developmentOrigins: readonly string[],
  allowHttpClientUrls = false
): (origin?: string) => boolean {
  const configuredOrigins = new Set(
    (clientUrl || "")
      .split(",")
      .map((origin) => parseConfiguredOrigin(origin, allowHttpClientUrls))
      .filter((origin): origin is string => origin !== undefined)
  );
  const allowedDevelopmentOrigins = new Set(
    developmentOrigins
      .map((origin) => parseConfiguredOrigin(origin, true))
      .filter((origin): origin is string => origin !== undefined)
  );

  return (origin) => {
    if (!origin) {
      return true;
    }

    const url = parseRequestOrigin(origin);
    if (!url) {
      return false;
    }

    if (configuredOrigins.has(url.origin) || allowedDevelopmentOrigins.has(url.origin)) {
      return true;
    }

    return url.protocol === "https:" && (
      url.hostname === cloudflarePagesHostname ||
      url.hostname.endsWith(`.${cloudflarePagesHostname}`)
    );
  };
}
