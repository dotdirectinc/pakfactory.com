import { test } from "node:test";
import assert from "node:assert/strict";
import { videoObject } from "./videoObject.ts";

test("videoObject emits required Google Rich Results fields", () => {
  const node = videoObject({
    id: "https://blog.example.com/#video-abc",
    name: "Custom Packaging 101",
    description: "An overview of custom packaging options for DTC brands.",
    thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    uploadDate: "2026-01-15T12:00:00.000Z",
    contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "PT4M32S",
  });

  assert.equal(node["@type"], "VideoObject");
  assert.equal(node.name, "Custom Packaging 101");
  assert.equal(node.description, "An overview of custom packaging options for DTC brands.");
  assert.equal(node.thumbnailUrl, "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  assert.equal(node.uploadDate, "2026-01-15T12:00:00.000Z");
  assert.equal(node.contentUrl, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal(node.embedUrl, "https://www.youtube.com/embed/dQw4w9WgXcQ");
  assert.equal(node.duration, "PT4M32S");
  assert.equal(node["@id"], "https://blog.example.com/#video-abc");
});

test("videoObject omits optional fields when absent", () => {
  const node = videoObject({
    name: "Minimal",
    description: "Desc",
    thumbnailUrl: "https://cdn.example.com/thumb.jpg",
    uploadDate: "2026-01-01T00:00:00.000Z",
    contentUrl: "https://cdn.example.com/video.mp4",
  });

  assert.equal(node.embedUrl, undefined);
  assert.equal(node.duration, undefined);
  assert.equal(node["@id"], undefined);
});
