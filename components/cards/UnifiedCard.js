/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import Image from "next/image"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { MessageCircleIcon } from "lucide-react"
import {
  CARD_SHELL_CLASS,
  CARD_MEDIA_SIZE_CLASSES,
  CARD_ORIENTATION_CLASSES,
  CARD_SIZE_CLASSES,
} from "@/components/cards/sizes/panel-layout"
import { sanitizeCardHtml } from "@/components/security/sanitize"
import { useImpressions } from "@/hooks/useImpressions"
import { useCommentCount } from "@/hooks/useCommentCount"
import ImpressionReactions from "@/components/social/ImpressionReactions"
import ReportButton from "@/components/moderation/ReportButton"
import PhotoGallery from "@/components/cards/card_photoGallery"

const formatDisplayDate = (dateValue) => {
  if (!dateValue) return ""

  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) {
    return String(dateValue)
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const safeText = (value) => String(value || "").trim()

export default function UnifiedCard({
  title = "Untitled",
  summary = "",
  image = "",
  mediaContent = null,
  galleryImages = [],
  contentWarnings = [],
  imageAlt = "Card media",
  href = "",
  badge = "",
  date = "",
  price = null,
  authorName = "",
  authorImage = "",
  authorRole = "Contributor",
  showAuthor = true,
  authorHref = "",
  enableAuthorLink = false,
  tags = [],
  maxTags = 3,
  size = "md",
  orientation = "vertical",
  compact = false,
  mediaClassName = "",
  className = "",
  titleClassName = "",
  showIdentityGlow = true,
  showImpressions = true,
  showComments = true,
  showReport = true,
  interactionVisibility = null,
  impressionTargetId = "",
  impressionTargetType = 4,
  commentTargetId = impressionTargetId,
  commentTargetType = 4,
  reportTargetId = impressionTargetId,
  reportTargetType = "Blog",
  reportTargetURL = href,
  footer = null,
}) {
  const { data: session } = useSession()
  const normalizedSize = CARD_SIZE_CLASSES[size] ? size : "md"
  const orientationClass = CARD_ORIENTATION_CLASSES[orientation] || CARD_ORIENTATION_CLASSES.vertical
  const mediaClass = CARD_MEDIA_SIZE_CLASSES[normalizedSize] || CARD_MEDIA_SIZE_CLASSES.md
  const headline = safeText(title) || "Untitled"
  const sanitizedSummary = sanitizeCardHtml(summary || "")
  const contributorHref = enableAuthorLink && authorHref ? authorHref : ""
  const visibleTags = Array.isArray(tags) ? tags.slice(0, Math.max(0, Number(maxTags) || 0)).map((tag) => safeText(tag)).filter(Boolean) : []
  const hasPrice = price !== null && price !== undefined && Number(price) > 0
  const formattedPrice = hasPrice ? `$${Number(price).toFixed(2)}` : ""
  const hasImpressionTarget = Number.isInteger(Number(impressionTargetId)) && Number(impressionTargetId) > 0
  const hasCommentTarget = Number.isInteger(Number(commentTargetId)) && Number(commentTargetId) > 0
  const hasReportTarget = Number.isInteger(Number(reportTargetId)) && Number(reportTargetId) > 0
  const shouldShowImpressions = interactionVisibility ? interactionVisibility.impressions === true : showImpressions
  const shouldShowComments = interactionVisibility ? interactionVisibility.comments === true : showComments
  const shouldShowReport = interactionVisibility ? interactionVisibility.report === true : showReport
  const { impressions, loading: impressionsLoading, toggleReaction } = useImpressions(
    impressionTargetId,
    impressionTargetType,
    shouldShowImpressions && hasImpressionTarget
  )
  const { commentCount, loading: commentCountLoading } = useCommentCount(
    commentTargetId,
    commentTargetType,
    shouldShowComments && hasCommentTarget
  )

  const titleNode = href ? (
    <Link href={href} className={`block font-semibold tracking-tight text-primary hover:underline ${titleClassName || "text-lg md:text-xl"}`}>
      <span dangerouslySetInnerHTML={{ __html: sanitizeCardHtml(headline) }} />
    </Link>
  ) : (
    <h3 className={`font-semibold tracking-tight text-primary ${titleClassName || "text-lg md:text-xl"}`} dangerouslySetInnerHTML={{ __html: sanitizeCardHtml(headline) }} />
  )
  const normalizedGalleryImages = Array.isArray(galleryImages)
    ? galleryImages.map((item) => {
        if (typeof item === "string") {
          return { original: item, thumbnail: item }
        }
        if (item && typeof item === "object") {
          const original = item.original || item.url || item.src || item.contentUrl || item.contentURL || item.imageUrl || item.imageURL || item.thumbnail || item.thumbnailURL || item.URL || "/blank_image.png"
          const thumbnail = item.thumbnail || item.thumbnailURL || item.preview || item.previewUrl || item.previewURL || original
          return {
            ...item,
            original,
            thumbnail,
          }
        }
        return { original: "/blank_image.png", thumbnail: "/blank_image.png" }
      })
    : []
  const hasGallery = normalizedGalleryImages.length > 0
  const hasGalleryThumbnails = normalizedGalleryImages.length > 1
  const figureClasses = mediaClassName || (
    orientation === "horizontal"
      ? (compact ? "h-20 w-28 min-w-28 md:w-32 md:min-w-32" : "w-full md:w-36 md:min-w-36 lg:w-40 lg:min-w-40")
      : hasGallery
        ? (compact ? "w-full h-32" : "w-full h-48 md:h-56")
        : "w-full"
  )
  const resolvedMediaContent = mediaContent || (
    hasGallery ? (
      normalizedGalleryImages.length > 1 ? (
        <div className="h-full w-full">
          <PhotoGallery
            images={normalizedGalleryImages}
            mode="standalone"
            navigationMode="hover"
            imageEffect="landscape"
            showThumbnails={true}
            contentWarnings={contentWarnings}
          />
        </div>
      ) : (
        <div className="relative h-full w-full">
          <Image
            src={normalizedGalleryImages[0].original || image || "/blank_image.png"}
            alt={imageAlt || headline}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      )
    ) : (
      image ? (
        <Image
          src={image}
          alt={imageAlt || headline}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 hover:scale-105"
        />
      ) : null
    )
  )

  return (
    <article className={`${CARD_SHELL_CLASS.replace(" h-full", "")} ${compact ? "rounded-box shadow-sm" : ""} self-start ${className} overflow-hidden`}>
      <div className={`flex h-full ${orientationClass}`}>
        {(resolvedMediaContent) && (
          <figure className={`relative ${hasGalleryThumbnails ? "overflow-visible" : "overflow-hidden"} bg-base-200 ${figureClasses} ${compact && orientation !== "horizontal" ? "h-32" : ""} ${!compact ? mediaClass : ""}`}>
            {resolvedMediaContent}
          </figure>
        )}

        <div className={`card-body min-w-0 flex-1 ${compact ? "gap-2 p-3" : CARD_SIZE_CLASSES[normalizedSize] || CARD_SIZE_CLASSES.md}`}>
          {(badge || date) && (
            <div className="flex min-w-0 items-center justify-between gap-2 text-[11px] uppercase tracking-[0.12em] text-base-content/60">
              {badge ? <span className="badge badge-outline badge-sm shrink-0">{badge}</span> : <span />}
              {date ? <time className="shrink-0 whitespace-nowrap text-right" dateTime={String(date)}>{formatDisplayDate(date)}</time> : null}
            </div>
          )}

          <div className="space-y-2">
            {titleNode}
            {summary ? (
              <div
                className={`${compact ? "text-xs" : "text-sm"} leading-relaxed text-base-content/80 ${compact ? "line-clamp-2" : "line-clamp-3"}`}
                dangerouslySetInnerHTML={{ __html: sanitizedSummary }}
              />
            ) : null}
          </div>

          {hasPrice && (
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1.5 shadow-sm">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">Price</span>
              <span className="text-sm font-black tracking-tight text-primary">{formattedPrice}</span>
            </div>
          )}

          {visibleTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {visibleTags.map((tag) => (
                <span key={tag} className="badge badge-ghost badge-sm">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {showAuthor && (authorName || authorImage) && (
            <div className={`${compact ? "gap-2 p-2" : "gap-3 p-2.5"} mt-auto flex items-center rounded-box border border-base-300 bg-base-100/80`}>
              {authorImage && (
                <div className="avatar">
                  <div
                    className={`relative ${compact ? "h-8 w-8" : "h-10 w-10"} overflow-hidden rounded-full border ${showIdentityGlow ? "shadow-[0_0_0_2px_rgba(168,85,247,0.25)]" : "border-base-300"}`}
                  >
                    {contributorHref ? (
                      <Link href={contributorHref} aria-label={`View ${authorName || "contributor"} profile`} className="block h-full w-full">
                        <Image src={authorImage} alt={authorName || "Author avatar"} fill sizes={compact ? "32px" : "40px"} className="object-cover" />
                      </Link>
                    ) : (
                      <Image src={authorImage} alt={authorName || "Author avatar"} fill sizes={compact ? "32px" : "40px"} className="object-cover" />
                    )}
                  </div>
                </div>
              )}
              <div className="min-w-0">
                {authorName && (
                  contributorHref ? (
                    <Link href={contributorHref} className="block truncate text-sm font-semibold text-base-content hover:underline">
                      {authorName}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-semibold text-base-content">{authorName}</p>
                  )
                )}
                <p className="text-[10px] uppercase tracking-[0.12em] text-base-content/60">{authorRole}</p>
              </div>
            </div>
          )}

          {(shouldShowImpressions && hasImpressionTarget || shouldShowComments && hasCommentTarget || shouldShowReport && hasReportTarget) && (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-base-300 pt-3">
              {shouldShowImpressions && hasImpressionTarget ? (
                impressionsLoading ? (
                  <div className="text-xs text-base-content/50">Loading reactions...</div>
                ) : impressions.length > 0 ? (
                  <ImpressionReactions
                    impressions={impressions}
                    currentUser={session?.user || null}
                    onToggle={toggleReaction}
                    readOnly={false}
                    size="sm"
                    showDetails={false}
                    targetId={impressionTargetId}
                    targetType={String(impressionTargetType)}
                  />
                ) : (
                  <div className="text-xs text-base-content/50">No reactions yet</div>
                )
              ) : <span />}

              {shouldShowComments && hasCommentTarget ? (
                <Link
                  href={`${href || "#"}#comments-section`}
                  className="btn btn-sm btn-outline flex-1 justify-center gap-2"
                  title="View comments"
                >
                  <MessageCircleIcon className="h-4 w-4" />
                  <span>
                    {commentCountLoading ? "..." : Number(commentCount) || 0} comment{(Number(commentCount) || 0) !== 1 ? "s" : ""}
                  </span>
                </Link>
              ) : null}

              {shouldShowReport && hasReportTarget ? (
                <ReportButton
                  targetId={reportTargetId}
                  targetType={reportTargetType}
                  targetURL={reportTargetURL}
                />
              ) : null}
            </div>
          )}

          {footer}
        </div>
      </div>
    </article>
  )
}
