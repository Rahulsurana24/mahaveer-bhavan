import { useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  Search,
  Filter,
  Calendar,
  User,
  CreditCard,
  Receipt,
  FileText,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Loading } from '@/components/ui/loading';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const MobileFinancialManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'donations' | 'reports' | 'donors'>('donations');
  const { toast } = useToast();

  // Fetch donations with filters
  const { data: donations = [], isLoading: donationsLoading } = useQuery({
    queryKey: ['mobile-donations', searchTerm, methodFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('donations')
        .select(
          `
          *,
          members(full_name, email)
        `
        )
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`receipt_number.ilike.%${searchTerm}%,purpose.ilike.%${searchTerm}%`);
      }

      if (methodFilter !== 'all') {
        query = query.eq('payment_method', methodFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch dashboard statistics
  const { data: dashboardStats } = useQuery({
    queryKey: ['mobile-donation-stats'],
    queryFn: async () => {
      const currentMonth = new Date();
      const startOfMonthDate = startOfMonth(currentMonth).toISOString();

      // This month's donations
      const { data: monthData } = await supabase
        .from('donations')
        .select('amount')
        .gte('created_at', startOfMonthDate)
        .eq('status', 'completed');

      const thisMonth = monthData?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
      const monthCount = monthData?.length || 0;

      // Last month's donations for comparison
      const lastMonth = subMonths(currentMonth, 1);
      const startOfLastMonth = startOfMonth(lastMonth).toISOString();
      const endOfLastMonth = endOfMonth(lastMonth).toISOString();

      const { data: lastMonthData } = await supabase
        .from('donations')
        .select('amount')
        .gte('created_at', startOfLastMonth)
        .lte('created_at', endOfLastMonth)
        .eq('status', 'completed');

      const lastMonthTotal = lastMonthData?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
      const growth =
        lastMonthTotal > 0 ? ((thisMonth - lastMonthTotal) / lastMonthTotal) * 100 : 0;

      // Total donations all time
      const { data: allData } = await supabase
        .from('donations')
        .select('amount')
        .eq('status', 'completed');

      const totalDonations = allData?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;

      // Count unique donors
      const { data: donorData } = await supabase
        .from('donations')
        .select('member_id')
        .eq('status', 'completed');

      const uniqueDonors = new Set(donorData?.map((d) => d.member_id).filter(Boolean)).size;

      // Average donation
      const avgDonation = allData && allData.length > 0 ? totalDonations / allData.length : 0;

      return {
        totalDonations,
        thisMonth,
        monthCount,
        growth,
        avgDonation,
        uniqueDonors,
      };
    },
  });

  // Fetch monthly reports
  const { data: monthlyStats = [] } = useQuery({
    queryKey: ['mobile-monthly-donations'],
    queryFn: async () => {
      const months = [];
      for (let i = 0; i < 4; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const startOfMonthDate = startOfMonth(date).toISOString();
        const endOfMonthDate = endOfMonth(date).toISOString();

        const { data, error } = await supabase
          .from('donations')
          .select('amount')
          .gte('created_at', startOfMonthDate)
          .lte('created_at', endOfMonthDate)
          .eq('status', 'completed');

        if (error) throw error;

        const total = data?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
        months.push({
          month: date.toLocaleDateString('en-US', { month: 'long' }),
          year: date.getFullYear(),
          donations: total,
          count: data?.length || 0,
        });
      }
      return months;
    },
  });

  // Fetch top donors
  const { data: topDonors = [] } = useQuery({
    queryKey: ['mobile-top-donors'],
    queryFn: async () => {
      const { data: donationsData, error } = await supabase
        .from('donations')
        .select(
          `
          amount,
          member_id,
          members(full_name)
        `
        )
        .eq('status', 'completed');

      if (error) throw error;

      // Group by member and sum donations
      const donorMap = new Map();
      donationsData?.forEach((donation: any) => {
        const memberName = donation.members?.full_name || 'Anonymous';
        if (!donorMap.has(memberName)) {
          donorMap.set(memberName, { name: memberName, amount: 0, donations: 0 });
        }
        const donor = donorMap.get(memberName);
        donor.amount += donation.amount || 0;
        donor.donations += 1;
      });

      return Array.from(donorMap.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);
    },
  });

  const exportDonations = () => {
    const csv = [
      ['Donor', 'Amount', 'Method', 'Purpose', 'Date', 'Status', 'Receipt'],
      ...donations.map((d: any) => [
        d.members?.full_name || 'Anonymous',
        d.amount,
        d.payment_method,
        d.purpose || 'General',
        format(new Date(d.created_at), 'yyyy-MM-dd'),
        d.status,
        d.receipt_number || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donations_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-[#00A36C]',
      pending: 'bg-[#B8860B]',
      failed: 'bg-red-500',
      refunded: 'bg-gray-500',
    };
    return (
      <Badge className={cn(colors[status] || 'bg-gray-500', 'text-white border-0')}>
        {status}
      </Badge>
    );
  };

  if (donationsLoading) {
    return (
      <MobileLayout title="Financial Management">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Financial Management">
      <div className="px-4 py-4 space-y-4">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-4 w-4 text-[#00A36C]" />
                {dashboardStats && (
                  <div className="flex items-center gap-1 text-xs">
                    {dashboardStats.growth >= 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-[#00A36C]" />
                        <span className="text-[#00A36C]">
                          {Math.abs(dashboardStats.growth).toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3 text-red-400" />
                        <span className="text-red-400">
                          {Math.abs(dashboardStats.growth).toFixed(1)}%
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold text-white">
                ₹{(dashboardStats?.totalDonations || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-gray-400">Total Donations</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-4">
              <Calendar className="h-4 w-4 text-[#B8860B] mb-2" />
              <div className="text-2xl font-bold text-white">
                ₹{(dashboardStats?.thisMonth || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-gray-400">
                This Month ({dashboardStats?.monthCount || 0})
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-4">
              <DollarSign className="h-4 w-4 text-blue-500 mb-2" />
              <div className="text-2xl font-bold text-white">
                ₹{Math.round(dashboardStats?.avgDonation || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-gray-400">Average</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-4">
              <User className="h-4 w-4 text-purple-500 mb-2" />
              <div className="text-2xl font-bold text-white">{dashboardStats?.uniqueDonors || 0}</div>
              <div className="text-xs text-gray-400">Donors</div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 bg-[#252525] p-1 rounded-lg overflow-x-auto">
          <Button
            variant={activeTab === 'donations' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('donations')}
            className={cn(
              'flex-1',
              activeTab === 'donations'
                ? 'bg-[#00A36C] text-white'
                : 'text-gray-400 hover:text-white'
            )}
          >
            <Receipt className="h-4 w-4 mr-2" />
            Donations
          </Button>
          <Button
            variant={activeTab === 'reports' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('reports')}
            className={cn(
              'flex-1 whitespace-nowrap',
              activeTab === 'reports'
                ? 'bg-[#00A36C] text-white'
                : 'text-gray-400 hover:text-white'
            )}
          >
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </Button>
          <Button
            variant={activeTab === 'donors' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('donors')}
            className={cn(
              'flex-1',
              activeTab === 'donors'
                ? 'bg-[#00A36C] text-white'
                : 'text-gray-400 hover:text-white'
            )}
          >
            <User className="h-4 w-4 mr-2" />
            Top Donors
          </Button>
        </div>

        {/* Donations Tab */}
        {activeTab === 'donations' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Search and Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search donations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                />
              </div>
              <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-[#252525] border-white/10 text-white"
                  >
                    <Filter className="h-4 w-4" />
                    {(methodFilter !== 'all' || statusFilter !== 'all') && (
                      <Badge className="ml-2 h-4 bg-[#00A36C] border-0">•</Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="bg-[#1C1C1C] border-white/10 max-h-[80vh]"
                >
                  <SheetHeader>
                    <SheetTitle className="text-white">Filter Donations</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Payment Method</Label>
                      <Select value={methodFilter} onValueChange={setMethodFilter}>
                        <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#252525] border-white/10">
                          <SelectItem value="all">All Methods</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="Credit Card">Credit Card</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#252525] border-white/10">
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1 bg-[#252525] border-white/10 text-white"
                        onClick={() => {
                          setMethodFilter('all');
                          setStatusFilter('all');
                        }}
                      >
                        Clear Filters
                      </Button>
                      <Button
                        className="flex-1 bg-[#00A36C] hover:bg-[#00A36C]/90"
                        onClick={() => setIsFilterSheetOpen(false)}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <Button
                variant="outline"
                onClick={exportDonations}
                className="bg-[#252525] border-white/10 text-white"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-sm text-gray-400">
              {donations.length} {donations.length === 1 ? 'donation' : 'donations'}
            </div>

            {/* Donations List */}
            {donations.length === 0 ? (
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-12 text-center">
                  <DollarSign className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                  <div className="text-gray-400">No donations found</div>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence>
                {donations.map((donation: any, index: number) => (
                  <motion.div
                    key={donation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-white text-sm">
                              {donation.members?.full_name || 'Anonymous'}
                            </div>
                            <div className="text-xs text-gray-400 font-mono truncate">
                              {donation.id.substring(0, 8)}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-lg font-bold text-[#00A36C]">
                              ₹{(donation.amount || 0).toLocaleString('en-IN')}
                            </div>
                            {getStatusBadge(donation.status)}
                          </div>
                        </div>

                        <div className="space-y-1 text-xs text-gray-400">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <CreditCard className="h-3 w-3" />
                              <span>{donation.payment_method || 'N/A'}</span>
                            </div>
                            <span>{donation.purpose || 'General'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(donation.created_at), 'MMM dd, yyyy')}</span>
                            </div>
                            {donation.receipt_number && (
                              <div className="flex items-center gap-1.5">
                                <Receipt className="h-3 w-3" />
                                <span className="font-mono">{donation.receipt_number}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {monthlyStats.length === 0 ? (
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                  <div className="text-gray-400">No reports available</div>
                </CardContent>
              </Card>
            ) : (
              monthlyStats.map((stat: any) => (
                <Card
                  key={`${stat.month}-${stat.year}`}
                  className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-semibold text-white text-sm">
                          {stat.month} {stat.year}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {stat.count} {stat.count === 1 ? 'donation' : 'donations'}
                        </div>
                        {stat.count > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            Avg: ₹{Math.round(stat.donations / stat.count).toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-[#00A36C]">
                          ₹{stat.donations.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </motion.div>
        )}

        {/* Top Donors Tab */}
        {activeTab === 'donors' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {topDonors.length === 0 ? (
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-12 text-center">
                  <User className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                  <div className="text-gray-400">No donors yet</div>
                </CardContent>
              </Card>
            ) : (
              topDonors.map((donor: any, index: number) => (
                <Card
                  key={donor.name}
                  className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00A36C] to-[#B8860B] flex items-center justify-center text-white font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm">{donor.name}</div>
                        <div className="text-xs text-gray-400">
                          {donor.donations} {donor.donations === 1 ? 'donation' : 'donations'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-[#00A36C]">
                          ₹{donor.amount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </motion.div>
        )}
      </div>
    </MobileLayout>
  );
};

export default MobileFinancialManagement;
