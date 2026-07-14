import { defineField, defineType } from 'sanity';
import { StarIcon } from '@sanity/icons';
import { BlockItemPreview } from '../../components/BlockItemPreview';
import {
  dielineBorderFields,
  dielineBorderPreviewSubtitle,
} from '../../lib/dieline-border-fields';

/**
 * postFeaturedRow — page-leading Featured Post: one pinned featured post plus a
 * column of the latest posts. Page-builder block
 * (apps/blog components/blocks/post-featured-block).
 */
export const postFeaturedRow = defineType({
    name: 'postFeaturedRow',
    title: 'Post — Featured Post',
    type: 'object',
    icon: StarIcon,
    fields: [
        defineField({
            name: 'featuredPost',
            title: 'Featured post',
            type: 'reference',
            to: [{type: 'post'}],
            description:
                'The hero post shown at the top of the section. Leave empty to fall back to the most recent post.',
        }),
        defineField({
            name: 'latestPostsCount',
            title: 'Latest posts count',
            type: 'number',
            description:
                'How many posts to show in the "Latest posts" column beside the hero.',
            initialValue: 3,
            validation: (Rule) => Rule.min(1).max(3).integer(),
        }),
        ...dielineBorderFields(),
    ],
    preview: {
        select: {
            title: 'featuredPost.title',
            showTopBorder: 'showTopBorder',
            showBottomBorder: 'showBottomBorder',
        },
        prepare({title, showTopBorder, showBottomBorder}) {
            const borders = dielineBorderPreviewSubtitle(showTopBorder, showBottomBorder);
            return {
        title: 'Post — Featured Post',
                subtitle: [title || 'Latest post (auto)', borders].filter(Boolean).join(' · '),
            };
        },
    },
  components: { preview: BlockItemPreview },
});
