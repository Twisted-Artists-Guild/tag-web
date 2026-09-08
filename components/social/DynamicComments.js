/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState, useRef } from 'react'
import SocialComments from './Comments'
import { useComments, CommentTargetType } from '@/hooks/useComments'

function getStoredActiveContext() {
  if (typeof window === "undefined") return null

  try {
    const activeContextId = window.localStorage.getItem("tag:activeContextId")
    const contexts = JSON.parse(window.localStorage.getItem("tag:availableContexts") || "[]")
    return Array.isArray(contexts)
      ? contexts.find((context) => context.id === activeContextId) || null
      : null
  } catch {
    return null
  }
}

const DynamicComments = ({
  targetId,
  targetType,
  allowMedia = true,
  readOnly = false,
  enabled = true,
  currentUser: propCurrentUser = null
}) => {
  const router = useRouter()
  const { data: session } = useSession()
  const [activeContext, setActiveContext] = useState(getStoredActiveContext)
  const currentUser = propCurrentUser || (activeContext && session?.user ? {
    ...session.user,
    name: activeContext.label,
    image: activeContext.avatarUrl || "/blank_image.png",
    type: activeContext.type,
    contextId: activeContext.id,
  } : session?.user || null)
    
  const [feedbackMessage, setFeedbackMessage] = useState(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const processingRef = useRef(false) // Prevent double calls

  useEffect(() => {
    const refreshActiveContext = () => setActiveContext(getStoredActiveContext())
    refreshActiveContext()
    window.addEventListener("tag:contexts-updated", refreshActiveContext)
    return () => window.removeEventListener("tag:contexts-updated", refreshActiveContext)
  }, [])

  const {
    comments,
    commentCount,
    loading,
    error,
    addComment,
    updateComment,
    deleteComment
  } = useComments(targetId, targetType, enabled)

  const showFeedback = (message, duration = 2000) => {
    setFeedbackMessage(message)
    setTimeout(() => setFeedbackMessage(null), duration)
  }

  const handleAddComment = async (commentData, parentId = null) => {
    if (!currentUser) {
      setShowLoginPrompt(true)
      setTimeout(() => setShowLoginPrompt(false), 2500)
      return
    }

    // Prevent double submission
    if (processingRef.current) {
      console.log('Already processing, skipping...')
      return
    }

    processingRef.current = true

    try {
      console.log('Adding comment:', { content: commentData.content, parentId })
      
      const result = await addComment({
        content: commentData.content, // Changed from commentData.body
        userId: currentUser.id,
        authorContextId: activeContext?.id || "user-primary",
        authorEntityType: activeContext?.type || "user",
        authorEntityId: activeContext?.rawId || null,
      }, parentId)

      if (result.success) {
        showFeedback(result.message)
      } else {
        showFeedback(`Error: ${result.error}`)
      }
    } finally {
      // Reset after a short delay
      setTimeout(() => {
        processingRef.current = false
      }, 500)
    }
  }

  const handleUpdateComment = async (commentData, parentId = null) => {
    if (!currentUser) {
      setShowLoginPrompt(true)
      setTimeout(() => setShowLoginPrompt(false), 2500)
      return
    }

    if (processingRef.current) {
      console.log('Already processing, skipping...')
      return
    }

    processingRef.current = true

    try {
      console.log('Updating comment:', { id: commentData.id, content: commentData.content })
      
      const result = await updateComment(
        commentData.id,
        commentData.content, // Changed from commentData.body
        currentUser.id
      )

      if (result.success) {
        showFeedback(result.message)
      } else {
        showFeedback(`Error: ${result.error}`)
      }
    } finally {
      setTimeout(() => {
        processingRef.current = false
      }, 500)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!currentUser) {
      setShowLoginPrompt(true)
      setTimeout(() => setShowLoginPrompt(false), 2500)
      return
    }

    if (!confirm('Are you sure you want to delete this comment?')) {
      return
    }

    const result = await deleteComment(commentId, currentUser.id)

    if (result.success) {
      showFeedback(result.message)
    } else {
      showFeedback(`Error: ${result.error}`)
    }
  }

  const handleLikeComment = async (comment, parentId = null) => {
    console.log('Like comment:', comment.id)
    showFeedback('Like feature coming soon!')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>Error loading comments: {error}</span>
      </div>
    )
  }

  return (
    <div className="relative">
      {commentCount > 0 && (
        <div className="mb-4 text-sm text-base-content/70">
          {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
        </div>
      )}

      <SocialComments
        initialComments={comments}
        onAddComment={handleAddComment}
        onUpdateComment={handleUpdateComment}
        onDeleteComment={handleDeleteComment}
        onLikeComment={handleLikeComment}
        contextId={`${targetType}-${targetId}`}
        currentUser={currentUser}
        allowMedia={allowMedia}
        readOnly={readOnly || !currentUser}
        managedExternally={true} // NEW: Tell SocialComments not to manage state locally
      />

      {showLoginPrompt && (
        <div className="absolute top-0 left-0 right-0 bg-warning text-warning-content px-4 py-2 rounded-box shadow-lg text-sm z-50 flex items-center justify-between">
          <span>Please log in to comment</span>
          <button 
            onClick={() => router.push('/api/auth/signin')}
            className="btn btn-sm btn-ghost hover:bg-warning-content/20"
          >
            Log In
          </button>
        </div>
      )}

      {feedbackMessage && (
        <div className="toast toast-top toast-center z-50">
          <div className="alert alert-success">
            <span>{feedbackMessage}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default DynamicComments
export { CommentTargetType }