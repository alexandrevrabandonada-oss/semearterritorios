import { describe, expect, it } from "vitest";
import { isSafePublicWord } from "@/lib/public-transparency-word-safety";

describe("public transparency page privacy guards", () => {
  it("bloqueia palavras com CPF, telefone, email e endereco", () => {
    expect(isSafePublicWord("123.456.789-09")).toBe(false);
    expect(isSafePublicWord("11987654321")).toBe(false);
    expect(isSafePublicWord("contato@exemplo.com")).toBe(false);
    expect(isSafePublicWord("Rua das Flores 120")).toBe(false);
    expect(isSafePublicWord("01001-000")).toBe(false);
  });

  it("permite palavras agregadas sem risco", () => {
    expect(isSafePublicWord("saneamento")).toBe(true);
    expect(isSafePublicWord("mobilidade")).toBe(true);
    expect(isSafePublicWord("transporte")).toBe(true);
  });
});
