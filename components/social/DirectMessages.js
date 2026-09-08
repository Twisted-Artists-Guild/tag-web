/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first

 🎯 ORCHESTRATION: Full messaging display & management component.
    Loads conversations from database, manages state, uses API hooks.
    Supports both API mode and Demo mode.
    Exports: DirectMessages (default)
*/

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { IoSend, IoTimeOutline, IoCheckmarkSharp, IoCheckmarkDoneSharp, IoTrashOutline, IoCreateOutline, IoAttachOutline, IoCloseCircle } from "react-icons/io5";
import { sanitizeDefaultHtml } from "@/components/security/sanitize";
import { useSession } from 'next-auth/react';
import { useMessagingRealtime } from '@/components/messaging/MessagingRealtimeProvider';

// Import components
import Image from "next/image";
import TiptapEditor from "@/components/tiptap/tiptap-editor";
import { getIdentityGlowStyle } from "@/utils/identityGlow";
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useMessageActions } from '@/hooks/useMessageActions';
import { useImpressions, ImpressionTargetType } from '@/hooks/useImpressions';
import ImpressionReactions from './ImpressionReactions';

/**
 * DirectMessages - A chat component for 1:1 and group conversations with rich text support
 * 
 * @param {Object} props
 * @param {boolean} props.apiMode - Use API mode (true) or Demo mode (false)
 * @param {boolean} props.compact - Whether to show in compact mode
 * @param {boolean} props.allowMedia - Whether to allow image/video embedding
 * @param {boolean} props.readOnly - Whether the messages are read-only
 * @param {number} props.maxHeight - Optional max height for the messages container
 * @param {string} props.initialConversationId - Optional initial conversation to display
 */
const DirectMessages = ({
    apiMode = true,
    compact = false,
    allowMedia = true,
    readOnly = false,
    maxHeight = compact ? 300 : 600,
    initialConversationId = null,
    currentUserId = null,
    currentUser: propCurrentUser = null,
    panelColor = null,
    composerContextControl = null,
}) => {
    const { data: session } = useSession();
    const currentUser = propCurrentUser || session?.user || { id: currentUserId };
    
    // State management
    const [newMessageContent, setNewMessageContent] = useState("");
    const [activeConversationId, setActiveConversationId] = useState(initialConversationId);
    const [showConversationList, setShowConversationList] = useState(!initialConversationId);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingContent, setEditingContent] = useState("");
    const [typingUsers, setTypingUsers] = useState([]); // ADD THIS
    const [clientTheme] = useState(() => {
        if (typeof window === 'undefined') return 'tag-theme';
        return localStorage.getItem("theme") || "tag-theme";
    });
    
    // Ref for auto-scrolling
    const messagesEndRefInternal = useRef(null);
    const messagesContainerRef = useRef(null); // ADD THIS
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    
    // Real-time functionality from SignalR context
    const { isConnected, joinConversation: contextJoinConversation, leaveConversation: contextLeaveConversation, sendTypingIndicator: contextSendTyping } = useMessagingRealtime();
    
    // Use hooks to fetch data (DirectMessages manages its own data)
    const {
        conversations: apiConversations,
        loading: conversationsLoading,
        markAsRead,
        refetch: refetchConversations
    } = useConversations(currentUser?.id, apiMode && !!currentUser);
    
    const {
        messages: apiMessages,
        loading: messagesLoading,
        hasMore,
        loadMore,
        addMessage: addMessageToState,
        updateMessage: updateMessageInState,
        removeMessage: removeMessageFromState,
        refetch: refetchMessages
    } = useMessages(activeConversationId, apiMode && !!activeConversationId);
    
    // Find active conversation
    const activeConversation = apiConversations.find(c => c.id === activeConversationId);
    
    const {
        sendMessage,
        editMessage,
        deleteMessage,
        uploadFile
    } = useMessageActions(activeConversationId, currentUser?.id, activeConversation);
    
    console.log('📊 DirectMessages State:', {
        activeConversationId,
        messagesCount: apiMessages?.length || 0,
        conversationsCount: apiConversations?.length || 0,
        messagesLoading
    });
    
    // Listen for SignalR events from context
    useEffect(() => {
        const handleMessage = (event) => {
            const update = event.detail;
            console.log('📨 SignalR message event received:', update);
            
            if (update.type === 'message_received' && update.data.conversationId?.toString() === activeConversationId?.toString()) {
                const messageData = update.data;
                
                // Extract sender info with fallbacks
                const senderId = messageData.senderId || messageData.fromUserId;
                let senderName = messageData.senderDisplayName;
                let senderAvatar = messageData.avatarUrl;
                
                // If it's the current user's message, use their info
                if (senderId?.toString() === currentUser?.id?.toString()) {
                    senderName = currentUser?.name || currentUser?.username || 'You';
                    senderAvatar = currentUser?.image || currentUser?.profilePic?.URL || '/images/default-avatar.png';
                } else {
                    // For other users, try to find their info from conversation participants
                    if (activeConversation?.participants) {
                        const participant = activeConversation.participants.find(p => 
                            p.id?.toString() === senderId?.toString() || 
                            p.userId?.toString() === senderId?.toString()
                        );
                        if (participant) {
                            senderName = participant.displayName || participant.username || senderName || 'Unknown';
                            senderAvatar = participant.avatarUrl || senderAvatar || '/images/default-avatar.png';
                        }
                    }
                    
                    // Final fallbacks
                    senderName = senderName || 'Unknown User';
                    senderAvatar = senderAvatar || '/images/default-avatar.png';
                }
                
                const newMessage = {
                    id: messageData.id || messageData.messageId,
                    content: messageData.content || messageData.body,
                    senderId: senderId,
                    senderName: senderName,
                    senderAvatar: senderAvatar,
                    timestamp: messageData.timestamp || messageData.createdAt || new Date().toISOString(),
                    status: 'delivered',
                    attachments: messageData.attachments || []
                };
                
                console.log('✅ Adding message with sender info:', {
                    id: newMessage.id,
                    senderId: newMessage.senderId,
                    senderName: newMessage.senderName,
                    senderAvatar: newMessage.senderAvatar
                });
                
                addMessageToState(newMessage);
                scrollToBottom();
            } else if (update.type === 'message_updated') {
                updateMessageInState(update.data.id, {
                    content: update.data.content,
                    isEdited: true
                });
            } else if (update.type === 'message_deleted') {
                removeMessageFromState(update.data.id);
            }
        };

        const handleTyping = (event) => {
            const data = event.detail;
            if (data.conversationId?.toString() === activeConversationId?.toString() && data.userId !== currentUser?.id) {
                if (data.isTyping) {
                    setTypingUsers(prev => [...new Set([...prev, data.username])]);
                } else {
                    setTypingUsers(prev => prev.filter(u => u !== data.username));
                }
            }
        };

        window.addEventListener('signalr:message', handleMessage);
        window.addEventListener('signalr:typing', handleTyping);

        return () => {
            window.removeEventListener('signalr:message', handleMessage);
            window.removeEventListener('signalr:typing', handleTyping);
        };
    }, [activeConversationId, currentUser, activeConversation, addMessageToState, updateMessageInState, removeMessageFromState]);

    // Join/leave conversation
    useEffect(() => {
        if (activeConversationId && isConnected) {
            console.log('📥 Joining conversation:', activeConversationId);
            contextJoinConversation(activeConversationId);
            
            return () => {
                console.log('📤 Leaving conversation:', activeConversationId);
                contextLeaveConversation(activeConversationId);
            };
        }
    }, [activeConversationId, isConnected, contextJoinConversation, contextLeaveConversation]);

    // Scroll to bottom
    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            if (messagesContainerRef.current) {
                // Scroll the container, not the page
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
        }, 100);
    }, []);
    
    // Scroll on new messages
    useEffect(() => {
        if (apiMessages?.length > 0) {
            scrollToBottom();
        }
    }, [apiMessages, scrollToBottom]);
    
    // Handle typing
    const handleTyping = useCallback((content) => {
        setNewMessageContent(content);
        
        if (isConnected && activeConversationId) {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            
            contextSendTyping(activeConversationId, true);
            
            typingTimeoutRef.current = setTimeout(() => {
                contextSendTyping(activeConversationId, false);
            }, 2000);
        }
    }, [isConnected, activeConversationId, contextSendTyping]);
    
    // Format timestamp
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
               ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    
    // Handle file selection
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        setSelectedFiles(prev => [...prev, ...files]);
    };
    
    // Remove selected file
    const handleRemoveFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };
    
    // Handle sending message
    const handleSendMessage = async () => {
        const textOnly = newMessageContent.replace(/<[^>]*>/g, '').trim();
        if ((!textOnly && selectedFiles.length === 0) || readOnly) return;
        
        const messageContentToSend = newMessageContent;
        const filesToSend = [...selectedFiles];
        
        // Clear inputs
        setNewMessageContent("");
        setSelectedFiles([]);
        
        // Stop typing indicator
        if (isConnected && activeConversationId) {
            contextSendTyping(activeConversationId, false);
        }
        
        if (apiMode) {
            // Optimistically add message
            const tempMessage = {
                id: `temp-${Date.now()}`,
                content: messageContentToSend,
                senderId: currentUser?.id,
                senderName: currentUser?.name || 'You',
                senderAvatar: currentUser?.image || '/images/default-avatar.png',
                timestamp: new Date().toISOString(),
                status: 'sending'
            };
            addMessageToState(tempMessage);
            
            setUploadingFiles(true);
            const result = await sendMessage(messageContentToSend, filesToSend);
            setUploadingFiles(false);
            
            if (result.success) {
                // Remove temp message and let SignalR add the real one
                removeMessageFromState(tempMessage.id);
                scrollToBottom();
                refetchConversations();
            } else {
                console.error('Failed to send message:', result.error);
                alert(`Failed to send message: ${result.error}`);
                removeMessageFromState(tempMessage.id);
                // Restore content
                setNewMessageContent(messageContentToSend);
                setSelectedFiles(filesToSend);
            }
        }
    };
    
    // Handle message edit
    const handleEditMessage = async (messageId) => {
        const message = apiMessages.find(m => m.id === messageId);
        if (!message) return;
        
        setEditingMessageId(messageId);
        setEditingContent(message.content);
    };
    
    // Save edited message
    const handleSaveEdit = async (messageId) => {
        const result = await editMessage(messageId, editingContent);
        
        if (result.success) {
            // Call parent callback
            // onMessageUpdated(messageId, {
            //     content: editingContent,
            //     isEdited: true
            // });
            
            setEditingMessageId(null);
            setEditingContent("");
        } else {
            console.error('Failed to edit message:', result.error);
            alert(`Failed to edit message: ${result.error}`);
        }
    };
    
    // Cancel edit
    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditingContent("");
    };
    
    // Handle message delete
    const handleDeleteMessage = async (messageId) => {
        if (!confirm('Delete this message?')) return;
        
        const result = await deleteMessage(messageId);
        
        if (result.success) {
            // Call the callback from parent component
            // onMessageDeleted(messageId);
        } else {
            console.error('Failed to delete message:', result.error);
            alert(`Failed to delete message: ${result.error}`);
        }
    };
    
    // Handle conversation selection
    const handleSelectConversation = (conv) => {
        setActiveConversationId(conv.id);
        setShowConversationList(false);
        markAsRead(conv.id);
    };
    
    // Back to conversation list
    const handleBackToList = () => {
        setActiveConversationId(null);
        setShowConversationList(true);
    };
    
    // Group messages by sender for UI
    const groupMessagesBySender = useCallback((messages) => {
        if (!messages || messages.length === 0) return [];
        
        const groups = [];
        let currentGroup = null;
        
        // Messages should already be sorted oldest->newest
        messages.forEach((message) => {
            if (!currentGroup || currentGroup.senderId !== message.senderId) {
                currentGroup = {
                    senderId: message.senderId,
                    senderName: message.senderName,
                    senderAvatar: message.senderAvatar,
                    messages: []
                };
                groups.push(currentGroup);
            }
            currentGroup.messages.push(message);
        });
        
        return groups;
    }, []);
    
    // Sort and group messages for display
    const groupedMessages = useMemo(() => {
        if (!apiMessages || apiMessages.length === 0) {
            console.log('⚠️ No messages to display');
            return [];
        }
        
        // CRITICAL: Sort messages OLDEST first (newest at bottom)
        const sortedMessages = [...apiMessages].sort((a, b) => {
            const timeA = new Date(a.timestamp || a.createdAt).getTime();
            const timeB = new Date(b.timestamp || b.createdAt).getTime();
            return timeA - timeB; // Ascending: oldest → newest
        });
        
        console.log('✅ Sorted messages:', sortedMessages.length, 'messages');
        
        // Group by sender
        return groupMessagesBySender(sortedMessages);
    }, [apiMessages, groupMessagesBySender]);
    
    console.log('📊 Grouped messages:', groupedMessages.length, 'groups');
    
    // Message Bubble Component
    const MessageBubble = ({ message, isOwnMessage }) => {
        const {
            impressions,
            loading: impressionsLoading,
            toggleReaction
        } = useImpressions(message.id, ImpressionTargetType.MESSAGE, !message.id?.toString().startsWith('temp-'));
        
        const isEditing = editingMessageId === message.id;
        
        return (
            <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}>
                <div className={`max-w-[70%] ${isOwnMessage ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content'} rounded-lg p-3`}>
                    {isEditing ? (
                        <div>
                            <TiptapEditor
                                value={editingContent}
                                onChange={setEditingContent}
                                className="bg-base-100 mb-2"
                                preset="minimal"
                            />
                            <div className="flex gap-2 justify-end">
                                <button 
                                    className="btn btn-xs btn-ghost" 
                                    onClick={handleCancelEdit}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="btn btn-xs btn-primary" 
                                    onClick={() => handleSaveEdit(message.id)}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div 
                                className="prose max-w-none"
                                dangerouslySetInnerHTML={{ __html: sanitizeDefaultHtml(message.content) }}
                            />
                            
                            {/* File attachments */}
                            {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {message.attachments.map((file, idx) => (
                                        <a 
                                            key={idx}
                                            href={file.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-xs underline"
                                        >
                                            <IoAttachOutline />
                                            {file.fileName}
                                        </a>
                                    ))}
                                </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                                <span>{formatTimestamp(message.timestamp)}</span>
                                {isOwnMessage && (
                                    <div className="flex items-center gap-1">
                                        {message.status === 'read' && <IoCheckmarkDoneSharp className="text-success" />}
                                        {message.status === 'delivered' && <IoCheckmarkSharp />}
                                        {message.status === 'sent' && <IoCheckmarkSharp className="opacity-50" />}
                                        {message.status === 'sending' && <IoTimeOutline />}
                                    </div>
                                )}
                            </div>
                            
                            {message.isEdited && (
                                <span className="text-xs opacity-60">(edited)</span>
                            )}
                        </>
                    )}
                    
                    {/* Impressions */}
                    {!isEditing && !impressionsLoading && impressions && impressions.length > 0 && (
                        <div className="mt-2">
                            <ImpressionReactions
                                impressions={impressions}
                                currentUser={currentUser}
                                onToggle={toggleReaction}
                                readOnly={readOnly}
                                size="sm"
                                showDetails={false}
                                targetId={message.id}
                                targetType="message"
                            />
                        </div>
                    )}
                    
                    {/* Actions */}
                    {!isEditing && isOwnMessage && !readOnly && (
                        <div className="flex gap-2 mt-2">
                            <button 
                                className="btn btn-xs btn-ghost"
                                onClick={() => handleEditMessage(message.id)}
                            >
                                <IoCreateOutline />
                            </button>
                            <button 
                                className="btn btn-xs btn-ghost text-error"
                                onClick={() => handleDeleteMessage(message.id)}
                            >
                                <IoTrashOutline />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    // Loading state
    if (messagesLoading) {
        return <div className="p-4 animate-pulse">Loading messages...</div>;
    }
    
    // Show conversation list
    if (showConversationList || !activeConversationId) {
        return (
            <div className={`direct-messages ${compact ? 'dm-compact' : 'dm-full'} flex flex-col h-full`} data-theme={clientTheme}>
                {/* Conversation list header */}
                <div className="p-3 bg-base-200 border-b border-base-300 flex items-center">
                    <h3 className="font-bold text-lg flex-1">Messages</h3>
                    {apiMode && <span className="badge badge-sm badge-success">Live</span>}
                </div>
                
                {/* Search box */}
                <div className="p-2 border-b border-base-300">
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        className="input input-sm input-bordered w-full"
                    />
                </div>
                
                {/* Conversation list */}
                <div className="grow overflow-y-auto">
                    {apiConversations.length === 0 ? (
                        <div className="p-8 text-center text-base-content/60">
                            <p>No conversations yet</p>
                        </div>
                    ) : (
                        apiConversations.map((conv) => (
                            <div 
                                key={conv.id}
                                className={`p-3 border-b border-base-200 hover:bg-base-200/60 cursor-pointer transition-colors ${conv.unreadCount > 0 ? 'bg-primary/10' : ''}`}
                                onClick={() => handleSelectConversation(conv)}
                            >
                                <div className="flex items-center">
                                    <div className="avatar mr-3">
                                        <div className="w-10 h-10 rounded-full relative">
                                            <Image
                                                src={conv.participants?.[0]?.avatarUrl || "/images/default-avatar.png"}
                                                alt={conv.participants?.[0]?.displayName || "User"}
                                                width={40}
                                                height={40}
                                                className="rounded-full object-cover"
                                            />
                                            {conv.participants?.[0]?.isOnline && (
                                                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-base-100 bg-success"></div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline">
                                            <h4 className="font-medium truncate">
                                                {conv.isGroup ? conv.name : (conv.participants?.[0]?.displayName || 'Unknown')}
                                            </h4>
                                            <span className="text-xs text-base-content/70 whitespace-nowrap ml-2">
                                                {conv.lastMessageTime}
                                            </span>
                                        </div>
                                        <p className="text-sm text-base-content/70 truncate">{conv.lastMessage}</p>
                                    </div>
                                    
                                    {conv.unreadCount > 0 && (
                                        <div className="ml-2">
                                            <div className="badge badge-sm badge-primary">{conv.unreadCount}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }
    
    // Show active conversation
    return (
        <div className={`direct-messages ${compact ? 'dm-compact' : 'dm-full'} flex flex-col h-full`} data-theme={clientTheme}>
            {/* Conversation header */}
            <div className="p-3 bg-base-200 border-b border-base-300 flex items-center">
                <button 
                    onClick={handleBackToList}
                    className="btn btn-ghost btn-sm btn-circle mr-2"
                >
                    ←
                </button>
                
                {activeConversation && (
                    <>
                        <div className="avatar mr-2">
                            <div className="w-8 h-8 rounded-full">
                                <Image
                                    src={activeConversation.participants?.[0]?.avatarUrl || "/images/default-avatar.png"}
                                    alt={activeConversation.participants?.[0]?.displayName || "User"}
                                    width={32}
                                    height={32}
                                    className="object-cover"
                                />
                            </div>
                        </div>
                        <div>
                            <h4 className="font-medium">
                                {activeConversation.isGroup ? activeConversation.name : activeConversation.participants?.[0]?.displayName}
                            </h4>
                            {activeConversation.participants?.[0]?.isOnline && (
                                <span className="text-xs text-success">Online</span>
                            )}
                        </div>
                    </>
                )}
            </div>
            
            {/* Messages container */}
            <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4"
            >
                {groupedMessages.length === 0 ? (
                    <div className="text-center text-base-content/60 py-8">
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    <>
                        {/* Message List */}
                        <div className="space-y-4">
                            {groupedMessages.map((group, groupIdx) => {
                                // FIXED: Use loose equality to handle string/number mismatch
                                const isOwnMessage = group.senderId?.toString() === currentUser?.id?.toString();
                                
                                return (
                                    <div key={groupIdx} className="space-y-1">
                                        {/* Sender info - show once per group */}
                                        {!isOwnMessage && (
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="avatar">
                                                    <div className="w-6 h-6 rounded-full">
                                                        <Image
                                                            src={group.senderAvatar || "/images/default-avatar.png"}
                                                            alt={group.senderName}
                                                            width={24}
                                                            height={24}
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                </div>
                                                <span className="text-sm font-medium">{group.senderName}</span>
                                            </div>
                                        )}
                                        
                                        {group.messages.map((message) => (
                                            <MessageBubble
                                                key={message.id}
                                                message={message}
                                                isOwnMessage={isOwnMessage}
                                            />
                                        ))}
                                    </div>
                                );
                            })}
                        
                            {/* Typing Indicator */}
                            {typingUsers && typingUsers.length > 0 && (
                                <div className="text-sm text-base-content/70 italic px-4 py-2">
                                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                                </div>
                            )}
                        
                            {/* Scroll Anchor - Keep for reference but we use scrollTop now */}
                            <div ref={messagesEndRefInternal} style={{ height: '1px' }} />
                        </div>
                    </>
                )}
            </div>
            
            {/* File preview */}
            {selectedFiles.length > 0 && (
                <div className="px-4 py-2 bg-base-200 border-t border-base-300">
                    <div className="flex flex-wrap gap-2">
                        {selectedFiles.map((file, idx) => (
                            <div key={idx} className="badge badge-lg gap-2">
                                <span className="truncate max-w-[150px]">{file.name}</span>
                                <button 
                                    onClick={() => handleRemoveFile(idx)}
                                    className="btn btn-ghost btn-xs btn-circle"
                                >
                                    <IoCloseCircle />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Message composer */}
            {!readOnly && (
                <div className="p-3 border-t border-base-300 bg-base-200 space-y-2">
                    {composerContextControl ? (
                        <div className="flex items-center justify-between gap-2 px-1">
                            <span className="text-[11px] text-base-content/60 font-medium">Posting Identity:</span>
                            {composerContextControl}
                        </div>
                    ) : null}
                    <div
                        className="flex gap-2 items-center p-1.5 rounded-box bg-base-100 border transition-all"
                        style={getIdentityGlowStyle(panelColor || currentUser, { type: currentUser?.type || "user" })}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <button 
                            className="btn btn-sm btn-circle btn-ghost"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingFiles}
                            title="Attach file"
                        >
                            <IoAttachOutline className="text-lg" />
                        </button>
                        
                        <div className="flex-1 min-w-0">
                            <TiptapEditor
                                value={newMessageContent}
                                onChange={handleTyping}
                                placeholder="Type a message..."
                                className="bg-transparent border-0"
                                preset={allowMedia ? "medium" : "minimal"}
                            />
                        </div>
                        
                        <button 
                            className="btn btn-sm btn-circle btn-primary"
                            onClick={handleSendMessage}
                            disabled={uploadingFiles || (!newMessageContent.trim() && selectedFiles.length === 0)}
                        >
                            {uploadingFiles ? (
                                <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                                <IoSend />
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DirectMessages;
