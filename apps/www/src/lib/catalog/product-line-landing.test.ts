import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
    assembleHeroMediaCards,
    assembleInspirationIndustries,
    assembleProductLineLanding,
    filterInspirationProductsByIndustry,
    PRODUCT_LINE_HERO_FEATURE_PLACEHOLDER,
    resolveStyleCardImage,
    RIGID_BOXES_MOCK_FEATURE,
    RIGID_BOXES_MOCK_FEATURED_VIDEO,
    RIGID_BOXES_MOCK_H1,
    RIGID_BOXES_MOCK_INTRO,
} from './product-line-landing';
import type {Product, ProductLine, ProductStyleRef} from './types';

function style(
    partial: Partial<ProductStyleRef> & Pick<ProductStyleRef, 'slug' | 'title'>,
): ProductStyleRef {
    return {...partial};
}

function product(
    partial: Partial<Product> &
        Pick<Product, 'title' | 'slug' | 'productStyle'>,
): Product {
    return {
        sku: partial.sku ?? '-',
        kind: partial.kind ?? 'standard',
        media: partial.media ?? [],
        description: partial.description ?? '',
        productLine: partial.productLine ?? {
            slug: 'rigid-boxes',
            title: 'Rigid Boxes',
        },
        availableCustomizations: partial.availableCustomizations ?? [],
        ...partial,
    };
}

function line(
    partial: Partial<ProductLine> & Pick<ProductLine, 'slug' | 'title'>,
): ProductLine {
    return {
        description: partial.description ?? '',
        styles: partial.styles ?? [],
        products: partial.products ?? [],
        ...partial,
    };
}

describe('resolveStyleCardImage', () => {
    it('prefers the style image', () => {
        const resolved = resolveStyleCardImage(
            style({
                slug: 'hinged-lid',
                title: 'Hinged Lid',
                imageUrl: 'https://cdn.example/style.jpg',
                imageAlt: 'Style alt',
            }),
            line({
                slug: 'rigid-boxes',
                title: 'Rigid Boxes',
                imageUrl: 'https://cdn.example/line.jpg',
                products: [
                    product({
                        title: 'Box A',
                        slug: 'box-a',
                        productStyle: {
                            slug: 'hinged-lid',
                            title: 'Hinged Lid',
                        },
                        media: [
                            {
                                src: 'https://cdn.example/product.jpg',
                                alt: 'Product',
                            },
                        ],
                    }),
                ],
            }),
        );
        assert.equal(resolved.imageUrl, 'https://cdn.example/style.jpg');
        assert.equal(resolved.imageAlt, 'Style alt');
    });

    it('falls back to the first product image in that style', () => {
        const resolved = resolveStyleCardImage(
            style({slug: 'hinged-lid', title: 'Hinged Lid'}),
            line({
                slug: 'rigid-boxes',
                title: 'Rigid Boxes',
                imageUrl: 'https://cdn.example/line.jpg',
                products: [
                    product({
                        title: 'Other',
                        slug: 'other',
                        productStyle: {
                            slug: 'drawer',
                            title: 'Drawer',
                        },
                        media: [
                            {
                                src: 'https://cdn.example/other.jpg',
                                alt: 'Other',
                            },
                        ],
                    }),
                    product({
                        title: 'Box A',
                        slug: 'box-a',
                        productStyle: {
                            slug: 'hinged-lid',
                            title: 'Hinged Lid',
                        },
                        media: [
                            {alt: 'No src'},
                            {
                                src: 'https://cdn.example/product.jpg',
                                alt: 'Product alt',
                            },
                        ],
                    }),
                ],
            }),
        );
        assert.equal(resolved.imageUrl, 'https://cdn.example/product.jpg');
        assert.equal(resolved.imageAlt, 'Product alt');
    });

    it('returns null when style and products have no image', () => {
        const resolved = resolveStyleCardImage(
            style({slug: 'hinged-lid', title: 'Hinged Lid'}),
            line({
                slug: 'rigid-boxes',
                title: 'Rigid Boxes',
                imageUrl: 'https://cdn.example/line.jpg',
                imageAlt: 'Line alt',
                products: [],
            }),
        );
        assert.equal(resolved.imageUrl, null);
        assert.equal(resolved.imageAlt, 'Hinged Lid');
    });

    it('skips inspiration products when falling back to product media', () => {
        const resolved = resolveStyleCardImage(
            style({slug: 'hinged-lid', title: 'Hinged Lid'}),
            line({
                slug: 'rigid-boxes',
                title: 'Rigid Boxes',
                products: [
                    product({
                        title: 'Client Box',
                        slug: 'client-box',
                        kind: 'inspiration',
                        productStyle: {
                            slug: 'hinged-lid',
                            title: 'Hinged Lid',
                        },
                        media: [
                            {
                                src: 'https://cdn.example/inspiration.jpg',
                                alt: 'Inspiration',
                            },
                        ],
                    }),
                    product({
                        title: 'Blank Box',
                        slug: 'blank-box',
                        kind: 'standard',
                        productStyle: {
                            slug: 'hinged-lid',
                            title: 'Hinged Lid',
                        },
                        media: [
                            {
                                src: 'https://cdn.example/standard.jpg',
                                alt: 'Standard',
                            },
                        ],
                    }),
                ],
            }),
        );
        assert.equal(resolved.imageUrl, 'https://cdn.example/standard.jpg');
        assert.equal(resolved.imageAlt, 'Standard');
    });
});

describe('assembleProductLineLanding', () => {
    it('uses sequence hero when there are at least two frames', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'folding-cartons',
                title: 'Folding Cartons',
                frames: [
                    {src: 'https://cdn.example/1.jpg', alt: '1'},
                    {src: 'https://cdn.example/2.jpg', alt: '2'},
                ],
            }),
        );
        assert.equal(model.heroMode, 'sequence');
        assert.equal(model.frames.length, 2);
    });

    it('uses static hero when there are fewer than two frames', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'folding-cartons',
                title: 'Folding Cartons',
                frames: [{src: 'https://cdn.example/1.jpg', alt: '1'}],
            }),
        );
        assert.equal(model.heroMode, 'static');
        assert.equal(model.frames.length, 1);
    });

    it('omits empty styles and page sections when none are authored', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'folding-cartons',
                title: 'Folding Cartons',
                faqs: [],
                expertise: [],
            }),
        );
        assert.equal(model.styles, null);
        assert.deepEqual(model.pageSections, []);
    });

    it('merges template sections over line sections by key', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'folding-cartons',
                title: 'Folding Cartons',
                templateSections: [
                    {
                        _key: 'a',
                        _type: 'generalCta',
                        heading: 'Template heading',
                    } as never,
                ],
                sections: [
                    {
                        _key: 'a',
                        _type: 'generalCta',
                        heading: 'Line heading',
                        body: 'Line body',
                    } as never,
                ],
            }),
        );
        assert.equal(model.pageSections.length, 1);
        assert.equal(model.pageSections[0]?._key, 'a');
        assert.equal(
            (model.pageSections[0] as {heading?: string}).heading,
            'Template heading',
        );
        assert.equal(
            (model.pageSections[0] as {body?: string}).body,
            'Line body',
        );
    });

    it('resolves %shortName% from the line shortName, not the title', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'test-rigid-boxes',
                title: '[Test] Rigid Boxes',
                shortName: 'Rigid Boxes',
                templateSections: [
                    {
                        _key: 'styles',
                        _type: 'productStylesRow',
                        eyebrow: '%shortName% Styles',
                        heading: 'Explore %title% by style',
                    } as never,
                ],
            }),
        );
        const section = model.pageSections[0] as {
            eyebrow?: string;
            heading?: string;
        };
        assert.equal(section.eyebrow, 'Rigid Boxes Styles');
        assert.equal(section.heading, 'Explore [Test] Rigid Boxes by style');
    });

    it('inherits FAQs from the line when the template faqSection listSource is page', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'test-rigid-boxes',
                title: '[Test] Rigid Boxes',
                faqs: [
                    {
                        question: 'What is MOQ?',
                        answerPlain: 'Usually 500 units.',
                    },
                ],
                templateSections: [
                    {
                        _key: 'faq',
                        _type: 'faqSection',
                        listSource: 'page',
                        faqs: [],
                    } as never,
                ],
            }),
        );
        const section = model.pageSections[0] as {
            faqs?: {question?: string}[];
        };
        assert.equal(section.faqs?.length, 1);
        assert.equal(section.faqs?.[0]?.question, 'What is MOQ?');
    });

    it('uses line sections when no template is set', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'folding-cartons',
                title: 'Folding Cartons',
                sections: [
                    {
                        _key: 'b',
                        _type: 'testimonialsRow',
                        heading: 'Reviews',
                    } as never,
                ],
            }),
        );
        assert.equal(model.pageSections.length, 1);
        assert.equal(model.pageSections[0]?._type, 'testimonialsRow');
    });

    it('inherits FAQs and featured studies into template pageSections only', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'folding-cartons',
                title: 'Folding Cartons',
                faqs: [
                    {
                        question: 'What is MOQ?',
                        answerPlain: 'Usually 500.',
                    },
                ],
                featuredStudies: [
                    {
                        slug: 'east-west-bank',
                        title: 'East West Bank',
                        imageUrl: 'https://cdn.example/ewb.jpg',
                        imageAlt: 'East West Bank',
                    },
                ],
                expertise: [
                    {slug: 'design', title: 'Design', description: 'Briefing'},
                ],
                templateSections: [
                    {
                        _key: 'cases',
                        _type: 'videoCaseStudiesRow',
                        listSource: 'page',
                        cards: [],
                    } as never,
                    {
                        _key: 'faq',
                        _type: 'faqSection',
                        listSource: 'page',
                        faqs: [],
                    } as never,
                ],
            }),
        );
        assert.equal(model.pageSections.length, 2);
        const cases = model.pageSections[0] as {
            _type?: string;
            cards?: {slug?: string}[];
        };
        const faq = model.pageSections[1] as {
            _type?: string;
            faqs?: {question?: string}[];
        };
        assert.equal(cases._type, 'videoCaseStudiesRow');
        assert.equal(cases.cards?.length, 1);
        assert.equal(cases.cards?.[0]?.slug, 'east-west-bank');
        assert.equal(faq._type, 'faqSection');
        assert.equal(faq.faqs?.length, 1);
        assert.equal(faq.faqs?.[0]?.question, 'What is MOQ?');
    });

    it('keeps Product Line Page template order with logoWall first', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'test-rigid-boxes',
                title: '[Test] Rigid Boxes',
                shortName: 'Rigid Boxes',
                faqs: [
                    {
                        question: 'What is MOQ?',
                        answerPlain: 'Usually 500.',
                    },
                ],
                featuredStudies: [
                    {
                        slug: 'east-west-bank',
                        title: 'East West Bank',
                        imageUrl: 'https://cdn.example/ewb.jpg',
                    },
                ],
                templateSections: [
                    {_key: '1', _type: 'logoWall'} as never,
                    {_key: '2', _type: 'productStylesRow', listSource: 'page'} as never,
                    {_key: '3', _type: 'mediaFeature'} as never,
                    {
                        _key: '4',
                        _type: 'videoCaseStudiesRow',
                        listSource: 'page',
                        cards: [],
                    } as never,
                    {_key: '5', _type: 'testimonialsRow'} as never,
                    {
                        _key: '6',
                        _type: 'faqSection',
                        listSource: 'page',
                        faqs: [],
                    } as never,
                ],
            }),
        );
        assert.deepEqual(
            model.pageSections.map((s) => s._type),
            [
                'logoWall',
                'productStylesRow',
                'mediaFeature',
                'videoCaseStudiesRow',
                'testimonialsRow',
                'faqSection',
            ],
        );
    });

    it('fills rigid-boxes H1 from mock when empty', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'rigid-boxes',
                title: 'Rigid Boxes',
            }),
        );
        assert.equal(model.h1, RIGID_BOXES_MOCK_H1);
        assert.equal(model.intro, RIGID_BOXES_MOCK_INTRO);
        assert.equal(model.featuredIconUrl, '/products/rigid-boxes/kit-mark.png');
        assert.equal(model.featuredImageUrl, '/products/rigid-boxes/feature.png');
        assert.equal(model.featuredVideoUrl, RIGID_BOXES_MOCK_FEATURED_VIDEO);
    });

    it('prefers authored featured video over rigid-boxes mock', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'rigid-boxes',
                title: 'Rigid Boxes',
                featuredVideoUrl: 'https://cdn.example/hero-scrub.mp4',
            }),
        );
        assert.equal(
            model.featuredVideoUrl,
            'https://cdn.example/hero-scrub.mp4',
        );
    });

    it('leaves featured video empty for non-mock lines without authored video', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'folding-cartons',
                title: 'Folding Cartons',
            }),
        );
        assert.equal(model.featuredVideoUrl, null);
    });

    it('defaults rigid-boxes hero layout to bottomBar when unset', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'rigid-boxes',
                title: 'Rigid Boxes',
            }),
        );
        assert.equal(model.heroLayout, 'bottomBar');
    });

    it('defaults other lines to stack hero layout when unset', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'folding-cartons',
                title: 'Folding Cartons',
            }),
        );
        assert.equal(model.heroLayout, 'stack');
    });

    it('honors layout shell stack on rigid-boxes', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'rigid-boxes',
                title: 'Rigid Boxes',
                heroLayout: 'stack',
            }),
        );
        assert.equal(model.heroLayout, 'stack');
    });

    it('honors layout shell bottomBar', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'folding-cartons',
                title: 'Folding Cartons',
                heroLayout: 'bottomBar',
            }),
        );
        assert.equal(model.heroLayout, 'bottomBar');
    });

    it('keeps an authored rigid-boxes H1', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'rigid-boxes',
                title: 'Rigid Boxes',
                h1: 'Custom Rigid Boxes',
                shortDescription: 'Authored intro.',
            }),
        );
        assert.equal(model.h1, 'Custom Rigid Boxes');
        assert.equal(model.intro, 'Authored intro.');
    });

    it('prefers shortDescription over description for the hero intro', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'test-rigid-boxes',
                title: '[Test] Rigid Boxes',
                shortDescription: 'Short hero line.',
                description: 'Long body copy that should not appear in the hero.',
            }),
        );
        assert.equal(model.intro, 'Short hero line.');
    });

    it('prefers authored featured icon and featured image over rigid-boxes mocks', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'rigid-boxes',
                title: 'Rigid Boxes',
                imageUrl: 'https://cdn.example/hero.jpg',
                imageAlt: 'Authored hero',
                featuredIconUrl: 'https://cdn.example/mark.png',
                featuredIconAlt: 'Authored mark',
            }),
        );
        assert.equal(model.featuredImageUrl, 'https://cdn.example/hero.jpg');
        assert.equal(model.featuredImageAlt, 'Authored hero');
        assert.equal(model.featuredIconUrl, 'https://cdn.example/mark.png');
        assert.equal(model.featuredIconAlt, 'Authored mark');
    });

    it('pads rigid-boxes frames from catalog images when media is empty', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'rigid-boxes',
                title: 'Rigid Boxes',
                imageUrl: 'https://cdn.example/line.jpg',
                styles: [
                    style({
                        slug: 'a',
                        title: 'A',
                        imageUrl: 'https://cdn.example/style-a.jpg',
                    }),
                    style({
                        slug: 'b',
                        title: 'B',
                        imageUrl: 'https://cdn.example/style-b.jpg',
                    }),
                ],
                products: [
                    product({
                        title: 'P',
                        slug: 'p',
                        productStyle: {slug: 'a', title: 'A'},
                        media: [
                            {
                                src: 'https://cdn.example/product.jpg',
                                alt: 'P',
                            },
                        ],
                    }),
                ],
            }),
        );
        assert.equal(model.frames.length, 4);
        assert.equal(model.heroMode, 'sequence');
        assert.deepEqual(
            model.frames.map((f) => f.src),
            [
                'https://cdn.example/line.jpg',
                'https://cdn.example/style-a.jpg',
                'https://cdn.example/style-b.jpg',
                'https://cdn.example/product.jpg',
            ],
        );
    });

    it('uses mock frames for rigid-boxes when the catalog has no images', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'rigid-boxes',
                title: 'Rigid Boxes',
            }),
        );
        assert.equal(model.frames.length, 1);
        assert.equal(model.heroMode, 'static');
        assert.equal(model.frames[0]?.src, RIGID_BOXES_MOCK_FEATURE.src);
    });

    it('does not pad frames for a non-mock slug', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'folding-cartons',
                title: 'Folding Cartons',
                imageUrl: 'https://cdn.example/line.jpg',
                styles: [
                    style({
                        slug: 'a',
                        title: 'A',
                        imageUrl: 'https://cdn.example/style-a.jpg',
                    }),
                ],
            }),
        );
        assert.equal(model.frames.length, 0);
        assert.equal(model.heroMode, 'static');
        assert.equal(model.h1, 'Folding Cartons');
    });

    it('applies the style image cascade on style cards', () => {
        const model = assembleProductLineLanding(
            line({
                slug: 'folding-cartons',
                title: 'Folding Cartons',
                imageUrl: 'https://cdn.example/line.jpg',
                styles: [
                    style({
                        slug: 'with-image',
                        title: 'With Image',
                        imageUrl: 'https://cdn.example/style.jpg',
                    }),
                    style({slug: 'from-product', title: 'From Product'}),
                    style({slug: 'no-image', title: 'No Image'}),
                ],
                products: [
                    product({
                        title: 'P',
                        slug: 'p',
                        productStyle: {
                            slug: 'from-product',
                            title: 'From Product',
                        },
                        media: [
                            {
                                src: 'https://cdn.example/product.jpg',
                                alt: 'P',
                            },
                        ],
                    }),
                ],
            }),
        );
        assert.equal(model.styles?.length, 3);
        assert.equal(model.styles?.[0]?.imageUrl, 'https://cdn.example/style.jpg');
        assert.equal(
            model.styles?.[1]?.imageUrl,
            'https://cdn.example/product.jpg',
        );
        assert.equal(model.styles?.[2]?.imageUrl, null);
    });

    it('assembles unique hero media cards with featured video on the first', () => {
        const cards = assembleHeroMediaCards({
            featuredImageUrl: 'https://cdn.example/hero.jpg',
            featuredImageAlt: 'Hero',
            featuredVideoUrl: 'https://cdn.example/hero.mp4',
            frames: [
                {src: 'https://cdn.example/hero.jpg', alt: 'Dup'},
                {src: 'https://cdn.example/frame-2.jpg', alt: 'Two'},
            ],
        });

        assert.equal(cards.length, 2);
        assert.equal(cards[0]?.id, 'featured');
        assert.equal(cards[0]?.src, 'https://cdn.example/hero.jpg');
        assert.equal(cards[0]?.videoUrl, 'https://cdn.example/hero.mp4');
        assert.equal(cards[0]?.settleIndex, 0);
        assert.equal(cards[1]?.id, 'frame-1');
        assert.equal(cards[1]?.src, 'https://cdn.example/frame-2.jpg');
        assert.equal(cards[1]?.videoUrl, undefined);
        assert.equal(cards[1]?.settleIndex, 1);
    });

    it('prefers standard products over frames for hero media cards', () => {
        const cards = assembleHeroMediaCards({
            featuredImageUrl: 'https://cdn.example/hero.jpg',
            featuredImageAlt: 'Hero',
            featuredVideoUrl: 'https://cdn.example/line-hero.mp4',
            frames: [{src: 'https://cdn.example/frame.jpg', alt: 'Frame'}],
            products: [
                product({
                    title: 'Box A',
                    slug: 'box-a',
                    productStyle: {slug: 'hinged-lid', title: 'Hinged Lid'},
                    featuredVideoUrl: 'https://cdn.example/box-a.mp4',
                    media: [
                        {src: 'https://cdn.example/box-a.jpg', alt: 'Box A'},
                    ],
                }),
                product({
                    title: 'Box B',
                    slug: 'box-b',
                    kind: 'inspiration',
                    productStyle: {slug: 'hinged-lid', title: 'Hinged Lid'},
                    media: [
                        {src: 'https://cdn.example/box-b.jpg', alt: 'Box B'},
                    ],
                }),
                product({
                    title: 'Box C',
                    slug: 'box-c',
                    productStyle: {slug: 'drawer', title: 'Drawer'},
                    media: [
                        {src: 'https://cdn.example/box-c.jpg', alt: 'Box C'},
                    ],
                    availableCustomizations: [
                        {
                            id: 'foil',
                            label: 'Foil stamp',
                            category: 'finishing',
                            categoryTitle: 'Finishing',
                            slug: 'hot-foil-stamping',
                            shortDescription: 'Metallic foil.',
                            imageUrl: 'https://cdn.example/foil-featured.jpg',
                            preselected: true,
                        },
                        {
                            id: 'emboss',
                            label: 'Embossing',
                            category: 'finishing',
                            categoryTitle: 'Finishing',
                            slug: 'embossing',
                            shortDescription: 'Raised relief.',
                            imageUrl: 'https://cdn.example/emboss.jpg',
                            preselected: false,
                        },
                    ],
                }),
            ],
        });

        // 2 standard products (inspiration skipped; no density copies)
        assert.equal(cards.length, 2);
        assert.equal(cards[0]?.id, 'box-a');
        assert.equal(cards[0]?.title, 'Box A');
        assert.equal(cards[0]?.detailHref, '/products/box-a');
        assert.equal(cards[0]?.settleIndex, 0);
        assert.equal(cards[0]?.videoUrl, 'https://cdn.example/box-a.mp4');
        assert.equal(cards[1]?.id, 'box-c');
        assert.equal(cards[1]?.title, 'Box C');
        assert.equal(cards[1]?.settleIndex, 1);
        assert.equal(cards[1]?.customizations?.[0]?.title, 'Foil stamp');
        assert.equal(
            cards[1]?.customizations?.[0]?.imageSrc,
            'https://cdn.example/foil-featured.jpg',
        );
        assert.equal(cards[1]?.customizations?.[0]?.imageAlt, 'Foil stamp');
        assert.equal(
            cards[1]?.customizations?.[0]?.learnMoreHref,
            '/customizations/finishing/hot-foil-stamping',
        );
        // Preselected-only: non-preselected Embossing is omitted
        assert.equal(cards[1]?.customizations?.length, 1);
        // No product video — line video must not stamp onto product cards
        assert.equal(cards[1]?.videoUrl, undefined);
    });

    it('skips inspiration featured pins; fills with standard auto candidates', () => {
        const cards = assembleHeroMediaCards({
            featuredImageUrl: null,
            featuredImageAlt: '',
            featuredVideoUrl: null,
            frames: [],
            featuredProducts: [
                product({
                    title: 'Pinned Inspiration',
                    slug: 'pinned',
                    kind: 'inspiration',
                    productStyle: {slug: 'hinged-lid', title: 'Hinged Lid'},
                    media: [
                        {src: 'https://cdn.example/pinned.jpg', alt: 'Pinned'},
                    ],
                }),
                product({
                    title: 'Pinned Standard',
                    slug: 'pinned-std',
                    kind: 'standard',
                    productStyle: {slug: 'hinged-lid', title: 'Hinged Lid'},
                    media: [
                        {
                            src: 'https://cdn.example/pinned-std.jpg',
                            alt: 'Pinned std',
                        },
                    ],
                }),
            ],
            products: [
                product({
                    title: 'Pinned Inspiration',
                    slug: 'pinned',
                    kind: 'inspiration',
                    productStyle: {slug: 'hinged-lid', title: 'Hinged Lid'},
                    media: [
                        {src: 'https://cdn.example/pinned.jpg', alt: 'Pinned'},
                    ],
                }),
                product({
                    title: 'Auto A',
                    slug: 'auto-a',
                    productStyle: {slug: 'drawer', title: 'Drawer'},
                    media: [
                        {src: 'https://cdn.example/auto-a.jpg', alt: 'Auto A'},
                    ],
                }),
                product({
                    title: 'Auto B',
                    slug: 'auto-b',
                    productStyle: {slug: 'drawer', title: 'Drawer'},
                    media: [
                        {src: 'https://cdn.example/auto-b.jpg', alt: 'Auto B'},
                    ],
                }),
            ],
        });

        // pinned standard + 2 auto standards (inspiration pin skipped)
        assert.equal(cards.length, 3);
        assert.equal(cards[0]?.id, 'pinned-std');
        assert.equal(cards[0]?.title, 'Pinned Standard');
        assert.equal(cards[1]?.id, 'auto-a');
        assert.equal(cards[2]?.id, 'auto-b');
    });

    it('returns empty hero media cards when there are no products or line media', () => {
        const cards = assembleHeroMediaCards({
            featuredImageUrl: null,
            featuredImageAlt: '',
            featuredVideoUrl: null,
            frames: [],
        });
        assert.deepEqual(cards, []);
    });

    it('uses the hero placeholder when a standard product has no media', () => {
        const cards = assembleHeroMediaCards({
            featuredImageUrl: 'https://cdn.example/line.jpg',
            featuredImageAlt: 'Line',
            featuredVideoUrl: null,
            frames: [],
            products: [
                product({
                    title: 'Blank Box',
                    slug: 'blank-box',
                    kind: 'standard',
                    productStyle: {slug: 'hinged-lid', title: 'Hinged Lid'},
                    media: [],
                }),
            ],
        });

        assert.equal(cards.length, 1);
        assert.equal(cards[0]?.id, 'blank-box');
        assert.equal(cards[0]?.src, PRODUCT_LINE_HERO_FEATURE_PLACEHOLDER);
        assert.equal(cards[0]?.alt, 'Blank Box');
        assert.equal(cards[0]?.detailHref, '/products/blank-box');
        assert.equal(cards[0]?.title, 'Blank Box');
    });

    it('includes description, style, and properties on standard hero cards', () => {
        const cards = assembleHeroMediaCards({
            featuredImageUrl: null,
            featuredImageAlt: '',
            featuredVideoUrl: null,
            frames: [],
            products: [
                product({
                    title: 'Spec Box',
                    slug: 'spec-box',
                    kind: 'standard',
                    description: 'A rigid box with details.',
                    productStyle: {slug: 'hinged-lid', title: 'Hinged Lid'},
                    properties: [
                        {label: 'Closure', value: 'Magnetic'},
                        {label: 'Style', value: 'Should ignore'},
                    ],
                    media: [
                        {
                            src: 'https://cdn.example/spec.jpg',
                            alt: 'Spec',
                        },
                    ],
                }),
            ],
        });

        assert.equal(cards[0]?.description, 'A rigid box with details.');
        assert.deepEqual(cards[0]?.properties, [
            {label: 'Style', value: 'Hinged Lid'},
            {label: 'Closure', value: 'Magnetic'},
        ]);
    });
});

describe('assembleInspirationIndustries / filterInspirationProductsByIndustry', () => {
    const apparelBox = product({
        title: 'Apparel Rigid Box',
        slug: 'apparel-box',
        kind: 'inspiration',
        productStyle: {slug: 'hinged-lid', title: 'Hinged Lid'},
        industries: [
            {slug: 'apparel', title: 'Apparel'},
            {slug: 'beauty', title: 'Beauty'},
        ],
    });
    const beautyBox = product({
        title: 'Beauty Rigid Box',
        slug: 'beauty-box',
        kind: 'inspiration',
        productStyle: {slug: 'hinged-lid', title: 'Hinged Lid'},
        industries: [{slug: 'beauty', title: 'Beauty'}],
    });
    const crumbOnly = product({
        title: 'Food Box',
        slug: 'food-box',
        kind: 'inspiration',
        productStyle: {slug: 'hinged-lid', title: 'Hinged Lid'},
        breadcrumbParent: {slug: 'food-beverage', title: 'Food & Beverage'},
    });

    it('lists unique industries sorted by title', () => {
        const industries = assembleInspirationIndustries([
            apparelBox,
            beautyBox,
            crumbOnly,
        ]);
        assert.deepEqual(
            industries.map((row) => row.slug),
            ['apparel', 'beauty', 'food-beverage'],
        );
    });

    it('filters products by industry including multi-tagged', () => {
        const apparel = filterInspirationProductsByIndustry(
            [apparelBox, beautyBox, crumbOnly],
            'apparel',
        );
        assert.deepEqual(
            apparel.map((row) => row.slug),
            ['apparel-box'],
        );

        const beauty = filterInspirationProductsByIndustry(
            [apparelBox, beautyBox, crumbOnly],
            'beauty',
        );
        assert.deepEqual(
            beauty.map((row) => row.slug),
            ['apparel-box', 'beauty-box'],
        );
    });
});
