import { test } from "node:test";
import assert from "node:assert/strict";
import { organization } from "./organization.ts";

test("organization emits the full company record when it has one", () => {
  const node = organization({
    id: "https://pakfactory.com/#organization",
    name: "PakFactory",
    url: "https://pakfactory.com",
    logo: "https://cdn.sanity.io/logo.png",
    description: "PakFactory is a custom packaging manufacturer.",
    sameAs: [
      "https://www.linkedin.com/company/pakfactory",
      "https://www.youtube.com/@pakfactory",
    ],
  });

  assert.equal(node["@type"], "Organization");
  assert.equal(node.name, "PakFactory");
  assert.equal(node.url, "https://pakfactory.com");
  assert.equal(node["@id"], "https://pakfactory.com/#organization");
  assert.equal(node.logo, "https://cdn.sanity.io/logo.png");
  assert.equal(node.description, "PakFactory is a custom packaging manufacturer.");
  assert.deepEqual(node.sameAs, [
    "https://www.linkedin.com/company/pakfactory",
    "https://www.youtube.com/@pakfactory",
  ]);
});

test("organization omits every optional property when absent", () => {
  const node = organization({
    name: "PakFactory",
    url: "https://pakfactory.com",
  });

  assert.deepEqual(node, {
    "@type": "Organization",
    name: "PakFactory",
    url: "https://pakfactory.com",
  });
});

// Omit, never empty. socialLinks is empty in Sanity today, so this is the
// shape the site actually emits until someone fills the field in.
test("organization omits sameAs rather than emitting an empty array", () => {
  const node = organization({
    name: "PakFactory",
    url: "https://pakfactory.com",
    sameAs: [],
  });

  assert.equal("sameAs" in node, false);
});

test("organization copies sameAs rather than aliasing the caller's array", () => {
  const profiles = ["https://www.linkedin.com/company/pakfactory"];
  const node = organization({
    name: "PakFactory",
    url: "https://pakfactory.com",
    sameAs: profiles,
  });

  profiles.push("https://example.com/injected");
  assert.deepEqual(node.sameAs, [
    "https://www.linkedin.com/company/pakfactory",
  ]);
});
