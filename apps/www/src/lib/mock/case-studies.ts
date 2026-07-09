/**
 * Dev/stub mock data matching the GROQ return shapes from @pakfactory/sanity/queries.
 * Used as a fallback when Sanity has no caseStudy documents yet (pre-PROD-1650).
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
    industry: "Fashion & Apparel",
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
    industry: "Home & Lifestyle",
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
    industry: "Consumer Electronics",
    heroImageUrl: "https://images.unsplash.com/photo-1612690669207-fed642192c40?w=800&q=80",
    heroImageAlt: "Brown corrugated shipping boxes on a warehouse conveyor",
  },
];

export const MOCK_CASE_STUDY_DETAILS: Record<string, CaseStudyDetail> = {
  "mock-sustainable-mailer-acme": {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ...MOCK_CASE_STUDY_CARDS[0]!,
    body: [
      {
        _type: "block",
        _key: "b1",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "s1",
            text: "Acme Apparel ships over 50,000 orders per month. Their legacy poly mailers were functional but misaligned with their sustainability pledge — and customers noticed.",
            marks: [],
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "b2",
        style: "h2",
        children: [
          { _type: "span", _key: "s2", text: "The Challenge", marks: [] },
        ],
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
            text: "They needed a mailer that was 100% curbside recyclable, strong enough to protect clothing without additional bubble wrap inserts, and printable with their brand colours without a minimum order above 2,000 units.",
            marks: [],
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "b4",
        style: "h2",
        children: [
          { _type: "span", _key: "s4", text: "The Solution", marks: [] },
        ],
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
    results: [
      {
        _key: "r1",
        metric: "Reduction in return rate",
        value: "40%",
        description: "Attributed to better product protection in transit",
      },
      {
        _key: "r2",
        metric: "Faster fulfillment",
        value: "2× faster",
        description: "Self-locking base eliminated tape step",
      },
      {
        _key: "r3",
        metric: "Recycled content",
        value: "100%",
        description: "Certified curbside recyclable by end customer",
      },
    ],
    metaTitle: "Sustainable Mailer Boxes Cut Return Rate by 40%",
    metaDescription:
      "How Acme Apparel switched to 100% recycled kraft mailers and reduced returns by 40% while speeding up fulfillment.",
    ogImageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&q=80",
  },
  "mock-rigid-gift-box-luminary": {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ...MOCK_CASE_STUDY_CARDS[1]!,
    body: [
      {
        _type: "block",
        _key: "b1",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "s1",
            text: "For Luminary Candles, the unboxing moment is as important as the candle itself. Gift buyers share their unboxing on social — packaging that disappoints kills word-of-mouth.",
            marks: [],
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "b2",
        style: "h2",
        children: [
          { _type: "span", _key: "s2", text: "The Solution", marks: [] },
        ],
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
    results: [
      {
        _key: "r1",
        metric: "Increase in repeat purchases",
        value: "28%",
        description: "Measured over the following two quarters",
      },
      {
        _key: "r2",
        metric: "Social shares per order",
        value: "3.4×",
        description: "vs. previous poly-bag packaging",
      },
      {
        _key: "r3",
        metric: "Damage-in-transit rate",
        value: "< 0.5%",
        description: "Custom foam insert eliminated shifting",
      },
    ],
    metaTitle: "Rigid Gift Boxes Drive 28% Repeat Purchases",
    metaDescription:
      "How Luminary Candles used PakFactory magnetic-closure rigid boxes to turn unboxing into a brand moment and grow repeat buyers.",
    ogImageUrl: "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1200&q=80",
  },
  "mock-corrugated-shipping-vertex": {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ...MOCK_CASE_STUDY_CARDS[2]!,
    body: [
      {
        _type: "block",
        _key: "b1",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "s1",
            text: "Vertex Electronics ships small PCBs and adapters in standard off-the-shelf boxes that were two sizes too large. They were paying for air — literally.",
            marks: [],
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "b2",
        style: "h2",
        children: [
          { _type: "span", _key: "s2", text: "The Problem", marks: [] },
        ],
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
            text: "Dimensional weight pricing meant every oversized box cost $1.20 more per shipment than necessary. Across 30,000 monthly shipments that was $36,000 walking out the door.",
            marks: [],
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "b4",
        style: "h2",
        children: [
          { _type: "span", _key: "s4", text: "The Solution", marks: [] },
        ],
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
    results: [
      {
        _key: "r1",
        metric: "Saved per unit",
        value: "$1.20",
        description: "DIM weight aligned to actual product weight",
      },
      {
        _key: "r2",
        metric: "Annual savings",
        value: "$432K",
        description: "Across 30,000 monthly shipments",
      },
      {
        _key: "r3",
        metric: "SKU box formats reduced to",
        value: "4",
        description: "Down from 12 ad-hoc sizes",
      },
    ],
    metaTitle: "Custom Corrugated Saves Vertex Electronics $1.20/Unit",
    metaDescription:
      "How PakFactory right-sized corrugated shipping boxes for Vertex Electronics, eliminating DIM weight overcharges and saving $432K annually.",
    ogImageUrl: "https://images.unsplash.com/photo-1612690669207-fed642192c40?w=1200&q=80",
  },
};

export const MOCK_SLUGS = Object.keys(MOCK_CASE_STUDY_DETAILS);
