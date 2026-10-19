import type { SupabaseClient } from "@supabase/supabase-js";
export async function uploadFecFile(
  storage: SupabaseClient["storage"],
  recordId: string,
  file: File,
) {
  const extensions: Record<string, string> = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
  };
  if (!file.size || file.size > 10 * 1024 * 1024 || !extensions[file.type])
    throw new Error("Aceitos PDF, DOCX, PNG e JPEG, até 10 MB.");
  const name = `${recordId}/${crypto.randomUUID()}.${extensions[file.type]}`;
  const result = await storage
    .from("fec-technical-private")
    .upload(name, file, { contentType: file.type, upsert: false });
  if (result.error)
    throw new Error(
      "Upload privado recusado. Confira conexão, autoria e situação do registro.",
    );
  return { recordId, objectName: name, title: file.name.slice(0, 180) };
}
