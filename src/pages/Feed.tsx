import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MobileLayout from "@/components/layout/MobileLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Smile } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMemberData } from "@/hooks/useMemberData";
import { Loading } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Post {
  id: string;
  member_id: string;
  type: 'post' | 'reel';
  media_url: string;
  caption?: string;
  location?: string;
  created_at: string;
  user_profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

const Feed = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { member } = useMemberData();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState("");

  // Fetch feed posts with infinite scroll
  const { data: feedPosts, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['feed-posts'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('gallery_posts')
        .select(`
          *,
          user_profiles:member_id(full_name, avatar_url)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + 9);

      if (error) throw error;
      return data as Post[];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 10) return undefined;
      return allPages.length * 10;
    },
    initialPageParam: 0
  });

  // Fetch likes for current user
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
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!member) throw new Error('Not authenticated');

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
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
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
      toast({
        title: "Comment added",
        description: "Your comment has been posted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post comment",
        variant: "destructive"
      });
    }
  });

  const handleLike = (postId: string) => {
    const isLiked = userLikes?.includes(postId);
    likeMutation.mutate({ postId, isLiked: !!isLiked });
  };

  const handleComment = (postId: string) => {
    if (!commentText.trim()) return;
    commentMutation.mutate({ postId, content: commentText });
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  const allPosts = feedPosts?.pages.flatMap(page => page) || [];

  if (isLoading) {
    return (
      <MobileLayout title="Feed">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Feed">
      <div className="bg-white min-h-screen pb-4">
        {/* Stories Section - Placeholder */}
        <div className="border-b border-gray-200 px-4 py-3">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500 p-0.5">
                  <div className="h-full w-full rounded-full bg-white p-0.5">
                    <div className="h-full w-full rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs text-gray-400">Story</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-600">User {i}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feed Posts */}
        <div className="divide-y divide-gray-100">
          {allPosts.map((post) => {
            const isLiked = userLikes?.includes(post.id);

            return (
              <article key={post.id} className="bg-white">
                {/* Post Header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-gray-200">
                      <AvatarImage src={post.user_profiles?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(post.user_profiles?.full_name || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {post.user_profiles?.full_name}
                      </p>
                      {post.location && (
                        <p className="text-xs text-gray-500">{post.location}</p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </div>

                {/* Post Media */}
                <div
                  className="w-full aspect-square bg-gray-100 cursor-pointer"
                  onDoubleClick={() => handleLike(post.id)}
                  onClick={() => setSelectedPost(post)}
                >
                  {post.type === 'post' ? (
                    <img
                      src={post.media_url}
                      alt={post.caption || 'Post'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={post.media_url}
                      className="w-full h-full object-cover"
                      controls
                    />
                  )}
                </div>

                {/* Post Actions */}
                <div className="px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 p-0"
                        onClick={() => handleLike(post.id)}
                      >
                        <Heart
                          className={cn(
                            "h-6 w-6 transition-colors",
                            isLiked ? "fill-red-500 text-red-500" : "text-gray-900"
                          )}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 p-0"
                        onClick={() => setSelectedPost(post)}
                      >
                        <MessageCircle className="h-6 w-6" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                        <Send className="h-6 w-6" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                      <Bookmark className="h-6 w-6" />
                    </Button>
                  </div>

                  {/* Caption */}
                  {post.caption && (
                    <div className="text-sm">
                      <span className="font-semibold mr-2">{post.user_profiles?.full_name}</span>
                      <span className="text-gray-900">{post.caption}</span>
                    </div>
                  )}

                  {/* View Comments */}
                  <button
                    onClick={() => setSelectedPost(post)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    View all comments
                  </button>

                  {/* Timestamp */}
                  <p className="text-xs text-gray-500 uppercase">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        {/* Load More */}
        {hasNextPage && (
          <div className="flex justify-center py-8">
            <Button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              variant="outline"
            >
              {isFetchingNextPage ? <Loading size="sm" /> : 'Load More'}
            </Button>
          </div>
        )}

        {/* No Posts */}
        {allPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="h-16 w-16 rounded-full border-2 border-gray-300 flex items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Posts Yet</h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              Be the first to share something!
            </p>
            <Button onClick={() => navigate('/create-post')}>
              Create Post
            </Button>
          </div>
        )}

        {/* Post Detail Modal */}
        <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
            {selectedPost && (
              <>
                {/* Post Media */}
                <div className="w-full aspect-square bg-gray-100">
                  {selectedPost.type === 'post' ? (
                    <img
                      src={selectedPost.media_url}
                      alt={selectedPost.caption || 'Post'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={selectedPost.media_url}
                      className="w-full h-full object-cover"
                      controls
                    />
                  )}
                </div>

                {/* Comments Section */}
                <div className="p-4 space-y-4">
                  {/* Post Caption */}
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={selectedPost.user_profiles?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(selectedPost.user_profiles?.full_name || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-semibold mr-2">{selectedPost.user_profiles?.full_name}</span>
                        {selectedPost.caption}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(selectedPost.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-4 max-h-60 overflow-y-auto">
                    {postComments?.map((comment: any) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={comment.user_profiles?.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(comment.user_profiles?.full_name || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-semibold mr-2">{comment.user_profiles?.full_name}</span>
                            {comment.content}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Comment */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                      <Smile className="h-5 w-5" />
                    </Button>
                    <Input
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleComment(selectedPost.id);
                        }
                      }}
                      className="flex-1 border-none focus-visible:ring-0"
                    />
                    <Button
                      onClick={() => handleComment(selectedPost.id)}
                      disabled={!commentText.trim() || commentMutation.isPending}
                      variant="ghost"
                      size="sm"
                      className="text-primary font-semibold"
                    >
                      Post
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
};

export default Feed;
