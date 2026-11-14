/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
import Link from "next/link";
import TagSEO from "@/components/TagSEO";
import StaffContextNav from "@/components/portal/StaffContextNav";
import VenueCategoryManager from "@/components/portal/VenueCategoryManager";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { isAdmin, isStaff } from "@/utils/authHelpers";

export default function StaffVenueCategoriesIndex() {
	const pageMetaData = {
		title: "Staff Venue Categories",
		description: "Manage the list of venue categories.",
		keywords: "staff, venues, categories, portal",
		robots: "no-index, no-follow",
		og: {
			title: "Staff Venue Categories",
			description: "Manage the list of venue categories.",
		},
	};

	return (
		<div className="min-h-screen bg-base-200 p-4 md:p-8">
			<TagSEO metadataProp={pageMetaData} canonicalSlug="portal/staff/venue-categories" />
			<StaffContextNav />
			<div className="mx-auto max-w-4xl space-y-6">
				<section className="card bg-base-100 shadow-lg border border-base-300">
					<div className="card-body gap-3">
						<div>
							<p className="text-xs uppercase tracking-widest text-base-content/50">Staff</p>
							<h1 className="text-3xl font-bold text-primary mt-1">Venue Categories</h1>
						</div>
						<p className="text-base-content/75">
							Categories describe what kind of space a venue is, and visitors use them to filter venues.
							Categories are never deleted: deactivating one keeps it on the venues that already use it,
							but it can no longer be chosen for other venues. Renaming keeps the filter key, so shared links keep working.
						</p>
						<div>
							<Link href="/portal/staff" className="btn btn-sm btn-outline">Staff Portal Home</Link>
						</div>
					</div>
				</section>

				<section className="card bg-base-100 shadow border border-base-300">
					<div className="card-body">
						<VenueCategoryManager />
					</div>
				</section>
			</div>
		</div>
	);
}

export async function getServerSideProps(context) {
	const session = await getServerSession(context.req, context.res, authOptions);

	if (!session?.user) {
		return {
			redirect: {
				destination: `/api/auth/signin?callbackUrl=${encodeURIComponent("/portal/staff/venue-categories")}`,
				permanent: false,
			},
		};
	}

	if (!isStaff(session) && !isAdmin(session)) {
		return { notFound: true };
	}

	return { props: {} };
}
