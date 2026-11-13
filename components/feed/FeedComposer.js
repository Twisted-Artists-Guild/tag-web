/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source - low-profit - human-first*/

import { useState } from 'react';
import { IoCreateOutline, IoCloseOutline } from 'react-icons/io5';

const SHARE_TYPES = [
    { type: null, label: 'General Post' },
    { type: 'Listing', label: 'Share a Listing' },
    { type: 'Artist', label: 'Share an Artist Profile' },
    { type: 'Event', label: 'Share an Event' },
    { type: 'Venue', label: 'Share a Venue' },
];

export default function FeedComposer({ session, onPostCreated }) {
    const [showCompose, setShowCompose] = useState(false);
    const [composeBody, setComposeBody] = useState('');
    const [shareType, setShareType] = useState(null);
    const [shareId, setShareId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmitPost = async (e) => {
        e.preventDefault();
        if (!session?.user?.id || (!composeBody.trim() && !shareType)) return;
        setSubmitting(true);

        try {
            const res = await fetch('/api/Feed?authorUserId=' + session.user.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    body: composeBody.trim(),
                    postType: shareType ? 'Share' + shareType : 'General',
                    authorEntityType: null,
                    authorEntityID: null,
                    sharedEntityType: shareType || null,
                    sharedEntityID: shareType && shareId ? parseInt(shareId) : null,
                }),
            });
            if (res.ok) {
                setComposeBody('');
                setShareType(null);
                setShareId('');
                setShowCompose(false);
                if (onPostCreated) onPostCreated();
            }
        } catch (err) {
            console.error('Failed to create post', err);
        }
        setSubmitting(false);
    };

    return (
        <div className="tag-bs-compose" data-theme="tag-dark" data-mode="dark">
            <div>
                {!showCompose ? (
                    <button
                        className="btn btn-ghost justify-start text-base-content/40 w-full text-left"
                        onClick={() => setShowCompose(true)}
                    >
                        <IoCreateOutline /> What are you creating today?
                    </button>
                ) : (
                    <form onSubmit={handleSubmitPost} className="space-y-3">
                        <div className="flex justify-between items-center">
                            <p className="font-bold text-sm">New Post</p>
                            <button type="button" className="btn btn-ghost btn-xs btn-circle" onClick={() => setShowCompose(false)}><IoCloseOutline /></button>
                        </div>
                        <textarea
                            className="textarea textarea-bordered w-full"
                            rows={3}
                            maxLength={5000}
                            placeholder="Share your thoughts, your art, your chaos..."
                            value={composeBody}
                            onChange={(e) => setComposeBody(e.target.value)}
                        />

                        {/* Share type selector */}
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs font-medium text-base-content/50">Share:</span>
                            {SHARE_TYPES.map(opt => (
                                <button
                                    key={opt.label}
                                    type="button"
                                    className={'badge badge-sm cursor-pointer ' + (shareType === opt.type ? 'badge-secondary' : 'badge-outline')}
                                    onClick={() => { setShareType(opt.type); if (!opt.type) setShareId(''); }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                            {shareType && (
                                <input type="number" min="1" className="input input-bordered input-xs w-24 font-mono" placeholder={shareType + ' ID'} value={shareId} onChange={(e) => setShareId(e.target.value)} />
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCompose(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || (!composeBody.trim() && !shareType)}>
                                {submitting ? <span className="loading loading-spinner loading-sm"></span> : 'Post'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}