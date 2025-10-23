import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Plus, Image as ImageIcon, Video, Trash2, Eye, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/ui/loading";

const GalleryManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch gallery items from database
  const { data: galleryItems, isLoading } = useQuery({
    queryKey: ['admin-gallery', searchTerm, typeFilter, eventFilter],
    queryFn: async () => {
      let query = supabase
        .from('gallery_items')
        .select(`
          *,
          events(title)
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (typeFilter !== 'all') {
        query = query.eq('media_type', typeFilter);
      }

      if (eventFilter !== 'all') {
        query = query.eq('event_id', eventFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Fetch events for filter dropdown
  const { data: events } = useQuery({
    queryKey: ['gallery-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title')
        .eq('is_published', true)
        .order('date', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    }
  });

  // Delete gallery item mutation
  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('gallery_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gallery'] });
      toast({
        title: "Item deleted",
        description: "Gallery item has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete item: " + error.message,
        variant: "destructive",
      });
    }
  });

  const handleDelete = (itemId: string) => {
    if (confirm('Are you sure you want to delete this gallery item?')) {
      deleteMutation.mutate(itemId);
    }
  };

  const getTypeBadge = (type: string) => {
    return type === 'image' ? (
      <Badge variant="default" className="flex items-center gap-1">
        <ImageIcon className="h-3 w-3" />
        Image
      </Badge>
    ) : (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Video className="h-3 w-3" />
        Video
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <AdminLayout title="Gallery Management">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" text="Loading gallery..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gallery Management">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Gallery Management</h2>
            <p className="text-muted-foreground">Manage photos and videos for events</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Upload Media
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Media</DialogTitle>
                <DialogDescription>
                  Add photos or videos to the gallery
                </DialogDescription>
              </DialogHeader>
              <UploadMediaForm onSuccess={() => setIsCreateDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              <h4 className="font-medium">Total Items</h4>
            </div>
            <p className="text-2xl font-bold">{galleryItems?.length || 0}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="h-5 w-5 text-blue-500" />
              <h4 className="font-medium">Images</h4>
            </div>
            <p className="text-2xl font-bold">
              {galleryItems?.filter(item => item.media_type === 'image').length || 0}
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Video className="h-5 w-5 text-purple-500" />
              <h4 className="font-medium">Videos</h4>
            </div>
            <p className="text-2xl font-bold">
              {galleryItems?.filter(item => item.media_type === 'video').length || 0}
            </p>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title or description..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Media Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by Event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {events?.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Gallery Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Gallery Items ({galleryItems?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!galleryItems || galleryItems.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No media found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || typeFilter !== 'all' || eventFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Get started by uploading your first media'}
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Media
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {galleryItems.map((item: any) => (
                  <Card key={item.id} className="overflow-hidden group relative">
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                      {item.media_type === 'image' ? (
                        item.media_url ? (
                          <img
                            src={item.media_url}
                            alt={item.title || 'Gallery item'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        )
                      ) : (
                        <Video className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-sm line-clamp-1">{item.title || 'Untitled'}</h4>
                        {getTypeBadge(item.media_type)}
                      </div>
                      {item.events && (
                        <p className="text-xs text-muted-foreground mb-2">{item.events.title}</p>
                      )}
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {item.description}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

const UploadMediaForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [file, setFile] = useState<File | null>(null);
  const [eventId, setEventId] = useState("");
  const [uploading, setUploading] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch events for dropdown
  const { data: events } = useQuery({
    queryKey: ['upload-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title')
        .eq('is_published', true)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file size (50MB max)
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 50MB",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Get user profile for uploaded_by
      const { data: userData } = await supabase.auth.getUser();
      
      // Upload file to storage
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}-${randomString}.${fileExt}`;
      const folderName = eventId ? `events/${eventId}` : 'general';
      const filePath = `${folderName}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('gallery')
        .getPublicUrl(uploadData.path);

      // Insert gallery item record
      const { error: insertError } = await supabase.from('gallery_items').insert([{
        title,
        description,
        media_type: mediaType,
        media_url: publicUrl,
        event_id: eventId || null,
        uploaded_by: userData.user?.id,
        is_public: true
      }]);

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['admin-gallery'] });
      toast({ 
        title: "Success", 
        description: "Media uploaded successfully!" 
      });
      onSuccess();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to upload media",
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Media title"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Media Type *</Label>
        <Select value={mediaType} onValueChange={setMediaType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Video</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Upload File *</Label>
        <Input
          type="file"
          onChange={handleFileChange}
          accept={mediaType === 'image' ? 'image/*' : 'video/*'}
          required
        />
        {file && (
          <p className="text-sm text-muted-foreground">
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Link to Event (Optional)</Label>
        <Select value={eventId || undefined} onValueChange={(value) => setEventId(value || "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select an event (optional)" />
          </SelectTrigger>
          <SelectContent>
            {events?.map((event) => (
              <SelectItem key={event.id} value={event.id}>
                {event.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={uploading}>
        {uploading ? "Uploading..." : "Upload Media"}
      </Button>
    </form>
  );
};

export default GalleryManagement;
