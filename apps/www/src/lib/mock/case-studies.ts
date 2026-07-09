/**
 * Dev/stub mock data matching the GROQ return shapes from @pakfactory/sanity/queries.
 * Used as a fallback when Sanity has no caseStudy documents yet.
 * Automatically superseded once real documents exist in Sanity.
 */
import type { CaseStudyCard, CaseStudyDetail } from "@pakfactory/sanity/queries";

export const MOCK_CASE_STUDY_CARDS: CaseStudyCard[] = [
  {
    _id: "mock-1",
    title: "Sustainable Mailer Boxes Cut Return Rate by 40%",
    slug: "mock-sustainable-mailer-acme",
    publishedAt: "2025-04-10T00:00:00Z",
    excerpt:
      "Acme Apparel needed eco-friendly mailers that could survive 3-day shipping without bubble wrap inserts. PakFactory delivered a 100% recycled solution that also reduced fulfillment time.",
    clientName: "Acme Apparel Co.",
    clientLogoUrl: null,
    solutions: [{ _id: "mock-sol-1", title: "Apparel", slug: "apparel" }],
    packagingTypes: [{ _id: "mock-pt-1", title: "Mailer Bags", slug: "mailer-bags" }],
    expertise: [{ _id: "mock-ex-1", title: "Packaging Design", slug: "packaging-design" }],
    heroImageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80",
    heroImageAlt: "Sustainable kraft mailer boxes stacked on a shelf",
  },
  {
    _id: "mock-2",
    title: "Rigid Gift Boxes Drive 28% Increase in Repeat Purchases",
    slug: "mock-rigid-gift-box-luminary",
    publishedAt: "2025-02-18T00:00:00Z",
    excerpt:
      "Luminary Candles wanted packaging that felt like part of the gift. A magnetic-closure rigid box with a custom foam insert turned every unboxing into a brand moment.",
    clientName: "Luminary Candles",
    clientLogoUrl: null,
    solutions: [{ _id: "mock-sol-2", title: "Candle", slug: "candle" }],
    packagingTypes: [{ _id: "mock-pt-2", title: "Rigid", slug: "rigid" }],
    expertise: [{ _id: "mock-ex-2", title: "Packaging Strategy", slug: "packaging-strategy" }],
    heroImageUrl: "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&q=80",
    heroImageAlt: "Luxury rigid gift box with magnetic closure",
  },
  {
    _id: "mock-3",
    title: "Custom Corrugated Shipping Solution Saves $1.20 Per Unit",
    slug: "mock-corrugated-shipping-vertex",
    publishedAt: "2024-12-05T00:00:00Z",
    excerpt:
      "Vertex Electronics was over-boxing small components and paying for it in DIM weight. PakFactory right-sized their corrugated line and added void-fill elimination inserts.",
    clientName: "Vertex Electronics",
    clientLogoUrl: null,
    solutions: [{ _id: "mock-sol-3", title: "Ecommerce", slug: "ecommerce" }],
    packagingTypes: [{ _id: "mock-pt-3", title: "Custom Corrugated Boxes", slug: "custom-corrugated-boxes" }],
    expertise: [{ _id: "mock-ex-3", title: "Managed Manufacturing", slug: "managed-manufacturing" }],
    heroImageUrl: "https://images.unsplash.com/photo-1612690669207-fed642192c40?w=800&q=80",
    heroImageAlt: "Brown corrugated shipping boxes on a warehouse conveyor",
  },
];

export const MOCK_CASE_STUDY_DETAILS: Record<string, CaseStudyDetail> = {
  "mock-sustainable-mailer-acme": {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ...MOCK_CASE_STUDY_CARDS[0]!,
    featuredVideo: null,
    metrics: [
      {
        _key: "m1",
        title: "40% Return Rate Reduction",
        description: "Attributed to better product protection in transit",
      },
      {
        _key: "m2",
        title: "2× Faster Fulfillment",
        description: "Self-locking base eliminated the tape step",
      },
      {
        _key: "m3",
        title: "100% Recycled Content",
        description: "Certified curbside recyclable by end customer",
      },
    ],
    challenges: {
      intro:
        "Acme Apparel ships over 50,000 orders per month. Their legacy poly mailers were functional but misaligned with their sustainability pledge — and customers noticed.",
      items: [
        "100% curbside recyclable packaging required",
        "Strong enough to protect clothing without bubble wrap inserts",
        "Brand colours printable at a 2,000-unit minimum",
      ],
    },
    solutionsBody: [
      {
        _type: "block",
        _key: "b4",
        style: "h2",
        children: [{ _type: "span", _key: "s4", text: "The Solution", marks: [] }],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "b5",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "s5",
            text: "PakFactory engineered a kraft corrugated mailer with a self-locking tuck base, two-ply walls, and a recycled content certificate. Full-bleed exterior printing was achieved through digital offset on recycled board — no plates, no minimums above 1,500.",
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    resultBody: null,
    resultImages: null,
    metaTitle: "Sustainable Mailer Boxes Cut Return Rate by 40%",
    metaDescription:
      "How Acme Apparel switched to 100% recycled kraft mailers and reduced returns by 40% while speeding up fulfillment.",
    ogImageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&q=80",
  },
  "mock-rigid-gift-box-luminary": {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ...MOCK_CASE_STUDY_CARDS[1]!,
    featuredVideo: null,
    metrics: [
      {
        _key: "m1",
        title: "28% Increase in Repeat Purchases",
        description: "Measured over the following two quarters",
      },
      {
        _key: "m2",
        title: "3.4× More Social Shares Per Order",
        description: "vs. previous poly-bag packaging",
      },
      {
        _key: "m3",
        title: "< 0.5% Damage-in-Transit Rate",
        description: "Custom foam insert eliminated shifting",
      },
    ],
    challenges: {
      intro:
        "For Luminary Candles, the unboxing moment is as important as the candle itself. Gift buyers share their unboxing on social — packaging that disappoints kills word-of-mouth.",
      items: [
        "Packaging that communicates premium quality on arrival",
        "Custom foam insert to protect each candle SKU",
        "Ships inside a plain outer shipper without scuffing the gift box",
      ],
    },
    solutionsBody: [
      {
        _type: "block",
        _key: "b2",
        style: "h2",
        children: [{ _type: "span", _key: "s2", text: "The Solution", marks: [] }],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "b3",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "s3",
            text: "A two-piece rigid box with a magnetic lid and a custom-cut EVA foam insert that cradles each candle. Matte laminated exterior with gold foil stamp logo. Ships inside a plain outer shipper to protect the gift box surface.",
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    resultBody: null,
    resultImages: null,
    metaTitle: "Rigid Gift Boxes Drive 28% Repeat Purchases",
    metaDescription:
      "How Luminary Candles used PakFactory magnetic-closure rigid boxes to turn unboxing into a brand moment and grow repeat buyers.",
    ogImageUrl: "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1200&q=80",
  },
  "mock-corrugated-shipping-vertex": {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ...MOCK_CASE_STUDY_CARDS[2]!,
    featuredVideo: null,
    metrics: [
      {
        _key: "m1",
        title: "$1.20 Saved Per Unit",
        description: "DIM weight aligned to actual product weight",
      },
      {
        _key: "m2",
        title: "$432K Annual Savings",
        description: "Across 30,000 monthly shipments",
      },
      {
        _key: "m3",
        title: "4 Box Formats",
        description: "Down from 12 ad-hoc sizes across the SKU range",
      },
    ],
    challenges: {
      intro:
        "Vertex Electronics ships small PCBs and adapters in standard off-the-shelf boxes that were two sizes too large. They were paying for air — literally.",
      items: [
        "Dimensional weight pricing adding $1.20 per shipment over actual weight",
        "12 different box sizes creating pick-and-pack confusion",
        "Excess void fill increasing fulfillment time and material cost",
      ],
    },
    solutionsBody: [
      {
        _type: "block",
        _key: "b4",
        style: "h2",
        children: [{ _type: "span", _key: "s4", text: "The Solution", marks: [] }],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "b5",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "s5",
            text: "PakFactory audited Vertex's top 12 SKU sizes and designed four corrugated box formats with custom die-cut inserts that eliminated all loose void fill. DIM weight dropped to match actual weight on every SKU.",
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    resultBody: null,
    resultImages: null,
    metaTitle: "Custom Corrugated Saves Vertex Electronics $1.20/Unit",
    metaDescription:
      "How PakFactory right-sized corrugated shipping boxes for Vertex Electronics, eliminating DIM weight overcharges and saving $432K annually.",
    ogImageUrl: "https://images.unsplash.com/photo-1612690669207-fed642192c40?w=1200&q=80",
  },
};

export const MOCK_SLUGS = Object.keys(MOCK_CASE_STUDY_DETAILS);
