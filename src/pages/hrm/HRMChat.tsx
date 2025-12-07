import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Send, MessageSquare, Trash2 } from 'lucide-react';
import { useChatRooms, useChatMessages, useSendMessage, useCreateChatRoom, useDeleteChatRoom, ChatRoom } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';

export default function HRMChat() {
  const { profile } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [message, setMessage] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', type: 'DEPARTMENT' as const });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: rooms } = useChatRooms();
  const { data: messages } = useChatMessages(selectedRoom?.id || null);
  const sendMessage = useSendMessage();
  const createChatRoom = useCreateChatRoom();
  const deleteChatRoom = useDeleteChatRoom();

  // Auto-select first room
  useEffect(() => {
    if (rooms?.length && !selectedRoom) {
      setSelectedRoom(rooms[0]);
    }
  }, [rooms, selectedRoom]);

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
    await createChatRoom.mutateAsync(newRoom);
    setCreateDialogOpen(false);
    setNewRoom({ name: '', type: 'DEPARTMENT' });
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

  const isAdmin = profile?.role === 'ADMIN';

  return (
    <div className="h-[calc(100vh-120px)]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Team Chat</h1>
          {isAdmin && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />New Room</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Chat Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Room Name *</Label>
                    <Input value={newRoom.name} onChange={e => setNewRoom({ ...newRoom, name: e.target.value })} placeholder="Sales Team" />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={newRoom.type} onValueChange={v => setNewRoom({ ...newRoom, type: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEPARTMENT">Department</SelectItem>
                        <SelectItem value="DIRECT">Direct</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateRoom} disabled={!newRoom.name} className="w-full">Create Room</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex gap-4 h-full">
          {/* Rooms List */}
          <Card className="w-64 flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Rooms</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1">
                {rooms?.map(room => (
                  <div
                    key={room.id}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted ${selectedRoom?.id === room.id ? 'bg-muted' : ''}`}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm truncate">{room.name}</span>
                    </div>
                    {isAdmin && room.type !== 'GLOBAL' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-2 border-b">
              <CardTitle>{selectedRoom?.name || 'Select a room'}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              {selectedRoom ? (
                <>
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages?.map(msg => {
                        const isOwn = msg.sender_id === profile?.id;
                        return (
                          <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-medium ${isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                  {msg.sender_name}
                                </span>
                                <span className={`text-xs ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                  {format(parseISO(msg.created_at), 'HH:mm')}
                                </span>
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
    </div>
  );
}
