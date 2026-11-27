import { EVENT_END_DATE, EVENT_START_DATE, SCHOOL_ALTERNATE_NAMES, SCHOOL_LOCATION, SCHOOL_NAME, SCHOOL_URL, SITE_NAME, SITE_URL, SITE_YEAR } from "./site";

type Crumb = { name: string; path: string };
export type FaqItem = { question: string; answer: string };

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const SCHOOL_ID = `${SITE_URL}/#school`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const EVENT_ID = `${SITE_URL}/#event`;

export const HOME_META = {
  title: `${SITE_NAME} ${SITE_YEAR} | ${SCHOOL_NAME} Programs, Events & Results`,
  description: `Discover ${SITE_NAME} ${SITE_YEAR} at ${SCHOOL_NAME}. Explore school programs, events, announcements, student achievements, results and latest updates from MGM ${SITE_NAME}.`,
};

/** Keeps a generated description inside the range search engines show, cutting at a word boundary. */
export function clampDescription(text: string, max = 160) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:\s-]+$/, "")}…`;
}

/** Titles and descriptions for the two data-driven routes; the event and category names come from Convex. */
export function eventMeta(title: string, venue?: string) {
  const base = `${title} results at MGM ${SITE_NAME} ${SITE_YEAR}: official winners, placements and points by school, with live updates from ${SCHOOL_NAME}, ${SCHOOL_LOCATION}.`;
  // The venue is organizer-written and of unknown length, so it is appended only when it fits whole.
  const withVenue = venue?.trim() ? `${base} At ${venue.trim()}.` : base;
  return {
    title: `${title} Results – MGM ${SITE_NAME} ${SITE_YEAR}`,
    description: withVenue.length <= 160 ? withVenue : clampDescription(base),
  };
}
export function categoryMeta(name: string) {
  return {
    title: `${name} Points – ${SITE_NAME} ${SITE_YEAR} Live Scoreboard`,
    description: clampDescription(`Live ${name} points table for ${SITE_NAME} ${SITE_YEAR}: school-wise rankings and standings updated as ${SCHOOL_NAME}, ${SCHOOL_LOCATION} publishes official event results.`),
  };
}

/** One source for the FAQ shown on /results and the FAQPage JSON-LD, so the two can never disagree. */
export function faqItems(): FaqItem[] {
  const start = EVENT_START_DATE ? new Date(EVENT_START_DATE) : null;
  const dateText = start && !Number.isNaN(start.getTime()) ? start.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }) : null;
  return [
    {
      question: `How do I check ${SITE_NAME} ${SITE_YEAR} results?`,
      answer: "Open the Results page on this site. Every event with an official result lists its winners, placements and points by school, and you can filter by category or school. Results appear only after the organizers publish them, so an event without a result is still pending.",
    },
    {
      question: "Where is the live scoreboard?",
      answer: "The live scoreboard is on the Scoreboard page. It shows overall school-wise points and a points table for each category, and it updates as official results are published.",
    },
    {
      question: `When is MGM ${SITE_NAME} ${SITE_YEAR}?`,
      answer: dateText
        ? `MGM ${SITE_NAME} ${SITE_YEAR} begins on ${dateText} at ${SCHOOL_NAME}, ${SCHOOL_LOCATION}. Event-wise timings and venues are listed on the Schedule page.`
        : `${SCHOOL_NAME}, ${SCHOOL_LOCATION} announces the programme on the Schedule page, which lists every event with its category, venue and status. Announcements from the organizers also appear on the home page.`,
    },
  ];
}

/** Organization, the host school, the WebSite and (once dates are confirmed) the Event, emitted once from the root layout. */
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
        url: SCHOOL_URL,
        sameAs: [SCHOOL_URL],
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
      ...eventNodes(),
    ],
  };
}

/**
 * Google rejects an Event without startDate, and the project stores no event dates, so the node is emitted
 * only once EVENT_START_DATE is set in lib/site.ts. Nothing here is guessed: status and attendance mode are
 * the standard values for a scheduled, in-person school competition.
 */
function eventNodes() {
  if (!EVENT_START_DATE) return [];
  return [{
    "@type": "Event",
    "@id": EVENT_ID,
    name: `${SITE_NAME} ${SITE_YEAR}`,
    alternateName: `MGM ${SITE_NAME} ${SITE_YEAR}`,
    url: SITE_URL,
    description: `${SITE_NAME} ${SITE_YEAR} is the inter-school competition hosted by ${SCHOOL_NAME}, ${SCHOOL_LOCATION}.`,
    startDate: EVENT_START_DATE,
    ...(EVENT_END_DATE ? { endDate: EVENT_END_DATE } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: SCHOOL_NAME, address: { "@type": "PostalAddress", addressLocality: SCHOOL_LOCATION, addressCountry: "IN" } },
    organizer: { "@id": SCHOOL_ID },
    inLanguage: "en-IN",
  }];
}

/** WebPage plus an optional BreadcrumbList (and FAQPage) for a single public route. */
export function pageSchema({ path, name, description, crumbs, faq }: { path: string; name: string; description: string; crumbs?: Crumb[]; faq?: FaqItem[] }) {
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
      ...(faq?.length ? [{
        "@type": "FAQPage",
        "@id": `${SITE_URL}${path}#faq`,
        mainEntity: faq.map(item => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
      }] : []),
    ],
  };
}
