import type { VideoObjectInput } from "../types";

export function videoObject(input: VideoObjectInput): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    "@type": "VideoObject",
    name: input.name,
    description: input.description,
    thumbnailUrl: input.thumbnailUrl,
    uploadDate: input.uploadDate,
    contentUrl: input.contentUrl,
  };

  if (input.id) doc["@id"] = input.id;
  if (input.embedUrl) doc.embedUrl = input.embedUrl;
  if (input.duration) doc.duration = input.duration;

  return doc;
}
