# Venues (website)

The website side of the venue feature (feature #267). The API side, with every endpoint, the roles and the database scripts, is in the
`tag-api` repo: [docs/venues.md](https://github.com/TwistedArtistsGuild/tag-api/blob/main/docs/venues.md).

## Pages

| Page | Who | Purpose |
| --- | --- | --- |
| `/venues` | Anyone | Directory: search, category, tag, region, state and city filters, and "Load more" paging. Filters live in the URL so a search can be shared |
| `/venue/<slug>` | Anyone. Owners and staff can also open a draft, shown as a preview | Public venue page: pictures, description, address with a map link, contacts, categories, tags, regions and upcoming events |
| `/join/venue` | Signed in | Registration wizard: reserve the name, profile and address, discoverability, media, contacts, review and publish |
| `/portal/venue` | Signed in | The venues the user owns |
| `/portal/venue/<slug>` | Owners, staff | Workspace: upcoming and past events, with publish, unpublish, cancel and delete-draft |
| `/portal/venue/<slug>/edit` | Owners, staff | The same steps as the wizard, for later changes |
| `/portal/venue/<slug>/events/new` and `.../events/<id>` | Owners, staff | Create or edit an event the venue hosts. Publishing lists what is still missing |
| `/portal/staff/venues` | Staff | Find venues, assign and remove owners |
| `/portal/staff/venue-categories`, `/portal/staff/regions` | Staff | Manage the shared category and region lists. The regions page also has the artist region migration |

The portal pages decide access on the server (`getServerSideProps`). They load the venue with the visitor's session token and ask the
API (`GET /api/venue/{id}/access`) whether the visitor manages it. If the API can't say yes, the visitor is sent away. The API makes the
same check again on every change, so hiding a button is never the only protection.

## Where the code is

| Area | Files |
| --- | --- |
| Public page | `pages/venue/[slug]/index.js`, `components/venues/VenueProfile.js`, `utils/venue-page.js` (everything the page shows is decided here) |
| Directory | `pages/venues/index.js`, `utils/venue-list.js` |
| Profile forms | `components/forms/onboarding/venues/` (`VenueProfileStep`, `VenueDiscoverabilityStep`), `components/forms/{CategorySelect,RegionSelect,TagInput}.js`, `utils/venue-profile.js`, `utils/venue-form.js` |
| Pictures | `utils/venue-media.js`, `pages/api/image/{upload,rename,delete}.js` |
| Events | `components/venues/{VenueEventsPanel,VenueEventForm}.js`, `pages/portal/venue/[slug]/`, `utils/venue-events.js` |
| Staff | `pages/portal/staff/`, `utils/venue-owners.js`, `utils/venue-categories.js`, `utils/venue-tags.js`, `utils/regions.js` |

Pages and components only draw. The rules (validation, what to show, what to send) live in `utils/` as plain functions, so they can be
tested without a browser.

## Security notes

- Text from owners and contacts is kept as plain text for React to escape. Only venue names and descriptions are HTML, and both go
  through the site's sanitizer. Links are only built from `http`, `https`, `tel` and `mailto` addresses.
- The image routes (`/api/image/upload`, `rename`, `delete`) check that the caller manages the venue before touching a file under
  `platformpics/venue/<id>/`. They refuse paths with `.` or `..` segments, because the storage client would resolve them into another
  folder than the one that was checked. Venue folders only accept JPG, PNG, GIF and WebP (no SVG), checked by name, type, size and the
  file's first bytes. These routes are **not** protected for artist, user, blog or listing media yet.
- Never upload, rename or delete while testing against a real storage account. `.env.local` holds the real connection string.

## Settings

The venue feature adds no environment settings. It uses the existing `AZURE_STORAGE_CONNECTION_STRING` for pictures and the existing
sign-in settings. See [env.md](env.md).

## Tests

```bash
node --test utils/*.test.js components/Header/nav-links.test.js
npx eslint .
```

The runner is Node's built-in `node:test`, so there is nothing to install. There is no React component test setup yet, which is why
the logic sits in `utils/`.

| File | Covers |
| --- | --- |
| `utils/venue-profile.test.js`, `utils/venue-form.test.js` | Onboarding and portal validation, the payloads sent to the API, publish checks, API errors |
| `utils/venue-list.test.js` | Directory filters, the URL round trip, paging and de-duplicating pages |
| `utils/venue-page.test.js` | The public page in every state: full, minimal, empty, preview of a draft, no owner, sanitizing, events |
| `utils/venue-media.test.js` | Picture rules, and which venue a file belongs to, including dot-segment tricks |
| `utils/venue-events.test.js` | Event form rules, the publish checklist, status labels, upcoming and past, and the API calls |
| `utils/venue-owners.test.js`, `venue-categories.test.js`, `venue-tags.test.js`, `regions.test.js` | Staff screens and shared lists |
| `components/Header/nav-links.test.js` | The Venues link in the header |

End-to-end coverage of the whole journey (register, fill in, publish, appear in the directory, show on the public page, host an event)
is in the API tests: `tests/18_VenueJourneyAndAccessTests.cs` in `tag-api`. A browser test runner (Cypress) is not set up in this repo yet.
