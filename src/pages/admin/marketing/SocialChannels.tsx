import { useState } from "react";
import { Plus, RefreshCw, Link as LinkIcon, Trash2, Facebook, Instagram, Youtube, Linkedin, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSocialChannels, useCreateSocialChannel, useDeleteSocialChannel, useUpdateSocialChannel } from "@/hooks/useSocialChannels";
import { toast } from "sonner";
import { format } from "date-fns";

const PLATFORMS = [
  { value: "FACEBOOK", label: "Facebook", icon: Facebook, color: "text-blue-600" },
  { value: "INSTAGRAM", label: "Instagram", icon: Instagram, color: "text-pink-600" },
  { value: "TIKTOK", label: "TikTok", icon: LinkIcon, color: "text-black" },
  { value: "YOUTUBE", label: "YouTube", icon: Youtube, color: "text-red-600" },
  { value: "LINKEDIN", label: "LinkedIn", icon: Linkedin, color: "text-blue-700" },
  { value: "TWITTER", label: "X (Twitter)", icon: Twitter, color: "text-black" },
];

export default function SocialChannels() {
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [formData, setFormData] = useState({
    display_name: "",
    handle: "",
  });

  const { data: channels, isLoading } = useSocialChannels({ is_active: true });
  const createChannel = useCreateSocialChannel();
  const updateChannel = useUpdateSocialChannel();
  const deleteChannel = useDeleteSocialChannel();

  const handleConnect = async () => {
    if (!selectedPlatform || !formData.display_name) {
      toast.error("Please fill in all fields");
      return;
    }

    await createChannel.mutateAsync({
      platform: selectedPlatform as any,
      display_name: formData.display_name,
      handle: formData.handle || null,
      is_active: true,
    });

    setShowConnectDialog(false);
    setSelectedPlatform("");
    setFormData({ display_name: "", handle: "" });
  };

  const handleRefreshToken = async (id: string) => {
    toast.info("Token refresh functionality will be implemented with real OAuth");
    await updateChannel.mutateAsync({
      id,
      last_synced_at: new Date().toISOString(),
    });
  };

  const getPlatformIcon = (platform: string) => {
    const config = PLATFORMS.find(p => p.value === platform);
    const Icon = config?.icon || LinkIcon;
    return <Icon className={`h-5 w-5 ${config?.color || ""}`} />;
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Social Media Channels</h1>
          <p className="text-muted-foreground">Connect and manage your social media accounts</p>
        </div>
        <Button onClick={() => setShowConnectDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Connect New Channel
        </Button>
      </div>

      {/* Channel Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORMS.map((platform) => (
          <Card key={platform.value} className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              setSelectedPlatform(platform.value);
              setShowConnectDialog(true);
            }}>
            <div className="flex items-center gap-3">
              <platform.icon className={`h-8 w-8 ${platform.color}`} />
              <div>
                <h3 className="font-semibold">{platform.label}</h3>
                <p className="text-sm text-muted-foreground">Connect {platform.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Channels Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>Channel / Page Name</TableHead>
              <TableHead>Handle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Synced</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : channels && channels.length > 0 ? (
              channels.map((channel) => (
                <TableRow key={channel.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(channel.platform)}
                      <span>{PLATFORMS.find(p => p.value === channel.platform)?.label}</span>
                    </div>
                  </TableCell>
                  <TableCell>{channel.display_name}</TableCell>
                  <TableCell>{channel.handle || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={channel.is_active ? "default" : "secondary"}>
                      {channel.is_active ? "Connected" : "Disconnected"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {channel.last_synced_at 
                      ? format(new Date(channel.last_synced_at), "MMM d, yyyy HH:mm")
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRefreshToken(channel.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteChannel.mutate(channel.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No channels connected yet. Click "Connect New Channel" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Connect Channel Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Social Media Channel</DialogTitle>
            <DialogDescription>
              Enter the details of your social media account. OAuth integration will be added in production.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Platform</Label>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((platform) => (
                    <SelectItem key={platform.value} value={platform.value}>
                      {platform.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Channel / Page Name</Label>
              <Input
                placeholder="e.g., My Business Page"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Handle / Username (Optional)</Label>
              <Input
                placeholder="@username"
                value={formData.handle}
                onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={createChannel.isPending}>
              {createChannel.isPending ? "Connecting..." : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
