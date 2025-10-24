import { useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, Package, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loading } from '@/components/ui/loading';

interface ItemType {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

const ItemTypeManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'kit',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch item types
  const { data: itemTypes = [], isLoading } = useQuery({
    queryKey: ['item-types', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('item_types')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ItemType[];
    },
  });

  // Create item type mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!data.name.trim()) {
        throw new Error('Item name is required');
      }

      const { error } = await supabase.from('item_types').insert({
        name: data.name,
        description: data.description || null,
        category: data.category,
        is_active: true,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-types'] });
      toast({ title: '✓ Item Type Created' });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update item type mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('item_types')
        .update({
          name: data.name,
          description: data.description || null,
          category: data.category,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-types'] });
      toast({ title: '✓ Item Type Updated' });
      setIsEditDialogOpen(false);
      setSelectedItem(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('item_types')
        .update({ is_active: !is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-types'] });
      toast({ title: '✓ Status Updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete item type mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('item_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-types'] });
      toast({ title: '✓ Item Type Deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'kit',
    });
  };

  const openEditDialog = (item: ItemType) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category || 'kit',
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete "${name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const getCategoryBadge = (category: string | null) => {
    const colors: Record<string, string> = {
      kit: 'bg-blue-500',
      gift: 'bg-purple-500',
      prasad: 'bg-amber-500',
      special: 'bg-[#00A36C]',
      book: 'bg-indigo-500',
    };
    const label = category || 'other';
    return (
      <Badge className={cn(colors[label] || 'bg-gray-500', 'text-white border-0 capitalize')}>
        {label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <MobileLayout title="Item Types">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Item Type Definition">
      <div className="px-4 py-4 space-y-4">
        {/* Header Card */}
        <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#00A36C]/20">
                <Package className="h-5 w-5 text-[#00A36C]" />
              </div>
              <div className="flex-1">
                <h2 className="text-white font-semibold">Item Types</h2>
                <p className="text-xs text-gray-400">
                  Define distributable resources for accurate reporting
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search item types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-[#00A36C] hover:bg-[#00A36C]/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-white">{itemTypes.length}</div>
              <div className="text-xs text-gray-400">Total Types</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-[#00A36C]">
                {itemTypes.filter((i) => i.is_active).length}
              </div>
              <div className="text-xs text-gray-400">Active</div>
            </CardContent>
          </Card>
        </div>

        {/* Item Types List */}
        <div className="space-y-3">
          <div className="text-sm text-gray-400">{itemTypes.length} item types</div>

          {itemTypes.length === 0 ? (
            <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                <div className="text-gray-400">No item types found</div>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {itemTypes.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="p-2 rounded-lg flex-shrink-0"
                          style={{
                            backgroundColor: item.is_active ? '#00A36C20' : '#6B728020',
                          }}
                        >
                          <Package
                            className="h-5 w-5"
                            style={{ color: item.is_active ? '#00A36C' : '#6B7280' }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <h3 className="font-semibold text-white text-sm">{item.name}</h3>
                              {item.description && (
                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              {getCategoryBadge(item.category)}
                              {item.is_active ? (
                                <Badge className="bg-[#00A36C] border-0">Active</Badge>
                              ) : (
                                <Badge className="bg-gray-500 border-0">Inactive</Badge>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(item)}
                              className="flex-1 h-8 bg-white/5 border-white/10 text-white hover:bg-white/10"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                toggleActiveMutation.mutate({
                                  id: item.id,
                                  is_active: item.is_active,
                                })
                              }
                              className="h-8 bg-white/5 border-white/10 text-white hover:bg-white/10"
                            >
                              {item.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(item.id, item.name)}
                              className="h-8 bg-white/5 border-white/10 text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-[95vw] bg-[#1C1C1C] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Add Item Type</DialogTitle>
            <DialogDescription className="text-gray-400">
              Define a new distributable resource type
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Item Name *</Label>
              <Input
                placeholder="e.g., New Member Kit"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-[#252525] border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#252525] border-white/10">
                  <SelectItem value="kit">Kit</SelectItem>
                  <SelectItem value="gift">Gift</SelectItem>
                  <SelectItem value="prasad">Prasad</SelectItem>
                  <SelectItem value="special">Special</SelectItem>
                  <SelectItem value="book">Book</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Description (Optional)</Label>
              <Textarea
                placeholder="Brief description of this item..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-[#252525] border-white/10 text-white resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="bg-[#252525] border-white/10 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={createMutation.isPending}
              className="bg-[#00A36C] hover:bg-[#00A36C]/90"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Item Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] bg-[#1C1C1C] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Item Type</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update item type details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Item Name *</Label>
              <Input
                placeholder="e.g., New Member Kit"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-[#252525] border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#252525] border-white/10">
                  <SelectItem value="kit">Kit</SelectItem>
                  <SelectItem value="gift">Gift</SelectItem>
                  <SelectItem value="prasad">Prasad</SelectItem>
                  <SelectItem value="special">Special</SelectItem>
                  <SelectItem value="book">Book</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Description (Optional)</Label>
              <Textarea
                placeholder="Brief description of this item..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-[#252525] border-white/10 text-white resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="bg-[#252525] border-white/10 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedItem && updateMutation.mutate({ id: selectedItem.id, data: formData })
              }
              disabled={updateMutation.isPending}
              className="bg-[#00A36C] hover:bg-[#00A36C]/90"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default ItemTypeManagement;
