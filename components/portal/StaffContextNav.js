import EntityContextNav from "@/components/portal/EntityContextNav"

export default function StaffContextNav() {
  const items = [
    {
      key: "staff-home",
      label: "Staff Home",
      href: "/portal/staff",
      purpose: "Top-level staff workspace overview.",
    },
    {
      key: "staff-dashboard",
      label: "Dashboard",
      href: "/portal/staff/dashboard",
      purpose: "Primary operational surface for day-to-day staff work.",
    },
    {
      key: "staff-logviewer",
      label: "Log Viewer",
      href: "/portal/staff/logviewer",
      purpose: "Review DB-backed audit logs and system activity.",
    },
    {
      key: "staff-bugviewer",
      label: "Bug Viewer",
      href: "/portal/staff/bugviewer",
      purpose: "Triage and update bug reports submitted by users.",
    },
    {
      key: "staff-tagblog",
      label: "Tag Blog",
      href: "/portal/staff/tagblog",
      purpose: "Review and manage blog suggestions and publishing flow.",
    },
    {
      key: "staff-contests",
      label: "Contests",
      href: "/portal/staff/contests",
      purpose: "Manage contest entries and contest workflows.",
    },
    {
      key: "staff-venues",
      label: "Venues",
      href: "/portal/staff/venues",
      purpose: "Find venues and assign or remove their owners.",
    },
    {
      key: "staff-ghl-index",
      label: "CRM Index",
      href: "/portal/staff/ghl-index",
      purpose: "Open GoHighLevel CRM overview and integrations.",
    },
    {
      key: "staff-ghl-chat",
      label: "GHL Chat",
      href: "/portal/staff/ghl-chat",
      purpose: "Handle messaging connected to CRM and social channels.",
    },
    {
      key: "staff-blob-usage",
      label: "Blob Usage",
      href: "/portal/staff/blob-usage",
      purpose: "Inspect storage usage trends to support media operations.",
    },
  ]

  return <EntityContextNav title="Staff Context" items={items} showEntitySwitcher defaultEntityHref="/portal/staff" />
}
