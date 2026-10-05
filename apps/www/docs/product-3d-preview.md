# Product preview — "View in 3D" (PROD-2777 graduation)

**Status:** CMS-configurable bridge on **Product** (Standard and Inspiration). Front-end consumes a plain GLB URL. Long-term asset ownership and interactive customize belong to **PakStudio** — this Sanity field may retire once previews resolve models from PakStudio/product identity.

## What it does

In product preview dialogs (`StandardProductPreview`, `SolutionProductPreview`), a product with a 3D model URL gets a **View in 3D** pill over the photo. Toggling swaps the photo for an interactive model:

- drag to rotate, scroll / pinch to zoom, slow auto-rotate (off under `prefers-reduced-motion`)
- when **Animation clip name** is set, **Close box / Open box** plays that glTF clip forward / backward
- the photo is the poster while the model downloads; if loading fails the dialog falls back to the photo and hides the pill

Products without a model render exactly as before.

## Studio field (`product.model3d`)

Shared object type [`productModel3d`](../../studio/schemas/productModel3d.ts):

| Field | Purpose |
| --- | --- |
| **Model URL** | Optional public GLB URL (Supabase site-assets, S3, or any CDN) |
| **Animation clip name** | Optional glTF clip (e.g. `Box animation`); empty = static model |

Sanity **Upload is not supported** — `cdn.sanity.io/files` rejects browser CORS from www origins.

Field helper: [`apps/studio/lib/product-model-3d-field.ts`](../../studio/lib/product-model-3d-field.ts). Visible on both Product types (`kind`: standard | inspiration). No inheritance from `basedOn`.

## How it's built

| Piece | Where |
| --- | --- |
| Viewer (props-only, `@google/model-viewer`, imported on mount) | [`components/ui/model-viewer.tsx`](../src/components/ui/model-viewer.tsx) |
| GROQ | [`packages/sanity/src/queries/product-model-3d.ts`](../../../packages/sanity/src/queries/product-model-3d.ts) → `model3dUrl` / `model3dAnimationName` |
| www adapter | [`map-sanity.ts`](../src/lib/catalog/map-sanity.ts) → `Product.model3dUrl` |
| Preview dialogs | `modelSrc` + `modelAnimationName` props only |

```text
product.model3d.url → Product.model3dUrl → preview modelSrc → ModelViewer
```

## Asset guidance

Optimize with `gltf-transform` (quantize + WebP textures; keep animation if needed). Target under ~5 MB; public `site-assets` bucket caps at 10 MB and `model/gltf-binary` only.

```bash
npx @gltf-transform/cli optimize in.glb box-3d.glb \
  --compress quantize --texture-compress webp --texture-size 1024 --simplify false
```

**Don't use `--compress meshopt` (or draco).** model-viewer needs an external decoder for those.

Staging example (already uploaded):

`https://gqyqizmycunqxocorfzd.supabase.co/storage/v1/object/public/site-assets/3d/box-3d.glb`

## Human handoff — PoC product

Agents do **not** write Sanity documents. After schema reload, set **3D model** on `test-custom-angled-cuff-ring-boxes`:

1. **Model URL** = `https://gqyqizmycunqxocorfzd.supabase.co/storage/v1/object/public/site-assets/3d/box-3d.glb`
2. **Animation clip name** = `Box animation`

Clear any legacy `source` / `path` / upload values left from earlier PoC shapes.

## Known gaps

- When closed, the camera may keep open-box framing on the PoC asset.
- Interactive customize, AR, and retiring this CMS field are out of scope for this bridge.
