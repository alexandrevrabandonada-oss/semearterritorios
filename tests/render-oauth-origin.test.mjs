import test from "node:test";
import assert from "node:assert/strict";
import { getPublicRedirectOrigin } from "../lib/auth/redirect-origin.ts";

test("OAuth usa a URL pública do Render, não a porta interna da função", () => {
  const internal = new URL("http://localhost:10000/auth/callback?code=synthetic");
  assert.equal(
    getPublicRedirectOrigin(internal, "https://semearterritorios.onrender.com"),
    "https://semearterritorios.onrender.com",
  );
});

test("OAuth local mantém a origem da requisição e ignora configuração inválida", () => {
  const local = new URL("http://localhost:3000/auth/callback");
  assert.equal(getPublicRedirectOrigin(local), "http://localhost:3000");
  assert.equal(getPublicRedirectOrigin(local, "http://localhost:10000"), "http://localhost:3000");
  assert.equal(getPublicRedirectOrigin(local, "https://user:pass@example.test"), "http://localhost:3000");
});
