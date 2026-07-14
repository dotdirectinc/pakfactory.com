type JsonLdScriptProps = {
  jsonLd: string;
};

/** Embeds a pre-serialized JSON-LD document in the page. */
export function JsonLdScript({ jsonLd }: JsonLdScriptProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd }}
    />
  );
}
