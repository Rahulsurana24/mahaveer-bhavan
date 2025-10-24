import { useState } from 'react';
import { useParams } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  QrCode,
  Search,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  Clock,
  User,
  Camera,
  Scan,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tantml:react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loading } from '@/components/ui/loading';
import { format } from 'date-fns';
import QrScanner from 'react-qr-scanner';

interface DistributionRecord {
  id: string;
  member_id: string;
  status: 'pending' | 'distributed' | 'absent';
  distributed_at: string | null;
  distribution_method: string | null;
  notes: string | null;
  members: {
    id: string;
    full_name: string;
    membership_type: string;
    phone: string;
    avatar_url: string | null;
  };
}

const MobileDistributionAttendance = () => {
  const { listId } = useParams<{ listId: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedMember, setScannedMember] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<DistributionRecord | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch distribution list details
  const { data: listDetails, isLoading: listLoading } = useQuery({
    queryKey: ['distribution-list-details', listId],
    queryFn: async () => {
      const { data, error } = await supabase
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
        .eq('id', listId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch distribution records
  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['distribution-records', listId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('distribution_records')
        .select(
          `
          *,
          members (
            id,
            full_name,
            membership_type,
            phone,
            avatar_url
          )
        `
        )
        .eq('distribution_list_id', listId)
        .order('members(full_name)');

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data || [];

      if (searchTerm) {
        filteredData = filteredData.filter(
          (r: any) =>
            r.members.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.members.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return filteredData as DistributionRecord[];
    },
  });

  // Fetch today's records
  const { data: todayRecords = [] } = useQuery({
    queryKey: ['distribution-today', listId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('distribution_records')
        .select(
          `
          *,
          members (
            full_name,
            membership_type
          )
        `
        )
        .eq('distribution_list_id', listId)
        .eq('status', 'distributed')
        .gte('distributed_at', `${today}T00:00:00`)
        .order('distributed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Mark distribution mutation
  const markDistributionMutation = useMutation({
    mutationFn: async ({
      recordId,
      method,
    }: {
      recordId: string;
      method: 'qr_scan' | 'manual';
    }) => {
      const { error } = await supabase
        .from('distribution_records')
        .update({
          status: 'distributed',
          distributed_at: new Date().toISOString(),
          distributed_by: (await supabase.auth.getUser()).data.user?.id,
          distribution_method: method,
          notes: notes || null,
        })
        .eq('id', recordId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-records'] });
      queryClient.invalidateQueries({ queryKey: ['distribution-today'] });
      queryClient.invalidateQueries({ queryKey: ['distribution-lists'] });
      toast({
        title: '✓ Distribution Marked',
        description: 'Confirmation notification sent to member',
      });
      setShowConfirmDialog(false);
      setScannedMember(null);
      setNotes('');
      setScannerOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Handle QR scan
  const handleQRScan = async (data: any) => {
    if (data?.text) {
      setScannerOpen(false);

      // Extract member ID from QR code (format: MAHAVEER_MEMBER:T-001)
      const match = data.text.match(/MAHAVEER_MEMBER:(.+)/);
      const memberId = match ? match[1] : data.text;

      // Find the record for this member
      const record = records.find((r) => r.member_id === memberId);

      if (!record) {
        toast({
          title: '⚠️ Not Eligible',
          description: 'This member is not on the distribution list',
          variant: 'destructive',
        });
        return;
      }

      if (record.status === 'distributed') {
        toast({
          title: '⚠️ Already Collected',
          description: `Collected at ${format(
            new Date(record.distributed_at!),
            'h:mm a'
          )}`,
          variant: 'destructive',
        });
        return;
      }

      // Show confirmation dialog
      setScannedMember(record.members);
      setSelectedRecord(record);
      setShowConfirmDialog(true);
    }
  };

  // Handle manual mark
  const handleManualMark = (record: DistributionRecord) => {
    if (record.status === 'distributed') {
      toast({
        title: '⚠️ Already Collected',
        description: `Collected at ${format(new Date(record.distributed_at!), 'h:mm a')}`,
        variant: 'destructive',
      });
      return;
    }

    setScannedMember(record.members);
    setSelectedRecord(record);
    setShowConfirmDialog(true);
  };

  // Calculate stats
  const stats = {
    total: records.length,
    distributed: records.filter((r) => r.status === 'distributed').length,
    pending: records.filter((r) => r.status === 'pending').length,
    todayCount: todayRecords.length,
    qrCount: todayRecords.filter((r: any) => r.distribution_method === 'qr_scan').length,
    manualCount: todayRecords.filter((r: any) => r.distribution_method === 'manual').length,
  };

  const progress = stats.total > 0 ? Math.round((stats.distributed / stats.total) * 100) : 0;

  if (listLoading || recordsLoading) {
    return (
      <MobileLayout title="Distribution Attendance">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  if (!listDetails) {
    return (
      <MobileLayout title="Distribution Attendance">
        <div className="px-4 py-4">
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-12 text-center">
              <XCircle className="h-12 w-12 mx-auto text-red-500 mb-3" />
              <div className="text-white font-semibold mb-2">List Not Found</div>
              <div className="text-gray-400">The distribution list does not exist</div>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Distribution Attendance">
      <div className="px-4 py-4 space-y-4">
        {/* Header Info */}
        <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#00A36C]/20 flex-shrink-0">
                <QrCode className="h-5 w-5 text-[#00A36C]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm line-clamp-1">
                  {listDetails.list_name}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {listDetails.item_types?.name}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="text-xs text-gray-400">Progress:</div>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00A36C]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs font-semibold text-white">{progress}%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-4">
              <Users className="h-4 w-4 text-white mb-2" />
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-gray-400">Total</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-4">
              <CheckCircle className="h-4 w-4 text-[#00A36C] mb-2" />
              <div className="text-2xl font-bold text-[#00A36C]">{stats.distributed}</div>
              <div className="text-xs text-gray-400">Distributed</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-4">
              <Clock className="h-4 w-4 text-[#B8860B] mb-2" />
              <div className="text-2xl font-bold text-[#B8860B]">{stats.pending}</div>
              <div className="text-xs text-gray-400">Pending</div>
            </CardContent>
          </Card>
        </div>

        {/* QR Scanner Button */}
        <Button
          onClick={() => setScannerOpen(!scannerOpen)}
          className={cn(
            'w-full h-14 text-lg font-semibold',
            scannerOpen
              ? 'bg-red-500 hover:bg-red-500/90'
              : 'bg-[#00A36C] hover:bg-[#00A36C]/90'
          )}
        >
          {scannerOpen ? (
            <>
              <XCircle className="h-5 w-5 mr-2" />
              Close Scanner
            </>
          ) : (
            <>
              <QrCode className="h-5 w-5 mr-2" />
              Scan QR Code
            </>
          )}
        </Button>

        {/* QR Scanner */}
        <AnimatePresence>
          {scannerOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-0">
                  <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                    <QrScanner
                      delay={300}
                      onError={(error) => console.error('QR Scanner error:', error)}
                      onScan={handleQRScan}
                      style={{ width: '100%', height: '100%' }}
                      constraints={{ video: { facingMode: 'environment' } }}
                    />
                    <div className="absolute inset-0 border-4 border-[#00A36C] m-8 rounded-lg pointer-events-none" />
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                      <div className="inline-block bg-black/70 px-4 py-2 rounded-lg">
                        <Scan className="h-5 w-5 text-[#00A36C] mx-auto mb-1 animate-pulse" />
                        <p className="text-white text-sm font-medium">
                          Point at member's QR code
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or member ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
          />
        </div>

        {/* Member List */}
        <div className="space-y-3">
          <div className="text-sm text-gray-400">{records.length} members</div>

          {records.length === 0 ? (
            <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                <div className="text-gray-400">No members found</div>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {records.map((record, index) => {
                const isDistributed = record.status === 'distributed';

                return (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={cn(
                        'bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10',
                        isDistributed && 'opacity-60'
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                              isDistributed
                                ? 'bg-[#00A36C]/20'
                                : 'bg-gradient-to-br from-[#00A36C] to-[#B8860B]'
                            )}
                          >
                            {isDistributed ? (
                              <CheckCircle className="h-5 w-5 text-[#00A36C]" />
                            ) : (
                              <User className="h-5 w-5 text-white" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white text-sm">
                              {record.members.full_name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-400 font-mono">
                                {record.members.id}
                              </span>
                              <Badge className="h-4 text-[10px] bg-white/10 text-gray-300 border-0">
                                {record.members.membership_type}
                              </Badge>
                            </div>
                            {isDistributed && record.distributed_at && (
                              <div className="text-xs text-[#00A36C] mt-1">
                                Collected at {format(new Date(record.distributed_at), 'h:mm a')}
                              </div>
                            )}
                          </div>

                          <Button
                            size="sm"
                            onClick={() => handleManualMark(record)}
                            disabled={isDistributed}
                            className={cn(
                              'h-9 flex-shrink-0',
                              isDistributed
                                ? 'bg-[#00A36C] hover:bg-[#00A36C] cursor-not-allowed'
                                : 'bg-[#00A36C] hover:bg-[#00A36C]/90'
                            )}
                          >
                            {isDistributed ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Marked
                              </>
                            ) : (
                              <>Mark</>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Today's Stats */}
        {todayRecords.length > 0 && (
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardHeader>
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Today's Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.todayCount}</div>
                  <div className="text-gray-400">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#00A36C]">{stats.qrCount}</div>
                  <div className="text-gray-400">QR Scan</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#B8860B]">{stats.manualCount}</div>
                  <div className="text-gray-400">Manual</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-[95vw] bg-[#1C1C1C] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Distribution</DialogTitle>
            <DialogDescription className="text-gray-400">
              Verify member details before marking
            </DialogDescription>
          </DialogHeader>
          {scannedMember && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-4 bg-[#252525] rounded-lg">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00A36C] to-[#B8860B] flex items-center justify-center text-white font-bold flex-shrink-0">
                  {scannedMember.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{scannedMember.full_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 font-mono">
                      {scannedMember.id}
                    </span>
                    <Badge className="h-4 text-[10px] bg-[#00A36C] text-white border-0">
                      {scannedMember.membership_type}
                    </Badge>
                  </div>
                  {scannedMember.phone && (
                    <p className="text-xs text-gray-400 mt-1">{scannedMember.phone}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Notes (Optional)</Label>
                <Textarea
                  placeholder="Additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-[#252525] border-white/10 text-white resize-none"
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setScannedMember(null);
                setNotes('');
              }}
              className="bg-[#252525] border-white/10 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedRecord) {
                  markDistributionMutation.mutate({
                    recordId: selectedRecord.id,
                    method: scannerOpen ? 'qr_scan' : 'manual',
                  });
                }
              }}
              disabled={markDistributionMutation.isPending}
              className="bg-[#00A36C] hover:bg-[#00A36C]/90"
            >
              {markDistributionMutation.isPending ? 'Marking...' : 'Confirm Distribution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default MobileDistributionAttendance;
