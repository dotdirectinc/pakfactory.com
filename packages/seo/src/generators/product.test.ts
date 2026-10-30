import { test } from "node:test";
import assert from "node:assert/strict";
import { product } from "./product.ts";

test("product emits the facts a PakFactory product page can support", () => {
  const node = product({
    id: "https://pakfactory.com/products/custom-rigid-box#product",
    name: "Custom Rigid Box",
    url: "https://pakfactory.com/products/custom-rigid-box",
    description: "A rigid setup box made to your dimensions.",
    image: ["https://cdn.sanity.io/a.jpg", "https://cdn.sanity.io/b.jpg"],
    sku: "PF-00154",
    brand: { "@id": "https://pakfactory.com/#organization" },
    alternateName: ["Setup box", "Telescoping box"],
    additionalProperty: [
      { name: "Minimum order quantity", value: "500" },
      { name: "Lead time", value: "22–25 business days" },
    ],
  });

  assert.equal(node["@type"], "Product");
  assert.equal(node.name, "Custom Rigid Box");
  assert.equal(node.sku, "PF-00154");
  assert.deepEqual(node.alternateName, ["Setup box", "Telescoping box"]);
  assert.deepEqual(node.image, [
    "https://cdn.sanity.io/a.jpg",
    "https://cdn.sanity.io/b.jpg",
  ]);
  assert.deepEqual(node.additionalProperty, [
    { "@type": "PropertyValue", name: "Minimum order quantity", value: "500" },
    { "@type": "PropertyValue", name: "Lead time", value: "22–25 business days" },
  ]);
});

test("product never emits offers, review or aggregateRating", () => {
  const node = product({ name: "Minimal", url: "https://pakfactory.com/p" });

  assert.equal(node.offers, undefined);
  assert.equal(node.review, undefined);
  assert.equal(node.aggregateRating, undefined);
});

test("product omits empty lists rather than emitting []", () => {
  const node = product({
    name: "Minimal",
    url: "https://pakfactory.com/p",
    alternateName: [],
    additionalProperty: [],
    image: [],
  });

  assert.equal(node.alternateName, undefined);
  assert.equal(node.additionalProperty, undefined);
  assert.equal(node.image, undefined);
  assert.equal(node["@id"], undefined);
  assert.equal(node.sku, undefined);
});

test("product drops blank aliases and half-filled properties", () => {
  const node = product({
    name: "Minimal",
    url: "https://pakfactory.com/p",
    alternateName: ["  ", "Setup box", ""],
    additionalProperty: [
      { name: "Lead time", value: "  " },
      { name: "", value: "500" },
      { name: "Minimum order quantity", value: "500" },
    ],
  });

  assert.deepEqual(node.alternateName, ["Setup box"]);
  assert.deepEqual(node.additionalProperty, [
    { "@type": "PropertyValue", name: "Minimum order quantity", value: "500" },
  ]);
});

test("product accepts a single image string", () => {
  const node = product({
    name: "One image",
    url: "https://pakfactory.com/p",
    image: "https://cdn.sanity.io/a.jpg",
  });

  assert.equal(node.image, "https://cdn.sanity.io/a.jpg");
});
