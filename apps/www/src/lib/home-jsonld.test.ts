import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildHomePageJsonLd } from "./home-jsonld";
import type { CompanyRecord } from "./www-global-settings";

const company = {
  name: "PakFactory",
  logoUrl: "https://cdn.sanity.io/logo.png",
  description: "A custom packaging orchestrator.",
} as CompanyRecord;

const graph = (record: CompanyRecord | null) =>
  JSON.parse(buildHomePageJsonLd(record))["@graph"] as Record<
    string,
    unknown
  >[];

describe("home page JSON-LD — the site itself is an entity (PROD-2990 §6)", () => {
  it("names the site and points publisher at the Organization in the graph", () => {
    const nodes = graph(company);
    const site = nodes.find((n) => n["@type"] === "WebSite");
    const org = nodes.find((n) => n["@type"] === "Organization");

    assert.ok(site, "the home page should carry a WebSite node");
    assert.ok(org, "and the Organization it belongs to");
    assert.equal(site.name, "PakFactory");
    // The pointer must resolve inside this same graph, not dangle.
    assert.deepEqual(site.publisher, { "@id": org["@id"] });
  });

  it("gives the site and the company the same name, from one field", () => {
    const nodes = graph({ ...company, name: "Renamed Co" } as CompanyRecord);
    const names = nodes.map((n) => n.name);
    assert.deepEqual(names, ["Renamed Co", "Renamed Co"]);
  });

  it("emits nothing at all when there is no company record", () => {
    assert.deepEqual(graph(null), []);
  });

  it("never claims a site search — the sitelinks search box is retired", () => {
    const site = graph(company).find((n) => n["@type"] === "WebSite");
    assert.ok(site);
    assert.equal(
      "potentialAction" in site,
      false,
      "www has no search results page a SearchAction could point at",
    );
  });
});
