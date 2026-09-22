import { useState, useEffect, useMemo } from "react"
import { getServerSession } from "next-auth/next"
import Link from "next/link"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { isAdmin, isStaff } from "@/utils/authHelpers"
import TagSEO from "@/components/TagSEO"
import StaffContextNav from "@/components/portal/StaffContextNav"

export default function GHLIndexPage() {
  const [contacts, setContacts] = useState([])
  const [surveys, setSurveys] = useState([])
  const [funnel, setFunnel] = useState({
    pipeline: null,
    membershipForm: null,
    stageCounts: [],
    opportunities: [],
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const membershipFormId = "jqVGvHmn4pv8gb67G3zU"

  const findFieldInObject = (value, candidateKeys) => {
    if (value == null) return null

    const normalize = (input) => String(input).toLowerCase().replace(/[^a-z0-9]/g, "")
    const normalizedCandidates = candidateKeys.map((key) => normalize(key))

    const visit = (node) => {
      if (node == null) return null

      if (typeof node !== "object") {
        return null
      }

      if (Array.isArray(node)) {
        for (const item of node) {
          const found = visit(item)
          if (found) return found
        }
        return null
      }

      for (const [key, rawVal] of Object.entries(node)) {
        const normalizedKey = normalize(key)
        const isMatch = normalizedCandidates.some(
          (candidate) => normalizedKey === candidate || normalizedKey.includes(candidate)
        )

        if (isMatch && typeof rawVal !== "object" && rawVal != null && String(rawVal).trim()) {
          return String(rawVal).trim()
        }

        const nested = visit(rawVal)
        if (nested) return nested
      }

      return null
    }

    return visit(value)
  }

  const contactTrend = useMemo(() => {
    const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" })
    const monthBuckets = []
    const now = new Date()

    for (let offset = 5; offset >= 0; offset -= 1) {
      const bucketDate = new Date(now.getFullYear(), now.getMonth() - offset, 1)
      monthBuckets.push({
        key: `${bucketDate.getFullYear()}-${String(bucketDate.getMonth() + 1).padStart(2, "0")}`,
        label: monthFormatter.format(bucketDate),
        count: 0,
      })
    }

    const bucketMap = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]))
    let contactsWithDates = 0

    contacts.forEach((contact) => {
      const rawDate =
        contact.dateAdded ||
        contact.date_added ||
        contact.createdAt ||
        contact.created_at ||
        contact.created ||
        contact.dateCreated ||
        findFieldInObject(contact, ["dateAdded", "date_added", "createdAt", "created_at", "created", "dateCreated"])

      if (!rawDate) return

      const parsedDate = new Date(rawDate)
      if (Number.isNaN(parsedDate.getTime())) return

      contactsWithDates += 1
      const bucketKey = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}`
      const bucket = bucketMap.get(bucketKey)
      if (bucket) {
        bucket.count += 1
      }
    })

    const maxCount = monthBuckets.reduce((max, bucket) => Math.max(max, bucket.count), 0)
    const totalInRange = monthBuckets.reduce((sum, bucket) => sum + bucket.count, 0)

    return {
      months: monthBuckets,
      maxCount,
      totalInRange,
      contactsWithDates,
    }
  }, [contacts])

  const getSubmissionName = (survey) => {
    const directName =
      survey.fullName ||
      survey.contactName ||
      survey.respondentName ||
      survey.name

    if (directName) return String(directName).trim()

    const firstName = findFieldInObject(survey, ["firstName", "first_name", "firstname"])
    const lastName = findFieldInObject(survey, ["lastName", "last_name", "lastname"])

    if (firstName || lastName) {
      return `${firstName || ""} ${lastName || ""}`.trim()
    }

    return findFieldInObject(survey, ["name", "fullname", "full_name"]) || "—"
  }

  const membershipRows = useMemo(() => {
    return surveys.map((survey, idx) => ({
      id: survey.id || survey._id || `submission-${idx}`,
      name: getSubmissionName(survey),
      city: findFieldInObject(survey, ["city", "town", "municipality"]) || "—",
      state: findFieldInObject(survey, ["state", "province", "region"]) || "—",
      organization:
        findFieldInObject(survey, ["organization", "organisation", "company", "companyName", "business", "guild"]) ||
        "—",
    }))
  }, [surveys])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const customersRes = await fetch("/api/crm/ghl-customers")
        if (!customersRes.ok) throw new Error(`Contacts: ${customersRes.statusText}`)
        const customersData = await customersRes.json()
        setContacts(customersData.data || [])

        try {
          const funnelRes = await fetch("/api/crm/ghl-funnel")
          if (!funnelRes.ok) throw new Error(`Funnel: ${funnelRes.statusText}`)
          const funnelData = await funnelRes.json()
          setFunnel({
            pipeline: funnelData.pipeline,
            membershipForm: funnelData.membershipForm || null,
            stageCounts: funnelData.stageCounts || [],
            opportunities: funnelData.opportunities || [],
            total: funnelData.total || 0,
          })
        } catch (err) {
          console.warn("Funnel fetch failed:", err.message)
        }

        try {
          const surveysRes = await fetch(
            `/api/crm/ghl-surveys?formId=${membershipFormId}&startAt=2020-01-01&endAt=2030-01-01`
          )
          if (surveysRes.ok) {
            const surveysData = await surveysRes.json()
            setSurveys(surveysData.data || [])
          } else {
            console.warn("Surveys endpoint not available")
          }
        } catch (err) {
          console.warn("Surveys fetch failed:", err.message)
        }
      } catch (err) {
        setError(err.message)
        console.error("Error fetching GHL data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
				<TagSEO metadataProp={{ title: "GHL CRM Dashboard", description: "Internal GoHighLevel CRM dashboard.", robots: "noindex, nofollow", keywords: "staff, crm, dashboard", og: { title: "GHL CRM Dashboard", description: "Internal GoHighLevel CRM dashboard." } }} canonicalSlug="portal/staff/ghl-index" />
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading GoHighLevel data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 p-6">
				<TagSEO metadataProp={{ title: "GHL CRM Dashboard", description: "Internal GoHighLevel CRM dashboard.", robots: "noindex, nofollow", keywords: "staff, crm, dashboard", og: { title: "GHL CRM Dashboard", description: "Internal GoHighLevel CRM dashboard." } }} canonicalSlug="portal/staff/ghl-index" />
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
			<TagSEO metadataProp={{ title: "GHL CRM Dashboard", description: "Internal GoHighLevel CRM dashboard.", robots: "noindex, nofollow", keywords: "staff, crm, dashboard", og: { title: "GHL CRM Dashboard", description: "Internal GoHighLevel CRM dashboard." } }} canonicalSlug="portal/staff/ghl-index" />
      <StaffContextNav />
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">GoHighLevel CRM Index</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-1">Company Social Chat Workspace</h2>
              <p className="text-sm text-gray-600 max-w-2xl">
                Open the dedicated GoHighLevel chat interface for staff messaging across Facebook, Instagram, WhatsApp, SMS, and email conversations tied to our social channels.
              </p>
            </div>
            <Link
              href="/portal/staff/ghl-chat"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Open GHL Chat
            </Link>
          </div>
        </div>

        {/* Contacts Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col gap-2 mb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-700">New Contacts, Past 6 Months</h2>
              <p className="text-sm text-gray-500">
                {contactTrend.totalInRange} new contacts across the last six calendar months
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {contactTrend.contactsWithDates > 0
                ? `${contactTrend.contactsWithDates} contacts included from creation-date data`
                : "No contact creation dates available from GoHighLevel"}
            </div>
          </div>

          {contacts.length > 0 ? (
            contactTrend.contactsWithDates > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-6">
                <ResponsiveContainer width="100%" height={288}>
                  <BarChart data={contactTrend.months} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "#64748b", textAnchor: "middle" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(99,102,241,0.08)" }}
                      formatter={(value) => [value, "New contacts"]}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Bar dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} maxBarSize={64} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                    Peak month: {contactTrend.maxCount} contacts
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                    Current total contacts: {contacts.length}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Contacts loaded, but none include a parseable created date for charting.</p>
            )
          ) : (
            <p className="text-gray-500">No contacts found</p>
          )}
        </div>

        {/* Initial Membership Drive Funnel Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Initial Membership Drive Funnel
          </h2>
          {funnel.pipeline ? (
            <div>
              <div className="mb-4 p-3 rounded bg-indigo-50 border border-indigo-200">
                <p className="font-semibold text-indigo-900">Pipeline: {funnel.pipeline.name}</p>
                <p className="text-indigo-700 text-sm">Total opportunities: {funnel.total}</p>
                <p className="text-indigo-700 text-sm">
                  Membership form submissions: {funnel.membershipForm?.submissionsTotal ?? 0}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {funnel.stageCounts.map((stage) => (
                  <div key={stage.stageId} className="border rounded p-3 bg-gray-50">
                    <p className="font-semibold text-gray-800 text-sm">{stage.stageName}</p>
                    <p className="text-xs text-gray-500">Win probability: {stage.stageWinProbability ?? "-"}%</p>
                    <p className="text-lg font-bold text-indigo-700 mt-1">{stage.count}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                  <thead className="bg-gray-50 text-gray-700 font-semibold">
                    <tr>
                      <th className="px-4 py-2">Opportunity</th>
                      <th className="px-4 py-2">Company</th>
                      <th className="px-4 py-2">Stage</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funnel.opportunities.slice(0, 10).map((opp) => (
                      <tr key={opp.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{opp.name || "-"}</td>
                        <td className="px-4 py-2">{opp.contact?.companyName || "—"}</td>
                        <td className="px-4 py-2">{opp.pipelineStageName || "—"}</td>
                        <td className="px-4 py-2">{opp.status || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No funnel/pipeline data found.</p>
          )}
        </div>

        {/* Surveys Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Initial Membership Drive Responses ({surveys.length})
          </h2>
          {surveys.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="bg-gray-50 text-gray-700 font-semibold">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">City</th>
                    <th className="px-4 py-2">State</th>
                    <th className="px-4 py-2">Organization</th>
                  </tr>
                </thead>
                <tbody>
                  {membershipRows.slice(0, 25).map((row) => (
                    <tr key={row.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{row.name}</td>
                      <td className="px-4 py-2">{row.city}</td>
                      <td className="px-4 py-2">{row.state}</td>
                      <td className="px-4 py-2">{row.organization}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {membershipRows.length > 25 && (
                <p className="text-gray-500 text-sm mt-2">
                  Showing 25 of {membershipRows.length} submissions
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">
              No submissions found yet for TAG Membership Interest Form ({membershipFormId}).
            </p>
          )}
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
        destination: `/api/auth/signin?callbackUrl=${encodeURIComponent("/portal/staff/ghl-index")}`,
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
