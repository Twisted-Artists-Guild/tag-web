/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import Link from "next/link";
import { getServerSession } from "next-auth/next";
import TagSEO from "@/components/TagSEO";
import StaffContextNav from "@/components/portal/StaffContextNav";
import BlogCreditsEditor from "@/components/blog/BlogCreditsEditor";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { isAdmin, isStaff } from "@/utils/authHelpers";
import serverFetch from "@/libs/serverFetch"

function isAuthorRole(session) {
	return !!session?.user?.roles?.includes("author");
}

export default function BlogCreditsByIdPage({ blog }) {
	if (!blog?.blogID) {
		return <div className="p-6">Blog not found.</div>;
	}

	const pageMetaData = {
		title: `Edit Credits: ${blog.title || "Blog"}`,
		description: "Manage credits for a specific blog post.",
		keywords: "blog, credits, manage",
		robots: "no-index, no-follow",
		og: {
			title: `Edit Credits: ${blog.title || "Blog"}`,
			description: "Manage credits for a specific blog post.",
		},
	};

	return (
		<div className="p-4 space-y-4">
			<TagSEO metadataProp={pageMetaData} canonicalSlug="/portal/staff/tagblog/[id]" />

			<div className="rounded-xl border border-base-300 bg-base-100 p-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-xs uppercase tracking-wide text-base-content/60">Blog Credits Editor</p>
						<h1 className="text-xl font-bold">{blog.title || "Untitled Blog"}</h1>
					</div>
					<Link
						href={`/portal/staff/tagblog/${blog.blogID}/update`}
						className="btn btn-outline btn-sm"
					>
						Back To Post Editor
					</Link>
				</div>
			</div>

			<BlogCreditsEditor blogId={blog.blogID} />
		</div>
	);
}

export async function getServerSideProps(context) {
	const session = await getServerSession(context.req, context.res, authOptions);

	if (!session?.user) {
		return {
			redirect: {
				destination: `/api/auth/signin?callbackUrl=${encodeURIComponent(context.resolvedUrl)}`,
				permanent: false,
			},
		};
	}

	if (!isStaff(session) && !isAdmin(session) && !isAuthorRole(session)) {
		return {
			notFound: true,
		};
	}

	const { id } = context.query;
	if (!id) {
		return { notFound: true };
	}

	try {
		const response = await serverFetch(`/blog/${id}`);
		if (!response.ok) {
			return { notFound: true };
		}

		const blog = await response.json();
		return {
			props: {
				blog,
			},
		};
	} catch (error) {
		console.error("Error loading blog for credits editor:", error);
		return { notFound: true };
	}
}
