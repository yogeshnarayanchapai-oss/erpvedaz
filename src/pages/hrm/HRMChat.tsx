import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Send, MessageSquare, Trash2, Users, Search, UserPlus, MoreVertical } from 'lucide-react';
import { 
  useStoreChatRooms, 
  useStoreChatMessages, 
  useSendChatMessage, 
  useCreateChatRoom,
  useDeleteChatRoom,
  useDeleteChatMessage,
  useCreateDMRoom,
  useEnsureDefaultGroups,
  useAddRoomParticipants,
  useUnreadCountPerRoom,
  useMarkRoomAsRead,
  ChatRoom 
} from '@/hooks/useTeamChat';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Get only employees for Team Chat
function useEmployeeUsers() {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['employee-users', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      
      // Get employees for this store (status is 'Active' with capital A)
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('user_id, full_name')
        .eq('store_id', storeId)
        .ilike('status', 'active');
      
      if (empError) throw empError;
      
      const employeeUserIds = (employees || []).filter(e => e.user_id).map(e => e.user_id);
      
      if (employeeUserIds.length === 0) return [];
      
      // Get profile info for these employees
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, name, username, email, role')
        .in('id', employeeUserIds);
      
      if (profError) throw profError;
      
      return (profiles || []).map(p => ({
        id: p.id,
        name: p.name,
        username: p.username,
        email: p.email,
        role: p.role,
      }));
    },
    enabled: !!storeId,
  });
}

// Get profile names for all DM participants (including non-employees like store owner)
function useDMParticipantProfiles(rooms: ChatRoom[]) {
  const participantIds = [...new Set(
    rooms
      .filter(r => r.type === 'DIRECT' && r.participants)
      .flatMap(r => r.participants || [])
  )];
  
  return useQuery({
    queryKey: ['dm-participant-profiles', participantIds.join(',')],
    queryFn: async () => {
      if (participantIds.length === 0) return new Map<string, string>();
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', participantIds);
      
      if (error) throw error;
      
      return new Map((profiles || []).map(p => [p.id, p.name || 'Unknown']));
    },
    enabled: participantIds.length > 0,
  });
}

export default function HRMChat() {
  const { profile } = useAuth();
  const storeId = useCurrentStoreId();
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [message, setMessage] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '' });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showAddStaffDialog, setShowAddStaffDialog] = useState(false);
  const [staffToAdd, setStaffToAdd] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: rooms = [] } = useStoreChatRooms();
  const { data: messages = [] } = useStoreChatMessages(selectedRoom?.id || null);
  const { data: employeeUsers = [] } = useEmployeeUsers();
  const { data: dmProfileMap = new Map() } = useDMParticipantProfiles(rooms);
  const { data: unreadPerRoom = {} } = useUnreadCountPerRoom();
  const markRoomAsRead = useMarkRoomAsRead();
  const sendMessage = useSendChatMessage();
  const createChatRoom = useCreateChatRoom();
  const deleteChatRoom = useDeleteChatRoom();
  const deleteMessage = useDeleteChatMessage();
  const createDM = useCreateDMRoom();
  const ensureDefaultGroups = useEnsureDefaultGroups();
  const addParticipants = useAddRoomParticipants();

  // Ensure default groups exist
  useEffect(() => {
    if (rooms.length === 0) {
      ensureDefaultGroups.mutate();
    }
  }, [rooms.length]);

  // Auto-select first room
  useEffect(() => {
    if (rooms?.length && !selectedRoom) {
      const groupRooms = rooms.filter(r => r.type !== 'DIRECT');
      if (groupRooms.length) setSelectedRoom(groupRooms[0]);
    }
  }, [rooms, selectedRoom]);

  // Mark room as read when selecting it
  useEffect(() => {
    if (selectedRoom) {
      markRoomAsRead.mutate(selectedRoom.id);
    }
  }, [selectedRoom?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !selectedRoom) return;
    await sendMessage.mutateAsync({ roomId: selectedRoom.id, message: message.trim() });
    setMessage('');
  };

  const handleCreateRoom = async () => {
    if (!newRoom.name.trim()) return;
    const participants = selectedMembers.length > 0 
      ? [...selectedMembers, profile?.id].filter(Boolean) as string[]
      : null;
    await createChatRoom.mutateAsync({ 
      name: newRoom.name, 
      type: 'DEPARTMENT',
      participants 
    });
    setCreateDialogOpen(false);
    setNewRoom({ name: '' });
    setSelectedMembers([]);
  };

  const handleDeleteRoom = async (room: ChatRoom) => {
    if (room.type === 'GLOBAL') return;
    if (confirm(`Delete chat room "${room.name}"?`)) {
      await deleteChatRoom.mutateAsync(room.id);
      if (selectedRoom?.id === room.id) {
        setSelectedRoom(rooms?.find(r => r.id !== room.id) || null);
      }
    }
  };

  const handleCreateDM = async (targetUser: { id: string; name: string }) => {
    const room = await createDM.mutateAsync({ 
      targetUserId: targetUser.id, 
      targetName: targetUser.name 
    });
    setSelectedRoom(room as ChatRoom);
    setShowUserSearch(false);
    setUserSearchQuery('');
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
    if (!selectedRoom || staffToAdd.length === 0) return;
    await addParticipants.mutateAsync({
      roomId: selectedRoom.id,
      participantIds: staffToAdd,
    });
    setStaffToAdd([]);
    setShowAddStaffDialog(false);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedRoom) return;
    if (confirm('Delete this message?')) {
      await deleteMessage.mutateAsync({ messageId, roomId: selectedRoom.id });
    }
  };

  const formatMessageDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`;
    return format(date, 'MMM d, HH:mm');
  };

  const getDMDisplayName = (room: ChatRoom) => {
    if (room.type !== 'DIRECT' || !room.participants) return room.name;
    const otherUserId = room.participants.find(id => id !== profile?.id);
    if (!otherUserId) return room.name;
    // Try dmProfileMap first (has all participants), then fallback to employeeUsers
    return dmProfileMap.get(otherUserId) || employeeUsers.find(u => u.id === otherUserId)?.name || 'Unknown';
  };

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'OWNER';
  const isManager = profile?.role === 'MANAGER';
  const canCreateGroups = isAdmin || isManager;
  const canDeleteMessages = isAdmin; // Only Admin/Owner can delete any message
  const canSeeReadStatus = isAdmin || isManager;

  const groupRooms = rooms.filter(r => r.type !== 'DIRECT');
  const dmRoomsRaw = rooms.filter(r => r.type === 'DIRECT');
  
  // Deduplicate DM rooms - show only one room per employee, prioritize by last_message_at
  const dmRoomsDeduped = dmRoomsRaw.reduce((acc, room) => {
    const otherUserId = room.participants?.find(id => id !== profile?.id);
    if (!otherUserId) return acc;
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

  const filteredUsers = employeeUsers.filter(u => 
    u.id !== profile?.id &&
    (userSearchQuery === '' || 
     u.name.toLowerCase().includes(userSearchQuery.toLowerCase()))
  );

  return (
    <div className="h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Team Chat</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowUserSearch(!showUserSearch)}>
            <Search className="w-4 h-4 mr-2" />Direct Message
          </Button>
          {canCreateGroups && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />New Group</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Group Chat</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Group Name *</Label>
                    <Input 
                      value={newRoom.name} 
                      onChange={e => setNewRoom({ name: e.target.value })} 
                      placeholder="Sales Team" 
                    />
                  </div>
                  <div>
                    <Label>Add Members (Optional)</Label>
                    <div className="h-48 border rounded-lg mt-2 overflow-y-auto">
                      <div className="p-2 space-y-1">
                        {employeeUsers
                          .filter(u => u.id !== profile?.id)
                          .map(user => (
                            <div
                              key={user.id}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer"
                              onClick={() => toggleMemberSelection(user.id)}
                            >
                              <Checkbox checked={selectedMembers.includes(user.id)} />
                              <Avatar className="w-7 h-7">
                                <AvatarFallback className="text-xs">{user.name[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{user.name}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                    {selectedMembers.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {selectedMembers.length} member(s) selected
                      </p>
                    )}
                  </div>
                  <Button onClick={handleCreateRoom} disabled={!newRoom.name} className="w-full">
                    Create Group
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* User search for DMs */}
      {showUserSearch && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <Input
              placeholder="Search employees..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="mb-3"
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredUsers.slice(0, 10).map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => handleCreateDM(user)}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.role}</p>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No employees found</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4 h-[calc(100%-60px)]">
        {/* Rooms List */}
        <Card className="w-72 flex-shrink-0 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Groups</CardTitle>
          </CardHeader>
          <CardContent className="p-2 flex-1 overflow-auto">
            <div className="space-y-1">
              {groupRooms
                .sort((a, b) => new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime())
                .map(room => {
                  const unreadCount = unreadPerRoom[room.id] || 0;
                  return (
                    <div
                      key={room.id}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted ${selectedRoom?.id === room.id ? 'bg-muted' : ''}`}
                      onClick={() => setSelectedRoom(room)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Users className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm truncate">{room.name}</span>
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="ml-auto text-xs h-5 min-w-[20px] flex items-center justify-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Badge>
                        )}
                      </div>
                      {isAdmin && room.type !== 'GLOBAL' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 flex-shrink-0"
                          onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room); }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
            </div>

            {dmRooms.length > 0 && (
              <>
                <div className="text-xs text-muted-foreground font-semibold mt-4 mb-2">Direct Messages</div>
                <div className="space-y-1">
                  {dmRooms.map(room => {
                    const unreadCount = unreadPerRoom[room.id] || 0;
                    return (
                      <div
                        key={room.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted ${selectedRoom?.id === room.id ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedRoom(room)}
                      >
                        <MessageSquare className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm truncate flex-1">{getDMDisplayName(room)}</span>
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs h-5 min-w-[20px] flex items-center justify-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-2 border-b flex flex-row items-center justify-between">
            <CardTitle>{selectedRoom ? (selectedRoom.type === 'DIRECT' ? getDMDisplayName(selectedRoom) : selectedRoom.name) : 'Select a room'}</CardTitle>
            {selectedRoom && selectedRoom.type !== 'DIRECT' && canCreateGroups && (
              <Button variant="outline" size="sm" onClick={() => setShowAddStaffDialog(true)}>
                <UserPlus className="w-4 h-4 mr-1" />Add Staff
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {selectedRoom ? (
              <>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map(msg => {
                      const isOwn = msg.sender_id === profile?.id;
                      const canDelete = canDeleteMessages || isOwn; // Admin/Owner can delete any, users can unsend own
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
                          <div className={`max-w-[70%] ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3 relative`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium ${isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                {msg.sender_name}
                              </span>
                              <span className={`text-xs ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                {formatMessageDate(msg.created_at)}
                              </span>
                              {canDelete && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className={`h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'text-primary-foreground/60 hover:text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                      <MoreVertical className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align={isOwn ? 'end' : 'start'}>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      {isOwn ? 'Unsend' : 'Delete'}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
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
          </CardContent>
        </Card>
      </div>

      {/* Add Staff Dialog */}
      <Dialog open={showAddStaffDialog} onOpenChange={setShowAddStaffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff to {selectedRoom?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select staff to add:</p>
            <div className="h-48 border rounded-lg overflow-y-auto">
              <div className="p-2 space-y-1">
                {employeeUsers
                  .filter(u => u.id !== profile?.id && !selectedRoom?.participants?.includes(u.id))
                  .map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => toggleStaffToAdd(user.id)}
                    >
                      <Checkbox checked={staffToAdd.includes(user.id)} />
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs">{user.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{user.name}</span>
                    </div>
                  ))}
              </div>
            </div>
            {staffToAdd.length > 0 && (
              <p className="text-xs text-muted-foreground">{staffToAdd.length} staff selected</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowAddStaffDialog(false); setStaffToAdd([]); }}>
                Cancel
              </Button>
              <Button onClick={handleAddStaffToRoom} disabled={staffToAdd.length === 0 || addParticipants.isPending}>
                Add Staff
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
