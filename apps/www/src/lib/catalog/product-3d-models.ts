/**
 * PoC (PROD-2777): interactive 3D models for product preview dialogs.
 *
 * Hard-coded per product slug on purpose — one product only, no Studio field.
 * Models live in the public `site-assets` bucket of the pakfactory.com Supabase
 * project (never the private RFQ S3 bucket). If this graduates past PoC, move
 * the path onto the product document instead of growing this map.
 */
const PRODUCT_MODEL_PATHS: Record<string, string> = {
    'test-custom-angled-cuff-ring-boxes': '3d/box-3d.glb',
};

const SITE_ASSETS_BUCKET = 'site-assets';

/** Public GLB URL for a product slug, or undefined when it has no model. */
export function productModelSrc(slug: string): string | undefined {
    const path = PRODUCT_MODEL_PATHS[slug];
    // Static reference so Next inlines it into the client bundle.
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!path || !base) return undefined;
    return `${base.replace(/\/$/, '')}/storage/v1/object/public/${SITE_ASSETS_BUCKET}/${path}`;
}
