import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Camera,
  Settings,
  Grid3x3,
  Video,
  Bookmark,
  Edit
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMemberData } from "@/hooks/useMemberData";
import { Loading } from "@/components/ui/loading";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const Profile = () => {
  const { member, loading, error } = useMemberData();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (member) {
      setFormData({
        full_name: member.full_name || '',
        email: member.email || '',
        phone: member.phone || '',
        address: member.address || '',
        city: member.city || '',
        state: member.state || '',
        postal_code: member.postal_code || ''
      });
    }
  }, [member]);

  // Fetch user's posts
  const { data: userPosts } = useQuery({
    queryKey: ['user-posts', member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data, error } = await supabase
        .from('gallery_posts')
        .select('*')
        .eq('member_id', member.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!member
  });

  // Stats
  const postsCount = userPosts?.filter(p => p.type === 'post').length || 0;
  const reelsCount = userPosts?.filter(p => p.type === 'reel').length || 0;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !member) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${member.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('member-photos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', member.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Profile photo updated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    } catch (error: any) {
      console.error('Photo upload error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!member) throw new Error('No member found');
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone
        })
        .eq('id', member.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  });

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  if (loading) {
    return (
      <MobileLayout title="Profile">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  if (error || !member) {
    return (
      <MobileLayout title="Profile">
        <div className="flex justify-center items-center min-h-[400px]">
          <p className="text-gray-500">Failed to load profile. Please try again.</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title={member.full_name}>
      <div className="bg-white min-h-screen">
        {/* Profile Header */}
        <div className="px-4 py-6 space-y-4">
          {/* Avatar and Stats */}
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-gray-200">
                <AvatarImage src={member.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {getInitials(member.full_name)}
                </AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -right-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Button
                  size="icon"
                  className="h-7 w-7 rounded-full bg-primary hover:bg-primary/90"
                  asChild
                  disabled={uploading}
                >
                  <span>
                    <Camera className="h-3 w-3" />
                  </span>
                </Button>
              </label>
            </div>

            <div className="flex-1 grid grid-cols-3 gap-4 text-center pt-2">
              <div>
                <div className="text-lg font-bold text-gray-900">{postsCount + reelsCount}</div>
                <div className="text-xs text-gray-500">Posts</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">0</div>
                <div className="text-xs text-gray-500">Followers</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">0</div>
                <div className="text-xs text-gray-500">Following</div>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <h2 className="font-semibold text-gray-900">{member.full_name}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {member.membership_type || 'Member'}
              </Badge>
              <Badge 
                className={cn(
                  "text-xs",
                  member.status === 'active' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                )}
              >
                {member.status}
              </Badge>
            </div>
            {member.city && member.state && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <MapPin className="h-3 w-3" />
                <span>{member.city}, {member.state}</span>
              </div>
            )}
            {member.phone && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Phone className="h-3 w-3" />
                <span>{member.phone}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 font-semibold">
                  Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Full Name</Label>
                    <Input
                      id="edit-name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="opacity-50"
                    />
                    <p className="text-xs text-gray-500">Email cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <Button
                    onClick={() => updateProfileMutation.mutate(formData)}
                    disabled={updateProfileMutation.isPending}
                    className="w-full"
                  >
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => navigate('/id-card')}>
              ID Card
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs - Posts/Reels */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full grid grid-cols-3 rounded-none border-t border-b border-gray-200 bg-white h-12">
            <TabsTrigger 
              value="posts" 
              className="data-[state=active]:border-t-2 data-[state=active]:border-t-gray-900 rounded-none"
            >
              <Grid3x3 className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger 
              value="reels"
              className="data-[state=active]:border-t-2 data-[state=active]:border-t-gray-900 rounded-none"
            >
              <Video className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger 
              value="saved"
              className="data-[state=active]:border-t-2 data-[state=active]:border-t-gray-900 rounded-none"
            >
              <Bookmark className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          {/* Posts Grid */}
          <TabsContent value="posts" className="mt-0">
            {postsCount > 0 ? (
              <div className="grid grid-cols-3 gap-1">
                {userPosts?.filter(p => p.type === 'post').map((post) => (
                  <div
                    key={post.id}
                    className="aspect-square cursor-pointer hover:opacity-75 transition-opacity"
                    onClick={() => navigate('/gallery')}
                  >
                    <img
                      src={post.media_url}
                      alt={post.caption || 'Post'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="h-16 w-16 rounded-full border-2 border-gray-300 flex items-center justify-center mb-4">
                  <Camera className="h-8 w-8 text-gray-300" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Posts Yet</h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                  Share your first photo or video
                </p>
                <Button onClick={() => navigate('/create-post')} size="sm">
                  Create Post
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Reels Grid */}
          <TabsContent value="reels" className="mt-0">
            {reelsCount > 0 ? (
              <div className="grid grid-cols-3 gap-1">
                {userPosts?.filter(p => p.type === 'reel').map((post) => (
                  <div
                    key={post.id}
                    className="aspect-square cursor-pointer hover:opacity-75 transition-opacity relative"
                    onClick={() => navigate('/gallery')}
                  >
                    <video
                      src={post.media_url}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video className="h-6 w-6 text-white drop-shadow-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="h-16 w-16 rounded-full border-2 border-gray-300 flex items-center justify-center mb-4">
                  <Video className="h-8 w-8 text-gray-300" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reels Yet</h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                  Share your first reel
                </p>
                <Button onClick={() => navigate('/create-post')} size="sm">
                  Create Reel
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Saved (Coming Soon) */}
          <TabsContent value="saved" className="mt-0">
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="h-16 w-16 rounded-full border-2 border-gray-300 flex items-center justify-center mb-4">
                <Bookmark className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Saved Posts</h3>
              <p className="text-sm text-gray-500 text-center">
                Coming soon: Save posts to view later
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default Profile;