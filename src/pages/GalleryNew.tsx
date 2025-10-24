import { useState } from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Heart,
  MessageCircle,
  Share2,
  Plus,
  Filter,
  Upload,
  X,
  Play,
  Image as ImageIcon,
  Send
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loading } from "@/components/ui/loading";
import { useToast } from "@/hooks/use-toast";
import { useMemberData } from "@/hooks/useMemberData";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

const GalleryNew = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterEvent, setFilterEvent] = useState("all");
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState("");
  const [uploadCaption, setUploadCaption] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { member } = useMemberData();

  // Fetch gallery posts with filters
  const { data: posts, isLoading } = useQuery({
    queryKey: ['gallery-posts', searchTerm, filterType, filterEvent],
    queryFn: async () => {
      let query = supabase
        .from('gallery_posts')
        .select(`
          *,
          user_profiles:member_id(id, full_name, avatar_url, is_admin)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`caption.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`);
      }

      if (filterType === 'admin') {
        query = query.eq('user_profiles.is_admin', true);
      } else if (filterType === 'members') {
        query = query.eq('user_profiles.is_admin', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch user's likes
  const { data: userLikes } = useQuery({
    queryKey: ['user-likes', member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data, error } = await supabase
        .from('gallery_likes')
        .select('post_id')
        .eq('user_id', member.id);

      if (error) throw error;
      return data.map(like => like.post_id);
    },
    enabled: !!member
  });

  // Fetch like counts
  const { data: likeCounts } = useQuery({
    queryKey: ['like-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery_likes')
        .select('post_id');

      if (error) throw error;

      const counts: Record<string, number> = {};
      data.forEach(like => {
        counts[like.post_id] = (counts[like.post_id] || 0) + 1;
      });
      return counts;
    }
  });

  // Fetch comment counts
  const { data: commentCounts } = useQuery({
    queryKey: ['comment-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery_comments')
        .select('post_id');

      if (error) throw error;

      const counts: Record<string, number> = {};
      data.forEach(comment => {
        counts[comment.post_id] = (counts[comment.post_id] || 0) + 1;
      });
      return counts;
    }
  });

  // Fetch comments for selected post
  const { data: postComments } = useQuery({
    queryKey: ['post-comments', selectedPost?.id],
    queryFn: async () => {
      if (!selectedPost) return [];
      const { data, error } = await supabase
        .from('gallery_comments')
        .select(`
          *,
          user_profiles:user_id(full_name, avatar_url)
        `)
        .eq('post_id', selectedPost.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedPost
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!member) throw new Error('Not authenticated');

      const isLiked = userLikes?.includes(postId);

      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('gallery_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', member.id);

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('gallery_likes')
          .insert({
            post_id: postId,
            user_id: member.id
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-likes'] });
      queryClient.invalidateQueries({ queryKey: ['like-counts'] });
    }
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!member) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('gallery_comments')
        .insert({
          post_id: postId,
          user_id: member.id,
          content
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ['post-comments'] });
      queryClient.invalidateQueries({ queryKey: ['comment-counts'] });
      toast({
        title: "Comment posted",
        description: "Your comment has been added successfully",
      });
    }
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile || !member) throw new Error('Missing required data');

      // Upload file to storage
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${member.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('gallery-posts')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('gallery-posts')
        .getPublicUrl(uploadData.path);

      // Create post record with pending moderation
      const { error: insertError } = await supabase
        .from('gallery_posts')
        .insert({
          member_id: member.id,
          type: uploadFile.type.startsWith('video/') ? 'reel' : 'post',
          media_url: publicUrl,
          caption: uploadCaption || null,
          is_published: false // Pending moderation
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadPreview("");
      setUploadCaption("");
      toast({
        title: "Upload successful",
        description: "Your post is pending admin approval",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload post",
        variant: "destructive"
      });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 50MB",
        variant: "destructive"
      });
      return;
    }

    setUploadFile(file);
    const url = URL.createObjectURL(file);
    setUploadPreview(url);
  };

  const handleShare = async (post: any) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.caption || 'Check out this post',
          text: post.caption || 'Shared from Mahaveer Bhavan',
          url: post.media_url
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(post.media_url);
      toast({
        title: "Link copied",
        description: "Post link copied to clipboard",
      });
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  if (isLoading) {
    return (
      <MobileLayout title="Gallery">
        <div className="flex justify-center items-center min-h-screen bg-[#1C1C1C]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      title="Gallery"
      headerRight={
        <Button
          size="sm"
          onClick={() => setIsUploadOpen(true)}
          className="bg-gradient-to-r from-[#00A36C] to-[#008556] hover:from-[#008556] hover:to-[#00A36C] h-9"
        >
          <Plus className="w-4 h-4 mr-1" />
          Upload
        </Button>
      }
    >
      <div className="min-h-screen bg-[#1C1C1C]">
        {/* Search and Filter Bar */}
        <div className="sticky top-14 z-30 bg-gradient-to-b from-[#252525] to-[#1C1C1C] border-b border-white/10 px-4 py-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="flex-1 bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-[#252525] border-white/10">
                <SelectItem value="all" className="text-white">All Posts</SelectItem>
                <SelectItem value="admin" className="text-white">Official Posts</SelectItem>
                <SelectItem value="members" className="text-white">Member Posts</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              className="bg-white/5 border-white/10 text-[#B8860B] hover:bg-white/10"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="pb-4">
          {posts && posts.length > 0 ? (
            <AnimatePresence>
              {posts.map((post, index) => {
                const isLiked = userLikes?.includes(post.id);
                const likeCount = likeCounts?.[post.id] || 0;
                const commentCount = commentCounts?.[post.id] || 0;

                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="mb-6"
                  >
                    <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10 overflow-hidden">
                      <CardContent className="p-0">
                        {/* Post Header */}
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-[#B8860B]">
                              <AvatarImage src={post.user_profiles?.avatar_url} />
                              <AvatarFallback className="bg-gradient-to-br from-[#00A36C] to-[#008556] text-white text-sm font-semibold">
                                {getInitials(post.user_profiles?.full_name || '')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-white font-semibold text-sm">
                                  {post.user_profiles?.full_name || 'Mahaveer Bhavan'}
                                </p>
                                {post.user_profiles?.is_admin && (
                                  <Badge className="bg-[#B8860B]/20 text-[#B8860B] border border-[#B8860B]/30 text-xs px-1.5 py-0">
                                    Official
                                  </Badge>
                                )}
                              </div>
                              <p className="text-gray-400 text-xs">
                                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Post Media */}
                        <div className="relative aspect-square bg-black">
                          {post.type === 'reel' ? (
                            <>
                              <img
                                src={post.media_url}
                                alt={post.caption || 'Post'}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Play className="h-16 w-16 text-white/80 drop-shadow-lg" fill="white" />
                              </div>
                            </>
                          ) : (
                            <img
                              src={post.media_url}
                              alt={post.caption || 'Post'}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        {/* Post Actions */}
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => likeMutation.mutate(post.id)}
                                className="flex items-center gap-2"
                              >
                                <Heart
                                  className={cn(
                                    "h-6 w-6 transition-colors",
                                    isLiked ? "fill-[#B8860B] text-[#B8860B]" : "text-gray-400 hover:text-gray-300"
                                  )}
                                />
                                <span className="text-white text-sm font-semibold">{likeCount}</span>
                              </motion.button>

                              <button
                                onClick={() => setSelectedPost(post)}
                                className="flex items-center gap-2 text-gray-400 hover:text-gray-300"
                              >
                                <MessageCircle className="h-6 w-6" />
                                <span className="text-sm font-semibold">{commentCount}</span>
                              </button>

                              <button
                                onClick={() => handleShare(post)}
                                className="text-gray-400 hover:text-gray-300"
                              >
                                <Share2 className="h-6 w-6" />
                              </button>
                            </div>
                          </div>

                          {/* Caption */}
                          {post.caption && (
                            <p className="text-white text-sm leading-relaxed">
                              <span className="font-semibold mr-2">{post.user_profiles?.full_name}</span>
                              {post.caption}
                            </p>
                          )}

                          {/* View Comments */}
                          {commentCount > 0 && (
                            <button
                              onClick={() => setSelectedPost(post)}
                              className="text-gray-400 hover:text-gray-300 text-sm"
                            >
                              View all {commentCount} comments
                            </button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <ImageIcon className="h-16 w-16 text-gray-600 mb-4" />
              <h3 className="text-white text-lg font-semibold mb-2">No posts yet</h3>
              <p className="text-gray-400 text-sm text-center mb-4">
                {searchTerm ? "No results found" : "Be the first to share a moment"}
              </p>
              <Button
                onClick={() => setIsUploadOpen(true)}
                className="bg-gradient-to-r from-[#00A36C] to-[#008556] hover:from-[#008556] hover:to-[#00A36C]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Upload Post
              </Button>
            </div>
          )}
        </div>

        {/* Upload Dialog */}
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent className="bg-[#252525] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Upload New Post</DialogTitle>
              <DialogDescription className="text-gray-400">
                Share a photo or video with the community (pending admin approval)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {!uploadFile ? (
                <>
                  <input
                    type="file"
                    id="file-upload"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-[#00A36C]/50 transition-colors"
                  >
                    <Upload className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-400 text-sm">Click to upload photo or video</p>
                    <p className="text-gray-500 text-xs mt-2">Max size: 50MB</p>
                  </label>
                </>
              ) : (
                <>
                  <div className="relative rounded-xl overflow-hidden bg-black">
                    {uploadFile.type.startsWith('video/') ? (
                      <video src={uploadPreview} controls className="w-full max-h-64 object-contain" />
                    ) : (
                      <img src={uploadPreview} alt="Preview" className="w-full max-h-64 object-contain" />
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                      onClick={() => {
                        setUploadFile(null);
                        setUploadPreview("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Caption</label>
                    <Textarea
                      placeholder="Write a caption..."
                      value={uploadCaption}
                      onChange={(e) => setUploadCaption(e.target.value)}
                      rows={4}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 resize-none"
                    />
                  </div>

                  <Button
                    onClick={() => uploadMutation.mutate()}
                    disabled={uploadMutation.isPending}
                    className="w-full bg-gradient-to-r from-[#00A36C] to-[#008556] hover:from-[#008556] hover:to-[#00A36C]"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loading size="sm" />
                        <span className="ml-2">Uploading...</span>
                      </>
                    ) : (
                      'Share Post'
                    )}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Comments Dialog */}
        <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
          <DialogContent className="bg-[#252525] border-white/10 max-w-lg max-h-[80vh] overflow-hidden p-0">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedPost?.user_profiles?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-[#00A36C] to-[#008556] text-white text-xs">
                      {getInitials(selectedPost?.user_profiles?.full_name || '')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-white font-semibold text-sm">
                    {selectedPost?.user_profiles?.full_name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedPost(null)}
                  className="text-gray-400 hover:text-white h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Post Caption */}
                {selectedPost?.caption && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={selectedPost?.user_profiles?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-[#00A36C] to-[#008556] text-white text-xs">
                        {getInitials(selectedPost?.user_profiles?.full_name || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-white text-sm">
                        <span className="font-semibold mr-2">{selectedPost?.user_profiles?.full_name}</span>
                        {selectedPost?.caption}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {formatDistanceToNow(new Date(selectedPost?.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Comments */}
                {postComments?.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={comment.user_profiles?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-[#00A36C] to-[#008556] text-white text-xs">
                        {getInitials(comment.user_profiles?.full_name || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-white text-sm">
                        <span className="font-semibold mr-2">{comment.user_profiles?.full_name}</span>
                        {comment.content}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Comment */}
              <div className="p-4 border-t border-white/10 bg-[#1C1C1C]">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && commentText.trim()) {
                        e.preventDefault();
                        commentMutation.mutate({ postId: selectedPost.id, content: commentText });
                      }
                    }}
                    className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  />
                  <Button
                    onClick={() => commentMutation.mutate({ postId: selectedPost.id, content: commentText })}
                    disabled={!commentText.trim() || commentMutation.isPending}
                    size="icon"
                    className="bg-gradient-to-r from-[#00A36C] to-[#008556] hover:from-[#008556] hover:to-[#00A36C] flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
};

export default GalleryNew;
