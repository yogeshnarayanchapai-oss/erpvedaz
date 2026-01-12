import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Send, X, Plus, Users, MessageSquare, Search, 
  Paperclip, Pin, Volume2, VolumeX, Check, CheckCheck,
  AtSign, Hash, User, FileText, Image, Loader2, ExternalLink, UserPlus, Maximize2,
  Menu, ArrowLeft
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
  useEmployeeUsers,
  useCreateDMRoom,
  useEnsureDefaultGroups,
  useUnreadCountPerRoom,
  useMarkRoomAsRead,
  useAddRoomParticipants,
  ChatRoom,
  uploadChatFile,
} from '@/hooks/useTeamChat';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  const navigate = useNavigate();
  const { profile } = useAuth();
  const storeId = useCurrentStoreId();
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNewRoomDialog, setShowNewRoomDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'groups' | 'dms'>('groups');
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showAddStaffDialog, setShowAddStaffDialog] = useState(false);
  const [staffToAdd, setStaffToAdd] = useState<string[]>([]);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true); // For mobile: show sidebar by default
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: rooms = [], refetch: refetchRooms } = useStoreChatRooms();
  const { data: messages = [] } = useStoreChatMessages(selectedRoom?.id || null);
  const { data: searchResults = [] } = useSearchMessages(selectedRoom?.id || null, searchQuery);
  const { data: pinnedMessages = [] } = usePinnedMessages(selectedRoom?.id || null);
  const { data: storeUsers = [] } = useEmployeeUsers();
  const { data: unreadPerRoom = {} } = useUnreadCountPerRoom();
  
  // Fetch all participant profiles for DM name resolution
  const dmParticipantIds = [...new Set(
    rooms
      .filter(r => r.type === 'DIRECT' && r.participants)
      .flatMap(r => r.participants || [])
  )];
  
  const { data: participantProfiles = [] } = useQuery({
    queryKey: ['dm-profiles', dmParticipantIds.join(',')],
    queryFn: async () => {
      if (dmParticipantIds.length === 0) return [];
      const { data } = await supabase.from('profiles').select('id, name').in('id', dmParticipantIds);
      return data || [];
    },
    enabled: dmParticipantIds.length > 0,
  });
  
  const profileMap = new Map(participantProfiles.map((p: any) => [p.id, p.name]));
  const sendMessage = useSendChatMessage();
  const createRoom = useCreateChatRoom();
  const deleteRoom = useDeleteChatRoom();
  const markAsRead = useMarkMessagesAsRead();
  const markRoomAsRead = useMarkRoomAsRead();
  const pinMessage = usePinMessage();
  const toggleMute = useToggleMuteRoom();
  const createDM = useCreateDMRoom();
  const ensureDefaultGroups = useEnsureDefaultGroups();
  const addParticipants = useAddRoomParticipants();

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

  // Mark messages as read when viewing a room
  useEffect(() => {
    if (selectedRoom && profile?.id) {
      // Mark all messages in this room as read
      markRoomAsRead.mutate(selectedRoom.id);
    }
  }, [selectedRoom?.id, profile?.id]);

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
    // Include selected members plus current user as participants
    const participants = selectedMembers.length > 0 
      ? [...selectedMembers, profile?.id].filter(Boolean) as string[]
      : null;
    await createRoom.mutateAsync({ 
      name: newRoomName, 
      type: 'DEPARTMENT',
      participants 
    });
    setNewRoomName('');
    setSelectedMembers([]);
    setShowNewRoomDialog(false);
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleStaffToAdd = (userId: string) => {
    setStaffToAdd(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddStaffToRoom = async () => {
    if (!selectedRoom) return;
    
    // Get current participants (excluding self)
    const currentParticipants = selectedRoom.participants?.filter(p => p !== profile?.id) || [];
    
    // Find participants to add (in staffToAdd but not in current)
    const toAdd = staffToAdd.filter(id => !currentParticipants.includes(id));
    
    // Find participants to remove (in current but not in staffToAdd)
    const toRemove = currentParticipants.filter(id => !staffToAdd.includes(id));
    
    // Update participants array
    if (toAdd.length > 0 || toRemove.length > 0) {
      const newParticipants = [
        ...(selectedRoom.participants?.filter(p => !toRemove.includes(p)) || []),
        ...toAdd
      ];
      
      await supabase
        .from('chat_rooms')
        .update({ participants: newParticipants })
        .eq('id', selectedRoom.id);
      
      refetchRooms();
      
      if (toAdd.length > 0 && toRemove.length > 0) {
        toast.success(`Added ${toAdd.length} and removed ${toRemove.length} members`);
      } else if (toAdd.length > 0) {
        toast.success(`Added ${toAdd.length} member(s)`);
      } else {
        toast.success(`Removed ${toRemove.length} member(s)`);
      }
    }
    
    setStaffToAdd([]);
    setShowAddStaffDialog(false);
  };

  // Initialize staffToAdd with existing participants when opening dialog
  useEffect(() => {
    if (showAddStaffDialog && selectedRoom) {
      const existingMembers = selectedRoom.participants?.filter(p => p !== profile?.id) || [];
      setStaffToAdd(existingMembers);
    }
  }, [showAddStaffDialog, selectedRoom?.id]);

  const handleCreateDM = async (targetUser: { id: string; name: string }) => {
    console.log('handleCreateDM called with:', targetUser);
    try {
      const room = await createDM.mutateAsync({ 
        targetUserId: targetUser.id, 
        targetName: targetUser.name 
      });
      console.log('DM room created/found:', room);
      setSelectedRoom(room as ChatRoom);
      setShowUserSearch(false);
      setUserSearchQuery('');
      setActiveTab('dms');
    } catch (error) {
      console.error('Error creating DM:', error);
    }
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
  const isManager = profile?.role === 'MANAGER';
  const canCreateGroups = isAdmin || isManager;
  const canSeeReadStatus = isAdmin || isManager;
  
  // Sort groups by last message activity
  const groupRooms = rooms
    .filter(r => r.type !== 'DIRECT')
    .sort((a, b) => new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime());
  
  // Deduplicate DM rooms - show only one room per staff member (most recent)
  const dmRoomsRaw = rooms.filter(r => r.type === 'DIRECT');
  const dmRoomsDeduped = dmRoomsRaw.reduce((acc, room) => {
    const otherUserId = room.participants?.find(id => id !== profile?.id);
    if (!otherUserId) return acc;
    
    // Keep the most recent room for each user (by last_message_at)
    const existing = acc.get(otherUserId);
    const roomTime = room.last_message_at || room.created_at;
    const existingTime = existing?.last_message_at || existing?.created_at;
    if (!existing || new Date(roomTime) > new Date(existingTime)) {
      acc.set(otherUserId, room);
    }
    return acc;
  }, new Map<string, ChatRoom>());
  const dmRooms = Array.from(dmRoomsDeduped.values())
    .sort((a, b) => new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime());
  
  const isRoomMuted = selectedRoom?.is_muted_by?.includes(profile?.id || '');

  // Get display name for DM room - use profileMap for non-employee users (like store owner)
  // Show only first name to avoid truncation in narrow sidebar
  const getDMDisplayName = (room: ChatRoom) => {
    if (room.type !== 'DIRECT' || !room.participants) return room.name;
    const otherUserId = room.participants.find(id => id !== profile?.id);
    if (!otherUserId) return room.name;
    // First try profileMap (contains all DM participants), then storeUsers (employees only)
    const fullName = profileMap.get(otherUserId) || storeUsers.find(u => u.id === otherUserId)?.name || room.name;
    // Return only first word of name to fit in narrow sidebar
    return fullName.split(' ')[0];
  };

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

  if (!open) return null;

  return (
    <div className="fixed inset-4 sm:inset-auto sm:bottom-6 sm:right-6 z-50 sm:w-[420px] sm:h-[550px] bg-background rounded-2xl shadow-2xl border overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 bg-primary text-primary-foreground shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Mobile: Show back arrow when viewing chat, menu when viewing sidebar */}
          <button 
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="sm:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-foreground/10 transition-colors"
          >
            {showMobileSidebar ? <MessageSquare className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <MessageSquare className="w-5 h-5 hidden sm:block" />
          <span className="font-semibold truncate">
            {selectedRoom && !showMobileSidebar 
              ? (selectedRoom.type === 'DIRECT' ? getDMDisplayName(selectedRoom) : selectedRoom.name)
              : 'Team Chat'
            }
          </span>
          {selectedRoom && showMobileSidebar && (
            <span className="text-primary-foreground/70 text-sm truncate hidden sm:inline">
              – {selectedRoom.type === 'DIRECT' ? getDMDisplayName(selectedRoom) : selectedRoom.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button 
            onClick={() => { 
              onOpenChange(false); 
              navigate('/hrm/chat'); 
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-foreground/10 transition-colors"
            title="Open Full Chat Page"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onOpenChange(false)} 
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-foreground/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
          {/* Sidebar - Full width on mobile when visible, fixed width on desktop */}
          <div className={cn(
            "border-r bg-muted/20 flex flex-col transition-all duration-200",
            showMobileSidebar 
              ? "absolute inset-0 z-10 sm:relative sm:w-36 sm:shrink-0" 
              : "hidden sm:flex sm:w-36 sm:shrink-0"
          )}>
            {/* Actions */}
            <div className="px-3 sm:px-4 py-3 border-b flex gap-3 shrink-0">
              {canCreateGroups && (
                <button 
                  onClick={() => setShowNewRoomDialog(true)}
                  className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                  title="Create Group"
                >
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
              <button 
                onClick={() => setShowUserSearch(!showUserSearch)}
                className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                title="Search Users"
              >
                <Search className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* User search for DMs */}
            {showUserSearch && (
              <div className="p-3 border-b space-y-2 bg-background shrink-0">
                <Input
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="h-10 sm:h-9 rounded-lg"
                />
                <div className="max-h-40 sm:max-h-32 overflow-y-auto space-y-1">
                  {filteredUsers.slice(0, 8).map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 p-2.5 sm:p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors active:bg-muted/80"
                      onClick={() => { handleCreateDM(user); setShowMobileSidebar(false); }}
                    >
                      <Avatar className="w-8 h-8 sm:w-7 sm:h-7">
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
              <div className="p-3 sm:p-3">
                <p className="text-xs text-muted-foreground font-semibold tracking-wider mb-3 sm:mb-2">GROUPS</p>
                <div className="space-y-1 sm:space-y-0.5">
                  {groupRooms.map(room => {
                    const unreadCount = unreadPerRoom[room.id] || 0;
                    return (
                      <div
                        key={room.id}
                        className={cn(
                          "flex items-center justify-between px-3 py-3 sm:py-2.5 rounded-lg cursor-pointer transition-colors active:scale-[0.98]",
                          selectedRoom?.id === room.id 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "hover:bg-muted text-foreground"
                        )}
                        onClick={() => { setSelectedRoom(room); setActiveTab('groups'); setShowMobileSidebar(false); }}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Hash className="w-4 h-4 sm:hidden shrink-0 text-muted-foreground" />
                          <span className="text-sm sm:text-xs truncate">{room.name}</span>
                        </div>
                        {unreadCount > 0 && selectedRoom?.id !== room.id && (
                          <span className="min-w-[24px] sm:min-w-[20px] h-6 sm:h-5 px-2 sm:px-1.5 flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-bold rounded-full">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* DMs Section */}
                {dmRooms.length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground font-semibold tracking-wider mt-6 mb-3 sm:mb-2">DIRECT MESSAGES</p>
                    <div className="space-y-1 sm:space-y-0.5">
                      {dmRooms.map(room => {
                        const unreadCount = unreadPerRoom[room.id] || 0;
                        const displayName = getDMDisplayName(room);
                        return (
                          <div
                            key={room.id}
                            className={cn(
                              "flex items-center justify-between px-3 py-3 sm:py-2.5 rounded-lg cursor-pointer transition-colors active:scale-[0.98]",
                              selectedRoom?.id === room.id 
                                ? "bg-primary/10 text-primary font-medium" 
                                : "hover:bg-muted text-foreground"
                            )}
                            onClick={() => { setSelectedRoom(room); setActiveTab('dms'); setShowMobileSidebar(false); }}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <User className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
                              <span className="text-sm sm:text-xs truncate">{displayName}</span>
                            </div>
                            {unreadCount > 0 && selectedRoom?.id !== room.id && (
                              <span className="min-w-[24px] sm:min-w-[20px] h-6 sm:h-5 px-2 sm:px-1.5 flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-bold rounded-full">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className={cn(
            "flex-1 flex flex-col bg-background",
            showMobileSidebar && "hidden sm:flex"
          )}>
            {selectedRoom ? (
              <>
                {/* Room Header with Add Staff button and participant count */}
                {canSeeReadStatus && selectedRoom.type !== 'DIRECT' && (
                  <div className="px-4 py-2 border-b flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{selectedRoom.name}</span>
                      {selectedRoom.participants && selectedRoom.participants.length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Badge variant="secondary" className="text-xs shrink-0 cursor-pointer hover:bg-secondary/80">
                              <Users className="w-3 h-3 mr-1" />
                              {selectedRoom.participants.length} members
                            </Badge>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-2" align="start">
                            <div className="text-sm font-medium mb-2">Group Members</div>
                            <ScrollArea className="max-h-48">
                              <div className="space-y-1">
                                {selectedRoom.participants.map(userId => {
                                  const userName = profileMap.get(userId) || storeUsers.find(u => u.id === userId)?.name || 'Unknown';
                                  return (
                                    <div key={userId} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted group">
                                      <Avatar className="w-6 h-6">
                                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                          {userName[0]?.toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm truncate flex-1">{userName}</span>
                                      {canCreateGroups && userId !== profile?.id && (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            const newParticipants = selectedRoom.participants?.filter(p => p !== userId) || [];
                                            await supabase
                                              .from('chat_rooms')
                                              .update({ participants: newParticipants })
                                              .eq('id', selectedRoom.id);
                                            refetchRooms();
                                            toast.success('Member removed from group');
                                          }}
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    {canCreateGroups && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 gap-1 shrink-0"
                        onClick={() => setShowAddStaffDialog(true)}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Add
                      </Button>
                    )}
                  </div>
                )}

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
                <ScrollArea className="flex-1 px-3 py-3">
                  <div className="space-y-4 pr-1">
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
                            "max-w-[70%] rounded-2xl px-3 py-2 relative group",
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

                {/* Input Area - Footer Style */}
                <div className="border-t bg-muted/30 relative">
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

                  <div className="flex items-center gap-2 sm:gap-3 px-3 py-3">
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
                      className="flex-shrink-0 w-10 h-10 sm:w-auto sm:h-auto flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      {uploading ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : <Paperclip className="w-5 h-5 sm:w-6 sm:h-6" />}
                    </button>
                    <Input
                      ref={inputRef}
                      value={message}
                      onChange={handleMessageChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message.."
                      className="flex-1 h-11 sm:h-10 rounded-full bg-background border-muted-foreground/20 px-4 text-base sm:text-sm"
                      disabled={uploading}
                    />
                    <button 
                      onClick={handleSend} 
                      disabled={!message.trim() || sendMessage.isPending || uploading}
                      className="flex-shrink-0 w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-primary/80 text-primary-foreground hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
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
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 p-4">
            <div className="bg-background border rounded-lg p-4 w-full max-w-sm shadow-lg max-h-[85%] flex flex-col">
              <h3 className="font-semibold mb-4 text-lg">Create New Group</h3>
              <Input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Group name"
                className="mb-4 h-11 sm:h-10"
              />
              
              {/* Staff Selection */}
              <p className="text-sm text-muted-foreground mb-2">Add members:</p>
              <ScrollArea className="flex-1 max-h-48 sm:max-h-48 border rounded-lg mb-4">
                <div className="p-2 space-y-1">
                  {storeUsers.filter(u => u.id !== profile?.id).map(user => (
                    <div
                      key={user.id}
                      className={cn(
                        "flex items-center gap-2 p-2.5 sm:p-2 rounded-lg cursor-pointer transition-colors active:scale-[0.98]",
                        selectedMembers.includes(user.id) 
                          ? "bg-primary/10 border border-primary/30" 
                          : "hover:bg-muted"
                      )}
                      onClick={() => toggleMemberSelection(user.id)}
                    >
                      <Checkbox 
                        checked={selectedMembers.includes(user.id)}
                        className="pointer-events-none"
                      />
                      <Avatar className="w-8 h-8 sm:w-7 sm:h-7">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {user.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {selectedMembers.length > 0 && (
                <p className="text-xs text-muted-foreground mb-3">
                  {selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected
                </p>
              )}
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="lg" className="h-11 sm:h-10" onClick={() => { setShowNewRoomDialog(false); setSelectedMembers([]); }}>Cancel</Button>
                <Button size="lg" className="h-11 sm:h-10" onClick={handleCreateRoom} disabled={!newRoomName.trim()}>Create</Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Staff Dialog */}
        {showAddStaffDialog && selectedRoom && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 p-4">
            <div className="bg-background border rounded-lg p-4 w-full max-w-sm shadow-lg max-h-[85%] flex flex-col">
              <h3 className="font-semibold mb-4 text-lg">Manage Members - {selectedRoom.name}</h3>
              
              {/* Staff Selection */}
              <p className="text-sm text-muted-foreground mb-2">Select members for this group:</p>
              <div className="h-52 sm:h-48 border rounded-lg mb-4 overflow-y-auto">
                <div className="p-2 space-y-1">
                  {storeUsers
                    .filter(u => u.id !== profile?.id)
                    .map(user => {
                      const isExistingMember = selectedRoom.participants?.includes(user.id);
                      const isSelected = staffToAdd.includes(user.id);
                      return (
                        <div
                          key={user.id}
                          className={cn(
                            "flex items-center gap-2 p-2.5 sm:p-2 rounded-lg cursor-pointer transition-colors active:scale-[0.98]",
                            isSelected
                              ? isExistingMember 
                                ? "bg-primary/10 border border-primary/30"
                                : "bg-green-500/10 border border-green-500/30"
                              : isExistingMember
                                ? "bg-destructive/10 border border-destructive/30"
                                : "hover:bg-muted"
                          )}
                          onClick={() => toggleStaffToAdd(user.id)}
                        >
                          <Checkbox 
                            checked={isSelected}
                            className="pointer-events-none"
                          />
                          <Avatar className="w-8 h-8 sm:w-7 sm:h-7">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {user.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.role}</p>
                          </div>
                          {isExistingMember && !isSelected && (
                            <span className="text-xs text-destructive">Remove</span>
                          )}
                          {!isExistingMember && isSelected && (
                            <span className="text-xs text-green-600">Add</span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
              
              {staffToAdd.length > 0 && (
                <p className="text-xs text-muted-foreground mb-3">
                  {staffToAdd.length} member{staffToAdd.length > 1 ? 's' : ''} selected
                </p>
              )}
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="lg" className="h-11 sm:h-10" onClick={() => { setShowAddStaffDialog(false); setStaffToAdd([]); }}>Cancel</Button>
                <Button size="lg" className="h-11 sm:h-10" onClick={handleAddStaffToRoom}>Save</Button>
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
    </div>
  );
}
