import assert from "node:assert/strict";
import test from "node:test";
import { createCorsOriginValidator } from "../dist/corsOrigins.js";

const isProductionOriginAllowed = createCorsOriginValidator(undefined, []);

test("allows the canonical Cloudflare Pages production origin", () => {
  assert.equal(isProductionOriginAllowed("https://padipufy.pages.dev"), true);
});

test("allows HTTPS deployment subdomains for this Cloudflare Pages project", () => {
  assert.equal(isProductionOriginAllowed("https://0c36218d.padipufy.pages.dev"), true);
});

test("rejects unrelated websites", () => {
  assert.equal(isProductionOriginAllowed("https://malicious-example.com"), false);
});

test("rejects hostnames that only contain the project hostname as a prefix", () => {
  assert.equal(isProductionOriginAllowed("https://padipufy.pages.dev.evil.com"), false);
});

test("rejects HTTP Cloudflare Pages deployment origins", () => {
  assert.equal(isProductionOriginAllowed("http://0c36218d.padipufy.pages.dev"), false);
});

test("allows a configured client origin exactly", () => {
  const isAllowed = createCorsOriginValidator("https://custom.example", []);

  assert.equal(isAllowed("https://custom.example"), true);
  assert.equal(isAllowed("https://sub.custom.example"), false);
});
