import { test } from "node:test";
import assert from "node:assert/strict";
import { service } from "./service.ts";

test("service emits required fields and links its provider by id", () => {
  const node = service({
    id: "https://pakfactory.com/expertise/structural-design#service",
    name: "Structural design",
    url: "https://pakfactory.com/expertise/structural-design",
    description: "Dieline engineering and prototyping.",
    provider: { "@id": "https://pakfactory.com/#organization" },
    serviceType: "Packaging design",
  });

  assert.equal(node["@type"], "Service");
  assert.equal(node.name, "Structural design");
  assert.equal(node.url, "https://pakfactory.com/expertise/structural-design");
  assert.deepEqual(node.provider, {
    "@id": "https://pakfactory.com/#organization",
  });
  assert.equal(node.serviceType, "Packaging design");
});

test("service omits optional fields when absent", () => {
  const node = service({ name: "Minimal", url: "https://pakfactory.com/e" });

  assert.equal(node.description, undefined);
  assert.equal(node.provider, undefined);
  assert.equal(node.serviceType, undefined);
  assert.equal(node["@id"], undefined);
});
