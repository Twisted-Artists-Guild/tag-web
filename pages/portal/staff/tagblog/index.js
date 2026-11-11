/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import React, { useMemo } from "react";
import { getServerSession } from "next-auth/next";
import DynaFormDB from "@/components/widgets/DynaFormDB";
import BlogPostSelector from "@/components/blog/blog-post-selector";
import TagSEO from "@/components/TagSEO";
import StaffContextNav from "@/components/portal/StaffContextNav";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { isAdmin, isStaff } from "@/utils/authHelpers";
import serverFetch from "@/libs/serverFetch"

const formName = "BlogForm1";

function isAuthorRole(session) {
	return !!session?.user?.roles?.includes("author");
}

export default function StaffTagBlogSuggestion(props) {
	const enhancedMetadata = useMemo(() => {
		const base = Array.isArray(props.metadataProp)
			? props.metadataProp[0]
			: props.metadataProp;

		if (!base || Object.keys(base).length === 0) {
			return null;
		}

		const imageStartPrefix = "platformpics/blog/";
		const apiPostfix = base.apiurlpostfix || base.APIURLpostfix || base.apiurLpostfix || "blog";
		const normalizedPostfix = String(apiPostfix).replace(/^\/+/, "");
		const resolvedApiUrl = base.APIURL || `/api/${normalizedPostfix}`;

		return {
			...base,
			FromURL: "/portal/staff/tagblog/index.js",
			redirectURL: "/blogs/",
			APIURL: resolvedApiUrl,
			imageCategory: "blogs",
			entityId: "new",
			imageContainer: "tagpictures",
			imageStartPrefix,
			imageTargetPrefix: imageStartPrefix,
		};
	}, [props.metadataProp]);

	const pageMetaData = {
		title: "Staff Blog Suggestions",
		description: "Submit blog post suggestions for TAG editorial review.",
		keywords: "tag, blog, suggestion, staff",
		robots: "no-index, no-follow",
		author: "Bobb Shields",
		viewport: "width=device-width, initial-scale=1.0",
		og: {
			title: "Staff Blog Suggestions",
			description: "Submit blog post suggestions for TAG editorial review.",
		},
	};

	if (!enhancedMetadata) {
		return (
			<div className="p-10 text-center">
				<span className="loading loading-ghost loading-lg"></span>
			</div>
		);
	}

	return (
		<div className="p-4 space-y-4 bg-base-200">
			<TagSEO metadataProp={pageMetaData} canonicalSlug="portal/staff/tagblog" />				<StaffContextNav />
			<div className="rounded-xl border border-warning/30 bg-base-100 p-4 shadow-sm">
				<h1 className="text-2xl font-bold text-base-content">Blog Post Suggestion Form</h1>
				<p className="mt-2 text-sm text-base-content/75">
					Suggestions submit as normal blog records and include your user ID from session.
				</p>
				<p className="mt-2 text-xs uppercase tracking-wide text-warning">
					TODO: Add explicit draft mode/status workflow before private-review publishing.
				</p>
			</div>

			<BlogPostSelector />
			<DynaFormDB request="add" metadataProp={enhancedMetadata} formData={null} />
		</div>
	);
}

export async function getServerSideProps(context) {
	const session = await getServerSession(context.req, context.res, authOptions);

	if (!session?.user) {
		return {
			redirect: {
				destination: `/api/auth/signin?callbackUrl=${encodeURIComponent("/portal/staff/tagblog")}`,
				permanent: false,
			},
		};
	}

	if (!isStaff(session) && !isAdmin(session) && !isAuthorRole(session)) {
		return {
			notFound: true,
		};
	}

	let metadata = {};
	try {
		let res = await serverFetch(`/formsmetadata/${formName}`);
		if (!res.ok) {
			res = await serverFetch(`/forms_metadata/${formName}`);
		}
		if (res.ok) {
			metadata = await res.json();
		}
	} catch (error) {
		console.error("Error fetching form metadata for staff tagblog index:", error);
	}

	return {
		props: {
			metadataProp: metadata,
		},
	};
}
