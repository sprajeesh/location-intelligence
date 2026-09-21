// Only treat a string as a safe, clickable http(s) URL when it parses as an
// absolute URL with a real host -- guards against malformed values and
// protocol-only strings like "https://" (empty hostname).
export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.length > 0;
  } catch {
    return false;
  }
}
