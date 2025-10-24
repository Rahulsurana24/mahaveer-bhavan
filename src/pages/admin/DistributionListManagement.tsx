import { useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Plus,
  ListChecks,
  Users,
  Package,
  Calendar,
  TrendingUp,
  CheckCircle,
  XCircle,
  Play,
  Search,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loading } from '@/components/ui/loading';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface DistributionList {
  id: string;
  list_name: string;
  item_type_id: string;
  eligible_membership_types: string[];
  total_stock: number | null;
  remaining_stock: number | null;
  status: 'active' | 'completed' | 'cancelled';
  distribution_date: string | null;
  notes: string | null;
  created_at: string;
  item_types?: {
    name: string;
    category: string;
  };
}

const DistributionListManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    list_name: '',
    item_type_id: '',
    distribution_date: '',
    total_stock: '',
    notes: '',
  });
  const [selectedMembershipTypes, setSelectedMembershipTypes] = useState<string[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const membershipTypes = ['Trustee', 'Tapasvi', 'Karyakarta', 'Labharti', 'Extra'];

  // Fetch item types
  const { data: itemTypes = [] } = useQuery({
    queryKey: ['item-types-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch distribution lists
  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['distribution-lists', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('distribution_lists')
        .select(
          `
          *,
          item_types (
            name,
            category
          )
        `
        )
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('list_name', `%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DistributionList[];
    },
  });

  // Fetch distribution records count for each list
  const { data: recordsCount = {} } = useQuery({
    queryKey: ['distribution-records-count', lists.map((l) => l.id)],
    queryFn: async () => {
      if (lists.length === 0) return {};

      const counts: Record<string, { total: number; distributed: number }> = {};

      for (const list of lists) {
        const { count: total } = await supabase
          .from('distribution_records')
          .select('*', { count: 'exact', head: true })
          .eq('distribution_list_id', list.id);

        const { count: distributed } = await supabase
          .from('distribution_records')
          .select('*', { count: 'exact', head: true })
          .eq('distribution_list_id', list.id)
          .eq('status', 'distributed');

        counts[list.id] = {
          total: total || 0,
          distributed: distributed || 0,
        };
      }

      return counts;
    },
    enabled: lists.length > 0,
  });

  // Create list mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData & { membership_types: string[] }) => {
      if (!data.list_name.trim() || !data.item_type_id || data.membership_types.length === 0) {
        throw new Error('Please fill in all required fields');
      }

      const { error } = await supabase.from('distribution_lists').insert({
        list_name: data.list_name,
        item_type_id: data.item_type_id,
        eligible_membership_types: data.membership_types,
        total_stock: data.total_stock ? parseInt(data.total_stock) : null,
        distribution_date: data.distribution_date || null,
        notes: data.notes || null,
        status: 'active',
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-lists'] });
      toast({
        title: '✓ Distribution List Created',
        description: 'Eligible members have been automatically added',
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('distribution_lists')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-lists'] });
      toast({ title: '✓ Status Updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      list_name: '',
      item_type_id: '',
      distribution_date: '',
      total_stock: '',
      notes: '',
    });
    setSelectedMembershipTypes([]);
  };

  const handleMembershipTypeToggle = (type: string) => {
    setSelectedMembershipTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleCompleteList = (id: string, name: string) => {
    if (confirm(`Mark "${name}" as completed? This action cannot be undone.`)) {
      updateStatusMutation.mutate({ id, status: 'completed' });
    }
  };

  const handleCancelList = (id: string, name: string) => {
    if (confirm(`Cancel "${name}"? This will stop all distribution activities.`)) {
      updateStatusMutation.mutate({ id, status: 'cancelled' });
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-[#00A36C]', label: 'Active' },
      completed: { color: 'bg-blue-500', label: 'Completed' },
      cancelled: { color: 'bg-red-500', label: 'Cancelled' },
    };
    const { color, label } = config[status] || config.active;
    return <Badge className={cn(color, 'text-white border-0')}>{label}</Badge>;
  };

  const getProgressPercentage = (listId: string) => {
    const counts = recordsCount[listId];
    if (!counts || counts.total === 0) return 0;
    return Math.round((counts.distributed / counts.total) * 100);
  };

  if (isLoading) {
    return (
      <MobileLayout title="Distribution Lists">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Distribution Lists">
      <div className="px-4 py-4 space-y-4">
        {/* Header Card */}
        <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#00A36C]/20">
                <ListChecks className="h-5 w-5 text-[#00A36C]" />
              </div>
              <div className="flex-1">
                <h2 className="text-white font-semibold">Distribution Lists</h2>
                <p className="text-xs text-gray-400">
                  Manage resource distribution to eligible members
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-4">
              <Play className="h-4 w-4 text-[#00A36C] mb-2" />
              <div className="text-2xl font-bold text-white">
                {lists.filter((l) => l.status === 'active').length}
              </div>
              <div className="text-xs text-gray-400">Active</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-4">
              <CheckCircle className="h-4 w-4 text-blue-500 mb-2" />
              <div className="text-2xl font-bold text-white">
                {lists.filter((l) => l.status === 'completed').length}
              </div>
              <div className="text-xs text-gray-400">Completed</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-4">
              <ListChecks className="h-4 w-4 text-white mb-2" />
              <div className="text-2xl font-bold text-white">{lists.length}</div>
              <div className="text-xs text-gray-400">Total</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search lists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 bg-[#252525] border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#252525] border-white/10">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-[#00A36C] hover:bg-[#00A36C]/90"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Lists */}
        <div className="space-y-3">
          <div className="text-sm text-gray-400">{lists.length} lists</div>

          {lists.length === 0 ? (
            <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
              <CardContent className="p-12 text-center">
                <ListChecks className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                <div className="text-gray-400">No distribution lists found</div>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {lists.map((list, index) => {
                const counts = recordsCount[list.id] || { total: 0, distributed: 0 };
                const progress = getProgressPercentage(list.id);

                return (
                  <motion.div
                    key={list.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-white text-sm line-clamp-1">
                                {list.list_name}
                              </h3>
                              {list.item_types && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Package className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-400">
                                    {list.item_types.name}
                                  </span>
                                </div>
                              )}
                            </div>
                            {getStatusBadge(list.status)}
                          </div>

                          {/* Progress Bar */}
                          {list.status === 'active' && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400">Progress</span>
                                <span className="text-white font-semibold">{progress}%</span>
                              </div>
                              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-[#00A36C]"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                  transition={{ duration: 0.5 }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-400">
                                {counts.distributed}/{counts.total}
                              </span>
                            </div>
                            {list.distribution_date && (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="text-gray-400">
                                  {format(new Date(list.distribution_date), 'MMM dd')}
                                </span>
                              </div>
                            )}
                            {list.remaining_stock !== null && (
                              <div className="flex items-center gap-1.5">
                                <Package className="h-3 w-3 text-gray-400" />
                                <span className="text-gray-400">
                                  {list.remaining_stock} left
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Membership Types */}
                          <div className="flex flex-wrap gap-1">
                            {list.eligible_membership_types.map((type) => (
                              <Badge
                                key={type}
                                className="h-5 text-[10px] bg-white/10 text-gray-300 border-0"
                              >
                                {type}
                              </Badge>
                            ))}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2 border-t border-white/10">
                            {list.status === 'active' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => navigate(`/admin/distribution-attendance/${list.id}`)}
                                  className="flex-1 h-8 bg-[#00A36C] hover:bg-[#00A36C]/90"
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Mark Attendance
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCompleteList(list.id, list.list_name)}
                                  className="h-8 bg-white/5 border-white/10 text-white hover:bg-white/10"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelList(list.id, list.list_name)}
                                  className="h-8 bg-white/5 border-white/10 text-red-400 hover:bg-red-500/10"
                                >
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {list.status !== 'active' && (
                              <div className="flex-1 text-center text-xs text-gray-400 py-1">
                                {list.status === 'completed'
                                  ? `Completed with ${counts.distributed}/${counts.total} distributions`
                                  : 'Cancelled'}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-y-auto bg-[#1C1C1C] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Create Distribution List</DialogTitle>
            <DialogDescription className="text-gray-400">
              Set up a new distribution list for eligible members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">List Name *</Label>
              <Input
                placeholder="e.g., 2025 Annual Conference Kit Collection"
                value={formData.list_name}
                onChange={(e) => setFormData({ ...formData, list_name: e.target.value })}
                className="bg-[#252525] border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Item Type *</Label>
              <Select
                value={formData.item_type_id}
                onValueChange={(value) => setFormData({ ...formData, item_type_id: value })}
              >
                <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                  <SelectValue placeholder="Select item type" />
                </SelectTrigger>
                <SelectContent className="bg-[#252525] border-white/10">
                  {itemTypes.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Eligible Membership Types *</Label>
              <div className="space-y-2 p-3 bg-[#252525] rounded-lg">
                {membershipTypes.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={selectedMembershipTypes.includes(type)}
                      onCheckedChange={() => handleMembershipTypeToggle(type)}
                      className="border-white/30"
                    />
                    <Label
                      htmlFor={`type-${type}`}
                      className="text-sm font-normal text-gray-300 cursor-pointer"
                    >
                      {type}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Distribution Date</Label>
                <Input
                  type="date"
                  value={formData.distribution_date}
                  onChange={(e) =>
                    setFormData({ ...formData, distribution_date: e.target.value })
                  }
                  className="bg-[#252525] border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Total Stock</Label>
                <Input
                  type="number"
                  placeholder="Optional"
                  value={formData.total_stock}
                  onChange={(e) => setFormData({ ...formData, total_stock: e.target.value })}
                  className="bg-[#252525] border-white/10 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Notes (Optional)</Label>
              <Textarea
                placeholder="Additional details..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
              onClick={() =>
                createMutation.mutate({ ...formData, membership_types: selectedMembershipTypes })
              }
              disabled={createMutation.isPending}
              className="bg-[#00A36C] hover:bg-[#00A36C]/90"
            >
              {createMutation.isPending ? 'Creating...' : 'Create List'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default DistributionListManagement;
