/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import UnifiedCard from "@/components/cards/UnifiedCard"

const defaultImage = "https://tagstatic.blob.core.windows.net/pexels/pexels-markus-winkler-1430818-3812433-merchandiseclothingrack.jpg"

const normalizeTags = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === "string") return value.split(",").map((tag) => tag.trim()).filter(Boolean)
  return [String(value)]
}

const getNewsIdentity = (data, fallbackImage) => {
  const entity = data.artist || data.user || data.authorArtist || data.authorUser || (typeof data.author === "object" ? data.author : null) || {}
  const isArtist = Boolean(data.artist || data.authorArtist || entity.artistID || entity.artistid || entity.artistPath)
  const isUser = Boolean(data.user || data.authorUser || entity.userID || entity.userid || entity.username)
  const role = isArtist ? "Artist" : isUser ? "User" : "News"
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
    "TAG News"

  return {
    name,
    image,
    role,
    href: path ? `/${isArtist ? "artists" : "user"}/${path}` : "",
  }
}

export default function NewsCard({
  news,
  size = "md",
  orientation = "vertical",
  showIdentityGlow = true,
  showImpressions = true,
  showComments = true,
  showReport = true,
  interactionVisibility = null,
}) {
  const article = news || {}
  const articleId = article.blogID || article.BlogID || article.id
  const href = article.href || (article.path || article.slug ? `/news/${article.path || article.slug}` : "/news")
  const title = article.title || article.headline || "TAG News Story"
  const summary = article.summary || article.description || article.byline || ""
  const image = article.image || article.heroImage || article.coverImage || defaultImage
  const identity = getNewsIdentity(article, article.logo || image)
  const date = article.date || article.publishedAt || article.createdAt || article.created
  const tags = normalizeTags(article.tags || article.categories || article.seoTags)

  return (
    <UnifiedCard
      title={title}
      summary={summary}
      image={image}
      imageAlt={title}
      href={href}
      badge="News"
      date={date}
      authorName={identity.name}
      authorImage={identity.image}
      authorRole={identity.role}
      tags={tags}
      size={size}
      orientation={orientation}
      showIdentityGlow={showIdentityGlow}
      showImpressions={showImpressions}
      showComments={showComments}
      showReport={showReport}
      interactionVisibility={interactionVisibility}
      impressionTargetId={articleId}
      impressionTargetType={4}
      commentTargetId={articleId}
      commentTargetType={4}
      reportTargetId={articleId}
      reportTargetType="Blog"
    />
  )
}
