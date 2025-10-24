import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card3D } from '@/components/3d/Card3D';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Plus,
  Grid3x3,
  PlaySquare,
  User,
  UserPlus,
  UserMinus,
  X,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemberData } from '@/hooks/useMemberData';
import { useToast } from '@/hooks/use-toast';
import { Loading } from '@/components/ui/loading';

const GalleryNew = () => {
  const [activeTab, setActiveTab] = useState('feed');
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const { member } = useMemberData();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch gallery posts
  const { data: posts, isLoading } = useQuery({
    queryKey: ['gallery-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery_posts')
        .select(`
          *,
          user_profiles!gallery_posts_member_id_fkey (
            id,
            full_name,
            photo_url
          ),
          gallery_likes (member_id),
          gallery_comments (count)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Fetch reels (posts with type='reel')
  const { data: reels } = useQuery({
    queryKey: ['gallery-reels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery_posts')
        .select(`
          *,
          user_profiles!gallery_posts_member_id_fkey (
            id,
            full_name,
            photo_url
          )
        `)
        .eq('type', 'reel')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { data: existingLike } = await supabase
        .from('gallery_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('member_id', member?.id)
        .single();

      if (existingLike) {
        // Unlike
        await supabase
          .from('gallery_likes')
          .delete()
          .eq('id', existingLike.id);
      } else {
        // Like
        await supabase
          .from('gallery_likes')
          .insert({ post_id: postId, member_id: member?.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-posts'] });
    }
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ postId, text }: { postId: string; text: string }) => {
      await supabase
        .from('gallery_comments')
        .insert({
          post_id: postId,
          member_id: member?.id,
          comment_text: text
        });
    },
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['gallery-posts'] });
      toast({ title: 'Comment posted!' });
    }
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async (memberIdToFollow: string) => {
      const { data: existingFollow } = await supabase
        .from('member_follows')
        .select('id')
        .eq('follower_id', member?.id)
        .eq('following_id', memberIdToFollow)
        .single();

      if (existingFollow) {
        // Unfollow
        await supabase
          .from('member_follows')
          .delete()
          .eq('id', existingFollow.id);
      } else {
        // Follow
        await supabase
          .from('member_follows')
          .insert({
            follower_id: member?.id,
            following_id: memberIdToFollow
          });
      }
    },
    onSuccess: () => {
      toast({ title: 'Follow status updated!' });
    }
  });

  const isPostLiked = (post: any) => {
    return post.gallery_likes?.some((like: any) => like.member_id === member?.id);
  };

  if (isLoading) {
    return (
      <MainLayout title="Gallery">
        <div className="flex items-center justify-center min-h-screen">
          <Loading size="lg" text="Loading gallery..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Gallery">
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900">
        {/* Header */}
        <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Gallery</h1>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-xl">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Post
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-white/10">
                  <DialogHeader>
                    <DialogTitle className="text-white">Create New Post</DialogTitle>
                    <DialogDescription className="text-white/60">
                      Share a photo or video with the community
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-orange-500/50 transition-colors cursor-pointer">
                      <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60">Click to upload or drag and drop</p>
                      <p className="text-white/40 text-sm mt-2">PNG, JPG, MP4 up to 50MB</p>
                    </div>
                    <Textarea
                      placeholder="Write a caption..."
                      className="bg-white/5 border-white/10 text-white rounded-xl"
                    />
                    <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-xl">
                      Share Post
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-5xl mx-auto px-4 py-6">
          <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1 mb-8">
            <TabsTrigger value="feed" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600">
              <Grid3x3 className="w-4 h-4 mr-2" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="reels" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600">
              <PlaySquare className="w-4 h-4 mr-2" />
              Reels
            </TabsTrigger>
          </TabsList>

          {/* Feed Tab */}
          <TabsContent value="feed" className="space-y-8">
            <AnimatePresence mode="wait">
              {posts?.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card3D className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden">
                    {/* Post Header */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border-2 border-orange-500">
                          <AvatarImage src={post.user_profiles?.photo_url} />
                          <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
                            {post.user_profiles?.full_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-white font-semibold">{post.user_profiles?.full_name}</p>
                          <p className="text-white/50 text-sm">{new Date(post.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => followMutation.mutate(post.member_id)}
                          className="text-orange-500 hover:text-orange-400 hover:bg-white/5"
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Follow
                        </Button>
                        <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/5">
                          <MoreHorizontal className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Post Image */}
                    <div className="relative aspect-square bg-black">
                      <img
                        src={post.media_url || '/placeholder.svg'}
                        alt="Post"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Post Actions */}
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => likeMutation.mutate(post.id)}
                            className="flex items-center gap-2"
                          >
                            <Heart
                              className={`w-6 h-6 ${
                                isPostLiked(post)
                                  ? 'fill-red-500 text-red-500'
                                  : 'text-white hover:text-white/80'
                              }`}
                            />
                            <span className="text-white font-semibold">{post.likes_count || 0}</span>
                          </motion.button>
                          <button
                            onClick={() => setSelectedPost(post)}
                            className="flex items-center gap-2 text-white hover:text-white/80"
                          >
                            <MessageCircle className="w-6 h-6" />
                            <span className="font-semibold">{post.comments_count || 0}</span>
                          </button>
                          <button className="text-white hover:text-white/80">
                            <Send className="w-6 h-6" />
                          </button>
                        </div>
                        <button className="text-white hover:text-white/80">
                          <Bookmark className="w-6 h-6" />
                        </button>
                      </div>

                      {/* Caption */}
                      {post.caption && (
                        <p className="text-white">
                          <span className="font-semibold mr-2">{post.user_profiles?.full_name}</span>
                          {post.caption}
                        </p>
                      )}
                    </div>
                  </Card3D>
                </motion.div>
              ))}
            </AnimatePresence>
          </TabsContent>

          {/* Reels Tab */}
          <TabsContent value="reels">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {reels?.map((reel) => (
                <Card3D key={reel.id} className="aspect-[9/16] bg-white/5 border border-white/10 rounded-2xl overflow-hidden relative group cursor-pointer">
                  <img
                    src={reel.thumbnail_url || reel.media_url}
                    alt="Reel"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-white text-sm font-semibold">{reel.user_profiles?.full_name}</p>
                      <div className="flex items-center gap-4 mt-2 text-white/80 text-sm">
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {reel.likes_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {reel.comments_count}
                        </span>
                      </div>
                    </div>
                  </div>
                  <PlaySquare className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-white/80" />
                </Card3D>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Comments Dialog */}
        <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
          <DialogContent className="bg-zinc-900 border-white/10 max-w-4xl max-h-[80vh] p-0">
            <div className="grid md:grid-cols-2 h-full">
              {/* Image */}
              <div className="bg-black flex items-center justify-center">
                <img
                  src={selectedPost?.media_url}
                  alt="Post"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Comments Section */}
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedPost?.user_profiles?.photo_url} />
                      <AvatarFallback>{selectedPost?.user_profiles?.full_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-white font-semibold">{selectedPost?.user_profiles?.full_name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedPost(null)}
                    className="text-white/60"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Caption */}
                  {selectedPost?.caption && (
                    <div className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={selectedPost?.user_profiles?.photo_url} />
                      </Avatar>
                      <div>
                        <p className="text-white">
                          <span className="font-semibold mr-2">{selectedPost?.user_profiles?.full_name}</span>
                          {selectedPost?.caption}
                        </p>
                        <p className="text-white/50 text-xs mt-1">
                          {new Date(selectedPost?.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Comments would go here */}
                </div>

                <div className="p-4 border-t border-white/10">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="bg-white/5 border-white/10 text-white rounded-xl"
                    />
                    <Button
                      onClick={() => commentMutation.mutate({ postId: selectedPost?.id, text: commentText })}
                      disabled={!commentText.trim()}
                      className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-xl"
                    >
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default GalleryNew;
