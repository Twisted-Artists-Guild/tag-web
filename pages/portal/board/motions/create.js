import DynaFormDB from "@/components/widgets/DynaFormDB";
import React, { useMemo } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { isAdmin, isStaff } from "@/utils/authHelpers";
import TagSEO from "@/components/TagSEO";
import BoardContextNav from "@/components/portal/BoardContextNav";
import serverFetch from "@/libs/serverFetch"

const formName = "CreateMotionForm"; // Make sure to configure this form in the DB metadata editor

export default function CreateMotionForm(props) {
    const { sessionUser } = props;

    // We enhance data similar to blogs but inject the user explicitly
    const enhancedMetadata = useMemo(() => {
        const base = props.metadataProp || { APIURLpostfix: "motions", RequestType: "add" };
        const resolvedApiUrl = `/api/motions`;

        return {
            ...base,
            FromURL: "/portal/board/motions/create",
            redirectURL: "/portal/board/motions",
            APIURL: resolvedApiUrl,
            entityId: "new"
        };
    }, [props.metadataProp]);

    // FIX: Wrap the prefilledData in useMemo so it doesn't trigger Form resets
    const prefilledData = useMemo(() => {
        return { 
            proposedById: sessionUser?.id ? parseInt(sessionUser.id) : 0 
        };
    }, [sessionUser]);

    return (
        <div className="p-4 pt-12 bg-base-200 min-h-screen">
            <TagSEO metadataProp={{ title: "Propose Motion" }} canonicalSlug="portal/board/motions/create" />
            
            <BoardContextNav />
            
            <div className="max-w-4xl mx-auto mt-8 bg-base-100 p-8 rounded-box shadow border border-base-300">
                <h1 className="text-3xl font-bold text-primary mb-6">Create New Motion</h1>
                <DynaFormDB request="add" metadataProp={enhancedMetadata} formData={prefilledData} />
            </div>
        </div>
    );
}

export async function getServerSideProps(context) {
    const session = await getServerSession(context.req, context.res, authOptions);
    if (!session?.user) return { redirect: { destination: `/api/auth/signin`, permanent: false } };
    if (!isStaff(session) && !isAdmin(session)) return { notFound: true };
    // TODO(board-permission-role): Restore board-specific create permission checks when board roles are available.

    let metadata = {};
    try {
        let res = await serverFetch(`/formsmetadata/${formName}`);
        if (!res.ok) res = await serverFetch(`/forms_metadata/${formName}`);
        if (res.ok) metadata = await res.json();
    } catch (e) { }

    return { props: { metadataProp: metadata, sessionUser: session.user } };
}