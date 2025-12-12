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
  AtSign, Hash, User
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
} from '@/hooks/useTeamChat';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';

interface TeamChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamChatDialog({ open, onOpenChange }: TeamChatDialogProps) {
  const { profile } = useAuth();
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
    if (!file || !selectedRoom) return;

    // Upload to Supabase storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    
    // For now, show toast - actual upload would need storage bucket setup
    toast.info('File upload feature requires storage bucket setup');
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
      <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <span className="font-semibold">Team Chat</span>
            {selectedRoom && (
              <span className="text-primary-foreground/70">– {selectedRoom.name}</span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-primary-foreground hover:bg-primary-foreground/10">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex h-[calc(80vh-56px)]">
          {/* Sidebar */}
          <div className="w-64 border-r flex flex-col">
            {/* Actions */}
            <div className="p-2 border-b flex gap-2">
              {isAdmin && (
                <Button size="sm" variant="ghost" onClick={() => setShowNewRoomDialog(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setShowUserSearch(!showUserSearch)}>
                <Users className="w-4 h-4" />
              </Button>
            </div>

            {/* User search for DMs */}
            {showUserSearch && (
              <div className="p-2 border-b space-y-2">
                <Input
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="h-8"
                />
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {filteredUsers.slice(0, 5).map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      onClick={() => handleCreateDM(user)}
                    >
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">{user.name[0]}</AvatarFallback>
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

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'groups' | 'dms')} className="px-2 pt-2">
              <TabsList className="w-full">
                <TabsTrigger value="groups" className="flex-1 text-xs">
                  <Hash className="w-3 h-3 mr-1" />Groups
                </TabsTrigger>
                <TabsTrigger value="dms" className="flex-1 text-xs">
                  <User className="w-3 h-3 mr-1" />DMs
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Rooms List */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {activeTab === 'groups' && (
                  <>
                    <p className="text-xs text-muted-foreground px-2 py-1 font-medium">GROUPS</p>
                    {groupRooms.map(room => (
                      <div
                        key={room.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted",
                          selectedRoom?.id === room.id && "bg-primary/10 text-primary"
                        )}
                        onClick={() => setSelectedRoom(room)}
                      >
                        <Hash className="w-4 h-4" />
                        <span className="text-sm truncate flex-1">{room.name}</span>
                      </div>
                    ))}
                  </>
                )}
                
                {activeTab === 'dms' && (
                  <>
                    <p className="text-xs text-muted-foreground px-2 py-1 font-medium">DIRECT MESSAGES</p>
                    {dmRooms.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                        No DMs yet. Click <Users className="w-3 h-3 inline" /> to start one.
                      </p>
                    ) : (
                      dmRooms.map(room => (
                        <div
                          key={room.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted",
                            selectedRoom?.id === room.id && "bg-primary/10 text-primary"
                          )}
                          onClick={() => setSelectedRoom(room)}
                        >
                          <User className="w-4 h-4" />
                          <span className="text-sm truncate flex-1">{room.name}</span>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedRoom ? (
              <>
                {/* Chat Header */}
                <div className="px-4 py-2 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedRoom.type === 'DIRECT' ? <User className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                    <span className="font-medium">{selectedRoom.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setShowSearch(!showSearch)}>
                      <Search className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => toggleMute.mutate({ roomId: selectedRoom.id, mute: !isRoomMuted })}>
                      {isRoomMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Search Bar */}
                {showSearch && (
                  <div className="px-4 py-2 border-b">
                    <Input
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8"
                    />
                    {searchResults.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Found {searchResults.length} messages
                      </div>
                    )}
                  </div>
                )}

                {/* Pinned Messages */}
                {pinnedMessages.length > 0 && (
                  <div className="px-4 py-2 border-b bg-muted/30">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Pin className="w-3 h-3" />
                      <span>{pinnedMessages.length} pinned message(s)</span>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {(showSearch && searchQuery ? searchResults : messages).map(msg => {
                      const isOwn = msg.sender_id === profile?.id;
                      const isRead = msg.read_by && msg.read_by.length > 0;
                      
                      return (
                        <div key={msg.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[70%] rounded-lg p-3 relative group",
                            isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}>
                            {!isOwn && (
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium">{msg.sender_name}</span>
                                {msg.sender_username && (
                                  <span className="text-xs opacity-60">@{msg.sender_username}</span>
                                )}
                              </div>
                            )}
                            
                            {/* Message content with mentions highlighted */}
                            <p className="text-sm whitespace-pre-wrap">
                              {msg.message_text.split(/(@\w+)/g).map((part, i) => 
                                part.startsWith('@') ? (
                                  <span key={i} className="text-blue-400 font-medium">{part}</span>
                                ) : part
                              )}
                            </p>
                            
                            {/* File attachment */}
                            {msg.file_url && (
                              <div className="mt-2">
                                {msg.file_type?.startsWith('image/') ? (
                                  <img src={msg.file_url} alt={msg.file_name || 'attachment'} className="max-w-full rounded" />
                                ) : (
                                  <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="text-xs underline">
                                    📎 {msg.file_name}
                                  </a>
                                )}
                              </div>
                            )}
                            
                            {/* Timestamp and read status */}
                            <div className={cn(
                              "flex items-center gap-1 mt-1",
                              isOwn ? "justify-end" : "justify-start"
                            )}>
                              <span className={cn(
                                "text-xs",
                                isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                              )}>
                                {formatMessageDate(msg.created_at)}
                              </span>
                              {isOwn && (
                                isRead ? (
                                  <CheckCheck className="w-3 h-3 text-blue-400" />
                                ) : (
                                  <Check className="w-3 h-3 opacity-60" />
                                )
                              )}
                              {msg.is_pinned && <Pin className="w-3 h-3 text-yellow-500" />}
                            </div>

                            {/* Pin button on hover */}
                            {isAdmin && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 h-6 w-6"
                                onClick={() => pinMessage.mutate({ messageId: msg.id, roomId: selectedRoom.id, pin: !msg.is_pinned })}
                              >
                                <Pin className={cn("w-3 h-3", msg.is_pinned && "text-yellow-500")} />
                              </Button>
                            )}
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
                    <div className="absolute bottom-full left-4 right-4 mb-2 bg-popover border rounded-lg shadow-lg p-2 space-y-1">
                      {mentionFilteredUsers.map(user => (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                          onClick={() => insertMention(user.username || user.name)}
                        >
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">{user.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                    />
                    <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Input
                      ref={inputRef}
                      value={message}
                      onChange={handleMessageChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message... (@mention)"
                      className="flex-1"
                    />
                    <Button onClick={handleSend} disabled={!message.trim() || sendMessage.isPending}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a room to start chatting
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
      </DialogContent>
    </Dialog>
  );
}

// Need to add toast import
import { toast } from 'sonner';
