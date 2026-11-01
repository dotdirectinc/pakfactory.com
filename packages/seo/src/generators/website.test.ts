import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { website } from "./website";

describe("website", () => {
  it("emits the two properties Google's site name feature reads", () => {
    const doc = website({ name: "PakFactory", url: "https://pakfactory.com" });
    assert.deepEqual(doc, {
      "@type": "WebSite",
      name: "PakFactory",
      url: "https://pakfactory.com",
    });
  });

  it("points publisher at the Organization node rather than copying it", () => {
    const doc = website({
      name: "PakFactory",
      url: "https://pakfactory.com",
      id: "https://pakfactory.com#website",
      publisher: { "@id": "https://pakfactory.com#organization" },
    });
    assert.equal(doc["@id"], "https://pakfactory.com#website");
    assert.deepEqual(doc.publisher, {
      "@id": "https://pakfactory.com#organization",
    });
  });

  it("omits alternateName rather than emitting an empty array", () => {
    const doc = website({
      name: "PakFactory",
      url: "https://pakfactory.com",
      alternateName: [],
    });
    assert.equal("alternateName" in doc, false);
  });

  it("drops blank aliases and keeps the editor's order", () => {
    const doc = website({
      name: "PakFactory",
      url: "https://pakfactory.com",
      alternateName: ["  ", "Pak Factory", "", " PakFactory Inc "],
    });
    assert.deepEqual(doc.alternateName, ["Pak Factory", "PakFactory Inc"]);
  });

  it("never emits potentialAction — the sitelinks search box is retired", () => {
    const doc = website({ name: "PakFactory", url: "https://pakfactory.com" });
    assert.equal("potentialAction" in doc, false);
  });
});
