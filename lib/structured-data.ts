import { SCHOOL_ALTERNATE_NAMES, SCHOOL_LOCATION, SCHOOL_NAME, SITE_NAME, SITE_URL, SITE_YEAR } from "./site";

type Crumb = { name: string; path: string };

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const SCHOOL_ID = `${SITE_URL}/#school`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export const HOME_META = {
  title: `${SITE_NAME} ${SITE_YEAR} | ${SCHOOL_NAME} Programs, Events & Results`,
  description: `Discover ${SITE_NAME} ${SITE_YEAR} at ${SCHOOL_NAME}. Explore school programs, events, announcements, student achievements, results and the latest updates from MGM ${SITE_NAME}.`,
};

/** Organization, the host school and the WebSite, emitted once from the root layout. */
export function siteSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: SITE_NAME,
        alternateName: `MGM ${SITE_NAME}`,
        url: SITE_URL,
        description: `${SITE_NAME} is the inter-school competition programme run at ${SCHOOL_NAME}, ${SCHOOL_LOCATION}.`,
        parentOrganization: { "@id": SCHOOL_ID },
      },
      {
        "@type": "EducationalOrganization",
        "@id": SCHOOL_ID,
        name: SCHOOL_NAME,
        alternateName: SCHOOL_ALTERNATE_NAMES,
        // Locality and country only: the project records no street address, phone or geo coordinates.
        address: { "@type": "PostalAddress", addressLocality: SCHOOL_LOCATION, addressCountry: "IN" },
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: `${SITE_NAME} ${SITE_YEAR}`,
        alternateName: `MGM ${SITE_NAME}`,
        url: SITE_URL,
        publisher: { "@id": ORGANIZATION_ID },
        inLanguage: "en-IN",
      },
    ],
  };
}

/** WebPage plus an optional BreadcrumbList for a single public route. */
export function pageSchema({ path, name, description, crumbs }: { path: string; name: string; description: string; crumbs?: Crumb[] }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}${path}#webpage`,
        url: `${SITE_URL}${path}`,
        name,
        description,
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": ORGANIZATION_ID },
        inLanguage: "en-IN",
      },
      ...(crumbs && crumbs.length > 1 ? [{
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}${path}#breadcrumb`,
        itemListElement: crumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: `${SITE_URL}${crumb.path}`,
        })),
      }] : []),
    ],
  };
}

/**
 * No Event schema is emitted: the events table stores no date or start time, and Google's Event
 * rich result requires startDate. Inventing one would be false data, so event pages carry WebPage
 * and BreadcrumbList only until organizers publish dates.
 */
