import { useState, useEffect } from 'react';
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  TrendingUp, 
  Download, 
  Search, 
  Calendar,
  CreditCard,
  User,
  Receipt,
  Settings,
  CheckCircle,
  BarChart3
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loading } from '@/components/ui/loading';
import PaymentConfiguration from './PaymentConfiguration';
import DonationVerification from './DonationVerification';
import { format } from 'date-fns';

const FinancialManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [donations, setDonations] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    thisMonthCount: 0,
    avgDonation: 0,
    activeDonors: 0
  });
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [topDonors, setTopDonors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      setLoading(true);

      // Load donations with member details
      const { data: donationsData, error: donError } = await supabase
        .from('donations')
        .select(`
          *,
          members (
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (donError) throw donError;

      setDonations(donationsData || []);

      // Calculate statistics
      const { data: allDonations, error: statsError } = await supabase
        .from('donations')
        .select('amount, created_at, member_id, status')
        .eq('status', 'verified');

      if (statsError) throw statsError;

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const total = allDonations?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
      const thisMonthDonations = allDonations?.filter(d => 
        new Date(d.created_at) >= thisMonthStart
      ) || [];
      const thisMonth = thisMonthDonations.reduce((sum, d) => sum + (d.amount || 0), 0);
      const uniqueDonors = new Set(allDonations?.map(d => d.member_id)).size;

      setStats({
        total,
        thisMonth,
        thisMonthCount: thisMonthDonations.length,
        avgDonation: allDonations && allDonations.length > 0 ? total / allDonations.length : 0,
        activeDonors: uniqueDonors
      });

      // Calculate monthly stats (last 12 months)
      const monthlyData: Record<string, { amount: number; count: number }> = {};
      for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = format(date, 'yyyy-MM');
        monthlyData[key] = { amount: 0, count: 0 };
      }

      allDonations?.forEach(d => {
        const key = format(new Date(d.created_at), 'yyyy-MM');
        if (monthlyData[key]) {
          monthlyData[key].amount += d.amount || 0;
          monthlyData[key].count += 1;
        }
      });

      const monthlyArray = Object.entries(monthlyData)
        .map(([key, data]) => ({
          month: format(new Date(key + '-01'), 'MMMM yyyy'),
          donations: data.amount,
          count: data.count
        }))
        .sort((a, b) => b.month.localeCompare(a.month));

      setMonthlyStats(monthlyArray);

      // Calculate top donors
      const donorMap: Record<string, { name: string; amount: number; count: number }> = {};
      
      allDonations?.forEach(d => {
        if (!donorMap[d.member_id]) {
          donorMap[d.member_id] = { name: '', amount: 0, count: 0 };
        }
        donorMap[d.member_id].amount += d.amount || 0;
        donorMap[d.member_id].count += 1;
      });

      // Get member names
      const { data: members } = await supabase
        .from('members')
        .select('id, full_name')
        .in('id', Object.keys(donorMap));

      members?.forEach(m => {
        if (donorMap[m.id]) {
          donorMap[m.id].name = m.full_name;
        }
      });

      const topDonorsArray = Object.values(donorMap)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)
        .map(d => ({
          name: d.name,
          amount: d.amount,
          donations: d.count
        }));

      setTopDonors(topDonorsArray);
    } catch (error: any) {
      console.error('Error loading financial data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load financial data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const donationsData = donations.map((d: any) => ({
    id: d.id,
    donor: d.members?.full_name || 'Unknown',
    amount: d.amount,
    method: d.payment_method || '-',
    purpose: d.purpose || 'General',
    date: format(new Date(d.created_at), 'yyyy-MM-dd'),
    status: d.status,
    receiptNumber: d.receipt_number || '-'
  }));

  const monthlyStatsData = monthlyStats.map((stat: any) => ({
    month: stat.month,
    donations: stat.donations.toLocaleString(),
    count: stat.count.toLocaleString(),
    avg: Math.round(stat.donations / stat.count).toLocaleString(),
    actions: <Button variant="outline" size="sm">
      <Download className="h-4 w-4 mr-2" />
      Export
    </Button>
  }));

  const topDonorsData = topDonors.map((donor: any) => ({
    name: donor.name,
    amount: donor.amount.toLocaleString(),
    donations: donor.donations.toLocaleString()
  }));

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      verified: { variant: 'default', label: 'Verified' },
      pending: { variant: 'secondary', label: 'Pending' },
      rejected: { variant: 'destructive', label: 'Rejected' }
    };
    const statusConfig = config[status] || { variant: 'outline', label: status };
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Donor', 'Amount', 'Purpose', 'Method', 'Status', 'Receipt'];
    const rows = donationsData.map(d => [
      d.date,
      d.donor,
      d.amount,
      d.purpose,
      d.method,
      d.status,
      d.receiptNumber
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `donations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Donations exported to CSV'
    });
  };

  const filteredDonations = donations.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (methodFilter !== 'all' && d.payment_method !== methodFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        d.members?.full_name?.toLowerCase().includes(query) ||
        d.receipt_number?.toLowerCase().includes(query) ||
        d.id?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const percentageChange = monthlyStats.length >= 2 
    ? ((monthlyStats[0].donations - monthlyStats[1].donations) / monthlyStats[1].donations) * 100 
    : 0;

  return (
    <AdminLayout title="Financial Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Financial Management</h2>
            <p className="text-muted-foreground">Track donations and manage financial records</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loading size="lg" />
          </div>
        ) : (
          <>
            {/* Financial Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Donations
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{stats.total.toLocaleString()}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    <span className={percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                    </span>
                    <span className="ml-1">from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    This Month
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{stats.thisMonth.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">
                    {stats.thisMonthCount} donations
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Donation
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{Math.round(stats.avgDonation).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">
                    per donation
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Donors
                  </CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeDonors}</div>
                  <div className="text-xs text-muted-foreground">
                    unique donors
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="donations" className="space-y-6">
              <TabsList>
                <TabsTrigger value="donations">Recent Donations</TabsTrigger>
                <TabsTrigger value="verification">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Verification
                </TabsTrigger>
                <TabsTrigger value="reports">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Reports
                </TabsTrigger>
                <TabsTrigger value="configuration">
                  <Settings className="h-4 w-4 mr-2" />
                  Configuration
                </TabsTrigger>
              </TabsList>

              {/* Recent Donations */}
              <TabsContent value="donations" className="space-y-6">
                {/* Filters */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by donor name or receipt number..."
                            className="pl-9"
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>
                      <Select>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Payment Method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Methods</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="card">Credit Card</SelectItem>
                          <SelectItem value="bank">Bank Transfer</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Donations Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Donations ({donations.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Donor</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Purpose</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Receipt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {donationsData.map((donation) => (
                          <TableRow key={donation.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{donation.donor}</div>
                                <div className="text-sm text-muted-foreground">{donation.id}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">₹{donation.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                <span>{donation.method}</span>
                              </div>
                            </TableCell>
                            <TableCell>{donation.purpose}</TableCell>
                            <TableCell>{donation.date}</TableCell>
                            <TableCell>{getStatusBadge(donation.status)}</TableCell>
                            <TableCell>
                              {donation.receiptNumber !== "-" ? (
                                <Button variant="outline" size="sm">
                                  {donation.receiptNumber}
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Monthly Reports */}
              <TabsContent value="monthly" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Donation Reports</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Number of Donations</TableHead>
                          <TableHead>Average Donation</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyStatsData.map((stat) => (
                          <TableRow key={stat.month}>
                            <TableCell className="font-medium">{stat.month} 2024</TableCell>
                            <TableCell className="font-medium">₹{stat.donations}</TableCell>
                            <TableCell>{stat.count}</TableCell>
                            <TableCell>₹{stat.avg}</TableCell>
                            <TableCell className="text-right">
                              {stat.actions}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Top Donors */}
              <TabsContent value="donors" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Donors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {topDonorsData.map((donor, index) => (
                        <div key={donor.name} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{donor.name}</div>
                              <div className="text-sm text-muted-foreground">{donor.donations} donations</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">₹{donor.amount}</div>
                            <div className="text-sm text-muted-foreground">total contributed</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default FinancialManagement;