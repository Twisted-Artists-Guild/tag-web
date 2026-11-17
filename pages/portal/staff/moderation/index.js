/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import TagSEO from '@/components/TagSEO';
import Link from 'next/link';
import { getModerationPageContext } from '@/utils/page-management';
import {
    IoFlagOutline,
    IoShieldCheckmarkOutline,
    IoFilterOutline,
    IoEyeOutline,
    IoChevronBackOutline,
    IoChevronForwardOutline,
    IoBanOutline,
    IoTrashOutline,
    IoPricetagOutline,
    IoArrowUpOutline,
    IoCloseCircleOutline,
    IoChatbubbleOutline,
    IoTimeOutline,
} from 'react-icons/io5';

const STATUS_OPTIONS = ['New', 'UnderReview', 'Resolved', 'Dismissed'];
const TARGET_TYPES = ['Listing', 'Artist', 'User', 'Comment', 'Message', 'Blog', 'Event', 'FeedPost', 'Vendor', 'Venue', 'Contest'];
const PRIORITY_LABELS = { 0: 'Low', 1: 'Normal', 2: 'High', 3: 'Critical' };
const PRIORITY_COLORS = { 0: 'badge-ghost', 1: 'badge-info', 2: 'badge-warning', 3: 'badge-error' };
const STATUS_COLORS = { New: 'badge-warning', UnderReview: 'badge-info', Resolved: 'badge-success', Dismissed: 'badge-ghost' };

const ACTION_TYPES = [
    { value: 'Block', label: 'Block Content', icon: IoBanOutline, color: 'btn-error' },
    { value: 'Suspend', label: 'Suspend User', icon: IoTimeOutline, color: 'btn-warning' },
    { value: 'RemoveContent', label: 'Remove Post', icon: IoTrashOutline, color: 'btn-error' },
    { value: 'ChangeTags', label: 'Change Tags', icon: IoPricetagOutline, color: 'btn-info' },
    { value: 'Escalate', label: 'Escalate', icon: IoArrowUpOutline, color: 'btn-warning' },
    { value: 'Dismiss', label: 'Dismiss', icon: IoCloseCircleOutline, color: 'btn-ghost' },
    { value: 'Note', label: 'Add Note', icon: IoChatbubbleOutline, color: 'btn-ghost' },
];

export default function ModerationDashboard() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const pageContext = getModerationPageContext(router.query);

    const [reports, setReports] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterStatus, setFilterStatus] = useState('');
    const [targetTypeOverride, setTargetTypeOverride] = useState(null);
    const [filterPriority, setFilterPriority] = useState('');
    const contextTargetType = pageContext?.targetType || '';
    const filterTargetType = targetTypeOverride?.context === contextTargetType
        ? targetTypeOverride.value : contextTargetType;

    // Detail view
    const [selectedReport, setSelectedReport] = useState(null);
    const [actionNote, setActionNote] = useState('');
    const [actionMeta, setActionMeta] = useState('');
    const [actionSubmitting, setActionSubmitting] = useState(false);
    const [lastActionResult, setLastActionResult] = useState(null);

    useEffect(() => {
        if (authStatus === 'unauthenticated') {
            router.push('/api/auth/signin?callbackUrl=/portal/staff/moderation');
        }
    }, [authStatus, router]);

    const fetchReports = useCallback(async () => {
        if (!router.isReady) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, pageSize: 25 });
            if (filterStatus) params.set('status', filterStatus);
            if (filterTargetType) params.set('targetType', filterTargetType);
            if (filterPriority) params.set('priority', filterPriority);

            const res = await fetch(`/api/ContentReport?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setReports(data.items || []);
                setTotalCount(data.totalCount || 0);
                setTotalPages(data.totalPages || 1);
            }
        } catch (err) {
            console.error("Failed to load reports", err);
        }
        setLoading(false);
    }, [page, filterStatus, filterTargetType, filterPriority, router.isReady]);

    useEffect(() => { fetchReports(); }, [fetchReports]);

    const handleTakeAction = async (actionType) => {
        if (!selectedReport) return;
        setActionSubmitting(true);
        setLastActionResult(null);

        try {
            const staffId = session?.user?.staffId || session?.user?.id;
            const res = await fetch('/api/ContentReport/action?staffId=' + staffId, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contentReportID: selectedReport.contentReportID,
                    actionType,
                    note: actionNote || null,
                    actionMetadata: actionMeta || null,
                }),
            });

            if (res.ok) {
                const newAction = await res.json();
                setSelectedReport(prev => ({
                    ...prev,
                    actions: [newAction, ...(prev.actions || [])],
                    status: actionType === 'Dismiss' ? 'Dismissed' : actionType === 'Escalate' ? 'UnderReview' : prev.status,
                }));
                setLastActionResult(newAction.sideEffectSummary || 'Action completed.');
                setActionNote('');
                setActionMeta('');
                fetchReports();
            }
        } catch (err) {
            console.error("Action failed", err);
            setLastActionResult('Action failed. Check console for details.');
        }
        setActionSubmitting(false);
    };

    const handleStatusUpdate = async (reportId, updates) => {
        try {
            await fetch(`/api/ContentReport/${reportId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            fetchReports();
            if (selectedReport?.contentReportID === reportId) {
                setSelectedReport(prev => ({ ...prev, ...updates }));
            }
        } catch (err) {
            console.error("Status update failed", err);
        }
    };

    if (authStatus === 'loading') {
        return <div className="min-h-screen flex items-center justify-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
    }

    return (
        <div className="min-h-screen bg-base-200">
            <TagSEO metadataProp={{ title: "Moderation Dashboard", robots: "noindex, nofollow" }} canonicalSlug="portal/staff/moderation" />

            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h1 className="text-2xl lg:text-3xl font-extrabold text-primary flex items-center gap-2">
                        <IoShieldCheckmarkOutline /> Moderation Dashboard
                    </h1>
                    <div className="badge badge-lg badge-primary badge-outline">
                        {totalCount} Total Report{totalCount !== 1 ? 's' : ''}
                    </div>
                </div>

                {pageContext ? (
                    <div className="rounded-box border border-base-300 bg-base-200 p-3 mb-4 text-sm">
                        <p>Page context: {pageContext.targetType} #{pageContext.targetId}. Use the content-type filter below; reports are not restricted to this individual page.</p>
                        {pageContext.targetUrl ? <Link href={pageContext.targetUrl} className="link">Return to source page</Link> : null}
                    </div>
                ) : null}

                {/* Filters */}
                <div className="card bg-base-100 shadow-sm border border-base-300 mb-6">
                    <div className="card-body py-3 flex flex-row flex-wrap items-center gap-3">
                        <IoFilterOutline className="text-base-content/50" />
                        <select className="select select-bordered select-sm" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
                            <option value="">All Statuses</option>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select className="select select-bordered select-sm" value={filterTargetType} onChange={(e) => { setTargetTypeOverride({ context: contextTargetType, value: e.target.value }); setPage(1); }}>
                            <option value="">All Types</option>
                            {TARGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select className="select select-bordered select-sm" value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}>
                            <option value="">All Priorities</option>
                            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Reports Table */}
                    <div className="flex-1">
                        <div className="card bg-base-100 shadow-sm border border-base-300">
                            <div className="overflow-x-auto">
                                <table className="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Type</th>
                                            <th>Labels</th>
                                            <th>Status</th>
                                            <th>Priority</th>
                                            <th>Date</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={7} className="text-center py-8"><span className="loading loading-spinner"></span></td></tr>
                                        ) : reports.length === 0 ? (
                                            <tr><td colSpan={7} className="text-center py-8 text-base-content/40">No reports found</td></tr>
                                        ) : reports.map(report => (
                                            <tr
                                                key={report.contentReportID}
                                                className={`hover cursor-pointer ${selectedReport?.contentReportID === report.contentReportID ? 'bg-primary/5' : ''}`}
                                                onClick={() => setSelectedReport(report)}
                                            >
                                                <td className="font-mono text-xs">#{report.contentReportID}</td>
                                                <td>
                                                    <span className="badge badge-sm badge-outline">{report.targetType}</span>
                                                </td>
                                                <td>
                                                    <div className="flex flex-wrap gap-1">
                                                        {(report.labels || []).slice(0, 2).map(l => (
                                                            <span key={l.contentWarningItemID} className="badge badge-xs badge-error badge-outline">{l.label}</span>
                                                        ))}
                                                        {(report.labels || []).length > 2 && (
                                                            <span className="badge badge-xs">+{report.labels.length - 2}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td><span className={`badge badge-sm ${STATUS_COLORS[report.status] || ''}`}>{report.status}</span></td>
                                                <td><span className={`badge badge-sm ${PRIORITY_COLORS[report.priority] || ''}`}>{PRIORITY_LABELS[report.priority]}</span></td>
                                                <td className="text-xs text-base-content/60">{new Date(report.createdAt).toLocaleDateString()}</td>
                                                <td><button className="btn btn-ghost btn-xs"><IoEyeOutline /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="card-body py-3 flex flex-row justify-center items-center gap-2">
                                    <button className="btn btn-sm btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                        <IoChevronBackOutline />
                                    </button>
                                    <span className="text-sm">Page {page} of {totalPages}</span>
                                    <button className="btn btn-sm btn-ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                                        <IoChevronForwardOutline />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detail Panel */}
                    <div className="w-full lg:w-96">
                        {selectedReport ? (
                            <div className="card bg-base-100 shadow-sm border border-base-300 sticky top-24">
                                <div className="card-body space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-lg">Report #{selectedReport.contentReportID}</h3>
                                        <span className={`badge ${STATUS_COLORS[selectedReport.status]}`}>{selectedReport.status}</span>
                                    </div>

                                    {/* Meta */}
                                    <div className="text-sm space-y-1">
                                        <p><span className="font-medium">Type:</span> {selectedReport.targetType} #{selectedReport.targetID}</p>
                                        <p><span className="font-medium">Reporter:</span> {selectedReport.reporterName || `User #${selectedReport.reporterUserID}`}</p>
                                        <p><span className="font-medium">Date:</span> {new Date(selectedReport.createdAt).toLocaleString()}</p>
                                        {selectedReport.targetURL && (
                                            <p><span className="font-medium">URL:</span> <a href={selectedReport.targetURL} className="link link-primary text-xs" target="_blank" rel="noopener noreferrer">{selectedReport.targetURL}</a></p>
                                        )}
                                    </div>

                                    {/* Labels */}
                                    {(selectedReport.labels || []).length > 0 && (
                                        <div>
                                            <p className="text-xs font-bold text-base-content/50 uppercase mb-1">Labels</p>
                                            <div className="flex flex-wrap gap-1">
                                                {selectedReport.labels.map(l => (
                                                    <span key={l.contentWarningItemID} className="badge badge-sm badge-error badge-outline">{l.label}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Description */}
                                    <div>
                                        <p className="text-xs font-bold text-base-content/50 uppercase mb-1">Description</p>
                                        <p className="text-sm bg-base-200 p-3 rounded-box">{selectedReport.description || <em className="text-base-content/40">No description provided</em>}</p>
                                    </div>

                                    {/* Quick status change */}
                                    <div>
                                        <p className="text-xs font-bold text-base-content/50 uppercase mb-1">Change Status</p>
                                        <div className="flex flex-wrap gap-1">
                                            {STATUS_OPTIONS.map(s => (
                                                <button
                                                    key={s}
                                                    className={`btn btn-xs ${selectedReport.status === s ? 'btn-primary' : 'btn-outline'}`}
                                                    onClick={() => handleStatusUpdate(selectedReport.contentReportID, { status: s })}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="divider my-1"></div>

                                    {/* Take Action */}
                                    <div>
                                        <p className="text-xs font-bold text-base-content/50 uppercase mb-2">Take Action</p>
                                        <textarea
                                            className="textarea textarea-bordered w-full textarea-sm mb-2"
                                            rows={2}
                                            placeholder="Action note (optional)..."
                                            value={actionNote}
                                            onChange={(e) => setActionNote(e.target.value)}
                                        />
                                        <div className="form-control mb-2">
                                            <label className="label py-0"><span className="label-text text-xs">Action Metadata (JSON, optional)</span></label>
                                            <textarea
                                                className="textarea textarea-bordered w-full textarea-xs font-mono"
                                                rows={2}
                                                placeholder='e.g. {"durationDays": 7} or {"addTagIds": [1,3]}'
                                                value={actionMeta}
                                                onChange={(e) => setActionMeta(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {ACTION_TYPES.map(action => (
                                                <button
                                                    key={action.value}
                                                    className={'btn btn-xs gap-1 ' + action.color}
                                                    disabled={actionSubmitting}
                                                    onClick={() => handleTakeAction(action.value)}
                                                    title={action.label}
                                                >
                                                    <action.icon className="text-sm" /> {action.label}
                                                </button>
                                            ))}
                                        </div>
                                        {lastActionResult && (
                                            <div className="alert alert-info alert-sm mt-2">
                                                <span className="text-xs">{lastActionResult}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action History */}
                                    {(selectedReport.actions || []).length > 0 && (
                                        <div>
                                            <p className="text-xs font-bold text-base-content/50 uppercase mb-2">Action History</p>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {selectedReport.actions.map(a => (
                                                    <div key={a.moderationActionID} className="bg-base-200 p-2 rounded text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="font-bold">{a.actionType}</span>
                                                            <span className="text-base-content/50">{new Date(a.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                        {a.staffName && <p className="text-base-content/60">by {a.staffName}</p>}
                                                        {a.note && <p className="mt-1">{a.note}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="card bg-base-100 border border-base-300 shadow-sm">
                                <div className="card-body items-center text-center py-12">
                                    <IoFlagOutline className="text-4xl text-base-content/20 mb-2" />
                                    <p className="text-base-content/40">Select a report to view details</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}