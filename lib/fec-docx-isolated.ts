import { spawn } from "node:child_process";
import { join } from "node:path";
import { FEC_MAX_UPLOAD } from "./fec-upload-limits.mjs";

/** Extracts DOCX text in a bounded child process. Only the authorized API route imports this module. */
export function extractFecDocx(
  buffer: Buffer,
  options: { workerPath?: string; timeoutMs?: number } = {},
): Promise<string> {
  const workerPath = options.workerPath ?? join(process.cwd(), "server", "fec-docx-worker.cjs");
  const timeoutMs = options.timeoutMs ?? 15_000;
  if (buffer.length === 0 || buffer.length > FEC_MAX_UPLOAD) {
    return Promise.reject(new Error("Documento fora do limite de 4 MB."));
  }

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--max-old-space-size=128", workerPath], {
      stdio: ["pipe", "pipe", "ignore"],
      windowsHide: true,
    });
    const chunks: Buffer[] = [];
    let total = 0;
    let killed = false;
    let started = false;
    const stop = () => {
      killed = true;
      child.kill("SIGKILL");
    };
    const timer = setTimeout(stop, timeoutMs);
    child.once("spawn", () => {
      started = true;
      child.stdin.end(buffer);
    });
    child.stdin.on("error", () => {});
    child.stdout.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > 1_000_000) stop();
      else chunks.push(chunk);
    });
    child.once("error", () => {
      clearTimeout(timer);
      reject(new Error("Processador isolado indisponível."));
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (!started) return;
      if (killed || code !== 0) {
        reject(new Error("DOCX recusado por limite ou falha de processamento."));
        return;
      }
      try {
        const data = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { text?: unknown };
        if (typeof data.text !== "string" || data.text.length > 500_000) throw new Error();
        resolve(data.text);
      } catch {
        reject(new Error("Resposta inválida do processador DOCX."));
      }
    });
  });
}
