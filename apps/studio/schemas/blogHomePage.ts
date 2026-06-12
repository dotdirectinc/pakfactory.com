import { defineField, defineType } from 'sanity'
import { HomeIcon } from '@sanity/icons'

export const blogHomePage = defineType({
  name: 'blogHomePage',
  title: 'Blog Homepage',
  type: 'document',
  icon: HomeIcon,
  groups: [
    { name: 'hero',      title: 'Hero',       default: true },
    { name: 'spotlight', title: 'Spotlight'                 },
    { name: 'sections',  title: 'Sections'                  },
  ],
  fields: [
    // ── HERO ──────────────────────────────────────────────────────────────────

    defineField({
      name: 'featuredPost',
      title: 'Featured post',
      type: 'reference',
      to: [{ type: 'post' }],
      group: 'hero',
      description: 'The hero post shown at the top of the blog homepage.',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'latestPostsCount',
      title: 'Latest posts count',
      type: 'number',
      group: 'hero',
      description: 'How many posts to show in the "Latest posts" column beside the hero.',
      initialValue: 4,
      validation: (Rule) => Rule.required().min(1).max(8).integer(),
    }),

    // ── SPOTLIGHT ─────────────────────────────────────────────────────────────

    defineField({
      name: 'spotlightPosts',
      title: 'Spotlight posts',
      type: 'array',
      group: 'spotlight',
      description:
        'Manually curated posts for the Spotlight section. Currently one post — will expand to a carousel.',
      of: [{ type: 'reference', to: [{ type: 'post' }] }],
      // Remove max(1) when the carousel is ready
      validation: (Rule) => Rule.max(1),
    }),

    // ── CATEGORY SECTIONS ─────────────────────────────────────────────────────

    defineField({
      name: 'categorySections',
      title: 'Category sections',
      type: 'array',
      group: 'sections',
      description:
        'Which blog categories appear as homepage sections, in display order. Drag to reorder. Any category can be added.',
      of: [{ type: 'reference', to: [{ type: 'blogCategory' }] }],
    }),

    defineField({
      name: 'postsPerSection',
      title: 'Posts per section',
      type: 'number',
      group: 'sections',
      description: 'How many posts to show per category section.',
      initialValue: 3,
      validation: (Rule) => Rule.required().min(1).max(6).integer(),
    }),
  ],

  preview: {
    prepare() {
      return { title: 'Blog Homepage' }
    },
  },
})
