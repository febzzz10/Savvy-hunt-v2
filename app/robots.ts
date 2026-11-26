import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Admin workspace and the private upload endpoint only; public pages, images and the gallery proxy stay crawlable.
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/admin/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
