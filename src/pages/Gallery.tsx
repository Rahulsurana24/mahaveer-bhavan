import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List,
  Download,
  Share2,
  Heart,
  Calendar,
  Users,
  Play,
  Image as ImageIcon,
  ZoomIn
} from "lucide-react";

const Gallery = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const albums = [
    {
      id: "album-1",
      title: "Monthly Satsang - January 2024",
      date: "2024-01-15",
      mediaCount: 45,
      thumbnail: "/placeholder.svg",
      type: "event",
      description: "Beautiful moments from our monthly spiritual gathering"
    },
    {
      id: "album-2",
      title: "Charity Drive 2024",
      date: "2024-01-10",
      mediaCount: 28,
      thumbnail: "/placeholder.svg",
      type: "social",
      description: "Community coming together to help those in need"
    },
    {
      id: "album-3",
      title: "Temple Visit - Palitana",
      date: "2023-12-20",
      mediaCount: 67,
      thumbnail: "/placeholder.svg",
      type: "trip",
      description: "Spiritual journey to the sacred Jain temples"
    },
    {
      id: "album-4",
      title: "Cultural Program",
      date: "2023-12-15",
      mediaCount: 34,
      thumbnail: "/placeholder.svg",
      type: "cultural",
      description: "Traditional performances and cultural celebrations"
    }
  ];

  const mediaItems = [
    {
      id: "media-1",
      type: "image",
      title: "Group Photo - Satsang",
      thumbnail: "/placeholder.svg",
      fullUrl: "/placeholder.svg",
      album: "Monthly Satsang - January 2024",
      date: "2024-01-15",
      likes: 23,
      downloads: 5
    },
    {
      id: "media-2",
      type: "video",
      title: "Spiritual Discourse",
      thumbnail: "/placeholder.svg",
      fullUrl: "/placeholder.svg",
      album: "Monthly Satsang - January 2024",
      date: "2024-01-15",
      duration: "15:30",
      likes: 45,
      downloads: 12
    },
    {
      id: "media-3",
      type: "image",
      title: "Charity Distribution",
      thumbnail: "/placeholder.svg",
      fullUrl: "/placeholder.svg",
      album: "Charity Drive 2024",
      date: "2024-01-10",
      likes: 18,
      downloads: 3
    },
    {
      id: "media-4",
      type: "image",
      title: "Temple Architecture",
      thumbnail: "/placeholder.svg",
      fullUrl: "/placeholder.svg",
      album: "Temple Visit - Palitana",
      date: "2023-12-20",
      likes: 67,
      downloads: 24
    }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "event": return <Calendar className="h-4 w-4" />;
      case "social": return <Users className="h-4 w-4" />;
      case "trip": return <Calendar className="h-4 w-4" />;
      case "cultural": return <Users className="h-4 w-4" />;
      default: return <ImageIcon className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "event": "default",
      "social": "secondary",
      "trip": "outline",
      "cultural": "destructive"
    };
    return <Badge variant={variants[type] || "outline"}>{type}</Badge>;
  };

  return (
    <MainLayout title="Gallery">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Community Gallery</h1>
          <p className="text-muted-foreground">
            Cherished memories from our events, trips, and community activities
          </p>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search photos and videos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="event">Events</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="trip">Trips</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                  </SelectContent>
                </Select>

                <Select>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="image">Photos</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Albums Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Albums</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {albums.map((album) => (
              <Card key={album.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                <div className="aspect-video relative">
                  <img 
                    src={album.thumbnail} 
                    alt={album.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    {getTypeBadge(album.type)}
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-1 line-clamp-1">{album.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {album.description}
                  </p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      <span>{album.mediaCount} items</span>
                    </div>
                    <span>{album.date}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Media Gallery */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Media</h2>
          
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {mediaItems.map((item) => (
                <Card 
                  key={item.id} 
                  className="overflow-hidden cursor-pointer group"
                  onClick={() => setSelectedMedia(item)}
                >
                  <div className="aspect-square relative">
                    <img 
                      src={item.thumbnail} 
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {item.type === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/50 rounded-full p-3">
                          <Play className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ZoomIn className="h-8 w-8 text-white" />
                    </div>
                    {item.type === "video" && item.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {item.duration}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h4 className="font-medium text-sm line-clamp-1">{item.title}</h4>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                      <span>{item.date}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          <span>{item.likes}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          <span>{item.downloads}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {mediaItems.map((item) => (
                <Card 
                  key={item.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedMedia(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 relative flex-shrink-0">
                        <img 
                          src={item.thumbnail} 
                          alt={item.title}
                          className="w-full h-full object-cover rounded"
                        />
                        {item.type === "video" && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="h-6 w-6 text-white drop-shadow-lg" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.album}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>{item.date}</span>
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            <span>{item.likes} likes</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            <span>{item.downloads} downloads</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Media Viewer Dialog */}
        <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{selectedMedia?.title}</DialogTitle>
              <DialogDescription>
                From {selectedMedia?.album} • {selectedMedia?.date}
              </DialogDescription>
            </DialogHeader>
            
            {selectedMedia && (
              <div className="space-y-4">
                <div className="relative">
                  {selectedMedia.type === "video" ? (
                    <video 
                      controls 
                      className="w-full max-h-[60vh] object-contain"
                      poster={selectedMedia.thumbnail}
                    >
                      <source src={selectedMedia.fullUrl} type="video/mp4" />
                    </video>
                  ) : (
                    <img 
                      src={selectedMedia.fullUrl} 
                      alt={selectedMedia.title}
                      className="w-full max-h-[60vh] object-contain"
                    />
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      <span>{selectedMedia.likes} likes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      <span>{selectedMedia.downloads} downloads</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Heart className="h-4 w-4 mr-2" />
                      Like
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Gallery;