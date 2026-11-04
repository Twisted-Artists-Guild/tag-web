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
import FeedReactions from '@/components/feed/FeedReactions';
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
        <article className="tag-bs-post" data-theme="tag-dark" data-mode="dark" data-post-id={post.feedPostID} data-post-art={post.pictureURL || post.sharedEntityPreview ? "1" : undefined}>
            {/* Author row */}
            <header className="tag-bs-post__head">
                <div
                    className="tag-bs-post__avatar"
                    data-post-avatar
                    style={showIdentityGlow ? getIdentityGlowStyle({
                        type: post.authorEntityName ? "artist" : "user",
                        id: post.authorUserID || post.authorEntityName,
                    }) : undefined}
                >
                    {post.authorImage ? (
                        <Image src={post.authorImage} alt={post.authorName || 'User'} width={42} height={42} />
                    ) : (
                        <span role="img" aria-label={post.authorName || 'User'}>{(post.authorName || 'A').trim().charAt(0).toUpperCase()}</span>
                    )}
                </div>
                <div className="tag-bs-post__who">
                    <span className="tag-bs-post__name">
                        {post.authorName || 'Anonymous'}
                        {post.authorEntityName && (
                            <Link href={post.authorEntityPath || '#'} className="tag-bs-post__entity">
                                <EntityIcon aria-hidden="true" /> {post.authorEntityName}
                            </Link>
                        )}
                    </span>
                    <p className="tag-bs-post__date" suppressHydrationWarning>
                        {timeAgo(post.createdAt)}
                        {post.isSuggestedPost && <span className="tag-bs-post__first"><IoSparklesOutline aria-hidden="true" /> First post</span>}
                    </p>
                </div>
                {session?.user && parseInt(session.user.id) === post.authorUserID && (
                    <button
                        type="button"
                        className="tag-bs-post__icon tag-bs-post__icon--delete"
                        onClick={handleDeletePost}
                        title="Delete post"
                        aria-label="Delete post"
                    >
                        <IoTrashOutline />
                    </button>
                )}
                <ReportButton targetType="FeedPost" targetId={post.feedPostID} targetURL={'/feed?post=' + post.feedPostID} className="tag-bs-post__flag" />
            </header>

            {/* Body */}
            {post.body && (
                <div className="tag-bs-post__body">
                    {post.body_Plaintext || post.body}
                </div>
            )}

            {/* Attached image */}
            {post.pictureURL && (
                <div className="tag-bs-post__media">
                    <Image src={post.pictureURL} alt="Post image" fill className="object-cover" />
                </div>
            )}

            {/* Shared entity preview */}
            <SharedPreview preview={post.sharedEntityPreview} />

            {/* Reactions */}
            <FeedReactions
                impressions={impressions}
                loading={impressionsLoading}
                onToggle={toggleReaction}
                currentUser={session?.user || null}
            />

            {/* Action bar */}
            <footer className="tag-bs-post__foot">
                <button
                    type="button"
                    className="tag-bs-post__act"
                    aria-expanded={showComments}
                    onClick={() => setShowComments(!showComments)}
                >
                    <IoChatbubbleOutline aria-hidden="true" />
                    {displayCount} comment{displayCount !== 1 ? 's' : ''}
                </button>
                <div className="tag-bs-post__share-wrap">
                    <button type="button" className="tag-bs-post__act" aria-expanded={showShare} onClick={() => setShowShare(!showShare)}>
                        <IoShareSocialOutline aria-hidden="true" /> Share
                    </button>
                    {showShare && <SharePopover post={post} onClose={() => setShowShare(false)} />}
                </div>
            </footer>

            {/* Comments Section */}
            {showComments && (
                <div className="tag-bs-post__comments">
                    <FeedPostComments
                        comments={comments}
                        commentsLoading={commentsLoading}
                        session={session}
                        addComment={addComment}
                        deleteComment={deleteComment}
                        refetchCount={refetchCount}
                    />
                </div>
            )}
        </article>
    );
}
