/**
 * Render terminates TLS before forwarding requests to Next.js. Prefer its
 * provider-controlled public URL so OAuth callbacks never redirect to the
 * internal localhost port. Local development keeps the request origin.
 */
export function getPublicRedirectOrigin(requestUrl: URL, renderExternalUrl?: string) {
  if (!renderExternalUrl) return requestUrl.origin;

  try {
    const external = new URL(renderExternalUrl);
    if (external.protocol !== "https:" || external.username || external.password) {
      return requestUrl.origin;
    }
    return external.origin;
  } catch {
    return requestUrl.origin;
  }
}
