/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/


import React, { useMemo } from "react";
import Link from "next/link";
import GalleryManager from "@/components/gallery/GalleryManager"
import DynaFormDB from "@/components/widgets/DynaFormDB"
import BlogPostSelector from "@/components/blog/blog-post-selector"
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { isAdmin, isStaff } from "@/utils/authHelpers";
import TagSEO from "@/components/TagSEO"
import serverFetch from "@/libs/serverFetch"

const formName = "BlogForm1";

function isAuthorRole(session) {
    return !!session?.user?.roles?.includes("author");
}

/**
 * Component for updating user details.
 * @param {Object} props
 * @param {Object} props.data
 * @param {Object} props.metadata
 * @returns {JSX.Element}
 */
export default function UpdateBlogForm1(props) {
    const enhancedMetadata = useMemo(() => {
        // 1. Handle the case where metadataProp might be an array or object
        const base = Array.isArray(props.metadataProp)
            ? props.metadataProp[0]
            : props.metadataProp;

        if (process.env.NODE_ENV === 'development') {
            console.log('UpdateBlogForm1 props:', { base, blogdata: props.blogdata, id: props.id });
        }

        // If metadata is missing, return null so DynaFormDB shows the error state
        if (!base || Object.keys(base).length === 0) return null;

        // Merge dynamic URL properties
        const blogId = String(props.blogdata?.blogID || "").trim();
        const imageStartPrefix = "platformpics/blog/";
        const imageTargetPrefix = blogId ? `${imageStartPrefix}${blogId}/` : imageStartPrefix;

        return {
            ...base,
            FromURL: `/portal/staff/tagblog/${props.id}/update`,
            redirectURL: props.blogdata?.path ? `/blogs/${props.blogdata.path}` : "/blogs",
            APIURL: `/api/blog/${props.blogdata?.blogID}`,
            imageCategory: 'blogs',
            entityId: props.blogdata?.blogID,
            imageContainer: "tagpictures",
            imageStartPrefix,
            imageTargetPrefix
        };
    }, [props.id, props.blogdata, props.metadataProp]);

    if (props.loadError) {
        return <div className="p-10"><div className="alert alert-error" role="alert">{props.loadError}</div></div>;
    }

    // Only render DynaFormDB if we actually have data, otherwise show a loader
    if (!props.blogdata || !enhancedMetadata) {
        return <div className="p-10 text-center"><span className="loading loading-ghost loading-lg"></span></div>;
    }

    return (
      <div className="p-4">
			<TagSEO metadataProp={{ title: "Update Blog Post", description: "Edit and update an existing blog post.", keywords: "blog, update, staff", robots: "noindex, nofollow", og: { title: "Update Blog Post", description: "Edit and update an existing blog post." } }} canonicalSlug="portal/staff/tagblog/[id]/update" />
            <div className="mb-6">
                <BlogPostSelector currentBlog={props.blogdata} />
                <GalleryManager
                    entityType="blog"
                    entityId={props.blogdata?.blogID}
                    entityLabel={props.blogdata?.path ? `Blog #${props.blogdata.blogID}: ${props.blogdata.path}` : `Blog #${props.blogdata?.blogID}`}
                    currentUser={props.currentUser}
                />
            </div>
            <DynaFormDB
                request="update"
                metadataProp={enhancedMetadata}
                formData={props.blogdata}
            />
            <div className="mt-4 flex justify-end">
                <Link
                    href="/portal/staff/tagblog/[id]"
                    as={`/portal/staff/tagblog/${props.blogdata?.blogID}`}
                    className="btn btn-outline btn-sm"
                >
                    Edit Credits
                </Link>
            </div>
        </div>
    );
}

/**
 * Get initial props for component.
 * @async
 * @param {Object} context
 * @returns {Object}
 */
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
    if (typeof id !== "string" || !/^[1-9]\d*$/.test(id)) {
        return { notFound: true };
    }
    let data = null;
    let metadata = null;
    let loadError = null;
    try {
        const fetchOptions = { headers: { cookie: context.req.headers.cookie || "" } };
        const res1 = await serverFetch(`/blog/${id}`, fetchOptions);
        if (res1.status === 404) {
            return { notFound: true };
        }
        if (!res1.ok) {
            throw new Error(`Blog request failed with status ${res1.status}`);
        }
        data = await res1.json();
        if (!Number.isInteger(data?.blogID) || data.blogID <= 0) {
            throw new Error("Blog response is missing a valid blog ID");
        }

        const metadataResponse = await serverFetch(`/formsmetadata/${formName}`, fetchOptions);
        if (!metadataResponse.ok) {
            throw new Error(`Form metadata request failed with status ${metadataResponse.status}`);
        }
        metadata = await metadataResponse.json();
    } catch (error) {
        console.error("Error fetching form meta or field data:", error);
        loadError = "Unable to load this blog editor. Please refresh the page or sign in again.";
        if (typeof window !== 'undefined') {
            console.log('getInitialProps result:', { data, metadata, id });
        }

    }

    return {
        props: {
            blogdata: data,
            id: id,
            metadataProp: metadata || {},
            loadError,
            currentUser: session.user?.name || session.user?.email || ""
        }
    };
}
