import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, X, Plus, Users, MessageSquare, Search, 
  Paperclip, Pin, Volume2, VolumeX, Check, CheckCheck,
  AtSign, Hash, User, FileText, Image, Loader2, ExternalLink
} from 'lucide-react';
import { 
  useStoreChatRooms, 
  useStoreChatMessages, 
  useSendChatMessage, 
  useCreateChatRoom,
  useDeleteChatRoom,
  useMarkMessagesAsRead,
  usePinMessage,
  useToggleMuteRoom,
  useSearchMessages,
  usePinnedMessages,
  useStoreUsers,
  useCreateDMRoom,
  useEnsureDefaultGroups,
  ChatRoom,
  uploadChatFile,
} from '@/hooks/useTeamChat';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TeamChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// URL detection regex
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// Render message text with clickable links
function renderMessageWithLinks(text: string) {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      const domain = new URL(part).hostname;
      return (
        <a 
          key={i} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline inline-flex items-center gap-1"
        >
          {domain} <ExternalLink className="w-3 h-3" />
        </a>
      );
    }
    // Handle @mentions
    return part.split(/(@\w+)/g).map((subPart, j) => 
      subPart.startsWith('@') ? (
        <span key={`${i}-${j}`} className="text-blue-400 font-medium">{subPart}</span>
      ) : subPart
    );
  });
}

export function TeamChatDialog({ open, onOpenChange }: TeamChatDialogProps) {
  const { profile } = useAuth();
  const storeId = useCurrentStoreId();
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNewRoomDialog, setShowNewRoomDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'groups' | 'dms'>('groups');
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: rooms = [] } = useStoreChatRooms();
  const { data: messages = [] } = useStoreChatMessages(selectedRoom?.id || null);
  const { data: searchResults = [] } = useSearchMessages(selectedRoom?.id || null, searchQuery);
  const { data: pinnedMessages = [] } = usePinnedMessages(selectedRoom?.id || null);
  const { data: storeUsers = [] } = useStoreUsers();
  const sendMessage = useSendChatMessage();
  const createRoom = useCreateChatRoom();
  const deleteRoom = useDeleteChatRoom();
  const markAsRead = useMarkMessagesAsRead();
  const pinMessage = usePinMessage();
  const toggleMute = useToggleMuteRoom();
  const createDM = useCreateDMRoom();
  const ensureDefaultGroups = useEnsureDefaultGroups();

  // Ensure default groups exist
  useEffect(() => {
    if (open && rooms.length === 0) {
      ensureDefaultGroups.mutate();
    }
  }, [open, rooms.length]);

  // Auto-select first room
  useEffect(() => {
    if (rooms.length && !selectedRoom) {
      const groupRooms = rooms.filter(r => r.type !== 'DIRECT');
      if (groupRooms.length) setSelectedRoom(groupRooms[0]);
    }
  }, [rooms, selectedRoom]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (selectedRoom && messages.length > 0 && profile?.id) {
      const unreadIds = messages
        .filter(m => m.sender_id !== profile.id && !m.read_by?.includes(profile.id))
        .map(m => m.id);
      if (unreadIds.length > 0) {
        markAsRead.mutate({ roomId: selectedRoom.id, messageIds: unreadIds });
      }
    }
  }, [selectedRoom, messages, profile?.id]);

  const handleSend = async () => {
    if (!message.trim() || !selectedRoom) return;
    
    // Extract mentions from message
    const mentionRegex = /@(\w+)/g;
    const mentionMatches = message.match(mentionRegex) || [];
    const mentionedUsernames = mentionMatches.map(m => m.substring(1));
    const mentionedUserIds = storeUsers
      .filter(u => mentionedUsernames.includes(u.username || ''))
      .map(u => u.id);

    await sendMessage.mutateAsync({ 
      roomId: selectedRoom.id, 
      message: message.trim(),
      mentions: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
    });
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    
    // Handle @ mentions
    if (e.key === '@') {
      setShowMentions(true);
      setMentionSearch('');
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Check for mention trigger
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      setShowMentions(true);
      setMentionSearch('');
    } else if (lastAtIndex !== -1) {
      const afterAt = value.substring(lastAtIndex + 1);
      if (!afterAt.includes(' ')) {
        setMentionSearch(afterAt);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (username: string) => {
    const lastAtIndex = message.lastIndexOf('@');
    const newMessage = message.substring(0, lastAtIndex) + `@${username} `;
    setMessage(newMessage);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    await createRoom.mutateAsync({ name: newRoomName, type: 'DEPARTMENT' });
    setNewRoomName('');
    setShowNewRoomDialog(false);
  };

  const handleCreateDM = async (user: { id: string; username: string | null }) => {
    if (!user.username) return;
    const room = await createDM.mutateAsync({ 
      targetUserId: user.id, 
      targetUsername: user.username 
    });
    setSelectedRoom(room as ChatRoom);
    setShowUserSearch(false);
    setUserSearchQuery('');
    setActiveTab('dms');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoom || !storeId) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Unsupported file type. Allowed: JPG, PNG, WEBP, PDF, DOCX, XLSX');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadChatFile(file, storeId);
      if (result) {
        // Extract mentions from message
        const mentionRegex = /@(\w+)/g;
        const mentionMatches = message.match(mentionRegex) || [];
        const mentionedUsernames = mentionMatches.map(m => m.substring(1));
        const mentionedUserIds = storeUsers
          .filter(u => mentionedUsernames.includes(u.username || ''))
          .map(u => u.id);

        await sendMessage.mutateAsync({ 
          roomId: selectedRoom.id, 
          message: message.trim() || `Shared ${file.type.startsWith('image/') ? 'an image' : 'a file'}`,
          fileUrl: result.url,
          fileType: result.type,
          fileName: result.name,
          mentions: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
        });
        setMessage('');
        toast.success('File uploaded');
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatMessageDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`;
    return format(date, 'MMM d, HH:mm');
  };

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'OWNER';
  const groupRooms = rooms.filter(r => r.type !== 'DIRECT');
  const dmRooms = rooms.filter(r => r.type === 'DIRECT');
  const isRoomMuted = selectedRoom?.is_muted_by?.includes(profile?.id || '');

  const filteredUsers = storeUsers.filter(u => 
    u.id !== profile?.id &&
    (userSearchQuery === '' || 
     u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
     u.username?.toLowerCase().includes(userSearchQuery.toLowerCase()))
  );

  const mentionFilteredUsers = storeUsers.filter(u =>
    mentionSearch === '' ||
    u.name.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    u.username?.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[600px] p-0 overflow-hidden rounded-2xl shadow-2xl border-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-primary text-primary-foreground rounded-t-2xl">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6" />
            <span className="font-semibold text-lg">Team Chat</span>
            {selectedRoom && (
              <span className="text-primary-foreground/70 text-lg">– {selectedRoom.name}</span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex h-[calc(600px-64px)]">
          {/* Sidebar */}
          <div className="w-56 border-r bg-muted/20 flex flex-col">
            {/* Actions */}
            <div className="px-4 py-3 border-b flex gap-3">
              {isAdmin && (
                <button 
                  onClick={() => setShowNewRoomDialog(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                >
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
              <button 
                onClick={() => setShowUserSearch(!showUserSearch)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              >
                <Users className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* User search for DMs */}
            {showUserSearch && (
              <div className="p-3 border-b space-y-2 bg-background">
                <Input
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="h-9 rounded-lg"
                />
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {filteredUsers.slice(0, 5).map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => handleCreateDM(user)}
                    >
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">{user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Groups Section */}
            <ScrollArea className="flex-1">
              <div className="p-3">
                <p className="text-xs text-muted-foreground font-semibold tracking-wider mb-2">GROUPS</p>
                <div className="space-y-0.5">
                  {groupRooms.map(room => (
                    <div
                      key={room.id}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                        selectedRoom?.id === room.id 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "hover:bg-muted text-foreground"
                      )}
                      onClick={() => { setSelectedRoom(room); setActiveTab('groups'); }}
                    >
                      <span className="text-sm">{room.name}</span>
                    </div>
                  ))}
                </div>

                {/* DMs Section */}
                {dmRooms.length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground font-semibold tracking-wider mt-6 mb-2">DIRECT MESSAGES</p>
                    <div className="space-y-0.5">
                      {dmRooms.map(room => (
                        <div
                          key={room.id}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                            selectedRoom?.id === room.id 
                              ? "bg-primary/10 text-primary font-medium" 
                              : "hover:bg-muted text-foreground"
                          )}
                          onClick={() => { setSelectedRoom(room); setActiveTab('dms'); }}
                        >
                          <User className="w-4 h-4" />
                          <span className="text-sm truncate">{room.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-background">
            {selectedRoom ? (
              <>
                {/* Search Bar (toggleable) */}
                {showSearch && (
                  <div className="px-4 py-2 border-b bg-muted/30">
                    <Input
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 rounded-lg"
                    />
                    {searchResults.length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Found {searchResults.length} messages
                      </div>
                    )}
                  </div>
                )}

                {/* Pinned Messages */}
                {pinnedMessages.length > 0 && (
                  <div className="px-4 py-2 border-b bg-amber-50 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                      <Pin className="w-3 h-3" />
                      <span>{pinnedMessages.length} pinned message(s)</span>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <ScrollArea className="flex-1 px-4 py-3">
                  <div className="space-y-4">
                    {(showSearch && searchQuery ? searchResults : messages).map(msg => {
                      const isOwn = msg.sender_id === profile?.id;
                      const isRead = msg.read_by && msg.read_by.length > 0;
                      
                      return (
                        <div key={msg.id} className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
                          {/* Sender name - only for others' messages */}
                          {!isOwn && (
                            <span className="text-sm text-muted-foreground mb-1 ml-1">{msg.sender_name}</span>
                          )}
                          
                          <div className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2.5 relative group",
                            isOwn 
                              ? "bg-primary text-primary-foreground rounded-br-md" 
                              : "bg-muted rounded-bl-md"
                          )}>
                            {/* Message content with links and mentions highlighted */}
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {renderMessageWithLinks(msg.message_text)}
                            </p>
                            
                            {/* File attachment */}
                            {msg.file_url && (
                              <div className="mt-2">
                                {msg.file_type?.startsWith('image/') ? (
                                  <div 
                                    className="cursor-pointer" 
                                    onClick={() => setPreviewImage(msg.file_url)}
                                  >
                                    <img 
                                      src={msg.file_url} 
                                      alt={msg.file_name || 'attachment'} 
                                      className="max-w-full max-h-48 rounded-xl object-cover hover:opacity-90 transition-opacity border border-border/20" 
                                    />
                                  </div>
                                ) : (
                                  <a 
                                    href={msg.file_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex items-center gap-2 p-2.5 rounded-xl bg-background/50 hover:bg-background/80 transition-colors border border-border/20"
                                  >
                                    <FileText className="w-5 h-5 text-muted-foreground" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">{msg.file_name}</p>
                                      <p className="text-xs text-muted-foreground">Click to download</p>
                                    </div>
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Pin button on hover */}
                            {isAdmin && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-7 w-7 rounded-full"
                                onClick={() => pinMessage.mutate({ messageId: msg.id, roomId: selectedRoom.id, pin: !msg.is_pinned })}
                              >
                                <Pin className={cn("w-3.5 h-3.5", msg.is_pinned && "text-amber-500")} />
                              </Button>
                            )}
                          </div>
                          
                          {/* Timestamp and read status - outside bubble */}
                          <div className={cn(
                            "flex items-center gap-1 mt-1",
                            isOwn ? "mr-1" : "ml-1"
                          )}>
                            <span className="text-[11px] text-muted-foreground">
                              {formatMessageDate(msg.created_at)}
                            </span>
                            {isOwn && (
                              isRead ? (
                                <CheckCheck className="w-3.5 h-3.5 text-primary" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-muted-foreground" />
                              )
                            )}
                            {msg.is_pinned && <Pin className="w-3 h-3 text-amber-500" />}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 border-t relative">
                  {/* Mention suggestions */}
                  {showMentions && mentionFilteredUsers.length > 0 && (
                    <div className="absolute bottom-full left-4 right-4 mb-2 bg-popover border rounded-xl shadow-xl p-2 space-y-1">
                      {mentionFilteredUsers.map(user => (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => insertMention(user.username || user.name)}
                        >
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">{user.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp,.pdf,.docx,.xlsx"
                      onChange={handleFileUpload}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                    </button>
                    <Input
                      ref={inputRef}
                      value={message}
                      onChange={handleMessageChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message... (@"
                      className="flex-1 h-11 rounded-full border-muted-foreground/20 px-4"
                      disabled={uploading}
                    />
                    <button 
                      onClick={handleSend} 
                      disabled={!message.trim() || sendMessage.isPending || uploading}
                      className="w-11 h-11 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>Select a chat to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* New Room Dialog */}
        {showNewRoomDialog && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="bg-background border rounded-lg p-4 w-80 shadow-lg">
              <h3 className="font-semibold mb-4">Create New Group</h3>
              <Input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Group name"
                className="mb-4"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowNewRoomDialog(false)}>Cancel</Button>
                <Button onClick={handleCreateRoom} disabled={!newRoomName.trim()}>Create</Button>
              </div>
            </div>
          </div>
        )}

        {/* Image Preview Modal */}
        {previewImage && (
          <div 
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 cursor-pointer"
            onClick={() => setPreviewImage(null)}
          >
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-[90%] max-h-[90%] object-contain rounded-lg"
            />
            <Button 
              size="icon" 
              variant="ghost" 
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setPreviewImage(null)}
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
