/**
 * Shared GROQ projection for www page `sections[]` (ADR-015 / ADR-020).
 * Deep-expand types as renderers wire them; shallow stubs keep `_key`/`_type`
 * (+ cheap scalars) for allowlisted inventory until later mappers land.
 */

import {
    FEATURED_VIDEO_URL_FIELD,
    FEATURED_VIDEO_URL_GROQ,
} from './featured-video';

export {FEATURED_VIDEO_URL_FIELD};

/** FAQ ref card — matches product FAQ projection shape. */
const FAQ_REF = /* groq */ `{
  question,
  "answerPlain": pt::text(answer)
}`;

/** Linkable doc fields for mediaFeature CTA (same shape as website nav). */
const LINKABLE_DOC = /* groq */ `{
  _id,
  _type,
  title,
  "slug": slug.current,
  "name": name,
  "term": term,
  pageRole,
  pageType,
  category,
  "handle": handle.current,
  "collectionSlug": primaryCollection->slug.current,
  "pageSlug": primaryLandingPage->slug.current
}`;

const LINK_OBJECT = /* groq */ `{
  label,
  linkType,
  externalUrl,
  relativePath,
  query,
  "internalLink": internalLink->${LINKABLE_DOC}
}`;

/** Shared section chrome (eyebrow · heading · intro · align · paddingBlock · link · dieline borders). */
const SECTION_CHROME = /* groq */ `
  eyebrow,
  heading,
  intro,
  align,
  paddingBlock,
  showTopBorder,
  showBottomBorder,
  listSource,
  curatedSource,
  link ${LINK_OBJECT}
`;

/**
 * Mixed inspirations cards — typed `inspirationsCard` or catalogue ref
 * (solutionStyle / productStyle / product).
 */
const INSPIRATIONS_CARD = /* groq */ `{
  _key,
  _type,
  _type == "inspirationsCard" => {
    "kind": "typed",
    title,
    description,
    "imageSrc": image.asset->url,
    "imageAlt": coalesce(image.alt, image.asset->altText),
    link ${LINK_OBJECT}
  },
  defined(_ref) => @->{
    "kind": "ref",
    _id,
    _type,
    "title": coalesce(shortName, title, name),
    "description": shortDescription,
    "imageSrc": featuredImage.asset->url,
    "imageAlt": coalesce(featuredImage.alt, featuredImage.asset->altText),
    "slug": slug.current,
    "solutionSlug": solution->slug.current,
    "lineSlug": productLine->slug.current,
    "handle": handle.current,
    "collectionSlug": primaryCollection->slug.current,
    "pageSlug": primaryLandingPage->slug.current
  }
}`;

/**
 * Mixed video case-study cards — typed `videoCaseStudyCard` or caseStudy ref.
 * Hover MP4: typed `video` file, or caseStudy `previewVideo`. No YouTube on cards.
 */
const VIDEO_CASE_STUDY_CARD = /* groq */ `{
  _key,
  _type,
  _type == "videoCaseStudyCard" => {
    "kind": "typed",
    brand,
    title,
    "imageSrc": image.asset->url,
    "imageAlt": coalesce(image.alt, image.asset->altText),
    "logoSrc": logo.asset->url,
    "logoAlt": coalesce(logo.alt, brand),
    "videoSrc": video.asset->url,
    link ${LINK_OBJECT},
    metric {
      title,
      body
    }
  },
  defined(_ref) => @->{
    "kind": "ref",
    _id,
    _type,
    title,
    "slug": slug.current,
    "brand": client->name,
    "imageSrc": coalesce(
      cardImage.asset->url,
      heroMedia.videoThumbnail.asset->url
    ),
    "imageAlt": coalesce(cardImageAlt, cardImage.asset->altText, title),
    "logoSrc": client->logo.asset->url,
    "logoAlt": client->name,
    "videoSrc": previewVideo.asset->url,
    "metricTitle": highlights[0].title,
    "metricBody": highlights[0].description
  }
}`;

/**
 * Expertise Service as a signature-system dimension (PROD-2577). Also used by
 * host documents so `signatureSystem` can inherit the stage's `services`.
 */
export const EXPERTISE_SERVICE_DIMENSION = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  summary,
  "imageSrc": image.asset->url,
  "imageAlt": coalesce(image.alt, image.asset->altText),
  "points": points[]{
    label,
    gloss
  }
}`;

/**
 * Catalogue row card (productLinesRow / solutionsRow, PROD-2666). Visibility
 * fields ride along so www can drop hidden targets (`isCatalogTargetVisible`).
 */
const CATALOG_ROW_ITEM = /* groq */ `{
  _id,
  _type,
  status,
  customerFacing,
  hasPage,
  "title": coalesce(shortName, title),
  "slug": slug.current,
  "description": shortDescription,
  "imageSrc": featuredImage.asset->url,
  "imageAlt": coalesce(featuredImage.alt, featuredImage.asset->altText, title)
}`;

/** Hero button: section link + one-line note (PROD-2666). */
const HERO_CTA = /* groq */ `{
  label,
  note,
  linkType,
  externalUrl,
  relativePath,
  "internalLink": internalLink->${LINKABLE_DOC}
}`;

/** Home hero copy shared by all three hero sections (PROD-2666). */
const HERO_COPY = /* groq */ `
  eyebrow,
  intro,
  showReviews,
  "primaryCta": primaryCta ${HERO_CTA},
  "secondaryCta": secondaryCta ${HERO_CTA}
`;

/**
 * Case study as a hero feature — media, client, first highlight stat and the
 * product lines it covers (`lineIds` lets the Finder hero match line × industry).
 */
const HERO_CASE_STUDY = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  "summary": cardSummary,
  "clientName": client->name,
  "logoSrc": client->logo.asset->url,
  "imageSrc": coalesce(
    heroMedia.image.asset->url,
    cardImage.asset->url,
    heroMedia.videoThumbnail.asset->url
  ),
  "imageAlt": coalesce(heroMedia.alt, cardImageAlt, cardImage.asset->altText, title),
  "videoSrc": previewVideo.asset->url,
  "statTitle": highlights[0].title,
  "statBody": highlights[0].description,
  "chips": products[0...3]->{"label": coalesce(shortName, title)}.label,
  "lineIds": products[]._ref
}`;

/**
 * Mixed spotlight slide — typed `heroSpotlightCampaign` or a catalogue ref
 * (caseStudy / productLine / productStyle / solution). Visibility fields ride
 * along so www can drop hidden catalogue targets (`isCatalogTargetVisible`).
 */
const HERO_SPOTLIGHT_SLIDE = /* groq */ `{
  _key,
  _type,
  _type == "heroSpotlightCampaign" => {
    "kind": "campaign",
    title,
    description,
    "imageSrc": image.asset->url,
    "imageAlt": coalesce(image.alt, image.asset->altText, title),
    link ${LINK_OBJECT}
  },
  defined(_ref) => @->{
    "kind": _type,
    "docType": _type,
    status,
    customerFacing,
    hasPage,
    "slug": slug.current,
    _type == "caseStudy" => ${HERO_CASE_STUDY},
    _type != "caseStudy" => {
      _id,
      "title": coalesce(shortName, title),
      "description": shortDescription,
      "lineSlug": productLine->slug.current,
      "imageSrc": featuredImage.asset->url,
      "imageAlt": coalesce(featuredImage.alt, featuredImage.asset->altText, title)
    }
  }
}`;

/** Finder hero product-line option — plus recent studies and styles for the line. */
const HERO_FINDER_LINE = /* groq */ `{
  _id,
  _type,
  status,
  customerFacing,
  "title": coalesce(shortName, title),
  "slug": slug.current,
  "description": shortDescription,
  "imageSrc": featuredImage.asset->url,
  "imageAlt": coalesce(featuredImage.alt, featuredImage.asset->altText, title),
  "videoSrc": ${FEATURED_VIDEO_URL_GROQ},
  "studies": *[_type == "caseStudy" && references(^._id)] | order(publishedAt desc)[0...4]${HERO_CASE_STUDY},
  "styles": *[_type == "productStyle" && references(^._id) && (!defined(status) || status == "active") && customerFacing != false] | order(title asc)[0...3]{
    _id,
    "title": coalesce(shortName, title),
    "slug": slug.current,
    "description": shortDescription,
    "imageSrc": featuredImage.asset->url,
    "imageAlt": coalesce(featuredImage.alt, featuredImage.asset->altText, title),
    "lineSlug": ^.slug.current,
    "videoSrc": ${FEATURED_VIDEO_URL_GROQ}
  }
}`;

/** Finder hero industry option — its curated related case studies. */
const HERO_FINDER_INDUSTRY = /* groq */ `{
  _id,
  _type,
  hasPage,
  "title": coalesce(shortName, title),
  "slug": slug.current,
  "description": shortDescription,
  "imageSrc": featuredImage.asset->url,
  "imageAlt": coalesce(featuredImage.alt, featuredImage.asset->altText, title),
  "studies": relatedCaseStudies[]->${HERO_CASE_STUDY}
}`;

/** Compact catalogue card for a default-rail / general-bucket reference. */
const HERO_FINDER_RAIL_ITEM = /* groq */ `{
  _id,
  _type,
  "title": coalesce(shortName, title),
  "slug": slug.current,
  "description": coalesce(shortDescription, cardSummary, summary, excerpt),
  "imageSrc": coalesce(
    featuredImage.asset->url,
    heroMedia.image.asset->url,
    cardImage.asset->url,
    mainImage.asset->url
  ),
  "imageAlt": coalesce(
    featuredImage.alt,
    featuredImage.asset->altText,
    heroMedia.alt,
    cardImageAlt,
    mainImage.alt,
    title
  ),
  "videoSrc": coalesce(
    previewVideo.asset->url,
    ${FEATURED_VIDEO_URL_GROQ}
  ),
  "clientName": client->name,
  "statTitle": highlights[0].title,
  "statBody": highlights[0].description,
  "lineIds": products[]._ref,
  status,
  customerFacing,
  hasPage
}`;

/** One simple-Finder General bucket entry (ref + optional feature media). */
const HERO_FINDER_GENERAL_ENTRY = /* groq */ `{
  _key,
  "item": item->${HERO_FINDER_RAIL_ITEM},
  "featureImageSrc": featureImage.asset->url,
  "featureImageAlt": coalesce(featureImage.alt, featureImage.asset->altText),
  "featureVideoUrl": select(
    featureVideo.source == "upload" => featureVideo.file.asset->url,
    featureVideo.source == "url" => featureVideo.url,
    defined(featureVideo.asset) => featureVideo.asset->url,
    null
  )
}`;

/** Flexible General-deck rail item (editor-ordered array). */
const HERO_FINDER_RAIL_ENTRY = /* groq */ `{
  _key,
  kindLabel,
  source,
  title,
  description,
  "item": item->${HERO_FINDER_RAIL_ITEM},
  link ${LINK_OBJECT},
  bannerType,
  "bannerImageSrc": bannerImage.asset->url,
  "bannerImageAlt": coalesce(bannerImage.alt, bannerImage.asset->altText),
  "bannerVideoUrl": select(
    bannerVideo.source == "upload" => bannerVideo.file.asset->url,
    bannerVideo.source == "url" => bannerVideo.url,
    defined(bannerVideo.asset) => bannerVideo.asset->url,
    null
  )
}`;

/**
 * Projection body for `sections[]{ … }` — use as:
 * `"sections": sections[]${PAGE_SECTIONS_PROJECTION}`
 */
export const PAGE_SECTIONS_PROJECTION = /* groq */ `{
  _key,
  _type,
  _type in ["heroSpotlight", "heroSpotlightFullBleed"] => {
    ${HERO_COPY},
    heading,
    "spotlight": spotlight[]${HERO_SPOTLIGHT_SLIDE}
  },
  _type in ["heroFinder", "heroFinderFullscreen"] => {
    ${HERO_COPY},
    headingLead,
    headingJoin,
    headingTrail,
    "productLines": productLines[]->${HERO_FINDER_LINE},
    "industries": industries[]->${HERO_FINDER_INDUSTRY},
    _type == "heroFinder" => {
      railOrder,
      "generalProducts": generalProducts[]${HERO_FINDER_GENERAL_ENTRY},
      "generalIndustries": generalIndustries[]${HERO_FINDER_GENERAL_ENTRY},
      "generalCustomizations": generalCustomizations[]${HERO_FINDER_GENERAL_ENTRY},
      "generalExpertise": generalExpertise[]${HERO_FINDER_GENERAL_ENTRY},
      "generalCaseStudies": generalCaseStudies[]${HERO_FINDER_GENERAL_ENTRY}
    },
    _type == "heroFinderFullscreen" => {
      "defaultRail": defaultRail[]${HERO_FINDER_RAIL_ENTRY}
    }
  },
  _type == "faqSection" => {
    ${SECTION_CHROME},
    "faqs": faqs[]->${FAQ_REF}
  },
  _type == "richText" => {
    ${SECTION_CHROME}
  },
  _type == "mediaFeature" => {
    ${SECTION_CHROME},
    "bodyPlain": pt::text(body),
    "mediaSrc": media.asset->url,
    "mediaAlt": coalesce(media.alt, media.asset->altText)
  },
  _type == "stats" => {
    ${SECTION_CHROME},
    "items": items[]{
      _key,
      value,
      label
    }
  },
  _type == "steps" => {
    ${SECTION_CHROME},
    "items": items[]{
      _key,
      title,
      body,
      link ${LINK_OBJECT}
    }
  },
  _type == "testimonialsRow" => {
    ${SECTION_CHROME},
    layoutVariant,
    aggregatePlacement
  },
  _type == "logoWall" => {
    ${SECTION_CHROME},
    "items": curatedItems[]->{
      _id,
      name,
      "imageSrc": logo.asset->url,
      "href": website
    }
  },
  _type == "caseStudiesRow" => {
    ${SECTION_CHROME},
    "items": curatedItems[]{
      _key,
      ...@->{
        _id,
        title,
        "slug": slug.current,
        "cardImageUrl": cardImage.asset->url,
        "cardImageAlt": coalesce(cardImageAlt, cardImage.asset->altText),
        "clientName": client->name,
        "tag": coalesce(products[0]->title, expertiseAreas[0]->title)
      }
    }
  },
  _type == "inspirationsGrid" => {
    ${SECTION_CHROME},
    "cards": cards[]${INSPIRATIONS_CARD}
  },
  _type == "videoCaseStudiesRow" => {
    ${SECTION_CHROME},
    "cards": cards[]${VIDEO_CASE_STUDY_CARD}
  },
  _type == "productLinesRow" => {
    ${SECTION_CHROME},
    "items": curatedItems[]->${CATALOG_ROW_ITEM}
  },
  _type == "productStylesRow" => {
    ${SECTION_CHROME},
    "cards": cards[]${INSPIRATIONS_CARD}
  },
  _type == "productsRow" => {
    ${SECTION_CHROME}
  },
  _type == "bundlesRow" => {
    ${SECTION_CHROME}
  },
  _type == "customizationsRow" => {
    ${SECTION_CHROME}
  },
  _type == "customizationsCatalog" => {
    ${SECTION_CHROME}
  },
  _type == "solutionsRow" => {
    ${SECTION_CHROME},
    "items": curatedItems[]->${CATALOG_ROW_ITEM}
  },
  _type == "expertiseSequence" => {
    ${SECTION_CHROME},
    "stages": curatedItems[]->{
      _id,
      title,
      "slug": slug.current,
      tagline,
      description,
      status,
      "diagramSrc": diagram.asset->url,
      "diagramAlt": coalesce(diagram.alt, diagram.asset->altText),
      ${FEATURED_VIDEO_URL_FIELD}
    }
  },
  _type == "signatureSystem" => {
    ${SECTION_CHROME},
    "bodyPlain": pt::text(body),
    "problems": problems[]{
      _key,
      label,
      "serviceId": service._ref
    },
    problemsCaption,
    systemName,
    systemHeading,
    systemIntro,
    "services": services[@->status != "discontinued"]->${EXPERTISE_SERVICE_DIMENSION}
  },
  _type == "benefits" => {
    ${SECTION_CHROME},
    "items": items[]{
      _key,
      title,
      body,
      symbol
    }
  },
  _type == "guidesRow" => {
    ${SECTION_CHROME}
  },
  _type == "dielinesRow" => {
    ${SECTION_CHROME}
  },
  _type == "glossaryStrip" => {
    ${SECTION_CHROME}
  },
  _type == "postsRow" => {
    ${SECTION_CHROME}
  },
  _type == "generalCta" => {
    heading,
    body,
    link ${LINK_OBJECT},
    theme,
    align,
    paddingBlock,
    showTopBorder,
    showBottomBorder
  },
  _type == "newsletterCta" => {
    ${SECTION_CHROME}
  },
  _type == "linkCards" => {
    ${SECTION_CHROME}
  },
  _type == "contactForm" => {
    ${SECTION_CHROME}
  }
}`;

/** Shared chrome fields on every website section. */
export type PageSectionLinkDoc = {
    label?: string | null;
    linkType?: string | null;
    externalUrl?: string | null;
    /** Root-relative site path when `linkType === 'path'` (e.g. `/products`). */
    relativePath?: string | null;
    /** Query string without `?`; may include resolved page-field tokens. */
    query?: string | null;
    internalLink?: {
        _id?: string | null;
        _type?: string | null;
        title?: string | null;
        slug?: string | null;
        name?: string | null;
        term?: string | null;
        pageRole?: string | null;
        pageType?: string | null;
        category?: string | null;
        handle?: string | null;
        collectionSlug?: string | null;
        pageSlug?: string | null;
    } | null;
};

export type PageSectionChromeFields = {
    eyebrow?: string | null;
    heading?: string | null;
    intro?: string | null;
    align?: 'left' | 'center' | string | null;
    paddingBlock?: 'xs' | 'sm' | 'md' | 'lg' | string | null;
    showTopBorder?: boolean | null;
    showBottomBorder?: boolean | null;
    /** Host list inherit: `page` | `custom` (ADR-020 §8). */
    listSource?: string | null;
    /** Row derive: `derive` | `custom`. */
    curatedSource?: string | null;
    link?: PageSectionLinkDoc | null;
};

export type PageSectionFaqDoc = {
    question?: string | null;
    answerPlain?: string | null;
};

export type PageSectionFaqSectionDoc = PageSectionChromeFields & {
    _type: 'faqSection';
    _key: string;
    faqs?: PageSectionFaqDoc[] | null;
};

export type PageSectionLogoWallItemDoc = {
    _id?: string | null;
    name?: string | null;
    imageSrc?: string | null;
    href?: string | null;
};

export type PageSectionLogoWallDoc = PageSectionChromeFields & {
    _type: 'logoWall';
    _key: string;
    items?: PageSectionLogoWallItemDoc[] | null;
};

export type PageSectionMediaFeatureDoc = PageSectionChromeFields & {
    _type: 'mediaFeature';
    _key: string;
    bodyPlain?: string | null;
    mediaSrc?: string | null;
    mediaAlt?: string | null;
};

export type PageSectionExpertiseStageDoc = {
    _id?: string | null;
    title?: string | null;
    slug?: string | null;
    tagline?: string | null;
    description?: string | null;
    status?: string | null;
    diagramSrc?: string | null;
    diagramAlt?: string | null;
    /** Playable upload/URL from featuredVideo; null for YouTube-only or unset. */
    featuredVideoUrl?: string | null;
};

export type PageSectionExpertiseSequenceDoc = PageSectionChromeFields & {
    _type: 'expertiseSequence';
    _key: string;
    stages?: PageSectionExpertiseStageDoc[] | null;
};

export type PageSectionCaseStudyItemDoc = {
    _key?: string | null;
    _id?: string | null;
    title?: string | null;
    slug?: string | null;
    cardImageUrl?: string | null;
    cardImageAlt?: string | null;
    clientName?: string | null;
    tag?: string | null;
};

export type PageSectionCaseStudiesRowDoc = PageSectionChromeFields & {
    _type: 'caseStudiesRow';
    _key: string;
    items?: PageSectionCaseStudyItemDoc[] | null;
};

/** Flattened mixed card from `inspirationsGrid.cards[]` (typed or ref). */
export type PageSectionInspirationsCardDoc = {
    _key?: string | null;
    _type?: string | null;
    kind?: 'typed' | 'ref' | null;
    _id?: string | null;
    title?: string | null;
    description?: string | null;
    imageSrc?: string | null;
    imageAlt?: string | null;
    link?: PageSectionLinkDoc | null;
    slug?: string | null;
    solutionSlug?: string | null;
    lineSlug?: string | null;
    handle?: string | null;
    collectionSlug?: string | null;
    pageSlug?: string | null;
};

export type PageSectionInspirationsGridDoc = PageSectionChromeFields & {
    _type: 'inspirationsGrid';
    _key: string;
    cards?: PageSectionInspirationsCardDoc[] | null;
};

/** Same chrome + cards shape as inspirationsGrid; product-line Styles band. */
export type PageSectionProductStylesRowDoc = PageSectionChromeFields & {
    _type: 'productStylesRow';
    _key: string;
    cards?: PageSectionInspirationsCardDoc[] | null;
};

export type PageSectionVideoCaseStudyMetricDoc = {
    title?: string | null;
    body?: string | null;
};

/** Flattened mixed card from `videoCaseStudiesRow.cards[]` (typed or ref). */
export type PageSectionVideoCaseStudyCardDoc = {
    _key?: string | null;
    _type?: string | null;
    kind?: 'typed' | 'ref' | null;
    _id?: string | null;
    brand?: string | null;
    title?: string | null;
    slug?: string | null;
    imageSrc?: string | null;
    imageAlt?: string | null;
    logoSrc?: string | null;
    logoAlt?: string | null;
    /** Hosted MP4 for muted hover (typed `video` or caseStudy `previewVideo`). */
    videoSrc?: string | null;
    link?: PageSectionLinkDoc | null;
    metric?: PageSectionVideoCaseStudyMetricDoc | null;
    metricTitle?: string | null;
    metricBody?: string | null;
};

export type PageSectionVideoCaseStudiesRowDoc = PageSectionChromeFields & {
    _type: 'videoCaseStudiesRow';
    _key: string;
    cards?: PageSectionVideoCaseStudyCardDoc[] | null;
};

export type ExpertiseServiceDimensionDoc = {
    _id?: string | null;
    title?: string | null;
    slug?: string | null;
    summary?: string | null;
    imageSrc?: string | null;
    imageAlt?: string | null;
    points?: {label?: string | null; gloss?: string | null}[] | null;
};

export type PageSectionSignatureProblemDoc = {
    _key?: string | null;
    label?: string | null;
    /** `_ref` of the Expertise Service that answers this problem. */
    serviceId?: string | null;
};

export type PageSectionSignatureSystemDoc = PageSectionChromeFields & {
    _type: 'signatureSystem';
    _key: string;
    bodyPlain?: string | null;
    problems?: PageSectionSignatureProblemDoc[] | null;
    problemsCaption?: string | null;
    systemName?: string | null;
    systemHeading?: string | null;
    systemIntro?: string | null;
    /** Custom dimensions; empty + `listSource` page → host `services` (ADR-020 §8). */
    services?: ExpertiseServiceDimensionDoc[] | null;
};

export type PageSectionBenefitDoc = {
    _key?: string | null;
    title?: string | null;
    body?: string | null;
    symbol?: string | null;
};

export type PageSectionBenefitsDoc = PageSectionChromeFields & {
    _type: 'benefits';
    _key: string;
    items?: PageSectionBenefitDoc[] | null;
};

export type PageSectionStepDoc = {
    _key?: string | null;
    title?: string | null;
    body?: string | null;
    link?: PageSectionLinkDoc | null;
};

export type PageSectionStepsDoc = PageSectionChromeFields & {
    _type: 'steps';
    _key: string;
    items?: PageSectionStepDoc[] | null;
};

/** General CTA band (heading + body + button link); theme/align/padding/borders Studio-controlled. */
export type PageSectionGeneralCtaDoc = {
    _type: 'generalCta';
    _key: string;
    heading?: string | null;
    body?: string | null;
    link?: PageSectionLinkDoc | null;
    theme?: 'muted' | 'inverse' | string | null;
    align?: 'left' | 'center' | string | null;
    paddingBlock?: string | null;
    showTopBorder?: boolean | null;
    showBottomBorder?: boolean | null;
};

/** Chrome-only Reviews band; quote items still mock on www. */
/** Reviews band — chrome from CMS; quotes from Google Places on www. */
export type PageSectionTestimonialsRowDoc = PageSectionChromeFields & {
    _type: 'testimonialsRow';
    _key: string;
    /** Carousel (arrows) vs dual-row marquee. Unset = carousel. */
    layoutVariant?: 'carousel' | 'marquee' | null;
    /** Where to show Google aggregate. Unset = footer. */
    aggregatePlacement?: 'footer' | 'eyebrow' | null;
};

/** Catalogue row card — product line or solution (PROD-2666). */
export type PageSectionCatalogRowItemDoc = {
    _id?: string | null;
    _type?: string | null;
    status?: string | null;
    customerFacing?: boolean | null;
    hasPage?: boolean | null;
    title?: string | null;
    slug?: string | null;
    description?: string | null;
    imageSrc?: string | null;
    imageAlt?: string | null;
};

export type PageSectionProductLinesRowDoc = PageSectionChromeFields & {
    _type: 'productLinesRow';
    _key: string;
    items?: (PageSectionCatalogRowItemDoc | null)[] | null;
};

export type PageSectionSolutionsRowDoc = PageSectionChromeFields & {
    _type: 'solutionsRow';
    _key: string;
    items?: (PageSectionCatalogRowItemDoc | null)[] | null;
};

export type PageSectionStatDoc = {
    _key?: string | null;
    value?: string | null;
    label?: string | null;
};

export type PageSectionStatsDoc = PageSectionChromeFields & {
    _type: 'stats';
    _key: string;
    items?: PageSectionStatDoc[] | null;
};

/** Hero button (label + note + link target). */
export type PageSectionHeroCtaDoc = Omit<PageSectionLinkDoc, 'query'> & {
    note?: string | null;
};

/** Copy fields shared by the three Home hero sections (PROD-2666). */
export type PageSectionHeroCopyFields = {
    eyebrow?: string | null;
    intro?: string | null;
    showReviews?: boolean | null;
    primaryCta?: PageSectionHeroCtaDoc | null;
    secondaryCta?: PageSectionHeroCtaDoc | null;
};

export type PageSectionHeroCaseStudyDoc = {
    _id?: string | null;
    title?: string | null;
    slug?: string | null;
    summary?: string | null;
    clientName?: string | null;
    logoSrc?: string | null;
    imageSrc?: string | null;
    imageAlt?: string | null;
    videoSrc?: string | null;
    statTitle?: string | null;
    statBody?: string | null;
    chips?: (string | null)[] | null;
    lineIds?: (string | null)[] | null;
};

/** Flattened spotlight slide — campaign (typed) or catalogue ref. */
export type PageSectionHeroSpotlightSlideDoc = PageSectionHeroCaseStudyDoc & {
    _key?: string | null;
    _type?: string | null;
    kind?:
        | 'campaign'
        | 'caseStudy'
        | 'productLine'
        | 'productStyle'
        | 'solution'
        | string
        | null;
    docType?: string | null;
    status?: string | null;
    customerFacing?: boolean | null;
    hasPage?: boolean | null;
    description?: string | null;
    lineSlug?: string | null;
    link?: PageSectionLinkDoc | null;
};

export type PageSectionHeroSpotlightDoc = PageSectionHeroCopyFields & {
    _type: 'heroSpotlight' | 'heroSpotlightFullBleed';
    _key: string;
    heading?: string | null;
    spotlight?: PageSectionHeroSpotlightSlideDoc[] | null;
};

export type PageSectionHeroFinderLineDoc = {
    _id?: string | null;
    _type?: string | null;
    status?: string | null;
    customerFacing?: boolean | null;
    title?: string | null;
    slug?: string | null;
    description?: string | null;
    imageSrc?: string | null;
    imageAlt?: string | null;
    /** Playable MP4 from `featuredVideo` (upload/url); YouTube yields null. */
    videoSrc?: string | null;
    studies?: PageSectionHeroCaseStudyDoc[] | null;
    styles?: PageSectionHeroFinderStyleDoc[] | null;
};

export type PageSectionHeroFinderStyleDoc = {
    _id?: string | null;
    title?: string | null;
    slug?: string | null;
    description?: string | null;
    imageSrc?: string | null;
    imageAlt?: string | null;
    lineSlug?: string | null;
    videoSrc?: string | null;
};

export type PageSectionHeroFinderIndustryDoc = {
    _id?: string | null;
    _type?: string | null;
    hasPage?: boolean | null;
    title?: string | null;
    slug?: string | null;
    description?: string | null;
    imageSrc?: string | null;
    imageAlt?: string | null;
    studies?: PageSectionHeroCaseStudyDoc[] | null;
};

export type PageSectionHeroFinderRailItemDoc = {
    _id?: string | null;
    _type?: string | null;
    title?: string | null;
    slug?: string | null;
    description?: string | null;
    imageSrc?: string | null;
    imageAlt?: string | null;
    videoSrc?: string | null;
    clientName?: string | null;
    statTitle?: string | null;
    statBody?: string | null;
    lineIds?: string[] | null;
    status?: string | null;
    customerFacing?: boolean | null;
    hasPage?: boolean | null;
};

/** One simple-Finder General bucket entry. */
export type PageSectionHeroFinderGeneralEntryDoc = {
    _key?: string | null;
    item?: PageSectionHeroFinderRailItemDoc | null;
    featureImageSrc?: string | null;
    featureImageAlt?: string | null;
    featureVideoUrl?: string | null;
};

/** One flexible General-deck rail entry (editor-ordered). */
export type PageSectionHeroFinderRailEntryDoc = {
    _key?: string | null;
    kindLabel?: string | null;
    source?: 'catalogue' | 'campaign' | string | null;
    title?: string | null;
    description?: string | null;
    item?: PageSectionHeroFinderRailItemDoc | null;
    link?: PageSectionLinkDoc | null;
    bannerType?: 'image' | 'video' | string | null;
    bannerImageSrc?: string | null;
    bannerImageAlt?: string | null;
    bannerVideoUrl?: string | null;
};

export type PageSectionHeroFinderDoc = PageSectionHeroCopyFields & {
    _type: 'heroFinder' | 'heroFinderFullscreen';
    _key: string;
    headingLead?: string | null;
    headingJoin?: string | null;
    headingTrail?: string | null;
    productLines?: PageSectionHeroFinderLineDoc[] | null;
    industries?: PageSectionHeroFinderIndustryDoc[] | null;
    railOrder?: 'business' | 'random' | string | null;
    generalProducts?: PageSectionHeroFinderGeneralEntryDoc[] | null;
    generalIndustries?: PageSectionHeroFinderGeneralEntryDoc[] | null;
    generalCustomizations?: PageSectionHeroFinderGeneralEntryDoc[] | null;
    generalExpertise?: PageSectionHeroFinderGeneralEntryDoc[] | null;
    generalCaseStudies?: PageSectionHeroFinderGeneralEntryDoc[] | null;
    defaultRail?: PageSectionHeroFinderRailEntryDoc[] | null;
};

/** Shallow / unwired section until a renderer maps it. */
export type PageSectionStubDoc = PageSectionChromeFields & {
    _type: string;
    _key: string;
};

export type PageSectionDoc =
    | PageSectionProductLinesRowDoc
    | PageSectionSolutionsRowDoc
    | PageSectionStatsDoc
    | PageSectionHeroSpotlightDoc
    | PageSectionHeroFinderDoc
    | PageSectionFaqSectionDoc
    | PageSectionLogoWallDoc
    | PageSectionMediaFeatureDoc
    | PageSectionExpertiseSequenceDoc
    | PageSectionCaseStudiesRowDoc
    | PageSectionInspirationsGridDoc
    | PageSectionProductStylesRowDoc
    | PageSectionVideoCaseStudiesRowDoc
    | PageSectionTestimonialsRowDoc
    | PageSectionSignatureSystemDoc
    | PageSectionBenefitsDoc
    | PageSectionGeneralCtaDoc
    | PageSectionStepsDoc
    | PageSectionStubDoc;
