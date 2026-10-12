/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/


import Link from "next/link";
import TagSEO from "@/components/TagSEO"

export default function TestIndex() {
	const pageMetaData = {
		title: "Testing Hub",
		description: "Internal testing links and feature sandboxes for Platform.",
		keywords: "testing, sandbox, internal tools",
		robots: "noindex, nofollow",
		og: {
			title: "Testing Hub",
			description: "Internal testing links and feature sandboxes.",
		},
	}

	return (
		<div className="p-4 bg-base-200">
			<TagSEO metadataProp={pageMetaData} canonicalSlug="test" />
			<h2 className="text-2xl font-bold text-primary">
        Links to Portal Resources
			</h2>
			<div className="mt-2">
				<Link href="/test/updateForms" className="link link-primary">
          /test/updateForms
				</Link>
			</div>
			<div className="mt-2">
				<Link href="/test/pictureManagement" className="link link-primary">
				  /test/pictureManagement
				</Link>
			</div>
			<div className="mt-2">
				<Link href="/test/social" className="link link-primary">
				  /test/social
				</Link>
			</div>
			<div className="mt-2">
				<Link href="/test/testtiptap" className="link link-primary">
				  /test/tiptap
				</Link>
			</div>
			<div className="mt-2">
				<Link href="/test/treasury" className="link link-primary">
				  /test/treasury
				</Link>
			</div>
			<div className="mt-2">
<Link href="/test/treasury_stripe" className="link link-primary">
  /test/treasury_stripe
</Link>
</div>
			<div className="mt-2">
				<Link href="/test/costCalculator" className="link link-primary">
				  /test/costCalculator
				</Link>
			</div>
		</div>
	);
}



