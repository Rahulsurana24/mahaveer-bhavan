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

const FinancialManagement = () => {
  const donations = [
    {
      id: "DON-001",
      donor: "Raj Patel",
      amount: 5000,
      method: "UPI",
      purpose: "General Donation",
      date: "2024-01-10",
      status: "completed",
      receiptNumber: "REC-2024-001"
    },
    {
      id: "DON-002", 
      donor: "Meera Shah",
      amount: 2500,
      method: "Credit Card",
      purpose: "Event Sponsorship",
      date: "2024-01-09",
      status: "completed",
      receiptNumber: "REC-2024-002"
    },
    {
      id: "DON-003",
      donor: "Suresh Kumar",
      amount: 1000,
      method: "Bank Transfer",
      purpose: "Temple Maintenance",
      date: "2024-01-08",
      status: "pending",
      receiptNumber: "-"
    }
  ];

  const monthlyStats = [
    { month: "January", donations: 245000, count: 89 },
    { month: "December", donations: 189000, count: 67 },
    { month: "November", donations: 234000, count: 78 },
    { month: "October", donations: 198000, count: 71 }
  ];

  const topDonors = [
    { name: "Raj Patel", amount: 25000, donations: 5 },
    { name: "Meera Shah", amount: 18500, donations: 7 },
    { name: "Suresh Kumar", amount: 15000, donations: 3 },
    { name: "Priya Sharma", amount: 12000, donations: 4 }
  ];

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
              <div className="text-2xl font-bold">₹2,45,000</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span className="text-primary">+12.5%</span>
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
              <div className="text-2xl font-bold">₹45,500</div>
              <div className="text-xs text-muted-foreground">
                89 donations
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
              <div className="text-2xl font-bold">₹2,750</div>
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
              <div className="text-2xl font-bold">456</div>
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
                    {donations.map((donation) => (
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
                            {getMethodIcon(donation.method)}
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
                    {monthlyStats.map((stat) => (
                      <TableRow key={stat.month}>
                        <TableCell className="font-medium">{stat.month} 2024</TableCell>
                        <TableCell className="font-medium">₹{stat.donations.toLocaleString()}</TableCell>
                        <TableCell>{stat.count}</TableCell>
                        <TableCell>₹{Math.round(stat.donations / stat.count).toLocaleString()}</TableCell>
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
                  {topDonors.map((donor, index) => (
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
                        <div className="font-bold">₹{donor.amount.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">total contributed</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default FinancialManagement;