import { defineField, defineType } from 'sanity';
import { StarIcon } from '@sanity/icons';
import { BlockItemPreview } from '../../components/BlockItemPreview';
import {
  dielineBorderFields,
  dielineBorderPreviewSubtitle,
} from '../../lib/dieline-border-fields';

/**
 * postFeaturedRow — page-leading Featured Post: exactly four editor-selected
 * posts rendered as the rotating home hero (lead crossfades through the four;
 * right rail lists them). Page-builder block
 * (apps/blog components/blocks/post-featured-block).
 */
export const postFeaturedRow = defineType({
    name: 'postFeaturedRow',
    title: 'Post — Featured Post',
    type: 'object',
    icon: StarIcon,
    fields: [
        defineField({
            name: 'featuredPosts',
            title: 'Featured posts',
            type: 'array',
            of: [{type: 'reference', to: [{type: 'post'}]}],
            description:
                'Up to four posts for the rotating home hero, in display order (first shown initially). Leave empty to fall back to recently published posts, featured-flagged first.',
            validation: (Rule) => Rule.max(4).unique(),
        }),
        ...dielineBorderFields(),
    ],
    preview: {
        select: {
            title: 'featuredPosts.0.title',
            posts: 'featuredPosts',
            showTopBorder: 'showTopBorder',
            showBottomBorder: 'showBottomBorder',
        },
        prepare({title, posts, showTopBorder, showBottomBorder}) {
            const borders = dielineBorderPreviewSubtitle(showTopBorder, showBottomBorder);
            const count = Array.isArray(posts) ? posts.length : 0;
            const selection =
                count > 1
                    ? `${title} +${count - 1} more`
                    : count === 1
                      ? title
                      : 'Auto — recent featured posts';
            return {
        title: 'Post — Featured Post',
                subtitle: [selection, borders].filter(Boolean).join(' · '),
            };
        },
    },
  components: { preview: BlockItemPreview },
});
