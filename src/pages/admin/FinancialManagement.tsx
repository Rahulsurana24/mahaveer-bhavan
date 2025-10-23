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
  Receipt
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loading } from "@/components/ui/loading";

const FinancialManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch donations from database
  const { data: donations, isLoading: donationsLoading } = useQuery({
    queryKey: ['admin-donations', searchTerm, methodFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('donations')
        .select(`
          *,
          members(full_name, email)
        `)
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
      return data;
    }
  });

  // Fetch monthly statistics
  const { data: monthlyStats } = useQuery({
    queryKey: ['admin-monthly-donations'],
    queryFn: async () => {
      const months = [];
      for (let i = 0; i < 4; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const { data, error } = await supabase
          .from('donations')
          .select('amount')
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth)
          .eq('status', 'completed');

        if (error) throw error;

        const total = data?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
        months.push({
          month: date.toLocaleDateString('en-US', { month: 'long' }),
          year: date.getFullYear(),
          donations: total,
          count: data?.length || 0
        });
      }
      return months;
    }
  });

  // Fetch top donors
  const { data: topDonors } = useQuery({
    queryKey: ['admin-top-donors'],
    queryFn: async () => {
      const { data: donationsData, error } = await supabase
        .from('donations')
        .select(`
          amount,
          member_id,
          members(full_name)
        `)
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
    }
  });

  // Calculate dashboard statistics
  const { data: dashboardStats } = useQuery({
    queryKey: ['admin-donation-stats'],
    queryFn: async () => {
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
      
      // This month's donations
      const { data: monthData } = await supabase
        .from('donations')
        .select('amount')
        .gte('created_at', startOfMonth)
        .eq('status', 'completed');

      const thisMonth = monthData?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
      const monthCount = monthData?.length || 0;

      // Last month's donations for comparison
      const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString();
      const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString();

      const { data: lastMonthData } = await supabase
        .from('donations')
        .select('amount')
        .gte('created_at', startOfLastMonth)
        .lte('created_at', endOfLastMonth)
        .eq('status', 'completed');

      const lastMonthTotal = lastMonthData?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
      const growth = lastMonthTotal > 0 ? ((thisMonth - lastMonthTotal) / lastMonthTotal * 100).toFixed(1) : 0;

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

      const uniqueDonors = new Set(donorData?.map(d => d.member_id).filter(Boolean)).size;

      // Average donation
      const avgDonation = allData && allData.length > 0 ? totalDonations / allData.length : 0;

      return {
        totalDonations,
        thisMonth,
        monthCount,
        growth,
        avgDonation,
        uniqueDonors
      };
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "completed": "default",
      "pending": "secondary",
      "failed": "destructive",
      "refunded": "outline"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getMethodIcon = (method: string) => {
    return <CreditCard className="h-4 w-4" />;
  };

  if (donationsLoading) {
    return (
      <AdminLayout title="Financial Management">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" text="Loading financial data..." />
        </div>
      </AdminLayout>
    );
  }

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
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button size="sm">
              <Receipt className="h-4 w-4 mr-2" />
              Generate Receipt
            </Button>
          </div>
        </div>

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
              <div className="text-2xl font-bold">₹{(dashboardStats?.totalDonations || 0).toLocaleString('en-IN')}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span className="text-primary">{dashboardStats?.growth > 0 ? '+' : ''}{dashboardStats?.growth}%</span>
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
              <div className="text-2xl font-bold">₹{(dashboardStats?.thisMonth || 0).toLocaleString('en-IN')}</div>
              <div className="text-xs text-muted-foreground">
                {dashboardStats?.monthCount || 0} donations
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
              <div className="text-2xl font-bold">₹{Math.round(dashboardStats?.avgDonation || 0).toLocaleString('en-IN')}</div>
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
              <div className="text-2xl font-bold">{dashboardStats?.uniqueDonors || 0}</div>
              <div className="text-xs text-muted-foreground">
                unique donors
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="donations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="donations">Recent Donations</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Reports</TabsTrigger>
            <TabsTrigger value="donors">Top Donors</TabsTrigger>
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
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Payment Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                <CardTitle>Recent Donations ({donations?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {!donations || donations.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No donations found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm || methodFilter !== 'all' || statusFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Donation records will appear here'}
                    </p>
                  </div>
                ) : (
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
                      {donations.map((donation: any) => (
                        <TableRow key={donation.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{donation.members?.full_name || 'Anonymous'}</div>
                              <div className="text-sm text-muted-foreground">{donation.id.substring(0, 8)}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">₹{(donation.amount || 0).toLocaleString('en-IN')}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getMethodIcon(donation.payment_method)}
                              <span>{donation.payment_method || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{donation.purpose || 'General'}</TableCell>
                          <TableCell>{new Date(donation.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(donation.status)}</TableCell>
                          <TableCell>
                            {donation.receipt_number ? (
                              <Button variant="outline" size="sm">
                                {donation.receipt_number}
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
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
                {!monthlyStats || monthlyStats.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No monthly data available</h3>
                    <p className="text-muted-foreground">Monthly statistics will appear here</p>
                  </div>
                ) : (
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
                      {monthlyStats.map((stat: any) => (
                        <TableRow key={`${stat.month}-${stat.year}`}>
                          <TableCell className="font-medium">{stat.month} {stat.year}</TableCell>
                          <TableCell className="font-medium">₹{stat.donations.toLocaleString('en-IN')}</TableCell>
                          <TableCell>{stat.count}</TableCell>
                          <TableCell>₹{stat.count > 0 ? Math.round(stat.donations / stat.count).toLocaleString('en-IN') : 0}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Export
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
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
                {!topDonors || topDonors.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No donor data available</h3>
                    <p className="text-muted-foreground">Top donors will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topDonors.map((donor: any, index: number) => (
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
                          <div className="font-bold">₹{donor.amount.toLocaleString('en-IN')}</div>
                          <div className="text-sm text-muted-foreground">total contributed</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default FinancialManagement;