/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import UnifiedCard from "@/components/cards/UnifiedCard"

function toUniformPlainText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const defaultImage = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"

const normalizeTags = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === "string") return value.split(",").map((tag) => tag.trim()).filter(Boolean)
  return [String(value)]
}

const getBlogIdentity = (data, fallbackImage) => {
  const entity = data.artist || data.user || data.authorArtist || data.authorUser || (typeof data.author === "object" ? data.author : null) || {}
  const isArtist = Boolean(data.artist || data.authorArtist || entity.artistID || entity.artistid || entity.artistPath)
  const isUser = Boolean(data.user || data.authorUser || entity.userID || entity.userid || entity.username)
  const role = isArtist ? "Artist" : isUser ? "User" : "Blog"
  const path = entity.path || entity.slug || entity.username || entity.userName || ""
  const image =
    entity.profilePic?.url ||
    entity.profilePic?.URL ||
    entity.profilePicUrl ||
    entity.profilePicture?.url ||
    entity.profilePicture?.URL ||
    entity.image ||
    entity.avatar ||
    data.authorImage ||
    fallbackImage
  const name =
    entity.name ||
    entity.preferredName ||
    `${entity.firstName || ""} ${entity.lastName || ""}`.trim() ||
    (typeof data.author === "string" ? data.author : "") ||
    data.authorName ||
    "TAG Community"

  return {
    name,
    image,
    role,
    href: path ? `/${isArtist ? "artists" : "user"}/${path}` : "",
    logoEntityType: isArtist ? "artist" : "",
    logoEntityId: entity.artistID || entity.ArtistID || entity.artistid || "",
    logoImage: entity.logoPic?.url || entity.logoPic?.URL || entity.logoPic?.normalizedURL || entity.logoPic?.NormalizedURL || entity.logo?.url || entity.logo?.URL || entity.logoUrl || entity.logoURL || "",
  }
}

const BlogCard = ({
  blog,
  showIdentityGlow = true,
  size = "md",
  orientation = "vertical",
  showImpressions = true,
  showComments = true,
  showReport = true,
  interactionVisibility = null,
}) => {
  const data = blog || {}
  const blogId = data.blogID || data.BlogID || data.id
  const title = toUniformPlainText(data.title || "Untitled blog")
  const summary = data.byline || data.summary || data.description || ""
  const image = data.image || data.coverImage || data.heroImage || defaultImage
  const href = data.href || (data.path ? `/blogs/${data.path}` : "/blogs")
  const identity = getBlogIdentity(data, image)
  const tags = normalizeTags(data.tags || data.categories || data.seoTags)

  return (
    <UnifiedCard
      title={title}
      summary={summary}
      image={image}
      imageAlt={title}
      href={href}
      badge="Blog"
      date={data.created || data.date || data.publishedAt}
      authorName={identity.name}
      authorImage={identity.image}
      authorRole={identity.role}
      logoImage={identity.logoImage}
      logoEntityType={identity.logoEntityType}
      logoEntityId={identity.logoEntityId}
      tags={tags}
      size={size}
      orientation={orientation}
      showIdentityGlow={showIdentityGlow}
      showImpressions={showImpressions}
      showComments={showComments}
      showReport={showReport}
      interactionVisibility={interactionVisibility}
      impressionTargetId={blogId}
      impressionTargetType={4}
      commentTargetId={blogId}
      commentTargetType={3}
      reportTargetId={blogId}
      reportTargetType="Blog"
    />
  )
}

export default BlogCard