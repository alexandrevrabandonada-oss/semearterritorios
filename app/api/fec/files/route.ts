import { fecBody, fecResponse, fecSession } from "@/lib/fec-server";
import { fecUuid } from "@/lib/fec-knowledge";
import { downloadFecPrivateObject, fecPrivateDownloadResponse } from "@/lib/fec-integrity-server";

function contentTypeForObject(name:string){
  const ext=name.split(".").at(-1)?.toLowerCase();
  if(ext==="pdf")return "application/pdf";
  if(ext==="docx")return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if(ext==="png")return "image/png";
  if(ext==="jpg"||ext==="jpeg")return "image/jpeg";
  return "application/octet-stream";
}

export async function GET(request: Request) {
  const session = await fecSession();
  if (session.response) return session.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!fecUuid(id)) return fecResponse({ error: "Arquivo inválido." }, 400);
  const { data: file, error } = await session.db
    .from("fec_knowledge_files")
    .select("object_name,title")
    .eq("id", id)
    .maybeSingle();
  if (error || !file)
    return fecResponse({ error: "Arquivo indisponível." }, 404);
  try {
    const bytes=await downloadFecPrivateObject({db:session.db,bucket:"fec-technical-private",objectName:file.object_name,
      actorId:session.userId,resourceKind:"technical_file",resourceId:id});
    return fecPrivateDownloadResponse(bytes,file.title,contentTypeForObject(file.object_name));
  } catch {
    return fecResponse({ error: "Acesso ao arquivo indisponível ou não registrado." }, 403);
  }
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
