/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
import Link from "next/link";
import TagSEO from "@/components/TagSEO";
import StaffContextNav from "@/components/portal/StaffContextNav";
import VenueOwnerManager from "@/components/portal/VenueOwnerManager";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { isAdmin, isStaff } from "@/utils/authHelpers";

export default function StaffVenuesIndex() {
	const pageMetaData = {
		title: "Staff Venues",
		description: "Assign owners to venues.",
		keywords: "staff, venues, owners, portal",
		robots: "no-index, no-follow",
		og: {
			title: "Staff Venues",
			description: "Assign owners to venues.",
		},
	};

	return (
		<div className="min-h-screen bg-base-200 p-4 md:p-8">
			<TagSEO metadataProp={pageMetaData} canonicalSlug="portal/staff/venues" />
			<StaffContextNav />
			<div className="mx-auto max-w-4xl space-y-6">
				<section className="card bg-base-100 shadow-lg border border-base-300">
					<div className="card-body gap-3">
						<div>
							<p className="text-xs uppercase tracking-widest text-base-content/50">Staff</p>
							<h1 className="text-3xl font-bold text-primary mt-1">Venue Owners</h1>
						</div>
						<p className="text-base-content/75">
							Venues added by staff start without an owner. Find a venue, then add the user who runs it so they can manage it.
							Venues without an owner are marked, and every change is recorded in the audit log.
						</p>
						<div>
							<Link href="/portal/staff" className="btn btn-sm btn-outline">Staff Portal Home</Link>
						</div>
					</div>
				</section>

				<section className="card bg-base-100 shadow border border-base-300">
					<div className="card-body">
						<VenueOwnerManager />
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
				destination: `/api/auth/signin?callbackUrl=${encodeURIComponent("/portal/staff/venues")}`,
				permanent: false,
			},
		};
	}

	if (!isStaff(session) && !isAdmin(session)) {
		return { notFound: true };
	}

	return { props: {} };
}
