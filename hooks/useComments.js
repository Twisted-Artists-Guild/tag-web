/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useState, useEffect, useCallback } from 'react'

/**
 * Hook to fetch and manage comments for any target (listing, artist, post, etc.)
 * @param {string} targetId - Unique identifier for the target
 * @param {number} targetType - Type of target: 1 for Listing, 2 for Artist, 3 for Post, etc.
 * @param {boolean} enabled - Whether to fetch comments (default: true)
 * @returns {Object} - comments data and mutation functions
 */
export function useComments(targetId, targetType, enabled = true) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [commentCount, setCommentCount] = useState(0)

  /**
   * Fetch all comments for the target
   */
  const fetchComments = useCallback(async () => {
    if (!enabled || !targetId || !targetType) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Fetch comments
      const response = await fetch(
        `/api/comments?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch comments: ${response.status}`)
      }

      const data = await response.json()
      const commentData = Array.isArray(data) ? data : (data.comments || data.data || [])
      
      setComments(commentData)
      setError(null)
    } catch (err) {
      console.error('Error fetching comments:', err)
      setError(err.message)
      setComments([])
    } finally {
      setLoading(false)
    }
  }, [targetId, targetType, enabled])

  /**
   * Fetch comment count
   */
  const fetchCommentCount = useCallback(async () => {
    if (!enabled || !targetId || !targetType) {
      return
    }

    try {
      const response = await fetch(
        `/api/comments/count?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch comment count: ${response.status}`)
      }

      const data = await response.json()
      setCommentCount(data.count || data || 0)
    } catch (err) {
      console.error('Error fetching comment count:', err)
    }
  }, [targetId, targetType, enabled])

  useEffect(() => {
    fetchComments()
    fetchCommentCount()
  }, [fetchComments, fetchCommentCount])

  /**
   * Add a new comment or reply
   * @param {Object} commentData - Comment content and metadata
   * @param {string} parentCommentId - Parent comment ID if this is a reply
   * @returns {Object} - success status
   */
  const addComment = useCallback(async (commentData, parentCommentId = null) => {
    try {
      console.log('useComments.addComment called:', { commentData, parentCommentId })
      
      const payload = {
        targetId,
        targetType,
        content: commentData.content || commentData.body,
        userId: commentData.userId,
        parentCommentId: parentCommentId || null,
        authorContextId: commentData.authorContextId || null,
        authorEntityType: commentData.authorEntityType || null,
        authorEntityId: commentData.authorEntityId || null,
      }
      
      console.log('API Payload:', payload)
      
      const response = await fetch(`/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error Response:', errorData)
        throw new Error(errorData.message || `Failed to add comment: ${response.status}`)
      }

      const result = await response.json()
      console.log('API Success Response:', result)
      
      // Refresh comments to get updated list (including nested replies)
      await fetchComments()
      await fetchCommentCount()

      return { 
        success: true, 
        comment: result,
        message: parentCommentId ? 'Reply added successfully' : 'Comment added successfully'
      }
    } catch (err) {
      console.error('Error adding comment:', err)
      return { success: false, error: err.message }
    }
  }, [targetId, targetType, fetchComments, fetchCommentCount])

  /**
   * Update an existing comment
   * @param {string} commentId - ID of comment to update
   * @param {string} content - New comment content
   * @param {string} userId - User ID making the update
   * @returns {Object} - success status
   */
  const updateComment = useCallback(async (commentId, content, userId) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          commentId,
          content,
          userId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to update comment: ${response.status}`)
      }

      const result = await response.json()
      
      // Refresh comments to get updated list
      await fetchComments()

      return { 
        success: true, 
        comment: result,
        message: 'Comment updated successfully'
      }
    } catch (err) {
      console.error('Error updating comment:', err)
      return { success: false, error: err.message }
    }
  }, [fetchComments])

  /**
   * Delete a comment
   * @param {string} commentId - ID of comment to delete
   * @param {string} userId - User ID making the deletion
   * @returns {Object} - success status
   */
  const deleteComment = useCallback(async (commentId, userId) => {
    try {
      const response = await fetch(
        `/api/comments/${commentId}?userId=${encodeURIComponent(userId)}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to delete comment: ${response.status}`)
      }

      // Refresh comments to get updated list
      await fetchComments()
      await fetchCommentCount()

      return { 
        success: true,
        message: 'Comment deleted successfully'
      }
    } catch (err) {
      console.error('Error deleting comment:', err)
      return { success: false, error: err.message }
    }
  }, [fetchComments, fetchCommentCount])

  /**
   * Get a single comment by ID
   * @param {string} commentId - ID of comment to fetch
   * @returns {Object} - comment data or error
   */
  const getComment = useCallback(async (commentId) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch comment: ${response.status}`)
      }

      const result = await response.json()
      
      return { 
        success: true, 
        comment: result
      }
    } catch (err) {
      console.error('Error fetching comment:', err)
      return { success: false, error: err.message }
    }
  }, [])

  return {
    comments,
    commentCount,
    loading,
    error,
    addComment,
    updateComment,
    deleteComment,
    getComment,
    refetch: fetchComments
  }
}

/**
 * Target type constants for clarity
 */
export const CommentTargetType = {
  ARTIST: 1,
  LISTING: 2,
  BLOG: 3,
  NEWS: 4,
  USER: 5,
  FEED_POST: 6,
}