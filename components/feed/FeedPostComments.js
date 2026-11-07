/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source - low-profit - human-first*/

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { IoTrashOutline } from 'react-icons/io5';
import { timeAgo } from '@/utils/relativeTime';
import { getIdentityGlowStyle } from '@/utils/identityGlow';
import ContextSwitcher from '@/components/Header/ContextSwitcher';
import { getCommentAuthorContext } from '@/hooks/useComments';
import { useEntityProfileImage } from '@/hooks/useEntityProfileImage';

function getStoredActiveContext() {
    if (typeof window === "undefined") return null;

    try {
        const activeContextId = window.localStorage.getItem("tag:activeContextId");
        const contexts = JSON.parse(window.localStorage.getItem("tag:availableContexts") || "[]");
        return Array.isArray(contexts)
            ? contexts.find((context) => context.id === activeContextId) || null
            : null;
    } catch {
        return null;
    }
}

export default function FeedPostComments({ comments, commentsLoading, commentsError, session, addComment, deleteComment, refetchCount }) {
    const [newComment, setNewComment] = useState('');
    const [commentSubmitting, setCommentSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [activeContext, setActiveContext] = useState(getStoredActiveContext);
    const [contextProfiles, setContextProfiles] = useState([]);

    useEffect(() => {
        const refreshActiveContext = () => {
            setActiveContext(getStoredActiveContext());
            try {
                const contexts = JSON.parse(window.localStorage.getItem("tag:availableContexts") || "[]");
                setContextProfiles(Array.isArray(contexts) ? contexts : []);
            } catch {
                setContextProfiles([]);
            }
        };
        refreshActiveContext();
        window.addEventListener("tag:contexts-updated", refreshActiveContext);
        return () => window.removeEventListener("tag:contexts-updated", refreshActiveContext);
    }, []);

    const savedActiveAvatarUrl = typeof window !== "undefined"
        ? window.localStorage.getItem("tag:activeContextAvatarUrl")
        : "";
    const composerAvatarSrc = activeContext?.avatarUrl || savedActiveAvatarUrl || session?.user?.image || '/blank_image.png';
    const composerIdentity = activeContext || {
        id: session?.user?.id,
        type: "user",
        contextId: "user-primary",
    };

    const handleContextChange = (nextContextId) => {
        if (!nextContextId || nextContextId === activeContext?.id) return;

        window.localStorage.setItem("tag:activeContextId", nextContextId);
        window.dispatchEvent(new Event("tag:contexts-updated"));
        window.location.reload();
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || commentSubmitting) return;
        if (!session?.user?.id) {
            setSubmitError('Unable to identify your account. Please sign in again.');
            return;
        }
        let authorContext;
        try {
            authorContext = getCommentAuthorContext(activeContext);
        } catch (error) {
            setSubmitError(error.message);
            return;
        }
        setSubmitError('');
        setCommentSubmitting(true);

        try {
            const result = await addComment({
                content: newComment.trim(),
                userId: parseInt(session.user.id, 10),
                ...authorContext,
            });

            if (result.success) {
                setNewComment('');
                refetchCount();
            } else {
                setSubmitError(result.error || 'Unable to post your comment. Please try again.');
            }
        } catch (error) {
            console.error('Error submitting comment:', error);
            setSubmitError('Unable to post your comment. Please try again.');
        } finally {
            setCommentSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!session?.user?.id) return;
        if (!window.confirm('Delete this comment?')) return;
        await deleteComment(commentId, parseInt(session.user.id));
        refetchCount();
    };

    return (
        <div className="border-t border-base-200 pt-3 space-y-3">
            {/* Comment input */}
            {session?.user ? (
                <form onSubmit={handleSubmitComment} className="flex gap-2">
                    {contextProfiles.length > 0 ? (
                        <ContextSwitcher
                            variant="compact"
                            compactSize="sm"
                            compactMenuPosition="bottom-left"
                            contexts={contextProfiles}
                            activeContextId={activeContext?.id || "user-primary"}
                            onChange={handleContextChange}
                        />
                    ) : (
                        <div className="avatar">
                            <div
                                className="w-8 rounded-full bg-base-300 overflow-hidden border"
                                style={getIdentityGlowStyle(composerIdentity, { contextId: activeContext?.id })}
                            >
                                <Image
                                    src={composerAvatarSrc}
                                    alt={activeContext?.label || "You"}
                                    width={32} height={32}
                                    className="object-cover"
                                />
                            </div>
                        </div>
                    )}
                    <div className="flex-1 flex gap-2">
                        <input
                            type="text"
                            className="input input-bordered input-sm flex-1"
                            style={getIdentityGlowStyle(composerIdentity, { contextId: activeContext?.id })}
                            placeholder="Write a comment..."
                            maxLength={2000}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary btn-sm"
                            disabled={commentSubmitting || !newComment.trim()}
                        >
                            {commentSubmitting ? <span className="loading loading-spinner loading-xs"></span> : 'Post'}
                        </button>
                    </div>
                </form>
            ) : (
                <p className="text-xs text-base-content/50 text-center">
                    <Link href="/api/auth/signin" className="link link-primary">Sign in</Link> to comment
                </p>
            )}
            {submitError && <p role="alert" className="text-sm text-error">{submitError}</p>}

            {/* Comments list */}
            {commentsLoading ? (
                <div className="flex justify-center py-3"><span className="loading loading-spinner loading-sm"></span></div>
            ) : commentsError ? (
                <p role="alert" className="text-sm text-error">Unable to load comments. Please try again later.</p>
            ) : comments.length === 0 ? (
                <p className="text-xs text-base-content/40 text-center py-2">No comments yet. Be the first!</p>
            ) : (
                <div className="space-y-3">
                    {comments.map(comment => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            session={session}
                            onDelete={handleDeleteComment}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Shows the profile picture of the identity the comment was posted as:
// the artist profile for artist comments, otherwise the commenting user's profile.
function CommentAvatar({ comment, sizeClass, sizePx }) {
    const authorName = comment.authorDisplayName || comment.user?.name || 'Anonymous';
    const isArtist = comment.authorEntityType === 'artist' && comment.authorEntityId;
    const storedImage = useEntityProfileImage(
        isArtist ? 'artist' : 'user',
        isArtist ? comment.authorEntityId : comment.userId
    );
    const imageSrc = storedImage ||
        comment.authorImage ||
        (isArtist ? null : comment.user?.image) ||
        '/blank_image.png';
    const identity = {
        type: comment.authorEntityType || 'user',
        id: comment.authorEntityId || comment.userId,
        contextId: comment.authorContextId || undefined,
    };

    return (
        <div className="avatar flex-shrink-0">
            <div
                className={`${sizeClass} rounded-full bg-base-300 overflow-hidden relative border`}
                style={getIdentityGlowStyle(identity, { contextId: comment.authorContextId })}
            >
                <Image
                    src={imageSrc}
                    alt={authorName}
                    fill
                    sizes={`${sizePx}px`}
                    className="object-cover"
                />
            </div>
        </div>
    );
}

function CommentItem({ comment, session, onDelete }) {
    const authorName = comment.authorDisplayName || comment.user?.name || 'Anonymous';

    return (
        <div className="flex gap-2">
            <CommentAvatar comment={comment} sizeClass="w-7 h-7" sizePx={28} />
            <div className="flex-1 min-w-0">
                <div className="bg-base-200 rounded-box px-3 py-2">
                    <div className="flex items-center justify-between">
                        <p className="font-bold text-xs">{authorName}</p>
                        {session?.user && parseInt(session.user.id) === comment.userId && (
                            <button
                                className="btn btn-ghost btn-xs text-error p-0 h-auto min-h-0"
                                onClick={() => onDelete(comment.id)}
                                title="Delete comment"
                            >
                                <IoTrashOutline className="text-sm" />
                            </button>
                        )}
                    </div>
                    <p className="text-sm text-base-content">{comment.content}</p>
                </div>
                <div className="flex gap-3 mt-0.5 px-1">
                    <span className="text-xs text-base-content/40" suppressHydrationWarning>
                        {timeAgo(new Date(comment.createdAt))}
                    </span>
                    {comment.isEdited && <span className="text-xs text-base-content/30">(edited)</span>}
                </div>
                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-4 mt-2 space-y-2">
                        {comment.replies.map(reply => (
                            <div key={reply.id} className="flex gap-2">
                                <CommentAvatar comment={reply} sizeClass="w-6 h-6" sizePx={24} />
                                <div className="flex-1 min-w-0">
                                    <div className="bg-base-200 rounded-box px-3 py-1.5">
                                        <div className="flex items-center justify-between">
                                            <p className="font-bold text-xs">{reply.authorDisplayName || reply.user?.name || 'Anonymous'}</p>
                                            {session?.user && parseInt(session.user.id) === reply.userId && (
                                                <button
                                                    className="btn btn-ghost btn-xs text-error p-0 h-auto min-h-0"
                                                    onClick={() => onDelete(reply.id)}
                                                    title="Delete reply"
                                                >
                                                    <IoTrashOutline className="text-sm" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-sm text-base-content">{reply.content}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}