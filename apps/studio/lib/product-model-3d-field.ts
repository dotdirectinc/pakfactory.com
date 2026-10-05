import {defineField} from 'sanity'

type ProductModel3dFieldOptions = {
  /** Field group/tab id. */
  group?: string
  /** Override the field description for the host document’s role. */
  description?: string
}

/**
 * Shared `productModel3d` object field — Product (standard + inspiration).
 * Editors paste a public GLB URL; www uses it as-is. Transitional until
 * PakStudio owns assets and customize.
 */
export function productModel3dField({
  group,
  description,
}: ProductModel3dFieldOptions = {}) {
  return defineField({
    name: 'model3d',
    title: '3D model',
    type: 'productModel3d',
    ...(group ? {group} : {}),
    description:
      description ??
      'Optional GLB for marketing “View in 3D” previews. Paste a public URL (Supabase site-assets, S3, or CDN). Interactive customize and long-term asset ownership move to PakStudio — this field is for preview until then.',
  })
}
