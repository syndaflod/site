const LASTFM_API = "https://ws.audioscrobbler.com/2.0/";
const REQUEST_TIMEOUT_MS = 8_000;
const ALLOWED_METHODS = new Set(["user.getRecentTracks", "user.getTopAlbums"]);

function redactKey(value: string, key: string) {
  const encodedKey = encodeURIComponent(key);
  return value
    .replaceAll(key, "[redacted]")
    .replaceAll(encodedKey, "[redacted]");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const method = searchParams.get("method");

  if (!method || !ALLOWED_METHODS.has(method)) {
    return Response.json({ error: "Unsupported Last.fm method" }, { status: 400 });
  }

  const user = process.env.LASTFM_USER;
  const key = process.env.LASTFM_KEY;

  if (!user || !key || user === "your_lastfm_username" || key === "your_lastfm_api_key") {
    return Response.json({ error: "Last.fm is not configured" }, { status: 503 });
  }

  const params = new URLSearchParams({
    method,
    user,
    api_key: key,
    format: "json",
    limit: method === "user.getRecentTracks" ? "200" : "9",
  });

  if (method === "user.getTopAlbums") params.set("period", "1month");

  try {
    const response = await fetch(`${LASTFM_API}?${params.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error("[lastfm] Upstream HTTP error", {
        method,
        status: response.status,
        statusText: response.statusText,
      });
      return Response.json({ error: "Last.fm request failed" }, { status: 502 });
    }

    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null) {
      console.error("[lastfm] Upstream returned a non-object response", { method });
      return Response.json({ error: "Last.fm returned an invalid response" }, { status: 502 });
    }
    if ("error" in data) {
      const upstreamError = data as { error?: unknown; message?: unknown };
      const message = typeof upstreamError.message === "string"
        ? redactKey(upstreamError.message, key)
        : "No error message provided";
      console.error("[lastfm] Upstream API error", {
        method,
        code: upstreamError.error,
        message,
      });
      return Response.json({ error: "Last.fm returned an invalid response" }, { status: 502 });
    }

    return Response.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const detail = error instanceof Error
      ? redactKey(error.message, key)
      : "Unknown error";
    const cause = error instanceof Error ? error.cause : undefined;
    const causeError = cause instanceof Error ? cause : undefined;
    const causeCode = typeof cause === "object" && cause !== null && "code" in cause
      ? (cause as { code?: unknown }).code
      : undefined;
    console.error("[lastfm] Request failed", {
      method,
      name: error instanceof Error ? error.name : "UnknownError",
      message: detail,
      causeName: causeError?.name,
      causeMessage: causeError ? redactKey(causeError.message, key) : undefined,
      causeCode,
    });
    return Response.json({ error: "Last.fm request failed" }, { status: 502 });
  }
}
