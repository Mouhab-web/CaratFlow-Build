import { createFileRoute } from "@tanstack/react-router";

import Landing from "@/components/Landing";
import {
  OPEN_GRAPH_DESCRIPTION,
  OPEN_GRAPH_TITLE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SOCIAL_IMAGE_ALT,
  SOCIAL_IMAGE_PATH,
  absoluteSiteUrl,
  siteConfig,
} from "@/lib/site-config";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => {
    const canonicalUrl = absoluteSiteUrl("/");
    const socialImageUrl = absoluteSiteUrl(SOCIAL_IMAGE_PATH);

    return {
      meta: [
        { title: SITE_TITLE },
        { name: "description", content: SITE_DESCRIPTION },
        {
          name: "robots",
          content: siteConfig.allowIndexing ? "index,follow" : "noindex,nofollow,noarchive",
        },
        { property: "og:title", content: OPEN_GRAPH_TITLE },
        { property: "og:description", content: OPEN_GRAPH_DESCRIPTION },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: SITE_NAME },
        { property: "og:locale", content: "en_US" },
        ...(canonicalUrl ? [{ property: "og:url", content: canonicalUrl }] : []),
        ...(socialImageUrl
          ? [
              { property: "og:image", content: socialImageUrl },
              { property: "og:image:alt", content: SOCIAL_IMAGE_ALT },
              { property: "og:image:width", content: "1200" },
              { property: "og:image:height", content: "630" },
            ]
          : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: OPEN_GRAPH_TITLE },
        { name: "twitter:description", content: OPEN_GRAPH_DESCRIPTION },
        ...(socialImageUrl
          ? [
              { name: "twitter:image", content: socialImageUrl },
              { name: "twitter:image:alt", content: SOCIAL_IMAGE_ALT },
            ]
          : []),
      ],
      links: canonicalUrl ? [{ rel: "canonical", href: canonicalUrl }] : [],
    };
  },
});
