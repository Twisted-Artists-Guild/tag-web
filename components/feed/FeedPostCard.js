/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source - low-profit - human-first*/

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import ReportButton from '@/components/moderation/ReportButton';
import ImpressionReactions from '@/components/social/ImpressionReactions';
import { useImpressions, ImpressionTargetType } from '@/hooks/useImpressions';
import { useComments, CommentTargetType } from '@/hooks/useComments';
import { useCommentCount } from '@/hooks/useCommentCount';
import SharedPreview from '@/components/feed/SharedPreview';
import SharePopover from '@/components/feed/SharePopover';
import FeedPostComments from '@/components/feed/FeedPostComments';
import { getIdentityGlowStyle } from '@/utils/identityGlow';
import {
    IoPersonOutline,
    IoStorefrontOutline,
    IoMusicalNotesOutline,
    IoLocationOutline,
    IoCalendarOutline,
    IoImageOutline,
    IoShareSocialOutline,
    IoSparklesOutline,
    IoChatbubbleOutline,
    IoTrashOutline,
} from 'react-icons/io5';
import { timeAgo } from '@/utils/relativeTime';

const ENTITY_ICONS = {
    Artist: IoMusicalNotesOutline,
    Vendor: IoStorefrontOutline,
    Venue: IoLocationOutline,
    Event: IoCalendarOutline,
    Listing: IoImageOutline,
};

export default function FeedPostCard({ post, showIdentityGlow = true }) {
    const { data: session } = useSession();
    const [showShare, setShowShare] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [postDeleted, setPostDeleted] = useState(false);
    const EntityIcon = ENTITY_ICONS[post.authorEntityType] || IoPersonOutline;

    const {
        impressions,
        loading: impressionsLoading,
        toggleReaction
    } = useImpressions(post.feedPostID, ImpressionTargetType.FEED_POST, true);

    const {
        commentCount: displayCount,
        refetch: refetchCount
    } = useCommentCount(post.feedPostID, CommentTargetType.FEED_POST, true);

    const {
        comments,
        loading: commentsLoading,
        addComment,
        deleteComment,
    } = useComments(post.feedPostID, CommentTargetType.FEED_POST, showComments);

    const handleDeletePost = async () => {
        if (!session?.user?.id) return;
        if (!window.confirm('Delete this post?')) return;

        try {
            const res = await fetch('/api/Feed/' + post.feedPostID + '?userId=' + session.user.id, {
                method: 'DELETE',
            });
            if (res.ok) {
                setPostDeleted(true);
            }
        } catch (err) {
            console.error('Failed to delete post', err);
        }
    };

    if (postDeleted) return null;

    return (
        <article className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body p-4 gap-3">
                {/* Author row */}
                <div className="flex items-center gap-3">
                    <div className="avatar">
                        <div
                            className={`w-10 rounded-full bg-base-300 overflow-hidden border ${showIdentityGlow ? "" : "border-base-300"}`}
                            style={showIdentityGlow ? getIdentityGlowStyle({
                                type: post.authorEntityName ? "artist" : "user",
                                id: post.authorUserID || post.authorEntityName,
                            }) : undefined}
                        >
                            <Image
                                src={post.authorImage || '/blank_image.png'}
                                alt={post.authorName || 'User'}
                                width={40} height={40}
                                className="object-cover"
                            />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm truncate">{post.authorName || 'Anonymous'}</span>
                            {post.authorEntityName && (
                                <Link href={post.authorEntityPath || '#'} className="badge badge-sm badge-primary badge-outline gap-1 truncate">
                                    <EntityIcon className="text-xs" /> {post.authorEntityName}
                                </Link>
                            )}
                        </div>
                        <p className="text-xs text-base-content/50" suppressHydrationWarning>
                            {timeAgo(post.createdAt)}
                            {post.isSuggestedPost && <span className="ml-1 badge badge-xs badge-ghost gap-0.5"><IoSparklesOutline /> First post</span>}
                        </p>
                    </div>
                    {session?.user && parseInt(session.user.id) === post.authorUserID && (
                        <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={handleDeletePost}
                            title="Delete post"
                        >
                            <IoTrashOutline />
                        </button>
                    )}
                    <ReportButton targetType="FeedPost" targetId={post.feedPostID} targetURL={'/feed?post=' + post.feedPostID} />
                </div>

                {/* Body */}
                {post.body && (
                    <div className="text-sm text-base-content whitespace-pre-wrap leading-relaxed">
                        {post.body_Plaintext || post.body}
                    </div>
                )}

                {/* Attached image */}
                {post.pictureURL && (
                    <div className="relative w-full aspect-video rounded-box overflow-hidden bg-base-300">
                        <Image src={post.pictureURL} alt="Post image" fill className="object-cover" />
                    </div>
                )}

                {/* Shared entity preview */}
                <SharedPreview preview={post.sharedEntityPreview} />

                {/* Reactions */}
                <div className="pt-1">
                    {!impressionsLoading && impressions && impressions.length > 0 ? (
                        <ImpressionReactions
                            impressions={impressions}
                            currentUser={session?.user || null}
                            onToggle={toggleReaction}
                            readOnly={false}
                            size="sm"
                            showDetails={false}
                            targetId={post.feedPostID}
                            targetType="feedpost"
                        />
                    ) : impressionsLoading ? (
                        <div className="text-xs text-base-content/50">Loading reactions...</div>
                    ) : null}
                </div>

                {/* Action bar */}
                <div className="flex items-center gap-2 pt-1 border-t border-base-200">
                    <button
                        className="btn btn-ghost btn-xs gap-1"
                        onClick={() => setShowComments(!showComments)}
                    >
                        <IoChatbubbleOutline />
                        {displayCount} comment{displayCount !== 1 ? 's' : ''}
                    </button>
                    <span className="flex-1"></span>
                    <div className="relative">
                        <button className="btn btn-ghost btn-xs gap-1" onClick={() => setShowShare(!showShare)}>
                            <IoShareSocialOutline /> Share
                        </button>
                        {showShare && <SharePopover post={post} onClose={() => setShowShare(false)} />}
                    </div>
                </div>

                {/* Comments Section */}
                {showComments && (
                    <FeedPostComments
                        comments={comments}
                        commentsLoading={commentsLoading}
                        session={session}
                        addComment={addComment}
                        deleteComment={deleteComment}
                        refetchCount={refetchCount}
                    />
                )}
            </div>
        </article>
    );
}