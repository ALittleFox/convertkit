import { buildHomeSchema, buildPageSchema, type FaqEntry } from "@/lib/structured-data";

interface JsonLdProps {
  locale: string;
  path: string;
  name: string;
  description: string;
  faq?: FaqEntry[];
  isHome?: boolean;
  /** Home page only: the list of tools rendered in the ItemList node. */
  tools?: { path: string; name: string; description: string }[];
}

/**
 * Server-rendered JSON-LD block.
 *
 * Rendered as a plain <script> rather than next/script so it lands in the
 * static HTML during prerender (crawlers do not run the client runtime).
 *
 * `<` is escaped to \u003c: the payload includes translation strings, and a
 * literal "</script>" inside one would terminate the tag early.
 */
export function JsonLd({ tools, ...props }: JsonLdProps) {
  const schema =
    tools?.length && props.isHome
      ? buildHomeSchema({ ...props, tools })
      : buildPageSchema(props);

  const json = JSON.stringify(schema).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
