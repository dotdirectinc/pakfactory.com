import {defineField, defineType} from 'sanity';
import {languageField, uniqueSlugPerLanguage} from '../lib/i18n-fields';
import {MEDIA_TAG, taggedImageField} from '../lib/media-tags';
import {seoFields, socialFields} from '../lib/seo-fields';

export const post = defineType({
    name: 'post',
    title: 'Post',
    type: 'document',
    groups: [
        {name: 'content', title: 'Content', default: true},
        {name: 'categorization', title: 'Categorization'},
        {name: 'publishing', title: 'Publishing'},
        {name: 'seo', title: 'SEO'},
        {name: 'social', title: 'Social'},
        {name: 'schemaAi', title: 'Schema & AI'},
    ],
    fields: [
        defineField(languageField),

        // ── Content ─────────────────────────────────────────────────────────────
        defineField({
            name: 'title',
            title: 'Title',
            type: 'string',
            group: 'content',
            description: 'The H1 shown on the page, written for readers. Ideally ≤ ~80 characters.',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'slug',
            title: 'Slug',
            type: 'slug',
            group: 'content',
            options: {source: 'title'},
            validation: (Rule) =>
                Rule.required().custom(uniqueSlugPerLanguage('post')),
        }),
        defineField({
            name: 'excerpt',
            title: 'Excerpt',
            type: 'text',
            rows: 3,
            group: 'content',
            description:
                '1–2 sentence summary used on listing pages and as the meta-description fallback.',
        }),
        defineField(taggedImageField({
            name: 'mainImage',
            title: 'Featured image',
            type: 'image',
            group: 'content',
            mediaTags: [MEDIA_TAG.blog],
            options: {hotspot: true},
            description: 'The hero image. Required, with alt text.',
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
        defineField({
            name: 'body',
            title: 'Body',
            type: 'array',
            group: 'content',
            of: [{type: 'block'}, {type: 'bodyImage'}, {type: 'widgetEmbed'}],
        }),

        // ── Categorization ──────────────────────────────────────────────────────
        defineField({
            name: 'category',
            title: 'Category',
            type: 'reference',
            to: [{type: 'blogCategory'}],
            group: 'categorization',
            description: 'Every post belongs to exactly one category (the six pillars).',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'tags',
            title: 'Tags',
            type: 'array',
            group: 'categorization',
            description:
                'Apply 3–5 structured tags from the relevant axes + 0–3 topic tags. See the Tagging Reference Guide.',
            of: [{type: 'reference', to: [{type: 'blogTag'}]}],
        }),
        defineField({
            name: 'relatedPosts',
            title: 'Related posts',
            type: 'array',
            group: 'categorization',
            description:
                'Optional 3–5 manually chosen posts. Falls back to category-based suggestions when empty.',
            of: [{type: 'reference', to: [{type: 'post'}]}],
            validation: (Rule) => Rule.max(5),
        }),
        defineField({
            name: 'featuredInCategory',
            title: 'Feature in category',
            type: 'boolean',
            group: 'categorization',
            description:
                'Pin this post as the featured post on its category landing page. Only one post per category should be enabled at a time.',
            initialValue: false,
        }),

        // ── Publishing ──────────────────────────────────────────────────────────
        defineField({
            name: 'author',
            title: 'Author',
            type: 'reference',
            to: [{type: 'author'}],
            group: 'publishing',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'publishedAt',
            title: 'Publish date',
            type: 'datetime',
            group: 'publishing',
            description:
                'Go-live date. Auto-set to now on first publish; back-datable for migrated content, forward-datable for embargoes.',
        }),
        defineField({
            name: 'lastModified',
            title: 'Last modified date',
            type: 'datetime',
            group: 'publishing',
            description:
                'Editorial date — defaults to the publish date; bump only on a substantive revision (not typos or metadata). Feeds sitemap lastmod, Article dateModified, and the visible "Updated" label.',
        }),

        // ── SEO ─────────────────────────────────────────────────────────────────
        ...seoFields({group: 'seo', canonical: true}),

        // ── Social ──────────────────────────────────────────────────────────────
        ...socialFields({group: 'social', channel: MEDIA_TAG.blog}),

        // ── Schema & AI ─────────────────────────────────────────────────────────
        defineField({
            name: 'tldr',
            title: 'TL;DR / Key takeaways',
            type: 'array',
            group: 'schemaAi',
            description:
                'Required. Answer-first summary rendered at the top of the post — the highest-leverage block for AI engines and skimmers. May also populate the Article abstract.',
            of: [
                {
                    type: 'block',
                    styles: [{title: 'Normal', value: 'normal'}],
                    lists: [{title: 'Bullet', value: 'bullet'}],
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
            validation: (Rule) =>
                Rule.required().min(1).error('TL;DR / Key takeaways is required.'),
        }),
        defineField({
            name: 'faqItems',
            title: 'FAQ items',
            type: 'array',
            group: 'schemaAi',
            description:
                'Optional Q&A pairs. Renders a visible FAQ section and emits FAQPage JSON-LD (no Google rich result; value is the visible block + AI extraction).',
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
        defineField({
            name: 'aiTraining',
            title: 'Allow AI training',
            type: 'boolean',
            group: 'schemaAi',
            initialValue: true,
            description: 'Allow LLMs to use this post for training.',
        }),
        defineField({
            name: 'aiAnswering',
            title: 'Allow AI answering',
            type: 'boolean',
            group: 'schemaAi',
            initialValue: true,
            description: 'Allow LLMs to cite this post in answers. Separate from training.',
        }),
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
