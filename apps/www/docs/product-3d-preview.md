# Product preview — "View in 3D" (PoC, PROD-2777)

**Status:** proof of concept for **one product** on staging. Not a general feature yet: no Studio field, no prod asset.

## What it does

In the product preview dialog ([`SolutionProductPreview`](../src/components/solution/solution-product-preview.tsx)), a product that has a 3D model gets a **View in 3D** pill in the top-right of the photo (modelled on Brilliant Earth's gallery pill). Toggling it swaps the photo for an interactive model:

- drag to rotate, scroll / pinch to zoom, slow auto-rotate (off under `prefers-reduced-motion`)
- **Close box / Open box** plays the GLB's `Box animation` clip forward / backward
- the photo is the poster while the model downloads; if loading fails the dialog falls back to the photo and hides the pill

Products without a model render exactly as before.

## How it's built

| Piece | Where |
| --- | --- |
| Viewer (props-only, `@google/model-viewer`, imported on mount) | [`components/ui/model-viewer.tsx`](../src/components/ui/model-viewer.tsx) |
| Slug → model URL (hard-coded PoC map) | [`lib/catalog/product-3d-models.ts`](../src/lib/catalog/product-3d-models.ts) |
| Toggle + wiring into the dialog | [`solution-product-preview.tsx`](../src/components/solution/solution-product-preview.tsx) (`modelSrc` on the preview product) |
| Who sets `modelSrc` | [`product-line-hero-media-marquee.tsx`](../src/components/product/product-line-hero-media-marquee.tsx) — `/products/<line>` hero marquee |

The model URL is `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-assets/<path>`, so it follows whichever Supabase project the deploy points at. Only **staging** (`gqyq…`) has the `site-assets` bucket and the file today.

## The asset

- Source `box-animation-materials.glb` was 35 MB (4K PNG textures). Optimized with:

  ```bash
  npx @gltf-transform/cli optimize in.glb box-3d.glb \
    --compress quantize --texture-compress webp --texture-size 1024 --simplify false
  ```

  → 3.94 MB, animation intact.
- **Don't use `--compress meshopt` (or draco).** model-viewer needs an external decoder script for those (`ModelViewerElement.meshoptDecoderLocation`), and without it the load fails with `setMeshoptDecoder must be called before loading compressed files`. Quantize needs no decoder.
- `Box animation` is authored as a **closing** sequence: frame 0 / rest pose = open (matches the product photo), last frame = closed. Hence the button reads "Close box" first.

## Hosting

Public Supabase Storage bucket `site-assets` (migration `20261002191226_site_assets_public_bucket.sql` in `pakfactory.com-backend`): public read, 10 MB, `model/gltf-binary` only, no `storage.objects` policies (service-role writes only). **Not** the RFQ S3 bucket — that one is private customer uploads behind 5-minute signed URLs.

Upload with an explicit content type (the bucket rejects anything else):

```bash
curl -X POST "$SUPABASE_URL/storage/v1/object/site-assets/3d/box-3d.glb" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Content-Type: model/gltf-binary" --data-binary @box-3d.glb
```

## Known gaps (PoC)

- When closed, the camera keeps the open-box framing, so the box sits low / off-centre.
- One product only, keyed by slug `test-custom-angled-cuff-ring-boxes`. Graduating = a model field on the product document instead of growing the map, plus a prod bucket + upload.
