/**
 * Serialises a JSON-LD object for an inline <script type="application/ld+json">.
 * JSON.stringify leaves "<" unescaped, so a "</script>" in any value would end
 * the script element; escaping "<" keeps the payload inert.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
