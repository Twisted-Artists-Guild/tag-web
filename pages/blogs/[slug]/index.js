/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/


import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react"
import longDateOptions from "@/utils/longdateoptions"
import TagSEO from "@/components/TagSEO"
import PhotoGallery from "@/components/cards/card_photoGallery"
import DynamicComments, { CommentTargetType } from "@/components/social/DynamicComments"
import ImpressionReactions from "@/components/social/ImpressionReactions"
import { useImpressions, ImpressionTargetType } from "@/hooks/useImpressions"
import { useCommentCount } from "@/hooks/useCommentCount"
import { defaultFieldClass } from "@/utils/formSettings"
import { PERMISSIONS } from "@/utils/permissions";
import { hasPermission } from "@/utils/authHelpers";
import { sanitizeDefaultHtml, sanitizeCardHtml } from "@/components/security/sanitize";
import serverFetch from "@/libs/serverFetch"

function pickField(record, ...keys) {
	for (const key of keys) {
		const value = record?.[key];
		if (value !== undefined && value !== null) {
			return value;
		}
	}

	return undefined;
}



function formatCompactNumber(value, fallback = 0) {
	const numeric = Number(value);
	const safeValue = Number.isFinite(numeric) ? numeric : fallback;
	if (safeValue >= 1000) {
		return `${(safeValue / 1000).toFixed(1).replace(/\.0$/, "")}k`;
	}
	return String(Math.max(0, Math.floor(safeValue)));
}

function stripHtmlTags(value) {
	return String(value || "")
		.replace(/<[^>]*>/g, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function slugifySectionTitle(value) {
	return stripHtmlTags(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 72);
}

function addSectionAnchors(html) {
	const seen = new Map();

	return String(html || "").replace(/<h3(\s[^>]*)?>([\s\S]*?)<\/h3>/gi, (match, attributes = "", innerHtml = "") => {
		if (/\sid=\s*"[^"]+"/i.test(match)) {
			return match;
		}

		const baseSlug = slugifySectionTitle(innerHtml) || "section";
		const nextCount = (seen.get(baseSlug) || 0) + 1;
		seen.set(baseSlug, nextCount);
		const uniqueSlug = nextCount === 1 ? baseSlug : `${baseSlug}-${nextCount}`;

		return `<h3${attributes} id="section-${uniqueSlug}">${innerHtml}</h3>`;
	});
}

const BlogByslug = props => {
	const { data: session } = useSession();
	const [mounted, setMounted] = useState(false)
	const blog = props.blog
	const blogRichtext = {
		title: pickField(blog, "titleRichtext", "TitleRichtext") || blog?.title || "",
		byline: pickField(blog, "bylineRichtext", "BylineRichtext") || blog?.byline || "",
		body: pickField(blog, "bodyRichtext", "BodyRichtext") || blog?.body || "",
	}
	const seoKeywords = `blog, post, article, ${blog.searchterms}`
	const canonicalSlug = `blogs/${blog.path}`
	const hasBlankCover = !blog?.image || blog.image === "/blank_image.png"

	useEffect(() => {
		const frameId = window.requestAnimationFrame(() => setMounted(true))
		return () => window.cancelAnimationFrame(frameId)
	}, [])

	const canUpdate = hasPermission(session, PERMISSIONS.BLOG.UPDATE);
	
	// Get the blog ID - try multiple property names
	const blogId = blog?.blogID || blog?.id || blog?.BlogID;
	
	// Add impressions hook
	const { 
		impressions, 
		loading: impressionsLoading,
		toggleReaction
	} = useImpressions(
		blogId, 
		ImpressionTargetType.BLOG,
		!!blogId && mounted // Only fetch when blog ID exists and component is mounted
	);
	
	// Debug logging (remove after testing)
	useEffect(() => {
		console.log('Blog impressions debug:', {
			blogId,
			impressions,
			impressionsLoading,
			mounted
		});
	}, [blogId, impressions, impressionsLoading, mounted]);
	
	const relatedGalleryImages = Array.isArray(blog?.gallery?.galleryItems)
		? blog.gallery.galleryItems
			.sort((a, b) => (Number(a?.sortOrder) || 0) - (Number(b?.sortOrder) || 0))
			.map((item) => {
				const picture = item.picture;
				const video = item.video;
				const url = picture?.url || video?.thumbnailURL || video?.url || "/blank_image.png";
				const thumbnailURL = picture?.thumbnailURL || video?.thumbnailURL || url;
				
				return {
					original: thumbnailURL,
					thumbnail: thumbnailURL,
					mediaType: picture ? "picture" : "video",
					sourceURL: picture?.url || video?.url || "",
					embedURL: picture?.embedURL || video?.embedURL || "",
					description: item.captionOverride || picture?.description || video?.description || picture?.title || video?.title || "",
					byline: picture?.byline || video?.byline || "",
					altText: picture?.altText || "",
				};
			})
		: [];
	
	const { 
		commentCount: apiCommentCount,
		loading: commentCountLoading
	} = useCommentCount(
		blogId, 
		CommentTargetType.BLOG,
		!!blogId && mounted
	);

	const commentCount = apiCommentCount ?? blog?.commentCount ?? 0;
	const viewCount = blog?.viewCount ?? blog?.views ?? 3200;

	const pageMetaData = {
		title: blog.title,
		description: blog.byline,
		keywords: seoKeywords,
		robots: "index, follow",
		author: blog.title,
		viewport: "width=device-width, initial-scale=1.0",
		 og: {
			title: blog.title,
			description: blog.byline,
			image: blog.image,
		},
	}

	return (
		/* suppressHydrationWarning prevents React from logging a hydration mismatch for this subtree.
		   We also only render the rich `body` HTML after mount to avoid SSR/CSR mismatch. */
		
		<div className="flex flex-col items-center min-h-screen w-full py-8 gap-8" suppressHydrationWarning>
			<style jsx global>{`
				.blog-rich-content h3,
				.blog-rich-content h4,
				.blog-rich-content h5 {
					margin: 0.85em 0 0.45em;
					line-height: 1.2;
				}

				.blog-rich-content h3 {
					font-size: 1.7rem;
					font-weight: 700;
					letter-spacing: -0.015em;
				}

				.blog-rich-content h4 {
					font-size: 1.35rem;
					font-weight: 700;
					letter-spacing: 0.01em;
					text-transform: uppercase;
				}

				.blog-rich-content h5 {
					font-size: 1.1rem;
					font-weight: 600;
					letter-spacing: 0.04em;
					text-transform: uppercase;
				}

				.blog-rich-content ul,
				.blog-rich-content ol {
					margin: 0.85em 0;
					padding-left: 1.75rem;
				}

				.blog-rich-content ul {
					list-style: disc;
				}

				.blog-rich-content ol {
					list-style: decimal;
				}

				.blog-rich-content li {
					margin: 0.3em 0;
				}

				.blog-rich-content li > p {
					margin: 0;
				}

				.blog-rich-content img[style*="text-align: left"],
				.blog-rich-content iframe[style*="text-align: left"] {
					display: block;
					margin-left: 0;
					margin-right: auto;
				}

				.blog-rich-content img[style*="text-align: center"],
				.blog-rich-content iframe[style*="text-align: center"] {
					display: block;
					margin-left: auto;
					margin-right: auto;
				}

				.blog-rich-content img[style*="text-align: right"],
				.blog-rich-content iframe[style*="text-align: right"] {
					display: block;
					margin-left: auto;
					margin-right: 0;
				}

				.reaction-scroll > div {
					display: grid;
					grid-template-columns: repeat(6, minmax(0, 1fr));
					gap: 0.4rem;
					align-items: start;
					max-height: 6.2rem;
					overflow-y: auto;
					padding-right: 0.25rem;
				}

				.reaction-scroll > div > * {
					justify-self: stretch;
				}
			`}</style>
			<TagSEO metadataProp={pageMetaData} canonicalSlug={canonicalSlug} />
			<div className="w-[75%] rounded-box border border-base-300 bg-base-100 p-4 md:p-6 space-y-6 shadow-sm">
				<div className="relative w-full overflow-hidden rounded-box border border-base-300 bg-base-200" style={{ aspectRatio: "16/9" }}>
					<Image
						src={blog.image || "/blank_image.png"}
						alt={stripHtmlTags(blog.title) || "Blog cover image"}
						fill
						sizes="(max-width: 1024px) 100vw, 75vw"
						className="object-cover"
					/>
					{hasBlankCover && (
						<div className="absolute inset-0 flex items-center justify-center bg-base-300/40">
							<span className="rounded-md bg-base-100/85 px-3 py-1 text-sm font-semibold uppercase tracking-wide text-base-content">
								Cover Photo
							</span>
						</div>
					)}
				</div>

				<div className="rounded-box border border-base-300 bg-base-200/40 p-4">
					<h1 className="font-poiret text-5xl md:text-7xl shadow-text">
						{stripHtmlTags(blogRichtext.title || props.blog.title) || "Untitled"}
					</h1>
					<div
						className="font-fredoka pt-2"
						dangerouslySetInnerHTML={{ __html: sanitizeCardHtml(blogRichtext.byline || props.blog.byline) }}
					></div>
					<div className="font-baloo pt-2 text-xs shadow-dark">{props.blog.formattedCreated}</div>
				</div>

				{mounted ? (
					<>
						<div className="space-y-4">
							{relatedGalleryImages.length > 0 ? (
								<div className="w-full">
									<PhotoGallery
										images={relatedGalleryImages}
										mode="standalone"
										navigationMode={relatedGalleryImages.length > 1 ? "hover" : "manual"}
										imageEffect="landscape"
										showThumbnails={relatedGalleryImages.length > 1}
										showContentWarnings={false}
									/>
								</div>
							) : (
								<div className="rounded-box border border-base-300 bg-base-200/40 p-4 text-sm text-base-content/70">
									Gallery pending...
								</div>
							)}
						</div>

						<div className="rounded-box border border-base-300 bg-base-200/40 p-4">
							<div className="mb-3 flex flex-wrap items-center gap-4 text-sm font-semibold">
								<span>👁 {formatCompactNumber(viewCount)} views</span>
								<a href="#comments-section" className="link link-primary">
									💬 {commentCountLoading ? '...' : formatCompactNumber(commentCount)} comments
								</a>
							</div>
							<div className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/60">
								Reactions {blogId && `(Blog ID: ${blogId})`}
							</div>
							<div className="reaction-scroll">
								{!impressionsLoading && impressions && impressions.length > 0 ? (
									<ImpressionReactions
										impressions={impressions}
										currentUser={session?.user}
										onToggle={toggleReaction}
										readOnly={false}
										size="md"
										showDetails={true}
										targetId={blogId}
										targetType="blog"
									/>
								) : impressionsLoading ? (
									<div className="text-sm text-base-content/50">Loading reactions...</div>
								) : blogId ? (
									<div className="text-sm text-base-content/50">
										No reactions available for blog {blogId}
									</div>
								) : (
									<div className="text-sm text-base-content/50">
										Blog ID not found
									</div>
								)}
							</div>
						</div>

						<div
							className="blog-rich-content font-fredoka rounded-box border border-base-300 bg-base-100 p-6 md:p-8 space-y-6"
							dangerouslySetInnerHTML={{ __html: sanitizeDefaultHtml(addSectionAnchors(String(blogRichtext.body || ""))) }}
						>
						</div>
					</>
				) : (
					<div className="font-fredoka rounded-box border border-base-300 bg-base-100 p-6 md:p-8 shadow-sm text-sm text-base-content/70">
						Gallery pending...
					</div>
				)}
			</div>

			{mounted && canUpdate && (
			<Link
				href="/portal/staff/tagblog/[slug]/update"
				as={`/portal/staff/tagblog/${props.slug}/update`}
				className={`${defaultFieldClass} font-fredoka text-xl text-[#e9ecef] transition hover:tracking-wider hover:text-transparent hover:bg-linear-to-r from-[#f1c0e8] to-[#8EECF5] hover:font-bold`}
			>
				Update this blog
			</Link>
			)}

			{/* Comments Section - Updated to use DynamicComments */}
			<div id="comments-section" className="w-[75%] rounded-box border border-base-300 bg-base-100 p-4">
				<div className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/60">Comments</div>
				{blogId ? (
					<DynamicComments
						targetId={blogId}
						targetType={CommentTargetType.BLOG}
						allowMedia={true}
						enabled={true}
					/>
				) : (
					<div className="alert alert-warning">
						<span>Unable to load comments. Blog ID: {JSON.stringify({ blogID: blog?.blogID, id: blog?.id })}</span>
					</div>
				)}
			</div>
		</div>
		
	)
}

BlogByslug.getInitialProps = async function (context) {
	const {slug} = context.query
  
	if (process.env.DEBUG === "true") {
		console.log (`Fetching blog: ${slug}, path: ${context.pathname}`)
	} 

	const res = await serverFetch(`/blog/path/${slug}`)
	const data = await res.json ()
	
	const blogData = Array.isArray(data) ? data[0] : data;

	let formattedCreated = "";
	try {
		const createdDate = new Date(blogData.created);
		formattedCreated = createdDate.toLocaleDateString("en-US", longDateOptions);
	} catch {
		formattedCreated = blogData.created || "";
	}

	if (process.env.DEBUG === "true") {
		console.log(`blog data fetched.`, blogData)
	} 

	return {
		blog: {
			...blogData,
			formattedCreated,
		},
		slug: slug,
	}
}

export default BlogByslug


