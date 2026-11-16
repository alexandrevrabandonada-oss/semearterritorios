/** Limites para rotas FEC. Não substituem rate limiting compartilhado na borda. */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  try {
    const parsed = new URL(origin);
    const internal = new URL(request.url);
    const host = request.headers.get("host") ?? internal.host;
    if (!host || /[\s\/@?#]/.test(host)) return false;
    const external = new URL(internal.protocol + "//" + host);
    return parsed.origin === origin && parsed.origin === external.origin;
  } catch { return false; }
}

export async function readBoundedBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  const rawLength = request.headers.get("content-length");
  if (rawLength && (!/^\d+$/.test(rawLength) || Number(rawLength) > maxBytes)) throw new Error("Corpo excessivo");
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) { await reader.cancel(); throw new Error("Corpo excessivo"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const out = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength; }
  return out;
}

export async function readBoundedFormData(request: Request, maxBytes: number): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data\s*;/i.test(contentType)) throw new Error("Formulário inválido");
  const bytes = await readBoundedBody(request, maxBytes);
  return new Request(request.url, { method: "POST", headers: { "content-type": contentType }, body: bytes as BodyInit }).formData();
}
/** Validates the declared file type and a structural signature before parsing. */
export function validFecFileType(name: string, mime: string, bytes: Uint8Array, allowText = false): boolean {
  const ext = name.split('.').pop()?.toLowerCase();
  const type = mime.toLowerCase();
  if (ext === 'pdf') return type === 'application/pdf' && bytes.length >= 5 && String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]) === '%PDF-';
  if (ext === 'docx') return type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4;
  if (allowText && (ext === 'txt' || ext === 'md')) return (type === 'text/plain' || (ext === 'md' && type === 'text/markdown')) && !bytes.includes(0);
  return false;
}
