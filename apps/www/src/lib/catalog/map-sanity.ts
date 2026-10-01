import {
    type CatalogCustomizationDetailDoc,
    type CatalogLibraryOptionDoc,
    type CatalogOptionDoc,
    type CatalogProductDoc,
    type CatalogProductLibraryDoc,
    type CatalogProductLineDoc,
    type CatalogPropertyValueDetailDoc,
    type PageSectionDoc,
} from '@pakfactory/sanity/queries';
import type {PortableTextBlock} from '@portabletext/types';
import {
    resolveImageAlt,
    sanityImageBaseUrl,
} from '@/lib/sanity/image';
import type {
    CatalogMedia,
    CustomizationDeclaredProperty,
    CustomizationDetail,
    CustomizationLibraryItem,
    CustomizationOption,
    CustomizationPropertyFact,
    CustomizationPropertyValue,
    Product,
    ProductFaq,
    ProductKind,
    ProductLibraryItem,
    ProductLibraryLineMeta,
    ProductLine,
    ProductLineCaseStudyRef,
    ProductLineExpertiseRef,
    ProductLineFrame,
    ProductLineRef,
    ProductLineRelatedRef,
    ProductProperty,
    ProductStyleRef,
} from '@/lib/catalog/types';
import {hasDetailPage, isConfigurable, toLifecycle} from '@/lib/catalog/types';

function mediaFromSanity(
    media: unknown[] | null | undefined,
    titleFallback: string,
): CatalogMedia[] {
    if (!Array.isArray(media) || media.length === 0) {
        return [{alt: titleFallback}];
    }
    return media.map((item) => {
        const src = sanityImageBaseUrl(item);
        const alt = resolveImageAlt(item, titleFallback);
        return src ? {src, alt} : {alt};
    });
}

/** Single Sanity image → CatalogMedia when it has a URL. */
function catalogMediaFromImage(
    image: unknown | null | undefined,
    titleFallback: string,
): CatalogMedia | null {
    if (!image) return null;
    const src = sanityImageBaseUrl(image);
    if (!src) return null;
    return {src, alt: resolveImageAlt(image, titleFallback)};
}

/**
 * Detail / compare gallery: Featured image first, then Media extras (ADR-023).
 * Dedupe by src when Featured was also left in Media. Empty → placeholder alt.
 */
function customizationGallerySlides(
    featuredImage: unknown | null | undefined,
    media: unknown[] | null | undefined,
    titleFallback: string,
): CatalogMedia[] {
    const slides: CatalogMedia[] = [];
    const seen = new Set<string>();

    const featured = catalogMediaFromImage(featuredImage, titleFallback);
    if (featured?.src) {
        slides.push(featured);
        seen.add(featured.src);
    }

    if (Array.isArray(media)) {
        for (const item of media) {
            const slide = catalogMediaFromImage(item, titleFallback);
            if (!slide?.src || seen.has(slide.src)) continue;
            seen.add(slide.src);
            slides.push(slide);
        }
    }

    return slides.length > 0 ? slides : [{alt: titleFallback}];
}

/** First non-empty trimmed string — used for option detail copy fallbacks. */
function firstNonEmpty(
    ...candidates: Array<string | null | undefined>
): string {
    for (const value of candidates) {
        const trimmed = value?.trim();
        if (trimmed) return trimmed;
    }
    return '';
}

function cardImageFromSanity(
    cardImage: unknown | null | undefined,
    titleFallback: string,
): {imageUrl: string | null; imageAlt: string} {
    const imageUrl = cardImage ? (sanityImageBaseUrl(cardImage) ?? null) : null;
    const imageAlt = cardImage
        ? resolveImageAlt(cardImage, titleFallback)
        : titleFallback;
    return {imageUrl, imageAlt};
}

/** FAQ rows → `ProductFaq[]`, dropping any without both a question and an answer. */
function mapFaqs(
    rows:
        | ({
              question?: string | null;
              answerPlain?: string | null;
              answer?: unknown[] | null;
          } | null)[]
        | null
        | undefined,
): ProductFaq[] {
    const faqs: ProductFaq[] = [];
    for (const row of rows ?? []) {
        const question = row?.question?.trim();
        const answerPlain = row?.answerPlain?.trim();
        if (!question || !answerPlain) continue;
        const answerBlocks = Array.isArray(row?.answer)
            ? (row.answer as PortableTextBlock[])
            : undefined;
        faqs.push({
            question,
            answerPlain,
            ...(answerBlocks?.length ? {answer: answerBlocks} : {}),
        });
    }
    return faqs;
}

function mapStyleRef(
    style: {
        slug: string | null;
        title: string;
        description?: string | null;
        shortDescription?: string | null;
        cardImage?: unknown | null;
        faqs?: ({
            question?: string | null;
            answerPlain?: string | null;
            answer?: unknown[] | null;
        } | null)[] | null;
    },
): ProductStyleRef | null {
    const styleSlug = style.slug?.trim();
    const title = style.title?.trim();
    if (!styleSlug || !title) return null;
    const description =
        typeof style.description === 'string'
            ? style.description.trim()
            : undefined;
    const shortDescription = style.shortDescription?.trim();
    const {imageUrl, imageAlt} = cardImageFromSanity(style.cardImage, title);
    const faqs = mapFaqs(style.faqs);
    return {
        slug: styleSlug,
        title,
        ...(description ? {description} : {}),
        ...(shortDescription ? {shortDescription} : {}),
        ...(imageUrl ? {imageUrl, imageAlt} : {}),
        ...(faqs.length ? {faqs} : {}),
    };
}

function preferStyleWithImage(
    existing: ProductStyleRef | undefined,
    next: ProductStyleRef,
): ProductStyleRef {
    if (!existing) return next;
    if (!existing.imageUrl && next.imageUrl) {
        return {
            ...existing,
            imageUrl: next.imageUrl,
            ...(next.imageAlt ? {imageAlt: next.imageAlt} : {}),
            ...(next.description && !existing.description
                ? {description: next.description}
                : {}),
            ...(next.shortDescription && !existing.shortDescription
                ? {shortDescription: next.shortDescription}
                : {}),
        };
    }
    if (!existing.shortDescription && next.shortDescription) {
        return {...existing, shortDescription: next.shortDescription};
    }
    return existing;
}

function mapAvailableCustomization(
    row: NonNullable<CatalogProductDoc['availableCustomizations']>[number],
): CustomizationOption | null {
    const option = row?.customization;
    if (!option?._id || !option.title) return null;
    if (option.status && option.status !== 'active') return null;

    // 🔴 KEEP-WHEN-CONFIGURABLE, never drop-when-not (PROD-2732).
    //
    // These read the same for every value that exists, and the OPPOSITE way for a
    // MISSING one. `appearsIn` is undefined on any option the backfill has not
    // reached, and a `!== 'not-configurable-with-page'` test would let those
    // through — putting Matte Lamination, Gloss Lamination, Soft Touch Lamination,
    // Varnish, Aqueous and UV Coating into the configurator as things a customer
    // can order. An unset value must mean "not offered", so the test is `===`.
    //
    // Same trap as `showOnDetailPage` (PROD-2610) and `customerFacing` (PROD-2620),
    // inverted: there the safe test is `!= false`, here it is `==`.
    if (!isConfigurable(option.appearsIn)) return null;

    const type = option.type;
    const category = type?.category;
    const categorySlug = category?.slug?.trim();
    if (!categorySlug) return null;

    const firstImage = Array.isArray(option.media) ? option.media[0] : null;

    // No shortDescription on customizationOption yet — fall back through
    // meta / glossary / benefits / type description for the detail panel.
    const description = firstNonEmpty(
        option.metaDescription,
        option.glossaryPlain,
        option.benefitsPlain,
        type?.description,
    );

    const customerSelects =
        type?.customerSelects === 'many' || type?.cardinality === 'many'
            ? 'many'
            : 'one';

    const achievedBy = (option.achievedBy ?? [])
        .filter(
            (item): item is NonNullable<(typeof option.achievedBy)>[number] =>
                Boolean(item?._id && item.title),
        )
        .map((item) => {
            const techniqueImage = Array.isArray(item.media)
                ? item.media[0]
                : null;
            const techniqueDescription = firstNonEmpty(
                item.metaDescription,
                item.glossaryPlain,
                item.benefitsPlain,
            );
            return {
                id: item._id,
                title: item.title,
                ...(item.slug ? {slug: item.slug} : {}),
                ...(item.typeTitle ? {typeTitle: item.typeTitle} : {}),
                ...(item.categorySlug
                    ? {categorySlug: item.categorySlug}
                    : {}),
                ...(techniqueDescription
                    ? {description: techniqueDescription}
                    : {}),
                imageUrl: techniqueImage
                    ? (sanityImageBaseUrl(techniqueImage) ?? null)
                    : null,
                ...(hasDetailPage(item.appearsIn) ? {hasPage: true} : {}),
            };
        });

    return {
        id: option._id,
        label: option.title,
        slug: option.slug ?? undefined,
        category: categorySlug,
        categoryTitle: category?.title ?? undefined,
        categoryDescription: category?.description ?? undefined,
        typeId: type?._id ?? undefined,
        typeSlug: type?.slug ?? undefined,
        typeTitle: type?.title ?? undefined,
        typeDescription: type?.description ?? undefined,
        customerSelects,
        cardinality: customerSelects,
        imageUrl: firstImage ? (sanityImageBaseUrl(firstImage) ?? null) : null,
        shortDescription: '',
        description,
        preselected: Boolean(row.preselected),
        ...(option.appearsIn ? {appearsIn: option.appearsIn} : {}),
        status: option.status ?? undefined,
        ...(achievedBy.length > 0 ? {achievedBy} : {}),
    };
}

/** Map a raw option projection (e.g. from the rules catalog) into a catalog option. */
export function mapSanityOptionDoc(
    option: CatalogOptionDoc | null | undefined,
    preselected = false,
): CustomizationOption | null {
    if (!option) return null;
    return mapAvailableCustomization({preselected, customization: option});
}

export function mapSanityProduct(doc: CatalogProductDoc): Product | null {
    const slug = doc.slug?.trim();
    if (!slug || !doc.title) return null;

    const lineSlug = doc.productLine?.slug?.trim();
    const lineTitle = doc.productLine?.title?.trim();
    if (!lineSlug || !lineTitle) return null;

    const styleSlug = doc.productStyle?.slug?.trim();
    const styleTitle = doc.productStyle?.title?.trim();
    if (!styleSlug || !styleTitle) return null;

    const kind: ProductKind =
        doc.kind === 'inspiration' ? 'inspiration' : 'standard';

    const productLine: ProductLineRef = {slug: lineSlug, title: lineTitle};
    const productStyle = mapStyleRef({
        slug: styleSlug,
        title: styleTitle,
        description: doc.productStyle?.description,
        shortDescription: doc.productStyle?.shortDescription,
        cardImage: doc.productStyle?.cardImage,
    });
    if (!productStyle) return null;

    const availableCustomizations = (doc.availableCustomizations ?? [])
        .map(mapAvailableCustomization)
        .filter((item): item is CustomizationOption => item != null);

    const dim = doc.dimensionRange;
    const dimensionRange = dim
        ? {
              ...(typeof dim.lengthMin === 'number'
                  ? {lengthMin: dim.lengthMin}
                  : {}),
              ...(typeof dim.lengthMax === 'number'
                  ? {lengthMax: dim.lengthMax}
                  : {}),
              ...(typeof dim.widthMin === 'number'
                  ? {widthMin: dim.widthMin}
                  : {}),
              ...(typeof dim.widthMax === 'number'
                  ? {widthMax: dim.widthMax}
                  : {}),
              ...(typeof dim.heightMin === 'number'
                  ? {heightMin: dim.heightMin}
                  : {}),
              ...(typeof dim.heightMax === 'number'
                  ? {heightMax: dim.heightMax}
                  : {}),
              ...(typeof dim.diameterMin === 'number'
                  ? {diameterMin: dim.diameterMin}
                  : {}),
              ...(typeof dim.diameterMax === 'number'
                  ? {diameterMax: dim.diameterMax}
                  : {}),
              ...(typeof dim.gussetMin === 'number'
                  ? {gussetMin: dim.gussetMin}
                  : {}),
              ...(typeof dim.gussetMax === 'number'
                  ? {gussetMax: dim.gussetMax}
                  : {}),
              ...(typeof dim.dropMin === 'number'
                  ? {dropMin: dim.dropMin}
                  : {}),
              ...(typeof dim.dropMax === 'number'
                  ? {dropMax: dim.dropMax}
                  : {}),
              ...(typeof dim.depthMin === 'number'
                  ? {depthMin: dim.depthMin}
                  : {}),
              ...(typeof dim.depthMax === 'number'
                  ? {depthMax: dim.depthMax}
                  : {}),
          }
        : undefined;

    const dimensionInput =
        typeof doc.dimensionInput === 'string' && doc.dimensionInput.trim()
            ? doc.dimensionInput.trim()
            : undefined;

    const properties: ProductProperty[] = [];
    for (const row of doc.properties ?? []) {
        const label = row?.label?.trim();
        if (!label) continue;
        const value = (row.values ?? [])
            .map((v) => v?.trim())
            .filter((v): v is string => Boolean(v))
            .join(', ');
        properties.push({label, value: value || 'N/A'});
    }

    const faqs = mapFaqs(doc.faqs);

    const relatedProducts = (doc.relatedProducts ?? [])
        .map(mapSanityProduct)
        .filter((item): item is Product => item != null);

    const sections = (doc.sections ?? []).filter(
        (section): section is PageSectionDoc =>
            Boolean(section?._key && section?._type),
    );
    const templateSections = (doc.template?.sections ?? []).filter(
        (section): section is PageSectionDoc =>
            Boolean(section?._key && section?._type),
    );

    return {
        title: doc.title,
        slug,
        // Never substitute the URL slug for a missing SKU (catalog / PDP eyebrow).
        sku: doc.sku?.trim() || '-',
        kind,
        status: toLifecycle(doc.status),
        description:
            typeof doc.description === 'string' ? doc.description.trim() : '',
        media: mediaFromSanity(doc.media, doc.title),
        ...(doc.featuredVideoUrl?.trim()
            ? {featuredVideoUrl: doc.featuredVideoUrl.trim()}
            : {}),
        productLine,
        productStyle,
        availableCustomizations,
        ...(doc.primarySolution
            ? {primarySolution: doc.primarySolution}
            : {}),
        ...(doc.breadcrumbParent?.title?.trim() &&
        doc.breadcrumbParent?.slug?.trim()
            ? {
                  breadcrumbParent: {
                      title: doc.breadcrumbParent.title.trim(),
                      slug: doc.breadcrumbParent.slug.trim(),
                  },
              }
            : {}),
        ...(typeof doc.moq === 'number' ? {moq: doc.moq} : {}),
        ...(dimensionInput ? {dimensionInput} : {}),
        ...(dimensionRange && Object.keys(dimensionRange).length
            ? {dimensionRange}
            : {}),
        ...(properties.length > 0 ? {properties} : {}),
        ...(faqs.length > 0 ? {faqs} : {}),
        ...(relatedProducts.length > 0 ? {relatedProducts} : {}),
        ...(sections.length > 0 ? {sections} : {}),
        ...(templateSections.length > 0 ? {templateSections} : {}),
    };
}

export type MappedProductLibraryItem = {
    item: ProductLibraryItem;
    propertyTitles: Record<string, string>;
    valueTitles: Record<string, string>;
};

/** Faceted `/products` library card (PROD-1845) — no availableCustomizations tree. */
export function mapSanityProductLibraryItem(
    doc: CatalogProductLibraryDoc,
): MappedProductLibraryItem | null {
    const product = mapSanityProduct(doc);
    if (!product) return null;

    const images = product.media
        .filter((item): item is {src: string; alt: string} => Boolean(item.src))
        .map((item) => ({
            src: item.src as string,
            alt: item.alt || product.title,
        }));
    const first = images[0];

    const attrs: Record<string, string[]> = {};
    const propertyTitles: Record<string, string> = {};
    const valueTitles: Record<string, string> = {};
    for (const row of doc.libraryProperties ?? []) {
        const propSlug = row?.property?.slug?.trim();
        const propTitle = row?.property?.title?.trim();
        if (!propSlug) continue;
        if (propTitle) propertyTitles[propSlug] = propTitle;
        const list = attrs[propSlug] ?? [];
        for (const value of row?.values ?? []) {
            const valueSlug = value?.slug?.trim();
            const valueTitle = value?.title?.trim();
            if (!valueSlug) continue;
            if (!list.includes(valueSlug)) list.push(valueSlug);
            if (valueTitle) valueTitles[valueSlug] = valueTitle;
        }
        if (list.length > 0) attrs[propSlug] = list;
    }

    const industries: {slug: string; title: string}[] = [];
    for (const row of doc.industries ?? []) {
        const slug = row?.slug?.trim();
        const title = row?.title?.trim();
        if (!slug || !title) continue;
        if (industries.some((item) => item.slug === slug)) continue;
        industries.push({slug, title});
    }

    return {
        item: {
            _id: doc._id,
            title: product.title,
            slug: product.slug,
            sku: product.sku,
            kind: product.kind,
            productLine: product.productLine,
            // Library payload: slug + title only (PROD-2599).
            productStyle: {
                slug: product.productStyle.slug,
                title: product.productStyle.title,
            },
            imageUrl: first?.src ?? null,
            imageAlt: first?.alt ?? product.title,
            ...(product.status && product.status !== 'active' ? {status: product.status} : {}),
            images: images.length > 0 ? images : undefined,
            ...(typeof product.moq === 'number' ? {moq: product.moq} : {}),
            industries,
            attrs,
        },
        propertyTitles,
        valueTitles,
    };
}

/** Line meta for the first-spot entry card — reads enriched library productLine fields. */
export function mapSanityProductLibraryLineMeta(
    doc: CatalogProductLibraryDoc,
): ProductLibraryLineMeta | null {
    const line = doc.productLine;
    if (!line) return null;
    const slug = line.slug?.trim();
    const title = line.title?.trim();
    if (!slug || !title) return null;

    const description =
        line.description?.trim() || line.cardSummary?.trim() || undefined;
    const {imageUrl, imageAlt} = cardImageFromSanity(line.cardImage, title);

    return {
        slug,
        title,
        ...(description ? {description} : {}),
        ...(imageUrl ? {imageUrl, imageAlt} : {}),
    };
}

export function mapSanityProductLine(doc: CatalogProductLineDoc): ProductLine | null {
    const slug = doc.slug?.trim();
    if (!slug || !doc.title) return null;

    const products = (doc.products ?? [])
        .map(mapSanityProduct)
        .filter((item): item is Product => item != null);

    const stylesFromField = (doc.styles ?? [])
        .map(mapStyleRef)
        .filter((item): item is ProductStyleRef => item != null);

    const stylesFromProducts = products.map((p) => p.productStyle);
    const stylesBySlug = new Map<string, ProductStyleRef>();
    for (const style of [...stylesFromField, ...stylesFromProducts]) {
        stylesBySlug.set(
            style.slug,
            preferStyleWithImage(stylesBySlug.get(style.slug), style),
        );
    }

    const {imageUrl, imageAlt} = cardImageFromSanity(doc.cardImage, doc.title);
    const featuredVideoUrl = doc.featuredVideoUrl?.trim() || null;
    const heroLayoutRaw = doc.template?.heroLayout?.trim();
    const heroLayout =
        heroLayoutRaw === 'bottomBar' || heroLayoutRaw === 'stack'
            ? heroLayoutRaw
            : undefined;
    const {imageUrl: featuredIconUrl, imageAlt: featuredIconAlt} =
        cardImageFromSanity(doc.kitMark, `${doc.title} featured icon`);

    const frames: ProductLineFrame[] = [];
    for (const item of doc.media ?? []) {
        const src = sanityImageBaseUrl(item);
        if (!src) continue;
        frames.push({
            src,
            alt: resolveImageAlt(item, doc.title),
        });
    }

    const expertise: ProductLineExpertiseRef[] = [];
    for (const row of doc.expertise ?? []) {
        if (!row) continue;
        const stageSlug = row.slug?.trim();
        const title = row.title?.trim();
        if (!stageSlug || !title) continue;
        const {imageUrl: stageImageUrl, imageAlt: stageImageAlt} =
            cardImageFromSanity(row.diagram, title);
        expertise.push({
            slug: stageSlug,
            title,
            ...(row.description?.trim()
                ? {description: row.description.trim()}
                : {}),
            ...(stageImageUrl
                ? {imageUrl: stageImageUrl, imageAlt: stageImageAlt}
                : {}),
        });
    }

    const featuredStudies: ProductLineCaseStudyRef[] = [];
    for (const row of doc.featuredStudies ?? []) {
        if (!row) continue;
        const studySlug = row.slug?.trim();
        const title = row.title?.trim();
        if (!studySlug || !title) continue;
        const studyImageUrl = row.cardImageUrl?.trim() || null;
        featuredStudies.push({
            slug: studySlug,
            title,
            ...(row.cardSummary?.trim()
                ? {cardSummary: row.cardSummary.trim()}
                : {}),
            ...(studyImageUrl
                ? {
                      imageUrl: studyImageUrl,
                      imageAlt: row.cardImageAlt?.trim() || title,
                  }
                : {}),
        });
    }

    const relatedLines: ProductLineRelatedRef[] = [];
    for (const row of doc.relatedLines ?? []) {
        if (!row) continue;
        const relatedSlug = row.slug?.trim();
        const title = row.title?.trim();
        if (!relatedSlug || !title) continue;
        const {imageUrl: relatedImageUrl, imageAlt: relatedImageAlt} =
            cardImageFromSanity(row.cardImage, title);
        relatedLines.push({
            slug: relatedSlug,
            title,
            ...(row.shortDescription?.trim()
                ? {shortDescription: row.shortDescription.trim()}
                : {}),
            ...(relatedImageUrl
                ? {imageUrl: relatedImageUrl, imageAlt: relatedImageAlt}
                : {}),
        });
    }

    const faqs = mapFaqs(doc.faqs);

    const h1 = doc.h1?.trim();
    const shortName = doc.shortName?.trim();
    const shortDescription = doc.shortDescription?.trim();
    const metaTitle = doc.metaTitle?.trim();
    const metaDescription = doc.metaDescription?.trim();
    const description =
        doc.description?.trim() || shortDescription || '';

    const sections = (doc.sections ?? []).filter(
        (section): section is PageSectionDoc =>
            Boolean(section?._key && section?._type),
    );
    const templateSections = (doc.template?.sections ?? []).filter(
        (section): section is PageSectionDoc =>
            Boolean(section?._key && section?._type),
    );

    return {
        slug,
        title: doc.title,
        description,
        ...(h1 ? {h1} : {}),
        ...(shortName ? {shortName} : {}),
        ...(shortDescription ? {shortDescription} : {}),
        ...(metaTitle ? {metaTitle} : {}),
        ...(metaDescription ? {metaDescription} : {}),
        ...(imageUrl ? {imageUrl, imageAlt} : {}),
        ...(featuredVideoUrl ? {featuredVideoUrl} : {}),
        ...(heroLayout ? {heroLayout} : {}),
        ...(featuredIconUrl ? {featuredIconUrl, featuredIconAlt} : {}),
        ...(frames.length > 0 ? {frames} : {}),
        ...(expertise.length > 0 ? {expertise} : {}),
        ...(featuredStudies.length > 0 ? {featuredStudies} : {}),
        ...(relatedLines.length > 0 ? {relatedLines} : {}),
        ...(faqs.length > 0 ? {faqs} : {}),
        ...(sections.length > 0 ? {sections} : {}),
        ...(templateSections.length > 0 ? {templateSections} : {}),
        styles: [...stylesBySlug.values()],
        products,
    };
}

export function mapSanityLibraryOption(
    doc: CatalogLibraryOptionDoc,
): CustomizationLibraryItem | null {
    const slug = doc.slug?.trim();
    const categorySlug = doc.category?.slug?.trim();
    if (!slug || !doc.title || !categorySlug) return null;

    const featured = catalogMediaFromImage(doc.featuredImage, doc.title);
    const mediaImages: {src: string; alt: string}[] = [];
    for (const item of Array.isArray(doc.media) ? doc.media : []) {
        const slide = catalogMediaFromImage(item, doc.title);
        if (!slide?.src) continue;
        mediaImages.push({src: slide.src, alt: slide.alt});
    }

    const thumbSrc = featured?.src ?? mediaImages[0]?.src ?? null;
    const thumbAlt =
        featured?.alt ?? mediaImages[0]?.alt ?? doc.title;
    const featuredVideoUrl = doc.featuredVideoUrl?.trim() || null;

    // Legacy `images` / cardImage coalesce — rest thumb only for older callers.
    const {imageUrl: cardUrl, imageAlt: cardAlt} = cardImageFromSanity(
        doc.cardImage,
        doc.title,
    );
    const imageUrl = thumbSrc ?? cardUrl;
    const imageAlt = thumbSrc ? thumbAlt : cardAlt;

    const productLines: ProductLineRef[] = [];
    const seenLines = new Set<string>();
    for (const line of doc.productLines ?? []) {
        const lineSlug = line?.slug?.trim();
        const lineTitle = line?.title?.trim();
        if (!lineSlug || !lineTitle || seenLines.has(lineSlug)) continue;
        seenLines.add(lineSlug);
        productLines.push({slug: lineSlug, title: lineTitle});
    }

    const attrs: Record<string, string[]> = {};
    const propertyTitles: Record<string, string> = {};
    const valueTitles: Record<string, string> = {};
    for (const value of doc.properties ?? []) {
        const propSlug = value?.property?.slug?.trim();
        const propTitle = value?.property?.title?.trim();
        const valueSlug = value?.slug?.trim();
        const valueTitle = value?.title?.trim();
        if (!propSlug || !valueSlug) continue;
        const list = attrs[propSlug] ?? [];
        if (!list.includes(valueSlug)) list.push(valueSlug);
        attrs[propSlug] = list;
        if (propTitle) propertyTitles[propSlug] = propTitle;
        if (valueTitle) valueTitles[valueSlug] = valueTitle;
    }

    return {
        _id: doc._id,
        title: doc.title,
        slug,
        categoryValue: categorySlug,
        categoryLabel: doc.category?.title ?? categorySlug,
        ...(toLifecycle(doc.status) !== 'active' ? {status: toLifecycle(doc.status)} : {}),
        imageUrl,
        imageAlt,
        ...(featured?.src
            ? {
                  featuredImageUrl: featured.src,
                  featuredImageAlt: featured.alt,
              }
            : {}),
        ...(mediaImages.length > 0 ? {mediaImages} : {}),
        ...(featuredVideoUrl ? {featuredVideoUrl} : {}),
        ...(imageUrl
            ? {images: [{src: imageUrl, alt: imageAlt}]}
            : {}),
        productLines,
        attrs,
        propertyTitles,
        valueTitles,
    };
}

function mapPropertyFacts(
    facts: CatalogPropertyValueDetailDoc['facts'],
): CustomizationPropertyFact[] {
    if (!Array.isArray(facts)) return [];
    const out: CustomizationPropertyFact[] = [];
    for (const fact of facts) {
        if (!fact) continue;
        const label = fact.label?.trim();
        if (!label) continue;
        if (typeof fact.value === 'number' && Number.isFinite(fact.value)) {
            out.push({label, display: String(fact.value)});
            continue;
        }
        const text = fact.text?.trim();
        if (text) out.push({label, display: text});
    }
    return out;
}

function mapDetailPropertyValue(
    value: CatalogPropertyValueDetailDoc | null | undefined,
): CustomizationPropertyValue | null {
    if (!value) return null;
    const slug = value.slug?.trim();
    const title = value.title?.trim();
    if (!slug || !title) return null;
    const propSlug = value.property?.slug?.trim();
    const propTitle = value.property?.title?.trim();
    const valuesPerItem = value.property?.valuesPerItem;
    const imageUrl = value.image
        ? (sanityImageBaseUrl(value.image) ?? null)
        : null;
    const imageAlt = value.image
        ? resolveImageAlt(value.image, title)
        : undefined;
    return {
        id: value._id,
        title,
        slug,
        ...(value.property?._id ? {propertyId: value.property._id} : {}),
        ...(propSlug ? {propertySlug: propSlug} : {}),
        ...(propTitle ? {propertyTitle: propTitle} : {}),
        ...(valuesPerItem === 'one' || valuesPerItem === 'many'
            ? {valuesPerItem}
            : {}),
        ...(imageUrl !== undefined ? {imageUrl} : {}),
        ...(imageAlt ? {imageAlt} : {}),
        facts: mapPropertyFacts(value.facts),
    };
}

export function mapSanityCustomizationDetail(
    doc: CatalogCustomizationDetailDoc,
): CustomizationDetail | null {
    const slug = doc.slug?.trim();
    const categorySlug = doc.category?.slug?.trim();
    const title = doc.title?.trim();
    if (!slug || !categorySlug || !title) return null;

    const productLines: ProductLineRef[] = [];
    const seenLines = new Set<string>();
    for (const line of doc.productLines ?? []) {
        const lineSlug = line?.slug?.trim();
        const lineTitle = line?.title?.trim();
        if (!lineSlug || !lineTitle || seenLines.has(lineSlug)) continue;
        seenLines.add(lineSlug);
        productLines.push({slug: lineSlug, title: lineTitle});
    }

    const properties = (doc.properties ?? [])
        .map(mapDetailPropertyValue)
        .filter((item): item is CustomizationPropertyValue => item != null);

    const declaredProperties: CustomizationDeclaredProperty[] = [];
    for (const row of doc.type?.declaredProperties ?? []) {
        if (!row) continue;
        const usage = row.usage === 'selectable' ? 'selectable' : 'stated';
        const propSlug = row.property?.slug?.trim();
        const propTitle = row.property?.title?.trim();
        const valuesPerItem = row.property?.valuesPerItem;
        declaredProperties.push({
            usage,
            ...(usage === 'stated' && row.showOnDetailPage === false
                ? {showOnDetailPage: false as const}
                : {}),
            ...(row.property?._id ? {propertyId: row.property._id} : {}),
            ...(propSlug ? {propertySlug: propSlug} : {}),
            ...(propTitle ? {propertyTitle: propTitle} : {}),
            ...(valuesPerItem === 'one' || valuesPerItem === 'many'
                ? {valuesPerItem}
                : {}),
        });
    }

    const description = firstNonEmpty(
        doc.metaDescription,
        doc.glossaryPlain,
        doc.benefitsPlain,
    );

    const typeTitle = doc.type?.title?.trim();
    const typeSlug = doc.type?.slug?.trim();

    const faqs = mapFaqs(doc.faqs);

    return {
        status: toLifecycle(doc.status),
        id: doc._id,
        title,
        slug,
        categoryValue: categorySlug,
        categoryLabel: doc.category?.title?.trim() || categorySlug,
        ...(typeTitle ? {typeTitle} : {}),
        ...(typeSlug ? {typeSlug} : {}),
        ...(description ? {description} : {}),
        media: customizationGallerySlides(doc.featuredImage, doc.media, title),
        ...(doc.featuredVideoUrl?.trim()
            ? {featuredVideoUrl: doc.featuredVideoUrl.trim()}
            : {}),
        properties,
        declaredProperties,
        productLines,
        ...(faqs.length > 0 ? {faqs} : {}),
    };
}
