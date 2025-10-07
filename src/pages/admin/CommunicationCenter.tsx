import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  MessageSquare, 
  Mail, 
  Phone, 
  Send, 
  Users, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

const CommunicationCenter = () => {
  const messageHistory = [
    {
      id: "MSG-001",
      title: "Monthly Satsang Reminder",
      type: "WhatsApp",
      recipients: 145,
      sent: "2024-01-10 10:30 AM",
      status: "delivered",
      template: "event_reminder"
    },
    {
      id: "MSG-002",
      title: "Donation Thank You",
      type: "Email",
      recipients: 89,
      sent: "2024-01-09 2:15 PM", 
      status: "delivered",
      template: "donation_thanks"
    },
    {
      id: "MSG-003",
      title: "New Member Welcome",
      type: "SMS",
      recipients: 12,
      sent: "2024-01-08 9:00 AM",
      status: "pending",
      template: "member_welcome"
    }
  ];

  const templates = [
    { id: "event_reminder", name: "Event Reminder", type: "WhatsApp" },
    { id: "donation_thanks", name: "Donation Thank You", type: "Email" },
    { id: "member_welcome", name: "Member Welcome", type: "SMS" },
    { id: "general_announcement", name: "General Announcement", type: "WhatsApp" }
  ];

  const getStatusBadge = (status: string) => {
    const config = {
      delivered: { variant: "default" as const, icon: CheckCircle, text: "Delivered" },
      pending: { variant: "secondary" as const, icon: Clock, text: "Pending" },
      failed: { variant: "destructive" as const, icon: XCircle, text: "Failed" }
    };
    
    const statusConfig = config[status as keyof typeof config] || config.pending;
    const Icon = statusConfig.icon;
    
    return (
      <Badge variant={statusConfig.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {statusConfig.text}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      WhatsApp: MessageSquare,
      Email: Mail,
      SMS: Phone
    };
    const Icon = icons[type as keyof typeof icons] || MessageSquare;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <AdminLayout title="Communication Center">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Communication Center</h2>
          <p className="text-muted-foreground">Send messages and manage communication with members</p>
        </div>

        <Tabs defaultValue="compose" className="space-y-6">
          <TabsList>
            <TabsTrigger value="compose">Compose Message</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="history">Message History</TabsTrigger>
          </TabsList>

          {/* Compose Message */}
          <TabsContent value="compose" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Compose New Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="message-type">Message Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select message type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template">Template (Optional)</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} ({template.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input placeholder="Enter message subject" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message Content</Label>
                  <Textarea 
                    placeholder="Type your message here..."
                    rows={6}
                  />
                </div>

                {/* Recipient Selection */}
                <div className="space-y-4">
                  <Label>Select Recipients</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="all-members" />
                        <Label htmlFor="all-members" className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          All Members (1,234)
                        </Label>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="event-participants" />
                        <Label htmlFor="event-participants" className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Event Participants (145)
                        </Label>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="space-y-2">
                        <Label>Membership Type</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="trustee">Trustee</SelectItem>
                            <SelectItem value="tapasvi">Tapasvi</SelectItem>
                            <SelectItem value="karyakarta">Karyakarta</SelectItem>
                            <SelectItem value="labharti">Labharti</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </Card>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Selected: 145 recipients
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">Save as Draft</Button>
                    <Button>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates */}
          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Message Templates</CardTitle>
                <Button>Create Template</Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{template.name}</h4>
                        {getTypeIcon(template.type)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {template.type} template for automated messaging
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="outline" size="sm">Use Template</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Message History */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Message History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Message</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messageHistory.map((message) => (
                      <TableRow key={message.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{message.title}</div>
                            <div className="text-sm text-muted-foreground">{message.id}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(message.type)}
                            <span>{message.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>{message.recipients}</TableCell>
                        <TableCell>{message.sent}</TableCell>
                        <TableCell>{getStatusBadge(message.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm">View Details</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default CommunicationCenter;