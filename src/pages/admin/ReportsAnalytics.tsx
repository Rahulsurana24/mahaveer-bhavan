import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  Users, 
  Calendar,
  DollarSign,
  Activity,
  PieChart
} from "lucide-react";

const ReportsAnalytics = () => {
  const membershipStats = [
    { type: "Trustee", count: 12, percentage: 15, color: "bg-blue-500" },
    { type: "Tapasvi", count: 45, percentage: 25, color: "bg-green-500" },
    { type: "Karyakarta", count: 89, percentage: 35, color: "bg-yellow-500" },
    { type: "Labharti", count: 134, percentage: 25, color: "bg-purple-500" }
  ];

  const eventStats = [
    { name: "Monthly Satsang", attendance: 145, capacity: 200, rate: "72%" },
    { name: "Charity Drive", attendance: 89, capacity: 100, rate: "89%" },
    { name: "Temple Visit", attendance: 67, capacity: 80, rate: "84%" },
    { name: "Cultural Program", attendance: 234, capacity: 300, rate: "78%" }
  ];

  const donationTrends = [
    { month: "Jan", amount: 245000, growth: "+12%" },
    { month: "Dec", amount: 189000, growth: "-8%" },
    { month: "Nov", amount: 234000, growth: "+15%" },
    { month: "Oct", amount: 198000, growth: "+5%" },
    { month: "Sep", amount: 167000, growth: "-3%" },
    { month: "Aug", amount: 189000, growth: "+18%" }
  ];

  const communicationStats = [
    { channel: "WhatsApp", sent: 2456, delivered: 2398, rate: "97.6%" },
    { channel: "Email", sent: 1890, delivered: 1834, rate: "97.0%" },
    { channel: "SMS", sent: 567, delivered: 559, rate: "98.6%" }
  ];

  return (
    <AdminLayout title="Reports & Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Reports & Analytics</h2>
            <p className="text-muted-foreground">Comprehensive insights and data analysis</p>
          </div>
          <div className="flex items-center gap-2">
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Members
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span className="text-primary">+5.2%</span>
                <span className="ml-1">growth</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Events Held
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <div className="text-xs text-muted-foreground">
                this year
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Donations
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹12.4L</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span className="text-primary">+18.2%</span>
                <span className="ml-1">growth</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Engagement Rate
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">78.5%</div>
              <div className="text-xs text-muted-foreground">
                avg participation
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="membership" className="space-y-6">
          <TabsList>
            <TabsTrigger value="membership">Membership</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="donations">Donations</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
          </TabsList>

          {/* Membership Analytics */}
          <TabsContent value="membership" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Membership Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {membershipStats.map((stat) => (
                      <div key={stat.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${stat.color}`} />
                          <span className="font-medium">{stat.type}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">{stat.count} members</span>
                          <Badge variant="outline">{stat.percentage}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Member Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>New Members (This Month)</span>
                      <Badge variant="default">+23</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Active Members</span>
                      <Badge variant="default">1,156</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Inactive Members</span>
                      <Badge variant="secondary">78</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Retention Rate</span>
                      <Badge variant="outline">94.2%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Event Analytics */}
          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Attendance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {eventStats.map((event) => (
                    <div key={event.name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{event.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {event.attendance}/{event.capacity} attendees
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-24 bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: event.rate }}
                          />
                        </div>
                        <Badge variant="outline">{event.rate}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Donation Analytics */}
          <TabsContent value="donations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Donation Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {donationTrends.map((trend) => (
                    <div key={trend.month} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <span className="font-medium w-12">{trend.month}</span>
                        <span className="font-bold">₹{trend.amount.toLocaleString()}</span>
                      </div>
                      <Badge 
                        variant={trend.growth.startsWith('+') ? 'default' : 'destructive'}
                      >
                        {trend.growth}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Communication Analytics */}
          <TabsContent value="communication" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Communication Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {communicationStats.map((stat) => (
                    <div key={stat.channel} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{stat.channel}</div>
                        <div className="text-sm text-muted-foreground">
                          {stat.delivered}/{stat.sent} delivered
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-24 bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: stat.rate }}
                          />
                        </div>
                        <Badge variant="default">{stat.rate}</Badge>
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

export default ReportsAnalytics;