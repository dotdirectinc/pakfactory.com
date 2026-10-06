import {CubeIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * productModel3d — optional public GLB URL for marketing "View in 3D" previews.
 * Transitional bridge until PakStudio owns assets and interactive customize;
 * www uses the URL as-is (Supabase site-assets, S3, or any CDN).
 *
 * Sanity Upload is not supported: cdn.sanity.io/files rejects browser CORS from
 * www origins, so model-viewer cannot load Studio-hosted GLBs.
 */
export const productModel3d = defineType({
  name: 'productModel3d',
  title: '3D model',
  type: 'object',
  icon: CubeIcon,
  fields: [
    defineField({
      name: 'url',
      title: 'Model URL',
      type: 'url',
      description:
        'Optional. Direct public link to a GLB (Supabase site-assets, S3, or CDN). Leave empty if this product has no 3D preview. Not a webpage.',
    }),
    defineField({
      name: 'animationName',
      title: 'Animation clip name',
      type: 'string',
      description:
        'Optional glTF animation clip (e.g. "Box animation"). When set, the preview shows Open/Close. Leave empty for a static model.',
    }),
  ],
  preview: {
    select: {
      url: 'url',
      animationName: 'animationName',
    },
    prepare({url, animationName}) {
      if (!url?.trim()) {
        return {title: '3D model', subtitle: 'Not set'}
      }
      const clip = animationName?.trim() ? ` · ${animationName.trim()}` : ''
      return {
        title: '3D model',
        subtitle: `${url.trim()}${clip}`,
      }
    },
  },
})
