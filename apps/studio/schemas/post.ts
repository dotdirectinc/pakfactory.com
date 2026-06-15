import {defineField, defineType} from 'sanity';
import {languageField, uniqueSlugPerLanguage} from '../lib/i18n-fields';
import {MEDIA_TAG, ogMediaTags, taggedImageField} from '../lib/media-tags';

export const post = defineType({
    name: 'post',
    title: 'Post',
    type: 'document',
    groups: [
        {name: 'overview', title: 'Overview', default: true},
        {name: 'body', title: 'Body'},
        {name: 'assets', title: 'Assets'},
        {name: 'taxonomy', title: 'Taxonomy'},
        {name: 'related', title: 'Related'},
        {name: 'faq', title: 'FAQ'},
        {name: 'seo', title: 'SEO'},
    ],
    fields: [
        defineField(languageField),
        // ── Overview ────────────────────────────────────────────────────────────
        defineField({
            name: 'title',
            title: 'Title',
            type: 'string',
            group: 'overview',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'slug',
            title: 'Slug',
            type: 'slug',
            group: 'overview',
            options: {source: 'title'},
            validation: (Rule) =>
                Rule.required().custom(uniqueSlugPerLanguage('post')),
        }),
        defineField({
            name: 'publishedAt',
            title: 'Published at',
            type: 'datetime',
            group: 'overview',
        }),
        defineField({
            name: 'author',
            title: 'Author',
            type: 'reference',
            to: [{type: 'author'}],
            group: 'overview',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'excerpt',
            title: 'Excerpt',
            type: 'text',
            rows: 3,
            group: 'overview',
        }),
        defineField({
            name: 'featuredOnHome',
            title: 'Feature on blog home',
            type: 'boolean',
            group: 'overview',
            description:
                'Pin this post as the hero feature on /blog. Only one post should be enabled at a time.',
            initialValue: false,
        }),

        // ── Body ────────────────────────────────────────────────────────────────
        defineField({
            name: 'body',
            title: 'Body',
            type: 'array',
            group: 'body',
            of: [{type: 'block'}, {type: 'bodyImage'}, {type: 'widgetEmbed'}],
        }),

        // ── Assets ──────────────────────────────────────────────────────────────
        defineField(taggedImageField({
            name: 'mainImage',
            title: 'Main image',
            type: 'image',
            group: 'assets',
            mediaTags: [MEDIA_TAG.blog],
            options: {hotspot: true},
            fields: [
                defineField({
                    name: 'alt',
                    title: 'Alt text override',
                    type: 'string',
                    description:
                        'Optional. Falls back to the alt text set on the image asset in the Media library.',
                }),
                defineField({
                    name: 'caption',
                    title: 'Caption',
                    type: 'string',
                    description:
                        'Optional short caption shown below the image in the frontend.',
                }),
            ],
        })),

        // ── Taxonomy ────────────────────────────────────────────────────────────
        defineField({
            name: 'category',
            title: 'Category',
            type: 'reference',
            to: [{type: 'blogCategory'}],
            group: 'taxonomy',
            description: 'Every post belongs to exactly one category.',
            validation: (Rule) => Rule.required(),
        }),

        defineField({
            name: 'featuredInCategory',
            title: 'Feature in category',
            type: 'boolean',
            group: 'taxonomy',
            description:
                'Pin this post as the featured post on its category landing page. Only one post per category should be enabled at a time.',
            initialValue: false,
        }),

        defineField({
            name: 'tags',
            title: 'Tags',
            type: 'array',
            group: 'taxonomy',
            description:
                'Apply 3–5 structured tags from the relevant axes + 0–3 topic tags. See the Tagging Reference Guide.',
            of: [{type: 'reference', to: [{type: 'blogTag'}]}],
        }),

        // ── Related ─────────────────────────────────────────────────────────────
        defineField({
            name: 'relatedCapabilities',
            title: 'Related capabilities',
            type: 'array',
            group: 'related',
            description: 'Connects this post to the knowledge graph.',
            of: [{type: 'reference', to: [{type: 'capability'}]}],
        }),
        defineField({
            name: 'relatedProducts',
            title: 'Related products',
            type: 'array',
            group: 'related',
            of: [{type: 'reference', to: [{type: 'product'}]}],
        }),

        // ── FAQ ─────────────────────────────────────────────────────────────────
        defineField({
            name: 'faqItems',
            title: 'FAQ items',
            type: 'array',
            group: 'faq',
            description:
                'Questions and answers displayed in the FAQ section. Used to generate FAQPage JSON-LD for SEO rich snippets and AI citation engines.',
            of: [
                {
                    type: 'object',
                    name: 'faqItem',
                    title: 'FAQ item',
                    fields: [
                        defineField({
                            name: 'question',
                            title: 'Question',
                            type: 'string',
                            validation: (Rule) => Rule.required(),
                        }),
                        defineField({
                            name: 'answer',
                            title: 'Answer',
                            type: 'array',
                            description:
                                'Keep answers concise — 2–4 sentences. Supports bold, italic, and links.',
                            of: [
                                {
                                    type: 'block',
                                    styles: [
                                        {title: 'Normal', value: 'normal'},
                                    ],
                                    lists: [],
                                    marks: {
                                        decorators: [
                                            {title: 'Strong', value: 'strong'},
                                            {title: 'Emphasis', value: 'em'},
                                        ],
                                        annotations: [
                                            {
                                                name: 'link',
                                                type: 'object',
                                                title: 'Link',
                                                fields: [
                                                    defineField({
                                                        name: 'href',
                                                        type: 'url',
                                                        title: 'URL',
                                                    }),
                                                ],
                                            },
                                        ],
                                    },
                                },
                            ],
                            validation: (Rule) => Rule.required(),
                        }),
                    ],
                    preview: {
                        select: {title: 'question'},
                        prepare: ({title}) => ({
                            title: title || 'Untitled question',
                        }),
                    },
                },
            ],
        }),

        // ── SEO ─────────────────────────────────────────────────────────────────
        defineField({
            name: 'metaTitle',
            title: 'Meta title',
            type: 'string',
            group: 'seo',
            validation: (Rule) => Rule.max(60),
        }),
        defineField({
            name: 'metaDescription',
            title: 'Meta description',
            type: 'text',
            rows: 3,
            group: 'seo',
            validation: (Rule) => Rule.max(160),
        }),
        defineField(taggedImageField({
            name: 'ogImage',
            title: 'OG image',
            type: 'image',
            group: 'seo',
            mediaTags: ogMediaTags(MEDIA_TAG.blog),
            options: {hotspot: true},
            fields: [
                defineField({
                    name: 'alt',
                    title: 'Alt text override',
                    type: 'string',
                    description:
                        'Optional. Falls back to the alt text set on the image asset in the Media library.',
                }),
            ],
        })),
    ],
    preview: {
        select: {
            title: 'title',
            publishedAt: 'publishedAt',
            authorName: 'author.name',
            categoryTitle: 'category.title',
            media: 'mainImage',
        },
        prepare({title, publishedAt, authorName, categoryTitle, media}) {
            const date = publishedAt
                ? new Date(publishedAt).toLocaleDateString()
                : 'Unpublished';
            const cat = categoryTitle ? `[${categoryTitle}]` : '[No category]';
            return {
                title,
                subtitle: `${cat} ${date} · ${authorName || 'No author'}`,
                media,
            };
        },
    },
    orderings: [
        {
            title: 'Published (newest first)',
            name: 'publishedAtDesc',
            by: [{field: 'publishedAt', direction: 'desc'}],
        },
    ],
});
