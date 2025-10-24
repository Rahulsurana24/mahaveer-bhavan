import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/ui/loading";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  BarChart3,
  Download,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Activity,
  FileText,
  Filter,
  Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ReportType = 'membership' | 'attendance' | 'donations' | 'engagement';

const CHART_COLORS = ['#00A36C', '#0088FE', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const EnhancedReportsAnalytics = () => {
  const { toast } = useToast();

  // Report Configuration State
  const [reportType, setReportType] = useState<ReportType>('membership');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedMembershipTypes, setSelectedMembershipTypes] = useState<string[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [donationPurpose, setDonationPurpose] = useState<string>('');
  const [donationType, setDonationType] = useState<string>('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [registrationStatus, setRegistrationStatus] = useState<string>('');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [lastGeneratedTime, setLastGeneratedTime] = useState<Date | null>(null);

  // Fetch user roles for membership type filter
  const { data: userRoles } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch events for event filter
  const { data: events } = useQuery({
    queryKey: ['events-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, date')
        .order('date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  // Fetch trips for trip filter
  const { data: trips } = useQuery({
    queryKey: ['trips-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('id, title, start_date')
        .order('start_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  // Membership Demographics Report
  const { data: membershipData, isLoading: membershipLoading, refetch: refetchMembership } = useQuery({
    queryKey: ['membership-report', startDate, endDate, selectedMembershipTypes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_membership_demographics', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_membership_types: selectedMembershipTypes.length > 0 ? selectedMembershipTypes : null,
        p_cities: selectedCities.length > 0 ? selectedCities : null,
        p_registration_status: registrationStatus || null
      });
      if (error) throw error;
      return data;
    },
    enabled: false // Only fetch when report is generated
  });

  // Membership Growth Report
  const { data: membershipGrowth, refetch: refetchGrowth } = useQuery({
    queryKey: ['membership-growth', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_membership_growth', {
        p_start_date: startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p_end_date: endDate || new Date().toISOString().split('T')[0],
        p_interval: 'month'
      });
      if (error) throw error;
      return data;
    },
    enabled: false
  });

  // Event Attendance Report
  const { data: attendanceData, isLoading: attendanceLoading, refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance-report', startDate, endDate, selectedEventId, selectedEventType],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_event_attendance_summary', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_event_type: selectedEventType || null,
        p_specific_event_id: selectedEventId || null
      });
      if (error) throw error;
      return data;
    },
    enabled: false
  });

  // Donation Summary Report
  const { data: donationData, isLoading: donationLoading, refetch: refetchDonations } = useQuery({
    queryKey: ['donation-report', startDate, endDate, donationType, donationPurpose],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_donation_summary', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_donation_type: donationType || null,
        p_purpose: donationPurpose || null
      });
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: false
  });

  // Donation Trends Report
  const { data: donationTrends, refetch: refetchDonationTrends } = useQuery({
    queryKey: ['donation-trends', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_donation_trends', {
        p_start_date: startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p_end_date: endDate || new Date().toISOString().split('T')[0],
        p_interval: 'month'
      });
      if (error) throw error;
      return data;
    },
    enabled: false
  });

  // Engagement Report
  const { data: engagementData, isLoading: engagementLoading, refetch: refetchEngagement } = useQuery({
    queryKey: ['engagement-report', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_activity_engagement_stats', {
        p_start_date: startDate || null,
        p_end_date: endDate || null
      });
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: false
  });

  // Generate Report Handler
  const handleGenerateReport = async () => {
    try {
      setReportGenerated(false);

      if (reportType === 'membership') {
        await refetchMembership();
        await refetchGrowth();
      } else if (reportType === 'attendance') {
        await refetchAttendance();
      } else if (reportType === 'donations') {
        await refetchDonations();
        await refetchDonationTrends();
      } else if (reportType === 'engagement') {
        await refetchEngagement();
      }

      setReportGenerated(true);
      setLastGeneratedTime(new Date());

      toast({
        title: "Report Generated",
        description: `${getReportTitle()} has been generated successfully.`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Export to CSV/Excel
  const handleExport = () => {
    try {
      let csvContent = '';
      let filename = '';

      if (reportType === 'membership' && membershipData) {
        filename = `membership_report_${new Date().toISOString().split('T')[0]}.csv`;
        csvContent = 'Membership Type,Count,Percentage,Average Age\n';
        membershipData.forEach((row: any) => {
          csvContent += `${row.membership_type},${row.member_count},${row.percentage}%,${row.avg_age}\n`;
        });
      } else if (reportType === 'attendance' && attendanceData) {
        filename = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
        csvContent = 'Event Name,Type,Date,Registered,Attended,Attendance Rate,Capacity Utilization\n';
        attendanceData.forEach((row: any) => {
          csvContent += `${row.event_name},${row.event_type},${row.event_date},${row.total_registered},${row.total_attended},${row.attendance_rate}%,${row.capacity_utilization}%\n`;
        });
      } else if (reportType === 'donations' && donationTrends) {
        filename = `donation_report_${new Date().toISOString().split('T')[0]}.csv`;
        csvContent = 'Period,Donations,Total Amount,Average Amount,Growth\n';
        donationTrends.forEach((row: any) => {
          csvContent += `${row.period},${row.donation_count},₹${row.total_amount},₹${row.avg_amount},${row.growth_percentage}%\n`;
        });
      }

      if (csvContent) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();

        toast({
          title: "Export Successful",
          description: `Report exported as ${filename}`
        });
      }
    } catch (error: any) {
      toast({
        title: "Export Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getReportTitle = () => {
    switch (reportType) {
      case 'membership': return 'Membership Demographics';
      case 'attendance': return 'Trip & Event Attendance Rates';
      case 'donations': return 'Donation Summaries & Trends';
      case 'engagement': return 'Activity/Engagement Logs';
      default: return 'Report';
    }
  };

  const isLoading = membershipLoading || attendanceLoading || donationLoading || engagementLoading;

  // Prepare chart data
  const membershipChartData = useMemo(() => {
    if (!membershipData) return [];
    return membershipData.map((item: any) => ({
      name: item.membership_type,
      value: item.member_count,
      percentage: item.percentage
    }));
  }, [membershipData]);

  const attendanceChartData = useMemo(() => {
    if (!attendanceData) return [];
    return attendanceData.slice(0, 10).map((item: any) => ({
      name: item.event_name.substring(0, 20),
      rate: parseFloat(item.attendance_rate),
      registered: item.total_registered,
      attended: item.total_attended
    }));
  }, [attendanceData]);

  const donationTrendChartData = useMemo(() => {
    if (!donationTrends) return [];
    return donationTrends.map((item: any) => ({
      period: item.period.substring(5, 7) + '/' + item.period.substring(0, 4),
      amount: parseFloat(item.total_amount),
      count: item.donation_count
    }));
  }, [donationTrends]);

  return (
    <AdminLayout title="Reports & Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Reporting & Analytics Generator</h2>
            <p className="text-muted-foreground">Transform raw data into actionable insights</p>
          </div>
          {lastGeneratedTime && (
            <Badge variant="outline" className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Last generated: {lastGeneratedTime.toLocaleTimeString()}
            </Badge>
          )}
        </div>

        {/* Report Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Report Configuration
            </CardTitle>
            <CardDescription>Select report type and configure filters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Report Type Selector */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Report Type</Label>
              <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="membership">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Membership Demographics
                    </div>
                  </SelectItem>
                  <SelectItem value="attendance">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Trip & Event Attendance Rates
                    </div>
                  </SelectItem>
                  <SelectItem value="donations">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Donation Summaries & Trends
                    </div>
                  </SelectItem>
                  <SelectItem value="engagement">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Activity/Engagement Logs
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Core Filters */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Core Filters</Label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {reportType !== 'engagement' && (
                <div className="space-y-2">
                  <Label>Membership Types (Optional)</Label>
                  <div className="border rounded-lg p-4 space-y-2">
                    {userRoles?.map((role: any) => (
                      <div key={role.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={selectedMembershipTypes.includes(role.name)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMembershipTypes([...selectedMembershipTypes, role.name]);
                            } else {
                              setSelectedMembershipTypes(selectedMembershipTypes.filter(t => t !== role.name));
                            }
                          }}
                        />
                        <label htmlFor={`role-${role.id}`} className="text-sm cursor-pointer">
                          {role.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contextual Filters */}
            {reportType === 'attendance' && (
              <>
                <Separator />
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Event/Trip Filters</Label>

                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Types</SelectItem>
                        <SelectItem value="event">Events Only</SelectItem>
                        <SelectItem value="trip">Trips Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedEventType === 'event' && events && (
                    <div className="space-y-2">
                      <Label>Specific Event (Optional)</Label>
                      <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Event" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Events</SelectItem>
                          {events.map((event: any) => (
                            <SelectItem key={event.id} value={event.id}>
                              {event.title} - {new Date(event.date).toLocaleDateString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedEventType === 'trip' && trips && (
                    <div className="space-y-2">
                      <Label>Specific Trip (Optional)</Label>
                      <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Trip" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Trips</SelectItem>
                          {trips.map((trip: any) => (
                            <SelectItem key={trip.id} value={trip.id}>
                              {trip.title} - {new Date(trip.start_date).toLocaleDateString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </>
            )}

            {reportType === 'donations' && (
              <>
                <Separator />
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Donation Filters</Label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Donation Type</Label>
                      <Select value={donationType} onValueChange={setDonationType}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Types</SelectItem>
                          <SelectItem value="one-time">One-Time Donations</SelectItem>
                          <SelectItem value="recurring">Recurring Donations</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Purpose/Campaign</Label>
                      <Input
                        value={donationPurpose}
                        onChange={(e) => setDonationPurpose(e.target.value)}
                        placeholder="e.g., Temple Construction"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {reportType === 'membership' && (
              <>
                <Separator />
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Demographic Filters</Label>

                  <div className="space-y-2">
                    <Label>Registration Status</Label>
                    <Select value={registrationStatus} onValueChange={setRegistrationStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Statuses</SelectItem>
                        <SelectItem value="active">Active Only</SelectItem>
                        <SelectItem value="pending">Pending Only</SelectItem>
                        <SelectItem value="inactive">Inactive Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            <Button onClick={handleGenerateReport} className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loading size="sm" text="" />
                  <span className="ml-2">Generating Report...</span>
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Report Output */}
        {reportGenerated && !isLoading && (
          <>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">{getReportTitle()} - Results</h3>
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export to CSV
              </Button>
            </div>

            {/* Membership Report */}
            {reportType === 'membership' && membershipData && (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Total Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {membershipData.reduce((sum: number, item: any) => sum + parseInt(item.member_count), 0)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Member Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{membershipData.length}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Average Age</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(membershipData.reduce((sum: number, item: any) => sum + parseFloat(item.avg_age || 0), 0) / membershipData.length).toFixed(1)} yrs
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Growth Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold flex items-center">
                        <TrendingUp className="h-5 w-5 mr-1 text-green-500" />
                        +{membershipGrowth?.[membershipGrowth.length - 1]?.new_members || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Membership Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={membershipChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={(entry) => `${entry.name}: ${entry.percentage}%`}
                          >
                            {membershipChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Membership Growth Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={membershipGrowth || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="new_members" stroke="#00A36C" name="New Members" />
                          <Line type="monotone" dataKey="cumulative_total" stroke="#0088FE" name="Total Members" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Data Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Membership Type</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Percentage</TableHead>
                          <TableHead>Avg Age</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {membershipData.map((row: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{row.membership_type}</TableCell>
                            <TableCell>{row.member_count}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{row.percentage}%</Badge>
                            </TableCell>
                            <TableCell>{row.avg_age} years</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Attendance Report */}
            {reportType === 'attendance' && attendanceData && (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Total Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{attendanceData.length}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Total Registrations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {attendanceData.reduce((sum: number, item: any) => sum + parseInt(item.total_registered), 0)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Total Attendance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {attendanceData.reduce((sum: number, item: any) => sum + parseInt(item.total_attended), 0)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Avg Attendance Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(attendanceData.reduce((sum: number, item: any) => sum + parseFloat(item.attendance_rate), 0) / attendanceData.length).toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Rates by Event</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={attendanceChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="rate" fill="#00A36C" name="Attendance Rate (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Data Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Event Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Registered</TableHead>
                          <TableHead>Attended</TableHead>
                          <TableHead>Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceData.slice(0, 20).map((row: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{row.event_name}</TableCell>
                            <TableCell><Badge variant="outline">{row.event_type}</Badge></TableCell>
                            <TableCell>{new Date(row.event_date).toLocaleDateString()}</TableCell>
                            <TableCell>{row.total_registered}</TableCell>
                            <TableCell>{row.total_attended}</TableCell>
                            <TableCell>
                              <Badge variant="default">{row.attendance_rate}%</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Donation Report */}
            {reportType === 'donations' && donationData && (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Total Donations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{donationData.total_donations}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Total Amount</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{parseFloat(donationData.total_amount).toLocaleString()}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Average Donation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{parseFloat(donationData.avg_donation).toLocaleString()}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Unique Donors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{donationData.unique_donors}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Donation Trends Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={donationTrendChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip formatter={(value: any) => `₹${value.toLocaleString()}`} />
                        <Legend />
                        <Line type="monotone" dataKey="amount" stroke="#00A36C" name="Total Amount (₹)" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Breakdown by Purpose */}
                {donationData.by_purpose && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Donations by Purpose</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Purpose</TableHead>
                            <TableHead>Count</TableHead>
                            <TableHead>Total Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(donationData.by_purpose).map(([purpose, data]: [string, any], index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{purpose}</TableCell>
                              <TableCell>{data.count}</TableCell>
                              <TableCell>₹{parseFloat(data.amount).toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Engagement Report */}
            {reportType === 'engagement' && engagementData && (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Messages Sent</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{engagementData.total_messages_sent}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Delivered</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{engagementData.total_delivered}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Delivery Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{engagementData.delivery_rate}%</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Unique Recipients</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {engagementData.member_engagement?.total_unique_recipients || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Channel Performance */}
                {engagementData.by_channel && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Communication Performance by Channel</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Channel</TableHead>
                            <TableHead>Sent</TableHead>
                            <TableHead>Delivered</TableHead>
                            <TableHead>Failed</TableHead>
                            <TableHead>Rate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(engagementData.by_channel).map(([channel, data]: [string, any], index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{channel}</TableCell>
                              <TableCell>{data.sent}</TableCell>
                              <TableCell>{data.delivered}</TableCell>
                              <TableCell>{data.failed}</TableCell>
                              <TableCell>
                                <Badge variant="default">
                                  {((data.delivered / data.sent) * 100).toFixed(1)}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {/* Empty State */}
        {!reportGenerated && !isLoading && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-xl font-semibold">No Report Generated</h3>
                  <p className="text-muted-foreground mt-2">
                    Configure your filters above and click "Generate Report" to view insights
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default EnhancedReportsAnalytics;
