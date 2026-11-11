/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { getServerSession } from "next-auth/next";
import TagSEO from "@/components/TagSEO";
import { sanitizeCardHtml } from "@/components/security/sanitize";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { hasPermission, isAdmin } from "@/utils/authHelpers";
import { PERMISSIONS } from "@/utils/permissions";
import serverFetch from "@/libs/serverFetch"

const TEMP_ALLOW_DELETE_WITHOUT_ROLE = false;

export default function StaffTagBlogManage({ blogs = [], isAdminUser = false }) {
	const { data: session } = useSession();
	const [blogList, setBlogList] = useState(blogs);
	const [deletingBlogId, setDeletingBlogId] = useState(null);
	const [deleteError, setDeleteError] = useState("");

	const canDeletePosts = useMemo(() => {
		if (TEMP_ALLOW_DELETE_WITHOUT_ROLE) {
			return true;
		}

		return isAdmin(session) || hasPermission(session, PERMISSIONS.BLOG.DELETE);
	}, [session]);

	const handleDeleteBlog = async (blog) => {
		if (!blog?.blogID) {
			return;
		}

		if (!canDeletePosts) {
			setDeleteError("You do not have permission to delete blog posts.");
			return;
		}

		const confirmed = window.confirm(
			`Delete post \"${blog.title || "Untitled"}\"? This cannot be undone.`
		);

		if (!confirmed) {
			return;
		}

		setDeleteError("");
		setDeletingBlogId(blog.blogID);

		try {
			const response = await fetch(`/api/blog/${blog.blogID}`, {
				method: "DELETE",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				const responseData = await response.json().catch(() => ({}));
				throw new Error(responseData?.message || responseData?.error || `Delete failed with status ${response.status}`);
			}

			setBlogList((prev) => prev.filter((item) => item.blogID !== blog.blogID));
		} catch (error) {
			setDeleteError(error.message || "Delete failed.");
		} finally {
			setDeletingBlogId(null);
		}
	};

	const pageMetaData = {
		title: "Manage Live Blog Posts",
		description: "Admin/author management view for published TAG blog posts.",
		keywords: "tag, blog, manage, update",
		robots: "no-index, no-follow",
		author: "Bobb Shields",
		viewport: "width=device-width, initial-scale=1.0",
		og: {
			title: "Manage Live Blog Posts",
			description: "Admin/author management view for published TAG blog posts.",
		},
	};

	return (
		<div className="p-4 bg-base-200 space-y-4">
			<TagSEO metadataProp={pageMetaData} canonicalSlug="portal/staff/tagblog/manage" />

			<div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
				<h1 className="text-2xl font-bold text-base-content">Manage Live Blog Posts</h1>
				<p className="mt-2 text-xs uppercase tracking-wide text-base-content/60">
					Private-review page is intentionally deferred to a later step.
				</p>
			</div>

			{deleteError && (
				<div className="alert alert-error">
					<span>{deleteError}</span>
				</div>
			)}

			{blogList.length === 0 ? (
				<div className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm text-base-content/75">
					No live blog posts were found for this account.
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{blogList.map((blog) => (
						<article key={blog.blogID} className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
							<p className="text-xs uppercase tracking-[0.18em] text-secondary">Live Blog</p>
							<h2
								className="mt-2 text-xl font-bold text-base-content line-clamp-2"
								dangerouslySetInnerHTML={{ __html: sanitizeCardHtml(blog.title || "Untitled") }}
							></h2>
							<div
								className="mt-2 text-sm text-base-content/70 line-clamp-3"
								dangerouslySetInnerHTML={{ __html: sanitizeCardHtml(blog.byline || "No byline") }}
							></div>
							<p className="mt-3 text-xs text-base-content/60">
								Path: <span className="font-semibold">/{blog.path}</span>
							</p>

							<div className="mt-4 flex flex-wrap items-center gap-3">
								<Link
									href="/blogs/[slug]"
									as={`/blogs/${blog.path}`}
									className="link link-primary font-semibold"
								>
									View Live
								</Link>
								<Link
									href={`/portal/staff/tagblog/${blog.blogID}/update`}
									className="link link-warning font-semibold"
								>
									Edit Post
								</Link>
								<Link
									href="/portal/staff/tagblog/[id]"
									as={`/portal/staff/tagblog/${blog.blogID}`}
									className="link link-secondary font-semibold"
								>
									Edit Credits
								</Link>
								<button
									type="button"
									onClick={() => handleDeleteBlog(blog)}
									className="btn btn-xs btn-error"
									disabled={deletingBlogId === blog.blogID}
								>
									{deletingBlogId === blog.blogID ? "Deleting..." : "Delete"}
								</button>
							</div>

							{isAdminUser && (
								<p className="mt-3 text-xs text-base-content/50">BlogID: {blog.blogID} | Author UserID: {blog.userID}</p>
							)}
						</article>
					))}
				</div>
			)}
		</div>
	);
}

export async function getServerSideProps(context) {
	const session = await getServerSession(context.req, context.res, authOptions);

	if (!session?.user) {
		return {
			redirect: {
				destination: `/api/auth/signin?callbackUrl=${encodeURIComponent("/portal/staff/tagblog/manage")}`,
				permanent: false,
			},
		};
	}

	const isAdminUser = isAdmin(session);
	const isAuthorRole = !!session?.user?.roles?.includes("author");
	const canUpdateBlog = hasPermission(session, PERMISSIONS.BLOG.UPDATE);

	if (!isAdminUser && !isAuthorRole && !canUpdateBlog) {
		return {
			notFound: true,
		};
	}

	let blogs = [];
	try {
		const response = await serverFetch(`/blog`);
		if (response.ok) {
			const payload = await response.json();
			const allBlogs = Array.isArray(payload) ? payload : [];

			blogs = allBlogs;

			blogs = blogs.sort((a, b) => {
				const aTime = new Date(a?.created || 0).getTime();
				const bTime = new Date(b?.created || 0).getTime();
				return bTime - aTime;
			});
		}
	} catch (error) {
		console.error("Error loading live blogs for manage page:", error);
	}

	return {
		props: {
			blogs,
			isAdminUser,
		},
	};
}
