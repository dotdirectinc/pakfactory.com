import {defineField, defineType} from 'sanity';
import {languageField, uniqueSlugPerLanguage} from '../lib/i18n-fields';
import {MEDIA_TAG, taggedImageField} from '../lib/media-tags'
import {seoFields, socialFields} from '../lib/seo-fields';
import {inlineBlocks} from './inline';

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
            description: 'The H1 heading shown on the post, written for readers. Best kept under 80 characters.',
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
                        'Optional. Falls back to the alt text on the image asset.',
                }),
            ],
        })),
        defineField({
            name: 'legacyImageUrl',
            title: 'Legacy image URL (S3)',
            type: 'url',
            group: 'content',
            readOnly: true,
            description:
                'Set by the WordPress migration, not by hand. The original image URL, kept as a fallback while images move to Sanity.',
        }),
        defineField({
            name: 'body',
            title: 'Body',
            type: 'array',
            group: 'content',
            of: [
                {type: 'block'},
                {type: 'bodyImage'},
                ...inlineBlocks.map((block) => ({type: block.name})),
                {type: 'widgetEmbed'},
            ],
        }),

        // ── Categorization ──────────────────────────────────────────────────────
        defineField({
            name: 'category',
            title: 'Category',
            type: 'reference',
            to: [{type: 'blogCategory'}],
            group: 'categorization',
            description: 'Every post belongs to exactly one category.',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'tags',
            title: 'Topics',
            type: 'array',
            group: 'categorization',
            description:
                'Apply 3–5 topics, each drawn from one of the topic groups.',
            of: [{type: 'reference', to: [{type: 'blogTag'}]}],
        }),
        defineField({
            name: 'relatedPosts',
            title: 'Related posts',
            type: 'array',
            group: 'categorization',
            description:
                'Up to 5, manually chosen. Empty falls back to the newest posts in the same category.',
            of: [{type: 'reference', to: [{type: 'post'}]}],
            validation: (Rule) => Rule.max(5),
        }),
        defineField({
            name: 'featuredInCategory',
            title: 'Feature in category',
            type: 'boolean',
            group: 'categorization',
            description:
                'Pin this post in the category featured band (hero + up to 3 cards). Mark at most 4 posts per category.',
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
                "The publish date shown on the post, used for structured data and blog sorting. Set automatically when the post goes live. Edit it only to back-date migrated content or to set a future date. Editing it does not publish the post — use Publish.",
        }),
        defineField({
            name: 'lastModified',
            title: 'Last updated (editorial)',
            type: 'datetime',
            group: 'publishing',
            description:
                "The “Updated” date shown on the post, and the date in the sitemap and structured data. Set it only for substantive changes, not typos or metadata. Separate from Sanity’s own last-edited timestamp.",
        }),
        defineField({
            name: 'viewCount',
            title: 'Views',
            type: 'number',
            group: 'publishing',
            description:
                'Ranks this post in the Popular row — higher is more prominent. Set by hand; nothing syncs it yet.',
            initialValue: 0,
            validation: (Rule) => Rule.min(0).integer(),
        }),

        // ── SEO ─────────────────────────────────────────────────────────────────
        ...seoFields({group: 'seo', canonical: true, typeSettingsId: 'postSettings'}),

        // ── Social ──────────────────────────────────────────────────────────────
        ...socialFields({group: 'social', channel: MEDIA_TAG.blog}),

        // ── Schema & AI ─────────────────────────────────────────────────────────
        defineField({
            name: 'tldr',
            title: 'TL;DR / Key takeaways',
            type: 'array',
            group: 'schemaAi',
            description:
                'Answer-first summary shown at the top of the post. Also used as the structured-data description, ahead of the excerpt.',
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
                'Q&A pairs. Renders a visible FAQ section on the post and adds FAQ structured data.',
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
