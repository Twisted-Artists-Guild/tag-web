# Card System

This directory contains the shared card primitives used across the site.

## UnifiedCard

Use `UnifiedCard` for any card that needs a consistent layout across pages, including article previews, profile embeds, and feed items.

Example:

```jsx
import UnifiedCard from "@/components/cards/UnifiedCard"

<UnifiedCard
  title="Artist Spotlight"
  summary="A quick look at this week's featured creative partner."
  image="/images/featured.jpg"
  href="/artists/sample"
  badge="Artist"
  date="2026-09-17"
  authorName="Maya Ellis"
  tags={["Community", "Spotlight"]}
  size="md"
  orientation="vertical"
/>
```

## BlogCard and NewsCard

These components wrap the shared primitive with blog/news defaults.

```jsx
import BlogCard from "@/components/cards/card_blog"
import NewsCard from "@/components/cards/card_news"

<BlogCard blog={blog} />
<NewsCard news={news} />
```

Cards show impressions and reporting by default when the source object includes a
numeric ID. Both features can be disabled per use:

```jsx
<BlogCard blog={blog} showImpressions={false} showReport={false} />
<NewsCard news={news} showReport={false} />
```

Use `showComments={false}` to hide the comment action. `UnifiedCard` also accepts
`impressionTargetId`, `impressionTargetType`, `commentTargetId`, `commentTargetType`,
`reportTargetId`, `reportTargetType`, and `reportTargetURL` for custom content types.

## Listing identity cards

Listing cards on `/art` use `UnifiedCard` for the embedded identity block. The
identity is resolved from `listing.vendor` first and falls back to `listing.artist`,
so vendor and artist cards share the same media, metadata, and interaction styling.
Listing-specific gallery, cart, reactions, report, and detail actions remain on the
listing card itself.

## Feed previews

Shared blog, news, listing, and event previews in the social feed use `SharedPreview`,
which renders `UnifiedCard` in compact horizontal mode. Pass a preview object with
`title`, `path` or `href`, and optional `image`, `type`, `summary`, `authorName`,
`authorImage`, `venue`, `price`, and date fields.

## Supported sizes

- `xs`
- `sm`
- `md`
- `lg`

## Supported orientations

- `vertical`
- `horizontal`

The components are intentionally slim and reusable so the same design language can appear in lists, search results, and feed previews without custom layout code.
