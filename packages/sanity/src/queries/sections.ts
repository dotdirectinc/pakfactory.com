/**
 * Shared GROQ projection for www page `sections[]` (ADR-015 / ADR-020).
 * Deep-expand types as renderers wire them; shallow stubs keep `_key`/`_type`
 * (+ cheap scalars) for allowlisted inventory until later mappers land.
 */

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

/** Shared section chrome (heading · intro · align · link · dieline borders). */
const SECTION_CHROME = /* groq */ `
  heading,
  intro,
  align,
  showTopBorder,
  showBottomBorder,
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
 * Hover MP4 is typed-only; caseStudy refs use heroMedia.videoUrl (YouTube).
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
    "youtubeUrl": null,
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
    "videoSrc": null,
    "youtubeUrl": select(
      heroMedia.mediaType == "video" => heroMedia.videoUrl
    ),
    "metricTitle": highlights[0].title,
    "metricBody": highlights[0].description
  }
}`;

/**
 * Projection body for `sections[]{ … }` — use as:
 * `"sections": sections[]${PAGE_SECTIONS_PROJECTION}`
 */
export const PAGE_SECTIONS_PROJECTION = /* groq */ `{
  _key,
  _type,
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
    ${SECTION_CHROME}
  },
  _type == "steps" => {
    ${SECTION_CHROME}
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
    ${SECTION_CHROME}
  },
  _type == "productStylesRow" => {
    ${SECTION_CHROME}
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
    ${SECTION_CHROME}
  },
  _type == "expertiseSequence" => {
    ${SECTION_CHROME},
    "stages": curatedItems[]->{
      _id,
      title,
      "slug": slug.current,
      tagline,
      description,
      "diagramSrc": diagram.asset->url,
      "diagramAlt": coalesce(diagram.alt, diagram.asset->altText)
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
  _type == "quoteCta" => {
    ${SECTION_CHROME}
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
    heading?: string | null;
    intro?: string | null;
    align?: 'left' | 'center' | string | null;
    showTopBorder?: boolean | null;
    showBottomBorder?: boolean | null;
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
    diagramSrc?: string | null;
    diagramAlt?: string | null;
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
    videoSrc?: string | null;
    /** caseStudy `heroMedia.videoUrl` when mediaType is video (YouTube). */
    youtubeUrl?: string | null;
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

/** Shallow / unwired section until a renderer maps it. */
export type PageSectionStubDoc = PageSectionChromeFields & {
    _type: string;
    _key: string;
};

export type PageSectionDoc =
    | PageSectionFaqSectionDoc
    | PageSectionLogoWallDoc
    | PageSectionMediaFeatureDoc
    | PageSectionExpertiseSequenceDoc
    | PageSectionCaseStudiesRowDoc
    | PageSectionInspirationsGridDoc
    | PageSectionVideoCaseStudiesRowDoc
    | PageSectionStubDoc;
