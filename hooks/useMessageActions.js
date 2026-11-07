/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useCallback } from 'react'
import { sanitizeDefaultHtml } from '@/components/security/sanitize'

/**
 * Hook for message actions (send, edit, delete)
 * @param {string} conversationId - Conversation ID
 * @param {string} currentUserId - Current user's ID
 * @param {Object} conversation - Full conversation object with participants
 * @returns {Object} - message action functions
 */
export function useMessageActions(conversationId, currentUserId, conversation = null) {
  
  /**
   * Get recipient user ID (for 1:1 conversations)
   * For group chats, this might be null or the first other participant
   */
  const getToUserId = useCallback(() => {
    if (!conversation || !conversation.participants) {
      return null
    }
    
    // Find the first participant that's not the current user (IDs may be numbers or strings)
    const recipient = conversation.participants.find(p => String(p.id) !== String(currentUserId))
    return recipient?.id || null
  }, [conversation, currentUserId])
  
  /**
   * Send a new message
   * @param {string} content - HTML content
   * @param {Array} files - Array of File objects to attach
   * @returns {Object} - success status and message
   */
  const sendMessage = useCallback(async (content, files = []) => {
    if (!conversationId || !currentUserId) {
      return { success: false, error: 'Missing conversation or user ID' }
    }

    try {
      const sanitizedContent = sanitizeDefaultHtml(content)
      
      // Upload files first if any
      const uploadedFiles = []
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('conversationId', conversationId)
        formData.append('userId', currentUserId)
        
        const uploadRes = await fetch(`/api/messages/upload`, {
          method: 'POST',
          body: formData
        })
        
        if (uploadRes.ok) {
          const fileData = await uploadRes.json()
          uploadedFiles.push({
            fileName: fileData.fileName || file.name,
            fileUrl: fileData.url || fileData.fileUrl,
            fileType: fileData.fileType || file.type,
            fileSize: fileData.fileSize || file.size
          })
        } else {
          console.error('Failed to upload file:', file.name)
        }
      }
      
      // Get recipient ID
      const toUserId = getToUserId()
      
      // Determine message type
      let messageType = 'text'
      if (uploadedFiles.length > 0) {
        const firstFileType = uploadedFiles[0].fileType || ''
        if (firstFileType.startsWith('image/')) {
          messageType = 'image'
        } else if (firstFileType.startsWith('video/')) {
          messageType = 'video'
        } else {
          messageType = 'file'
        }
      }
      
      // Send message with exact API format
      const response = await fetch(`/api/conversations/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ConversationId: conversationId,
          FromUserID: currentUserId,
          ToUserID: toUserId,
          Body: sanitizedContent,
          MessageType: messageType,
          Attachment: uploadedFiles.length > 0 ? JSON.stringify(uploadedFiles) : null
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to send message: ${response.status}`)
      }

      const result = await response.json()
      
      return { 
        success: true, 
        message: result,
        messageText: 'Message sent successfully'
      }
    } catch (err) {
      console.error('Error sending message:', err)
      return { success: false, error: err.message }
    }
  }, [conversationId, currentUserId, getToUserId])

  /**
   * Edit existing message
   */
  const editMessage = useCallback(async (messageId, newContent) => {
    if (!currentUserId) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      const sanitizedContent = sanitizeDefaultHtml(newContent)
      
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          MessageId: messageId,
          Body: sanitizedContent,
          UserId: currentUserId
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to edit message: ${response.status}`)
      }

      const result = await response.json()

      return { 
        success: true, 
        message: result,
        messageText: 'Message updated successfully' 
      }
    } catch (err) {
      console.error('Error editing message:', err)
      return { success: false, error: err.message }
    }
  }, [currentUserId])

  /**
   * Delete message
   */
  const deleteMessage = useCallback(async (messageId) => {
    if (!currentUserId) {
      return { success: false, error: 'User not authenticated' }
    }

    if (!confirm('Are you sure you want to delete this message?')) {
      return { success: false, error: 'Cancelled by user' }
    }

    try {
      
      const response = await fetch(
        `/api/messages/${messageId}?userId=${encodeURIComponent(currentUserId)}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to delete message: ${response.status}`)
      }

      return { 
        success: true, 
        messageText: 'Message deleted successfully' 
      }
    } catch (err) {
      console.error('Error deleting message:', err)
      return { success: false, error: err.message }
    }
  }, [currentUserId])

  /**
   * Mark message as read
   */
  const markAsRead = useCallback(async (messageId) => {
    if (!currentUserId) return { success: false }

    try {
      
      await fetch(`/api/messages/${messageId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          UserId: currentUserId,
          MessageId: messageId
        })
      })

      return { success: true }
    } catch (err) {
      console.error('Error marking as read:', err)
      return { success: false, error: err.message }
    }
  }, [currentUserId])

  /**
   * Upload file attachment
   */
  const uploadFile = useCallback(async (file) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('ConversationId', conversationId)
      formData.append('UserId', currentUserId)
      
      const response = await fetch(`/api/messages/upload`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Failed to upload file: ${response.status}`)
      }

      const result = await response.json()
      
      return { 
        success: true, 
        file: {
          fileName: result.fileName || file.name,
          fileUrl: result.url || result.fileUrl,
          fileType: result.fileType || file.type,
          fileSize: result.fileSize || file.size
        }
      }
    } catch (err) {
      console.error('Error uploading file:', err)
      return { success: false, error: err.message }
    }
  }, [conversationId, currentUserId])

  return {
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    uploadFile
  }
}