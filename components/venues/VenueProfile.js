/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import Link from "next/link"
import ReportButton from "@/components/moderation/ReportButton"
import useEntityLogo from "@/components/cards/useEntityLogo"

function Chips({ label, items, hrefFor }) {
  if (items.length === 0) return null
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item.key}>
          <Link href={hrefFor(item)} className="badge badge-outline badge-lg hover:badge-primary">{item.label}</Link>
        </li>
      ))}
    </ul>
  )
}

function ContactList({ items, kind }) {
  if (items.length === 0) return null
  return (
    <>
      {items.map((item) => (
        <li key={`${kind}-${item.href || item.text}`} className="break-words">
          <span className="font-medium">{item.label}: </span>
          {item.href ? (
            <a href={item.href} className="link link-primary" {...(item.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{item.text}</a>
          ) : (
            <span>{item.text}</span>
          )}
        </li>
      ))}
    </>
  )
}

// The public venue page. It only draws `view`, which utils/venue-page.js builds from what the API returns, so every
// section appears when the venue has the information and is left out when it does not. Venue text from owners is plain
// text for React to escape, apart from the name and description, which are sanitized HTML.
export default function VenueProfile({ view, gallery = { loading: false, error: "" } }) {
  const logoUrl = useEntityLogo({ logoImage: view.images.logo, entityType: "Venue", entityId: view.venueId })
  const { address, contacts } = view
  const hasLocation = Boolean(address) || view.regions.length > 0 || Boolean(view.hours)

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 md:py-12 space-y-6" aria-labelledby="venue-title">
      {view.isPreview ? (
        <div role="status" className="alert alert-warning">
          <span><strong>Preview.</strong> {view.previewNote} Only you and TAG staff can see this page.</span>
        </div>
      ) : null}

      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex min-w-0 items-center gap-3">
          {logoUrl ? <img src={logoUrl} alt={`${view.name} logo`} className="h-16 w-16 shrink-0 rounded-box border border-base-300 bg-base-100 object-contain p-1" /> : null}
          <div className="min-w-0 space-y-2">
            <h1 id="venue-title" className="text-3xl font-bold break-words" dangerouslySetInnerHTML={{ __html: view.nameHtml }} />
            <Chips
              label="Categories"
              items={view.categories.map((category) => ({ key: category.slug || category.name, label: category.name, slug: category.slug }))}
              hrefFor={(item) => (item.slug ? `/venues?category=${encodeURIComponent(item.slug)}` : "/venues")}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/venues" className="btn btn-sm btn-outline">All venues</Link>
          {view.isPublic ? <ReportButton targetType="Venue" targetId={view.venueId} targetURL={`/venue/${view.slug}`} variant="text" /> : null}
        </div>
      </header>

      {view.images.cover ? (
        <div className="rounded-box overflow-hidden border border-base-300 bg-base-200/40">
          <img src={view.images.cover} alt={`${view.name} cover photo`} className="w-full h-56 md:h-72 object-cover" />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {view.descriptionHtml ? (
            <section aria-labelledby="venue-about" className="rounded-box border border-base-300 bg-base-100 shadow p-5 space-y-3">
              <h2 id="venue-about" className="text-xl font-semibold">About this venue</h2>
              <div
                className="space-y-2 break-words [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:link [&_a]:link-primary [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold"
                dangerouslySetInnerHTML={{ __html: view.descriptionHtml }}
              />
            </section>
          ) : null}

          {view.tags.length > 0 ? (
            <section aria-labelledby="venue-amenities" className="rounded-box border border-base-300 bg-base-100 shadow p-5 space-y-3">
              <h2 id="venue-amenities" className="text-xl font-semibold">Amenities</h2>
              <Chips label="Amenities" items={view.tags.map((tag) => ({ key: tag, label: tag }))} hrefFor={(item) => `/venues?tag=${encodeURIComponent(item.label)}`} />
            </section>
          ) : null}

          {view.events.length > 0 ? (
            <section aria-labelledby="venue-events" className="rounded-box border border-base-300 bg-base-100 shadow p-5 space-y-3">
              <h2 id="venue-events" className="text-xl font-semibold">Upcoming events</h2>
              <ul className="divide-y divide-base-300">
                {view.events.map((event) => (
                  <li key={event.id} className="py-2">
                    <p className="font-medium break-words">{event.title}</p>
                    <p className="text-sm text-base-content/70">
                      {event.when ? <time dateTime={event.startTime}>{event.when}</time> : null}
                      {event.when && event.artistName ? " · " : null}
                      {event.artistName ? <span>{event.artistName}</span> : null}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6" aria-label="Venue details">
          {view.images.profile ? (
            <img src={view.images.profile} alt={`${view.name} profile picture`} className="w-full h-56 object-cover rounded-box border border-base-300" />
          ) : null}

          {hasLocation ? (
            <section aria-labelledby="venue-location" className="rounded-box border border-base-300 bg-base-100 shadow p-5 space-y-3">
              <h2 id="venue-location" className="text-xl font-semibold">Location</h2>
              {address ? (
                <address className="not-italic space-y-1">
                  {address.line1 ? <p className="break-words">{address.line1}</p> : null}
                  {address.line2 ? <p className="break-words">{address.line2}</p> : null}
                  {address.cityLine ? <p className="break-words">{address.cityLine}</p> : null}
                  <a href={address.mapUrl} target="_blank" rel="noopener noreferrer" className="link link-primary text-sm">View on a map<span className="sr-only"> (opens in a new tab)</span></a>
                </address>
              ) : null}
              {view.regions.length > 0 ? (
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">Regions served</h3>
                  <Chips
                    label="Regions"
                    items={view.regions.map((region) => ({ key: region.slug || region.name, label: region.name, slug: region.slug }))}
                    hrefFor={(item) => (item.slug ? `/venues?region=${encodeURIComponent(item.slug)}` : "/venues")}
                  />
                </div>
              ) : null}
              {view.hours ? (
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">Hours</h3>
                  <p className="whitespace-pre-line break-words">{view.hours}</p>
                </div>
              ) : null}
            </section>
          ) : null}

          {view.hasContacts ? (
            <section aria-labelledby="venue-contact" className="rounded-box border border-base-300 bg-base-100 shadow p-5 space-y-3">
              <h2 id="venue-contact" className="text-xl font-semibold">Contact</h2>
              <ul className="space-y-2 text-sm">
                <ContactList items={contacts.phones} kind="phone" />
                <ContactList items={contacts.emails} kind="email" />
                <ContactList items={contacts.websites} kind="website" />
                <ContactList items={contacts.social} kind="social" />
              </ul>
            </section>
          ) : null}

          {view.showClaimPrompt ? (
            <section aria-labelledby="venue-claim" className="rounded-box border border-dashed border-base-300 bg-base-200/40 p-5 space-y-2">
              <h2 id="venue-claim" className="text-lg font-semibold">Own this venue?</h2>
              <p className="text-sm text-base-content/75">Nobody manages this page yet. Contact us to take it over and keep its details up to date.</p>
              <Link href="/contact" className="btn btn-sm btn-primary">Contact us</Link>
            </section>
          ) : null}
        </aside>
      </div>

      <section aria-labelledby="venue-gallery" className="rounded-box border border-base-300 bg-base-100 shadow p-5 space-y-3">
        <h2 id="venue-gallery" className="text-xl font-semibold">Gallery</h2>
        {gallery.loading ? <p role="status" className="text-sm text-base-content/70">Loading gallery...</p> : null}
        {gallery.error ? <div role="alert" className="alert alert-error"><span>{gallery.error}</span></div> : null}
        {!gallery.loading && !gallery.error && view.images.gallery.length === 0 ? (
          <p className="text-sm text-base-content/70">No gallery photos yet.</p>
        ) : null}
        {view.images.gallery.length > 0 ? (
          <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {view.images.gallery.map((item) => (
              <li key={item.url} className="rounded-box overflow-hidden border border-base-300 bg-base-200/40">
                <img src={item.url} alt={item.alt} loading="lazy" className="w-full h-36 object-cover" />
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </article>
  )
}
