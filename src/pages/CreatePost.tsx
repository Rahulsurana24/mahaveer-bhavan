import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image as ImageIcon, Video, X, MapPin, Tag, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CreatePost = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [postType, setPostType] = useState<'post' | 'reel'>('post');

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      return data;
    }
  });

  // Upload and create post mutation
  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !currentUser) throw new Error("Missing required data");

      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const bucketName = postType === 'reel' ? 'gallery-reels' : 'gallery-posts';
      const filePath = `${currentUser.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(uploadData.path);

      // Create post record
      const { error: insertError } = await supabase
        .from('gallery_posts')
        .insert({
          member_id: currentUser.id,
          type: postType,
          media_url: publicUrl,
          caption: caption || null,
          location: location || null,
          is_published: true
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-posts'] });
      toast({
        title: "Success",
        description: "Your post has been published!",
      });
      navigate('/dashboard');
    },
    onError: (error: any) => {
      console.error('Post creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive"
      });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 50MB",
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isVideo) {
      toast({
        title: "Error",
        description: "Please select an image or video file",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    setPostType(isVideo ? 'reel' : 'post');

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl("");
  };

  const handlePublish = () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to post",
        variant: "destructive"
      });
      return;
    }

    createPostMutation.mutate();
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  return (
    <MobileLayout
      title="Create Post"
      showBack
      hideBottomNav
      headerRight={
        <Button
          onClick={handlePublish}
          disabled={!selectedFile || createPostMutation.isPending}
          className="h-9 px-4 bg-primary hover:bg-primary/90"
        >
          {createPostMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Posting...
            </>
          ) : (
            'Share'
          )}
        </Button>
      }
    >
      <div className="p-4 space-y-4">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={currentUser?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(currentUser?.full_name || '')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{currentUser?.full_name}</p>
            <p className="text-xs text-gray-500">Share your moment</p>
          </div>
        </div>

        {/* File Upload / Preview */}
        {!selectedFile ? (
          <div className="space-y-3">
            <input
              type="file"
              id="file-upload"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col items-center justify-center py-8">
                <ImageIcon className="h-16 w-16 text-gray-400 mb-4" />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Tap to select photo or video
                </p>
                <p className="text-xs text-gray-500">
                  Max size: 50MB
                </p>
              </div>
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Photo
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Video className="h-4 w-4 mr-2" />
                Video/Reel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Preview */}
            <div className="relative rounded-xl overflow-hidden bg-black">
              {postType === 'post' ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full object-contain max-h-96"
                />
              ) : (
                <video
                  src={previewUrl}
                  controls
                  className="w-full object-contain max-h-96"
                />
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full"
                onClick={handleRemoveFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <Label htmlFor="caption" className="text-sm font-medium">
                Caption
              </Label>
              <Textarea
                id="caption"
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                {caption.length}/2000 characters
              </p>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Add Location
              </Label>
              <Input
                id="location"
                placeholder="Where was this taken?"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Post Type Badge */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
                postType === 'reel'
                  ? "bg-purple-100 text-purple-700"
                  : "bg-blue-100 text-blue-700"
              )}>
                {postType === 'reel' ? (
                  <>
                    <Video className="h-3 w-3" />
                    Reel
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-3 w-3" />
                    Post
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default CreatePost;
