/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MessageCircleIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useImpressions, ImpressionTargetType } from '@/hooks/useImpressions'
import { useCommentCount } from '@/hooks/useCommentCount'
import { CommentTargetType } from '@/hooks/useComments'
import ImpressionReactions from '@/components/social/ImpressionReactions'
import { getSeededStockPhoto } from '@/utils/stockPhotos'
import { sanitizeCardHtml } from '@/components/security/sanitize'
import longDateOptions from '@/utils/longdateoptions'
import ReportButton from "@/components/moderation/ReportButton"
import { getIdentityGlowStyle } from '@/utils/identityGlow'

function toUniformPlainText(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const MOCK_ARTIST_NAME = "Artist Goes Here"

const BlogCard = ({ blog, showIdentityGlow = true }) => {
  const { data: session } = useSession()
  const [showComments, setShowComments] = useState(false)
  
  const blogId = blog?.blogID || blog?.id || blog?.BlogID
  
  // Fetch impressions
  const { 
    impressions, 
    loading: impressionsLoading,
    toggleReaction
  } = useImpressions(
    blogId, 
    ImpressionTargetType.BLOG,
    !!blogId
  )
  
  // Fetch comment count
  const { 
    commentCount,
    loading: commentCountLoading
  } = useCommentCount(
    blogId, 
    CommentTargetType.BLOG,
    !!blogId
  )
  
  const uniformCardTitle = toUniformPlainText(blog.title)
  const uniformCardByline = sanitizeCardHtml(blog.byline)
  
  return (
    <div
      key={blog.path}
      className="card bg-base-200 text-base-content shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out group"
    >
      <figure className="relative h-48 w-full">
        <Image
          src={blog.image || getSeededStockPhoto(blog.path)}
          alt="Blog post cover image"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{ objectFit: "cover" }}
          className="rounded-t-box group-hover:scale-105 transition-transform duration-300"
        />
      </figure>
      <div className="card-body p-6">
        <div className="flex justify-end">
          <span
            className="text-xs text-base-content/60"
            suppressHydrationWarning
          >
            {new Date(blog.created).toLocaleDateString("en-US", longDateOptions)}
          </span>
        </div>
        <div>
          <Link
            href="/blogs/[slug]"
            as={`/blogs/${blog.path}`}
            className="card-title w-full text-2xl text-primary hover:underline"
          >
            {uniformCardTitle || "Untitled"}
          </Link>
        </div>
        <div 
          className="text-lg text-base-content/80 line-clamp-3" 
          dangerouslySetInnerHTML={{ __html: uniformCardByline }}
        />

        <div className="mt-3 flex items-center gap-3 rounded-box border border-base-300 bg-base-100 p-3">
          <div className="avatar">
            <div
              className={`relative h-12 w-12 rounded-full overflow-hidden border ${showIdentityGlow ? "" : "border-base-300"}`}
              style={showIdentityGlow ? getIdentityGlowStyle(blog, { type: "artist" }) : undefined}
            >
              <Image
                src={blog.image || getSeededStockPhoto(`${blog.path}-artist`)}
                alt={`${MOCK_ARTIST_NAME} avatar`}
                fill
                sizes="48px"
                style={{ objectFit: "cover" }}
              />
            </div>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-base-content">{MOCK_ARTIST_NAME}</p>
            <p className="text-xs uppercase tracking-wide text-base-content/60">Gallery</p>
          </div>
        </div>
        
        {/* Impressions Section */}
        <div className="relative mt-4 border-t border-base-300 pt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            {!impressionsLoading && impressions && impressions.length > 0 ? (
              <ImpressionReactions
                impressions={impressions}
                currentUser={session?.user}
                onToggle={toggleReaction}
                readOnly={false}
                size="sm"
                showDetails={false}
                targetId={blogId}
                targetType="blog"
              />
            ) : impressionsLoading ? (
              <div className="text-xs text-base-content/50">Loading reactions...</div>
            ) : (
              <div className="text-xs text-base-content/50">No reactions yet</div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-4 space-y-2">
          <Link
            href={`/blogs/${blog.path}#comments-section`}
            className="btn btn-sm btn-outline w-full justify-center gap-2"
            title="View comments"
          >
            <MessageCircleIcon className="w-4 h-4" />
            <span>
              {commentCountLoading ? '...' : (Number(commentCount) || 0)} comment{(Number(commentCount) || 0) !== 1 ? 's' : ''}
            </span>
          </Link>
        </div>

        {/* Report Button - Always visible */}
        <div className="mt-4">
          <ReportButton 
            targetId={blogId}
            targetType="blog"
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
}

export default BlogCard