import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { extractFecPdf } from "../lib/fec-pdf-isolated.ts";

function syntheticPdf() {
  const stream = "BT /F1 12 Tf 24 72 Td (FEC PDF SINTETICO) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    "<< /Length " + Buffer.byteLength(stream, "ascii") + " >>\nstream\n" + stream + "\nendstream",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += (i + 1) + " 0 obj\n" + objects[i] + "\nendobj\n";
  }
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += String(offset).padStart(10, "0") + " 00000 n \n";
  }
  pdf += "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF";
  return Buffer.from(pdf, "ascii");
}

test("worker extrai PDF sintético e rejeita arquivo inválido ou acima de 4 MB", async () => {
  const workerPath = resolve("server/fec-pdf-worker.cjs");
  const text = await extractFecPdf(syntheticPdf(), { workerPath });
  assert.match(text, /FEC PDF SINTETICO/);
  await assert.rejects(extractFecPdf(Buffer.from("%PDF-malformado"), { workerPath }));
  await assert.rejects(
    extractFecPdf(Buffer.alloc(4 * 1024 * 1024 + 1), { workerPath }),
    /4 MB/,
  );
});
