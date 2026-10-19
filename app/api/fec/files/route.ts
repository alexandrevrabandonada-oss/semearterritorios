import { fecBody, fecResponse, fecSession } from "@/lib/fec-server";
import { fecUuid } from "@/lib/fec-knowledge";

export async function GET(request: Request) {
  const session = await fecSession();
  if (session.response) return session.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!fecUuid(id)) return fecResponse({ error: "Arquivo inválido." }, 400);
  const { data: file, error } = await session.db
    .from("fec_knowledge_files")
    .select("object_name")
    .eq("id", id)
    .maybeSingle();
  if (error || !file)
    return fecResponse({ error: "Arquivo indisponível." }, 404);
  const signed = await session.db.storage
    .from("fec-technical-private")
    .createSignedUrl(file.object_name, 60);
  if (signed.error)
    return fecResponse({ error: "Acesso temporário indisponível." }, 403);
  return fecResponse({ url: signed.data.signedUrl, expiresIn: 60 });
}
export async function POST(request: Request) {
  const session = await fecSession();
  if (session.response) return session.response;
  let body;
  try {
    body = await fecBody(request);
  } catch {
    return fecResponse({ error: "JSON inválido." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return fecResponse({ error: "Vínculo de arquivo inválido." }, 400);
  const d = body as Record<string, unknown>;
  if (
    !fecUuid(d.recordId) ||
    typeof d.objectName !== "string" ||
    typeof d.title !== "string" ||
    !d.title.trim() ||
    d.title.length > 180 ||
    !d.objectName.startsWith(d.recordId + "/") ||
    !/^[-a-zA-Z0-9/_.]+$/.test(d.objectName) ||
    d.objectName.includes("..")
  )
    return fecResponse({ error: "Vínculo de arquivo inválido." }, 400);
  // Bytes vão diretamente ao Storage com JWT/RLS e limite de 10 MB do bucket.
  // A API recebe apenas metadados e o banco exige objeto existente e rascunho próprio.
  const { data, error } = await session.db
    .from("fec_knowledge_files")
    .insert({
      record_id: d.recordId,
      object_name: d.objectName,
      title: d.title.trim(),
      created_by: session.userId,
    })
    .select("*")
    .single();
  if (error)
    return fecResponse(
      {
        error:
          "Vínculo recusado. Confira objeto existente e permissão de edição. Se o upload já terminou, preserve o nome do objeto para reconciliação.",
      },
      409,
    );
  return fecResponse({ file: data }, 201);
}
