/**
 * Shared GROQ for Studio `productModel3d` (public GLB URL + optional clip).
 * www uses the URL as-is. Transitional — PakStudio may supply it later.
 */
export const MODEL_3D_FIELDS = /* groq */ `
  "model3dUrl": model3d.url,
  "model3dAnimationName": model3d.animationName
`;

export const MODEL_3D_URL_FIELD = /* groq */ `"model3dUrl": model3d.url`;
