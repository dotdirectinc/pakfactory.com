import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isInternalEmail } from "./internal-domain";

describe("admin sign-in email domain", () => {
  it("accepts dotdirect.ca, in any case and with stray whitespace", () => {
    assert.equal(isInternalEmail("someone@dotdirect.ca"), true);
    assert.equal(isInternalEmail("  Someone@DotDirect.CA "), true);
  });
  it("refuses every other domain, including the other company domain", () => {
    assert.equal(isInternalEmail("someone@pakfactory.com"), false);
    assert.equal(isInternalEmail("someone@gmail.com"), false);
  });
  it("refuses look-alikes that only contain or end with the domain", () => {
    assert.equal(isInternalEmail("someone@evil-dotdirect.ca"), false);
    assert.equal(isInternalEmail("someone@dotdirect.ca.evil.com"), false);
    assert.equal(isInternalEmail("dotdirect.ca@gmail.com"), false);
  });
  it("refuses empty and malformed values", () => {
    assert.equal(isInternalEmail(""), false);
    assert.equal(isInternalEmail(null), false);
    assert.equal(isInternalEmail(undefined), false);
    assert.equal(isInternalEmail("@dotdirect.ca"), false);
  });
});
