import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Bell, 
  Shield, 
  Database,
  Mail,
  MessageSquare,
  Upload,
  Download,
  RefreshCw
} from "lucide-react";

const SystemSettings = () => {
  return (
    <AdminLayout title="System Settings">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">System Settings</h2>
          <p className="text-muted-foreground">Configure system preferences and integrations</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  General Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="trust-name">Trust Name</Label>
                    <Input 
                      id="trust-name" 
                      defaultValue="Sree Mahaveer Swami Charitable Trust" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Contact Email</Label>
                    <Input 
                      id="contact-email" 
                      type="email"
                      defaultValue="info@mahaveertrust.org" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">Contact Phone</Label>
                    <Input 
                      id="contact-phone" 
                      defaultValue="+91 98765 43210" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select defaultValue="asia-kolkata">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asia-kolkata">Asia/Kolkata (IST)</SelectItem>
                        <SelectItem value="utc">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trust-address">Trust Address</Label>
                  <Textarea 
                    id="trust-address"
                    defaultValue="123 Dharma Marg, Spiritual Quarter, Mumbai, Maharashtra 400001"
                    rows={3}
                  />
                </div>

                <div className="space-y-4">
                  <Label>Application Features</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Member Registration</Label>
                        <p className="text-sm text-muted-foreground">Allow new member registrations</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Event Registration</Label>
                        <p className="text-sm text-muted-foreground">Enable event registration for members</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Online Donations</Label>
                        <p className="text-sm text-muted-foreground">Accept online donations</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <Button>Save General Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Email Notifications</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>New Member Registration</Label>
                        <p className="text-sm text-muted-foreground">Notify admins when new members register</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Event Registration</Label>
                        <p className="text-sm text-muted-foreground">Notify when members register for events</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Donation Received</Label>
                        <p className="text-sm text-muted-foreground">Notify when donations are received</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>WhatsApp Notifications</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Event Reminders</Label>
                        <p className="text-sm text-muted-foreground">Send event reminders to registered members</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Welcome Messages</Label>
                        <p className="text-sm text-muted-foreground">Send welcome messages to new members</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="notification-email">Admin Notification Email</Label>
                    <Input 
                      id="notification-email" 
                      type="email"
                      defaultValue="admin@mahaveertrust.org" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender-name">Sender Name</Label>
                    <Input 
                      id="sender-name" 
                      defaultValue="Mahaveer Trust" 
                    />
                  </div>
                </div>

                <Button>Save Notification Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integration Settings */}
          <TabsContent value="integrations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    WhatsApp Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-token">WhatsApp Business API Token</Label>
                    <Input 
                      id="whatsapp-token" 
                      type="password"
                      placeholder="Enter API token" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-phone">Phone Number ID</Label>
                    <Input 
                      id="whatsapp-phone" 
                      placeholder="Enter phone number ID" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable WhatsApp</Label>
                      <p className="text-sm text-muted-foreground">Enable WhatsApp messaging</p>
                    </div>
                    <Switch />
                  </div>
                  <Button variant="outline" className="w-full">Test Connection</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host">SMTP Host</Label>
                    <Input 
                      id="smtp-host" 
                      defaultValue="smtp.gmail.com" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp-port">Port</Label>
                      <Input 
                        id="smtp-port" 
                        defaultValue="587" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-security">Security</Label>
                      <Select defaultValue="tls">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tls">TLS</SelectItem>
                          <SelectItem value="ssl">SSL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-username">Username</Label>
                    <Input 
                      id="smtp-username" 
                      type="email"
                      placeholder="your-email@gmail.com" 
                    />
                  </div>
                  <Button variant="outline" className="w-full">Test Email</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Authentication Settings</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Two-Factor Authentication</Label>
                        <p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Email Verification</Label>
                        <p className="text-sm text-muted-foreground">Require email verification for new members</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                    <Input 
                      id="session-timeout" 
                      type="number"
                      defaultValue="60" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
                    <Input 
                      id="max-login-attempts" 
                      type="number"
                      defaultValue="5" 
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Data Privacy</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Data Encryption</Label>
                        <p className="text-sm text-muted-foreground">Encrypt sensitive member data</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Activity Logging</Label>
                        <p className="text-sm text-muted-foreground">Log all admin activities</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <Button>Update Security Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup Settings */}
          <TabsContent value="backup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Backup & Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Automated Backups</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable Automated Backups</Label>
                        <p className="text-sm text-muted-foreground">Automatically backup data daily</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="backup-frequency">Backup Frequency</Label>
                    <Select defaultValue="daily">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backup-retention">Retention Period (days)</Label>
                    <Input 
                      id="backup-retention" 
                      type="number"
                      defaultValue="30" 
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Manual Actions</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button variant="outline" className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Create Backup
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Restore Backup
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      System Maintenance
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Last Backup</Label>
                  <p className="text-sm text-muted-foreground">
                    January 10, 2024 at 2:30 AM (Size: 45.2 MB)
                  </p>
                </div>

                <Button>Save Backup Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default SystemSettings;