import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Search,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Play
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loading } from "@/components/ui/loading";

const Gallery = () => {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  // Fetch gallery items from database
  const { data: mediaItems, isLoading } = useQuery({
    queryKey: ['gallery-items', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('gallery_items')
        .select(`
          *,
          events(title, date)
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  const selectedMedia = selectedMediaIndex !== null && mediaItems ? mediaItems[selectedMediaIndex] : null;

  const handleNext = () => {
    if (selectedMediaIndex !== null && mediaItems && selectedMediaIndex < mediaItems.length - 1) {
      setSelectedMediaIndex(selectedMediaIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (selectedMediaIndex !== null && selectedMediaIndex > 0) {
      setSelectedMediaIndex(selectedMediaIndex - 1);
    }
  };

  const toggleLike = (id: string) => {
    setLiked(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleBookmark = (id: string) => {
    setBookmarked(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <MainLayout title="Gallery">
        <div className="flex justify-center py-12">
          <Loading size="lg" text="Loading gallery..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Gallery">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Instagram-style Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gallery</h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Instagram-style Grid */}
        {!mediaItems || mediaItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No posts yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 md:gap-2">
            {mediaItems.map((item: any, index: number) => (
              <div
                key={item.id}
                className="aspect-square relative cursor-pointer group overflow-hidden"
                onClick={() => setSelectedMediaIndex(index)}
              >
                {item.media_type === 'video' ? (
                  <>
                    <img
                      src={item.media_url}
                      alt={item.title || 'Gallery item'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="h-10 w-10 text-white drop-shadow-lg" fill="white" />
                    </div>
                  </>
                ) : (
                  <img
                    src={item.media_url}
                    alt={item.title || 'Gallery item'}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Hover Overlay - Instagram style */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Heart className="h-5 w-5" fill="white" />
                    <span>{Math.floor(Math.random() * 100)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <MessageCircle className="h-5 w-5" fill="white" />
                    <span>{Math.floor(Math.random() * 20)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instagram-style Modal */}
        <Dialog open={selectedMediaIndex !== null} onOpenChange={() => setSelectedMediaIndex(null)}>
          <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0">
            <div className="flex h-full">
              {/* Left: Media Display */}
              <div className="flex-1 bg-black flex items-center justify-center relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
                  onClick={() => setSelectedMediaIndex(null)}
                >
                  <X className="h-5 w-5" />
                </Button>

                {selectedMediaIndex !== null && selectedMediaIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                )}

                {selectedMediaIndex !== null && mediaItems && selectedMediaIndex < mediaItems.length - 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                    onClick={handleNext}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                )}

                {selectedMedia && (
                  selectedMedia.media_type === 'video' ? (
                    <video
                      controls
                      className="max-w-full max-h-full"
                      src={selectedMedia.media_url}
                    />
                  ) : (
                    <img
                      src={selectedMedia.media_url}
                      alt={selectedMedia.title || 'Gallery item'}
                      className="max-w-full max-h-full object-contain"
                    />
                  )
                )}
              </div>

              {/* Right: Instagram-style Info Panel */}
              <div className="w-full md:w-96 bg-background flex flex-col">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder.svg" />
                      <AvatarFallback>MB</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">Mahaveer Bhavan</p>
                      {selectedMedia?.events && (
                        <p className="text-xs text-muted-foreground">
                          {selectedMedia.events.title}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </div>

                {/* Description/Caption */}
                <div className="flex-1 p-4 overflow-y-auto">
                  {selectedMedia && (
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback>MB</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm">
                            <span className="font-semibold mr-2">Mahaveer Bhavan</span>
                            {selectedMedia.description || selectedMedia.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(selectedMedia.created_at).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Comments Section */}
                      <div className="text-sm text-muted-foreground text-center py-4">
                        No comments yet
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="border-t">
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => selectedMedia && toggleLike(selectedMedia.id)}
                        >
                          <Heart
                            className={`h-6 w-6 ${
                              selectedMedia && liked.has(selectedMedia.id)
                                ? 'fill-red-500 text-red-500'
                                : ''
                            }`}
                          />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <MessageCircle className="h-6 w-6" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Share2 className="h-6 w-6" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => selectedMedia && toggleBookmark(selectedMedia.id)}
                      >
                        <Bookmark
                          className={`h-6 w-6 ${
                            selectedMedia && bookmarked.has(selectedMedia.id)
                              ? 'fill-current'
                              : ''
                          }`}
                        />
                      </Button>
                    </div>
                    <div className="text-sm font-semibold">
                      {Math.floor(Math.random() * 100)} likes
                    </div>
                  </div>

                  {/* Add Comment */}
                  <div className="p-4 border-t flex items-center gap-2">
                    <Input
                      placeholder="Add a comment..."
                      className="border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button variant="ghost" className="text-primary font-semibold">
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

export default Gallery;
