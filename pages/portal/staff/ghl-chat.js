import Link from "next/link"
import CrmSocialChat from "@/components/ghl/CrmSocialChat"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { isAdmin, isStaff } from "@/utils/authHelpers"
import TagSEO from "@/components/TagSEO"
import StaffContextNav from "@/components/portal/StaffContextNav"

export default function GHLChatPage() {
  return (
    <div className="min-h-screen bg-base-200 p-4 md:p-6">
			<TagSEO metadataProp={{ title: "GHL Staff Chat", description: "Internal GoHighLevel staff chat workspace.", robots: "noindex, nofollow", keywords: "staff, crm, chat", og: { title: "GHL Staff Chat", description: "Internal GoHighLevel staff chat workspace." } }} canonicalSlug="portal/staff/ghl-chat" />
      <StaffContextNav />
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                GoHighLevel Social Messaging
              </p>
              <h1 className="mt-2 text-3xl font-bold text-base-content md:text-4xl">
                TAG Company Chat Interface
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-base-content/70 md:text-base">
                This workspace is our company GoHighLevel inbox for conversations coming from connected social media and CRM messaging channels. Staff can review active threads and send outbound replies from one place.
              </p>
            </div>
            <Link
              href="/portal/staff/ghl-index"
              className="inline-flex items-center justify-center rounded-md border border-base-300 bg-base-200 px-4 py-2 text-sm font-medium text-base-content transition hover:bg-base-300"
            >
              Back to CRM Index
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-base-300 bg-base-100 p-3 shadow-sm md:p-4">
          <CrmSocialChat />
        </div>
      </div>
    </div>
  )
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions)

  if (!session?.user) {
    return {
      redirect: {
        destination: `/api/auth/signin?callbackUrl=${encodeURIComponent("/portal/staff/ghl-chat")}`,
        permanent: false,
      },
    }
  }

  if (!isStaff(session) && !isAdmin(session)) {
    return {
      notFound: true,
    }
  }

  return { props: {} }
}