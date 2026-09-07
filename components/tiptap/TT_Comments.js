/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/


import { useState, useCallback, memo } from "react";
import { IoThumbsUp, IoArrowUndo, IoCreateOutline, IoAdd } from "react-icons/io5";
import { sanitizeDefaultHtml } from "@/components/security/sanitize";

// Import components
import Image from "next/image";
import SocialReactions from '../social/Reactions';
import TiptapEditor from "@/components/tiptap/tiptap-editor";
import { getIdentityGlowStyle } from "@/utils/identityGlow";
import ContextSwitcher from "@/components/Header/ContextSwitcher";

function buildCommentsState(initialComments = []) {
    return initialComments.map(comment => ({
        ...comment,
        isEditing: false,
        replies: comment.replies?.map(reply => ({
            ...reply,
            isEditing: false
        })) || []
    }));
}

/**
 * SocialComments - A feature-rich comment system with inline editing, replies, likes, and media embedding
 * 
 * @param {Object} props
 * @param {Array} props.initialComments - Initial comments data to display
 * @param {Function} props.onAddComment - Callback when a comment is added
 * @param {Function} props.onUpdateComment - Callback when a comment is updated
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
    onLikeComment = () => {},
    contextId = "",
    currentUser = null,
    allowMedia = true,
    readOnly = false
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
    
    // Check if the current user can edit a specific comment
    const canEditComment = useCallback((comment) => {
        if (readOnly) return false;
        if (!currentUser) return false;
        
        // Allow editing if it's the user's own comment or they have admin permissions
        return currentUser.id === comment.authorId || currentUser.isAdmin;
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
            id: `temp-${Date.now()}`, // Temporary ID until saved to backend
            body: "",
            authorId: currentUser.id,
            author: currentUser.username || "Anonymous",
            authorDisplayName: currentUser.displayName || currentUser.username || "Anonymous",
            avatarUrl: currentUser.avatarUrl || "/images/default-avatar.png",
            likes: 0,
            created: new Date().toISOString(),
            isEditing: true,
            replies: []
        };
        
        setComments(prevComments => [...prevComments, newComment]);
    }, [currentUser, readOnly]);

    /**
     * Adds a new blank reply to a specific comment
     */
    const addNewReply = useCallback((parentId) => {
        if (!currentUser || readOnly) return;
        
        setComments(prevComments => prevComments.map(comment => {
            if (comment.id === parentId) {
                const newReply = {
                    id: `temp-reply-${Date.now()}`, // Temporary ID until saved to backend
                    body: "",
                    authorId: currentUser.id,
                    author: currentUser.username || "Anonymous",
                    authorDisplayName: currentUser.displayName || currentUser.username || "Anonymous",
                    avatarUrl: currentUser.avatarUrl || "/images/default-avatar.png",
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
        
        setComments(prevComments => prevComments.map(comment => {
            // Update top-level comment
            if (!isReply && comment.id === commentId) {
                const updatedComment = { 
                    ...comment, 
                    body: sanitizedContent,
                    isEditing: false // Exit edit mode
                };
                
                // If it's a new comment (has temp- prefix)
                if (commentId.toString().startsWith('temp-')) {
                    // Generate a real ID for the comment
                    const newId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    updatedComment.id = newId;
                    
                    // Call the onAddComment callback
                    onAddComment(updatedComment);
                } else {
                    // Call the onUpdateComment callback
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
                            body: sanitizedContent,
                            isEditing: false // Exit edit mode
                        };
                        
                        // If it's a new reply (has temp- prefix)
                        if (commentId.toString().startsWith('temp-')) {
                            // Generate a real ID for the reply
                            const newId = `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            updatedReply.id = newId;
                            
                            // Call the onAddComment callback with parent info
                            onAddComment(updatedReply, comment.id);
                        } else {
                            // Call the onUpdateComment callback
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
    }, [onAddComment, onUpdateComment]);

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

    // Memoize editor content change handler for better performance
    const handleEditorChange = useCallback((commentId, content, isReply = false, parentId = null) => {
        setComments(prevComments => {
            // Find the specific comment to update without re-creating the entire array
            const commentIndex = prevComments.findIndex(c => 
                !isReply ? c.id === commentId : c.id === parentId
            );
            
            if (commentIndex === -1) return prevComments;
            
            const newComments = [...prevComments];
            
            if (!isReply) {
                // Update main comment
                if (newComments[commentIndex].body !== content) {
                    newComments[commentIndex] = { 
                        ...newComments[commentIndex], 
                        body: content 
                    };
                }
            } else {
                // Update reply
                const replyIndex = newComments[commentIndex].replies.findIndex(r => r.id === commentId);
                if (replyIndex !== -1 && newComments[commentIndex].replies[replyIndex].body !== content) {
                    const newReplies = [...newComments[commentIndex].replies];
                    newReplies[replyIndex] = { 
                        ...newReplies[replyIndex], 
                        body: content 
                    };
                    newComments[commentIndex] = {
                        ...newComments[commentIndex],
                        replies: newReplies
                    };
                }
            }
            
            return newComments;
        });
    }, []);

    /**
     * Comment component - renders a single comment or reply
     */
    const Comment = memo(({ comment, isReply = false, parentId = null, index = 0 }) => {
        // Check if this is a new comment with empty body
        const isNew = comment.body === "" || comment.body === "<p><br></p>";
        
        // Determine background class for alternating comments
        // For accessibility: uses subtle alternating backgrounds while maintaining contrast
        const isEven = index % 2 === 0;
        const bgClass = isReply 
            ? 'bg-base-200' // All replies get same background for better nesting visuals
            : isEven 
                ? 'bg-base-100' // Even comments get default background
                : 'bg-base-200'; // Odd comments get slightly darker background
        
        return (
            <div 
                className={`rounded-lg shadow-md mb-4 transition-all duration-200
                    ${comment.isEditing 
                        ? 'bg-base-100 border-2 border-primary p-3' // Editing state - brightest background
                        : `${bgClass} border-l-4 border-primary p-4`}`}
                data-theme={currentTheme} // Apply the selected theme
                id={`comment-${comment.id}`}
            >
                {/* Edit Mode */}
                {comment.isEditing ? (
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            {/* Avatar in edit mode */}
                            <div className="avatar">
                                <div className="w-10 h-10 rounded-full overflow-hidden">
                                    {comment.avatarUrl && (
                                        <Image 
                                            src={comment.avatarUrl} 
                                            alt={`${comment.authorDisplayName || comment.author}'s avatar`}
                                            width={40}
                                            height={40}
                                            className="object-cover"
                                        />
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                <p className="font-semibold text-sm">{comment.authorDisplayName || comment.author}</p>
                                <p className="text-xs text-primary">{isNew ? 'New Comment' : 'Editing...'}</p>
                            </div>
                        </div>
                        
                        {/* Rich text editor for content */}
                        <TiptapEditor
                            value={comment.body}
                            onChange={(content) => handleEditorChange(comment.id, content, isReply, parentId)}
                            placeholder={isReply ? "Write your reply..." : "What's on your mind?"}
                            className="bg-base-100"
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
                                onClick={() => handleCommentSubmit(comment.id, comment.body, isReply, parentId)}
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
                                <div className="w-10 h-10 rounded-full overflow-hidden">
                                    {comment.avatarUrl && (
                                        <Image 
                                            src={comment.avatarUrl} 
                                            alt={`${comment.authorDisplayName || comment.author}'s avatar`}
                                            width={40}
                                            height={40}
                                            className="object-cover"
                                        />
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex justify-between w-full">
                                <p className="font-semibold">{comment.authorDisplayName || comment.author}</p>
                                <time 
                                    className="text-sm text-base-content/60" 
                                    dateTime={comment.created}
                                >
                                    {new Date(comment.created).toLocaleString()}
                                </time>
                            </div>
                        </div>
                        
                        {/* Comment content with proper sanitization and styling */}
                        <div 
                            dangerouslySetInnerHTML={{ __html: sanitizeDefaultHtml(comment.body) }} 
                            className="py-2 prose max-w-none prose-img:rounded-lg prose-video:rounded-lg"
                        />
                        
                        {/* Reactions and Action buttons in one line */}
                        <div className="flex items-center justify-between flex-wrap gap-3 mt-3">
                            {/* Left side: Reactions */}
                            <div className="flex items-center gap-2">
                                <SocialReactions
                                    targetId={comment.id}
                                    targetType="comment"
                                    initialReactions={comment.reactions || []}
                                    currentUser={currentUser}
                                    readOnly={readOnly}
                                    size="sm"
                                    showQuickReactions={true}
                                    onReactionAdd={(reactionData) => {
                                        // Handle reaction add if needed
                                        console.log('Reaction added:', reactionData);
                                    }}
                                    onReactionRemove={(reactionData) => {
                                        // Handle reaction remove if needed
                                        console.log('Reaction removed:', reactionData);
                                    }}
                                />
                            </div>

                            {/* Right side: Action buttons */}
                            <div className="flex items-center gap-2">
                                <button 
                                    className="btn btn-xs btn-ghost gap-1 text-base-content/70 hover:text-base-content"
                                    onClick={() => handleLike(comment.id, isReply, parentId)}
                                    disabled={readOnly || !currentUser}
                                    aria-label={`Like this ${isReply ? 'reply' : 'comment'}. Currently has ${comment.likes} likes.`}
                                >
                                    <IoThumbsUp className="h-3 w-3" />
                                    <span className="text-xs">{comment.likes || 0}</span>
                                </button>
                                
                                {!isReply && !readOnly && currentUser && (
                                    <button 
                                        className="btn btn-xs btn-ghost gap-1 text-base-content/70 hover:text-base-content"
                                        onClick={() => addNewReply(comment.id)}
                                        aria-label={`Reply to comment by ${comment.authorDisplayName || comment.author}`}
                                    >
                                        <IoArrowUndo className="h-3 w-3" />
                                        <span className="text-xs">Reply</span>
                                    </button>
                                )}
                                
                                {canEditComment(comment) && (
                                    <button 
                                        className="btn btn-xs btn-ghost gap-1 text-base-content/70 hover:text-base-content"
                                        onClick={() => toggleEditMode(comment.id, isReply, parentId)}
                                        aria-label={`Edit this ${isReply ? 'reply' : 'comment'}`}
                                    >
                                        <IoCreateOutline className="h-3 w-3" />
                                        <span className="text-xs">Edit</span>
                                    </button>
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
                                aria-label={`Replies to comment by ${comment.authorDisplayName || comment.author}`}
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

export function TTCommentsEditorCard({ value, onChange, onSubmit, onCancel, currentUser = null, contextProfiles = [], activeContextId = null, onContextChange }) {
    return (
        <div
            className="rounded-lg border bg-base-100 p-4 space-y-3 transition-all"
            style={getIdentityGlowStyle(currentUser || "user", { type: currentUser?.type || "user" })}
        >
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">Comment</h2>
                    <p className="text-sm text-base-content/70">
                        Posting as {currentUser?.displayName || currentUser?.username || "user"}
                    </p>
                </div>
                {contextProfiles && contextProfiles.length > 0 ? (
                    <ContextSwitcher
                        variant="compact"
                        compactSize="sm"
                        compactMenuPosition="bottom-right"
                        contexts={contextProfiles}
                        activeContextId={activeContextId}
                        onChange={onContextChange}
                    />
                ) : null}
            </div>
            <TiptapEditor
                value={value}
                onChange={onChange}
                placeholder="Write a comment..."
                preset="minimal"
                fontScope="comment"
                minHeight={100}
                actionPreset="submit-cancel"
                submitLabel="Post Comment"
                cancelLabel="Cancel"
                emptySubmitMessage="Write something before posting."
                clearOnSubmit
                onSubmit={onSubmit}
                onCancel={onCancel}
            />
        </div>
    );
}

export default SocialComments;

