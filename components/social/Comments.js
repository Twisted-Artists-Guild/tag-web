/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first

 🎯 ORCHESTRATION: Full comment display & management component.
    Loads comments from database, manages state, uses TT_Comments editor card.
    Uses: @/components/tiptap/TT_Comments for editor UI
    Exports: SocialComments (default), TTCommentsEditorCard (named)
*/

import { useState, useCallback, memo, useEffect, useRef } from "react";
import { IoThumbsUp, IoArrowUndo, IoCreateOutline, IoAdd, IoTrashOutline } from "react-icons/io5";
import { sanitizeDefaultHtml } from "@/components/security/sanitize";
import { ClientDate } from "@/utils/hydration";
import { getIdentityGlowStyle } from "@/utils/identityGlow";

// Import components
import Image from "next/image";
import ImpressionReactions from './ImpressionReactions';
import { useImpressions, ImpressionTargetType } from '@/hooks/useImpressions';
import TiptapEditor from "@/components/tiptap/tiptap-editor";
import ContextSwitcher from "@/components/Header/ContextSwitcher";
// Import the canonical editor card from tiptap folder
export { TTCommentsEditorCard } from "@/components/tiptap/TT_Comments";

function buildCommentsState(initialComments = []) {
    return initialComments.map(comment => ({
        ...comment,
        // Normalize API response to component expectations
        author: comment.authorDisplayName || comment.user?.name || comment.author || "Anonymous",
        authorDisplayName: comment.authorDisplayName || comment.user?.name || comment.author || "Anonymous",
        avatarUrl: comment.authorImage || comment.avatarUrl ||
            (comment.authorEntityType === "user" ? comment.user?.image : null) ||
            "/blank_image.png",
        created: comment.createdAt || comment.created,
        isEditing: false,
        replies: comment.replies?.map(reply => ({
            ...reply,
            // Normalize reply data too
            author: reply.authorDisplayName || reply.user?.name || reply.author || "Anonymous",
            authorDisplayName: reply.authorDisplayName || reply.user?.name || reply.author || "Anonymous",
            avatarUrl: reply.authorImage || reply.avatarUrl ||
                (reply.authorEntityType === "user" ? reply.user?.image : null) ||
                "/blank_image.png",
            created: reply.createdAt || reply.created,
            isEditing: false
        })) || []
    }));
}

function hasActiveDrafts(comments = []) {
    return comments.some((comment) => {
        const commentId = String(comment?.id || "");
        const commentEditing = Boolean(comment?.isEditing) || commentId.startsWith("temp-");
        if (commentEditing) return true;

        const replies = Array.isArray(comment?.replies) ? comment.replies : [];
        return replies.some((reply) => {
            const replyId = String(reply?.id || "");
            return Boolean(reply?.isEditing) || replyId.startsWith("temp-");
        });
    });
}

function commentsSignature(comments = []) {
    return JSON.stringify(
        comments.map((comment) => ({
            id: comment?.id,
            content: comment?.content || comment?.body || "",
            updatedAt: comment?.updatedAt || comment?.updated || comment?.modifiedAt || "",
            replies: (Array.isArray(comment?.replies) ? comment.replies : []).map((reply) => ({
                id: reply?.id,
                content: reply?.content || reply?.body || "",
                updatedAt: reply?.updatedAt || reply?.updated || reply?.modifiedAt || "",
            })),
        })),
    );
}

/**
 * SocialComments - A feature-rich comment system with inline editing, replies, likes, and media embedding
 * 
 * @param {Object} props
 * @param {Array} props.initialComments - Initial comments data to display
 * @param {Function} props.onAddComment - Callback when a comment is added
 * @param {Function} props.onUpdateComment - Callback when a comment is updated
 * @param {Function} props.onDeleteComment - Callback when a comment is deleted
 * @param {Function} props.onLikeComment - Callback when a comment is liked
 * @param {string} props.contextId - ID of the context being commented on (article ID, etc)
 * @param {Object} props.currentUser - Current user information (null if not logged in)
 * @param {boolean} props.allowMedia - Whether to allow image/video embedding (default: true)
 * @param {boolean} props.readOnly - Whether the comments are read-only (default: false)
 * @param {string} props.theme - Optional theme variant ('light' or 'dark', default is 'light')
 */
const SocialComments = ({ 
    initialComments = [],
    onAddComment = () => {},
    onUpdateComment = () => {},
    onDeleteComment = () => {},
    onLikeComment = () => {},
    contextId = "",
    currentUser = null,
    allowMedia = true,
    readOnly = false,
    managedExternally = false // NEW: Set to true when comments are managed by parent (API-driven)
}) => {
    // State management for comments
    const [comments, setComments] = useState(() => buildCommentsState(initialComments));
    const [isLoading] = useState(false);
    const [currentTheme] = useState(() => {
        if (typeof window === "undefined") {
            return "tag-theme";
        }

        return localStorage.getItem("theme") || "tag-theme";
    });
    
    // Sync comments when initialComments change (important for API-driven updates)
    useEffect(() => {
        if (!managedExternally) {
            return;
        }

        const nextComments = buildCommentsState(initialComments);
        setComments((prevComments) => {
            // Do not clobber in-progress edits/drafts while a user is typing.
            if (hasActiveDrafts(prevComments)) {
                return prevComments;
            }

            return commentsSignature(prevComments) === commentsSignature(nextComments)
                ? prevComments
                : nextComments;
        });
    }, [initialComments, managedExternally])
    
    // Check if the current user can edit a specific comment
    const canEditComment = useCallback((comment) => {
        if (readOnly) return false;
        if (!currentUser) return false;
        
        // Allow editing if it's the user's own comment or they have admin permissions
        return currentUser.id === comment.userId || currentUser.isAdmin;
    }, [currentUser, readOnly]);
    
    /**
     * Toggles the edit mode for a specific comment
     */
    const toggleEditMode = useCallback((commentId, isReply = false, parentId = null) => {
        setComments(prevComments => prevComments.map(comment => {
            // Toggle top-level comment
            if (!isReply && comment.id === commentId) {
                return { ...comment, isEditing: !comment.isEditing };
            }
            
            // Toggle reply comment
            if (isReply && parentId === comment.id) {
                const updatedReplies = comment.replies.map(reply => {
                    if (reply.id === commentId) {
                        return { ...reply, isEditing: !reply.isEditing };
                    }
                    return reply;
                });
                
                return { ...comment, replies: updatedReplies };
            }
            
            return comment;
        }));
    }, []);

    /**
     * Adds a new blank comment in edit mode
     */
    const addNewComment = useCallback(() => {
        if (!currentUser || readOnly) return;
        
        const newComment = {
            id: `temp-${Date.now()}`, // Change semicolon to comma here
            content: "",
            userId: currentUser.id,
            authorRole: currentUser.type || "user",
            contextId: currentUser.contextId || "user-primary",
            user: {
                name: currentUser.name || "Anonymous",
                image: currentUser.image || "/images/default-avatar.png",
            },
            likes: 0,
            created: new Date().toISOString(),
            isEditing: true,
            replies: []
        };
        
        setComments(prevComments => [newComment, ...prevComments]);
    }, [currentUser, readOnly]);

    /**AvatarUrl
     * Adds a new blank reply to a specific comment
     */
    const addNewReply = useCallback((parentId) => {
        if (!currentUser || readOnly) return;
        
        setComments(prevComments => prevComments.map(comment => {
            if (comment.id === parentId) {
                const newReply = {
                    id: `temp-reply-${Date.now()}`, // Make sure this is a comma
                    content: "",
                    userId: currentUser.id,
                    authorRole: currentUser.type || "user",
                    contextId: currentUser.contextId || "user-primary",
                    user: {
                        name: currentUser.name || "Anonymous",
                        image: currentUser.image || "/images/default-avatar.png",
                    },
                    likes: 0,
                    created: new Date().toISOString(),
                    isEditing: true
                };
                
                return {
                    ...comment,
                    replies: [...(comment.replies || []), newReply]
                };
            }
            return comment;
        }));
    }, [currentUser, readOnly]);

    /**
     * Submits edited content for a comment or reply
     */
    const handleCommentSubmit = useCallback((commentId, content, isReply = false, parentId = null) => {
        // Don't submit empty comments (just HTML tags with no content)
        const textOnly = content.replace(/<[^>]*>/g, '').trim();
        if (!textOnly) return;
        
        // Sanitize content to prevent XSS attacks
        const sanitizedContent = sanitizeDefaultHtml(content);
        
        // If managed externally, just call the callback and let parent handle state
        if (managedExternally) {
            const commentData = {
                id: commentId,
                content: sanitizedContent,
                userId: currentUser?.id,
                user: {
                    name: currentUser?.name,
                    image: currentUser?.image || '/images/default-avatar.png',
                }
            };
            
            if (commentId.toString().startsWith('temp-')) {
                // New comment or reply
                onAddComment(commentData, isReply ? parentId : null);
            } else {
                // Update existing comment
                onUpdateComment(commentData, isReply ? parentId : null);
            }
            
            return;
        }
        
        // Original local state management logic (for non-API mode)
        setComments(prevComments => prevComments.map(comment => {
            // Update top-level comment
            if (!isReply && comment.id === commentId) {
                const updatedComment = { 
                    ...comment, 
                    content: sanitizedContent,
                    isEditing: false
                };
                
                if (commentId.toString().startsWith('temp-')) {
                    const newId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    updatedComment.id = newId;
                    
                    onAddComment(updatedComment);
                } else {
                    onUpdateComment(updatedComment);
                }
                
                return updatedComment;
            }
            
            // Update reply
            if (isReply && parentId === comment.id) {
                const updatedReplies = comment.replies.map(reply => {
                    if (reply.id === commentId) {
                        const updatedReply = { 
                            ...reply, 
                            content: sanitizedContent,
                            isEditing: false
                        };
                        
                        if (commentId.toString().startsWith('temp-')) {
                            const newId = `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            updatedReply.id = newId;
                            
                            onAddComment(updatedReply, comment.id);
                        } else {
                            onUpdateComment(updatedReply, comment.id);
                        }
                        
                        return updatedReply;
                    }
                    return reply;
                });
                
                return { ...comment, replies: updatedReplies };
            }
            
            return comment;
        }));
    }, [currentUser, managedExternally, onAddComment, onUpdateComment]);

    /**
     * Increments like count for a comment or reply
     */
    const handleLike = useCallback((commentId, isReply = false, parentId = null) => {
        if (!currentUser || readOnly) return;
        
        setComments(prevComments => prevComments.map(comment => {
            // Handle top-level comment like
            if (!isReply && comment.id === commentId) {
                const updatedComment = { 
                    ...comment, 
                    likes: comment.likes + 1 
                };
                
                // Call the onLikeComment callback
                onLikeComment(updatedComment);
                
                return updatedComment;
            }
            
            // Handle reply like
            if (isReply && parentId === comment.id) {
                const updatedReplies = comment.replies.map(reply => {
                    if (reply.id === commentId) {
                        const updatedReply = {
                            ...reply,
                            likes: reply.likes + 1
                        };
                        
                        // Call the onLikeComment callback with parent info
                        onLikeComment(updatedReply, comment.id);
                        
                        return updatedReply;
                    }
                    return reply;
                });
                
                return { ...comment, replies: updatedReplies };
            }
            
            return comment;
        }));
    }, [currentUser, onLikeComment, readOnly]);

    /**
     * Cancels editing without saving changes
     */
    const handleCancelEdit = useCallback((commentId, isReply = false, parentId = null, isNew = false) => {
        if (isNew) {
            // Remove new comments that were canceled
            if (!isReply) {
                // Remove a new top-level comment
                setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
            } else {
                // Remove a new reply
                setComments(prevComments => prevComments.map(comment => {
                    if (comment.id === parentId) {
                        return {
                            ...comment,
                            replies: comment.replies.filter(reply => reply.id !== commentId)
                        };
                    }
                    return comment;
                }));
            }
        } else {
            // Just toggle edit mode off for existing comments
            toggleEditMode(commentId, isReply, parentId);
        }
    }, [toggleEditMode]);

    // Remove the handleEditorChange function entirely (lines 396-434)
    // We'll store draft content in a ref instead of state

    // Add this near the top of the component, after the state declarations
    const draftContentRef = useRef({});

    /**
     * Comment component - renders a single comment or reply
     */
    const Comment = memo(({ comment, isReply = false, parentId = null, index = 0 }) => {
        // Store draft content locally to avoid re-renders
        const [draftContent, setDraftContent] = useState(() => draftContentRef.current[comment.id] ?? (comment.content || ""));

        useEffect(() => {
            if (!comment.isEditing) {
                draftContentRef.current[comment.id] = undefined;
                return;
            }

            const savedDraft = draftContentRef.current[comment.id];
            if (typeof savedDraft === "string") {
                setDraftContent(savedDraft);
            } else {
                const nextDraft = comment.content || "";
                setDraftContent(nextDraft);
                draftContentRef.current[comment.id] = nextDraft;
            }
        }, [comment.id, comment.content, comment.isEditing]);
        
        // Hook for impressions
        const { 
            impressions, 
            loading: impressionsLoading,
            toggleReaction
        } = useImpressions(
            comment.id, 
            3, // 3 for Comment type (add to ImpressionTargetType if not exists)
            !comment.isEditing // Only fetch when not editing
        );
        
        // Check if this is a new comment with empty content
        const isNew = comment.id?.toString().startsWith('temp-') || 
                      !comment.content || 
                      comment.content === "" || 
                      comment.content === "<p><br></p>" ||
                      comment.content === "<p></p>";
        
        // Determine background class for alternating comments
        // For accessibility: uses subtle alternating backgrounds while maintaining contrast
        const isEven = index % 2 === 0;
        const bgClass = isReply 
            ? 'bg-base-200' // All replies get same background for better nesting visuals
            : isEven 
                ? 'bg-base-100' // Even comments get default background
                : 'bg-base-200'; // Odd comments get slightly darker background
        const authorType = comment.authorEntityType || comment.authorRole || (comment.artistID ? "artist" : "user");
        const authorName = comment.authorDisplayName || comment.user?.name || comment.author || "Anonymous";
        const authorImage = comment.authorImage || comment.avatarUrl ||
            (authorType === "user" ? comment.user?.image : null) ||
            "/blank_image.png";
        const authorIdentity = {
            type: authorType,
            id: comment.authorEntityId || comment.artistID || comment.userID || comment.userId,
            contextId: comment.authorContextId || comment.contextId,
        };
        
        return (
            <div 
                className={`rounded-lg shadow-md mb-4 transition-all duration-200
                    ${comment.isEditing 
                        ? 'bg-base-100 border border-base-300 p-3' // Editing state - brightest background
                        : `${bgClass} border-l-4 border-primary p-4`}`}
                data-theme={currentTheme} // Apply the selected theme
                id={`comment-${comment.id}`}
            >
                {/* Edit Mode */}
                {comment.isEditing ? (
                    <div>
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                                {/* Avatar in edit mode */}
                                <div className="avatar">
                                    <div
                                        className="w-10 h-10 rounded-full overflow-hidden border"
                                        style={getIdentityGlowStyle(authorIdentity, { contextId: authorIdentity.contextId })}
                                    >
                                        <Image 
                                            src={authorImage}
                                            alt={`${authorName}'s avatar`}
                                            width={40}
                                            height={40}
                                            className="object-cover"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <p className="font-semibold text-sm">{authorName}</p>
                                    <p className="text-xs text-primary">{isNew ? 'New Comment' : 'Editing...'}</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Rich text editor for content */}
                        <TiptapEditor
                            value={draftContent}
                            onChange={(content) => {
                                draftContentRef.current[comment.id] = content;
                                setDraftContent(content);
                            }}
                            placeholder={isReply ? "Write your reply..." : "What's on your mind?"}
                            className="bg-base-100"
                            containerStyle={getIdentityGlowStyle(currentUser || comment)}
                            preset={allowMedia ? "medium" : "minimal"}
                        />
                        
                        {/* Action buttons */}
                        <div className="flex gap-2 mt-3 justify-end">
                            <button 
                                className="btn btn-sm btn-outline" 
                                onClick={() => handleCancelEdit(comment.id, isReply, parentId, isNew)}
                                aria-label="Cancel editing"
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-sm btn-primary" 
                                onClick={() => {
                                    handleCommentSubmit(comment.id, draftContent, isReply, parentId);
                                    draftContentRef.current[comment.id] = undefined;
                                }}
                                aria-label={isNew ? "Post comment" : "Save changes"}
                            >
                                {isNew ? (isReply ? "Post Reply" : "Post Comment") : "Save"}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* View Mode */
                    <>
                        <div className="flex items-center gap-3 mb-2">
                            {/* Avatar */}
                            <div className="avatar">
                                <div
                                    className="w-10 h-10 rounded-full overflow-hidden border"
                                    style={getIdentityGlowStyle(authorIdentity, { contextId: authorIdentity.contextId })}
                                >
                                    <Image 
                                        src={authorImage}
                                        alt={`${authorName}'s avatar`}
                                        width={40}
                                        height={40}
                                        className="object-cover"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex justify-between w-full">
                                <p className="font-semibold">{authorName}</p>
                                    <ClientDate
                                        dateString={comment.createdAt}
                                        className="text-sm text-base-content/60"
                                    />
                            </div>
                        </div>
                        
                        {/* Comment content with proper sanitization and styling */}
                        <div 
                            className="py-2 prose max-w-none prose-img:rounded-lg prose-video:rounded-lg"
                            dangerouslySetInnerHTML={{ __html: sanitizeDefaultHtml(comment.content || comment.body) }}
                        />
                        
                        {/* Impressions/Reactions and Action buttons in one line */}
                        <div className="flex items-center justify-between flex-wrap gap-3 mt-3">
                            {/* Left side: Impressions */}
                            <div className="flex items-center gap-2">
                                {!impressionsLoading && impressions && impressions.length > 0 ? (
                                    <ImpressionReactions
                                        impressions={impressions}
                                        currentUser={currentUser}
                                        onToggle={toggleReaction}
                                        readOnly={readOnly}
                                        size="sm"
                                        showDetails={false}
                                        targetId={`comment-${comment.id}`}
                                        targetType="comment"
                                    />
                                ) : impressionsLoading ? (
                                    <div className="text-xs text-base-content/50">Loading reactions...</div>
                                ) : null}
                            </div>

                            {/* Right side: Action buttons */}
                            <div className="flex items-center gap-2">
                                {!isReply && !readOnly && currentUser && (
                                    <button 
                                        className="btn btn-xs btn-ghost gap-1 text-base-content/70 hover:text-base-content"
                                        onClick={() => addNewReply(comment.id)}
                                        aria-label={`Reply to comment by ${comment.user?.name || comment.authorDisplayName || comment.author}`}
                                    >
                                        <IoArrowUndo className="h-3 w-3" />
                                        <span className="text-xs">Reply</span>
                                    </button>
                                )}
                                
                                {canEditComment(comment) && !comment.isEditing && (
    <div className="flex gap-2">
        <button 
            onClick={() => toggleEditMode(comment.id, isReply, parentId)}
            className="btn btn-ghost btn-xs"
            aria-label="Edit comment"
        >
            <IoCreateOutline className="text-lg" />
        </button>
        <button 
            onClick={() => handleCommentDelete(comment.id, isReply, parentId)}
            className="btn btn-ghost btn-xs text-error hover:bg-error/10"
            aria-label="Delete comment"
        >
            <IoTrashOutline className="text-lg" />
        </button>
    </div>
)}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    });
    
    // Set display name for the memo component for better debugging
    Comment.displayName = 'Comment';

    // Show loading state
    if (isLoading) {
        return <div className="p-4 animate-pulse">Loading comments...</div>;
    }
    
    return (
        <div className="comments-container" data-theme={currentTheme}>
            {/* Add comment button - only shown if logged in and not read-only */}
            {currentUser && !readOnly && (
                <div className="mb-6">
                    <button 
                        className="btn btn-primary gap-2"
                        onClick={addNewComment}
                        aria-label="Add a new comment"
                    >
                        <IoAdd className="h-5 w-5" />
                        Add Comment
                    </button>
                </div>
            )}

            {/* Comments header */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold" id="comments-heading">
                    Comments ({comments.length})
                </h3>
                <div className="badge badge-neutral">
                    {comments.reduce((total, comment) => total + 1 + (comment.replies?.length || 0), 0)} Total Posts
                </div>
            </div>

            {/* Comments list */}
            <div className="comments-list space-y-6" aria-live="polite" aria-labelledby="comments-heading">
                {comments.map((comment, index) => (
                    <div key={comment.id} className="comment-thread">
                        {/* Main Comment */}
                        <Comment comment={comment} index={index} />
                        
                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                            <div 
                                className="replies ml-8 mt-2 space-y-3 pl-3 border-l-2 border-base-300" 
                                aria-label={`Replies to comment by ${comment.user.name}`}
                            >
                                {comment.replies.map((reply, replyIndex) => (
                                    <Comment 
                                        key={reply.id} 
                                        comment={reply} 
                                        isReply={true}
                                        parentId={comment.id}
                                        index={replyIndex}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                
                {/* Empty state */}
                {comments.length === 0 && (
                    <div className="alert alert-info">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span>No comments yet. {currentUser && !readOnly ? "Be the first to comment!" : ""}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SocialComments;

