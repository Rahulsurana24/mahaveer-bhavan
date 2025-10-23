import { AdminLayout } from '@/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Shield, Image, Database } from 'lucide-react';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const SystemAdministration = () => {
  const navigate = useNavigate();

  return (
    <AdminLayout title="System Administration">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">System Administration</h2>
          <p className="text-muted-foreground">
            Manage system settings, audit logs, and administrative functions
          </p>
        </div>

        <Tabs defaultValue="audit" className="space-y-6">
          <TabsList>
            <TabsTrigger value="audit">
              <Shield className="h-4 w-4 mr-2" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              System Settings
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Database className="h-4 w-4 mr-2" />
              Integrations
            </TabsTrigger>
          </TabsList>

          {/* Audit Logs Tab */}
          <TabsContent value="audit" className="space-y-6">
            <AuditLogViewer />
          </TabsContent>

          {/* System Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 hover:bg-muted/50 cursor-pointer" onClick={() => navigate('/admin/gallery-management')}>
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Image className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Gallery Management</h3>
                        <p className="text-sm text-muted-foreground">
                          Manage event photos and gallery albums
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 hover:bg-muted/50 cursor-pointer" onClick={() => navigate('/admin/financial-management')}>
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Settings className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Payment Gateway</h3>
                        <p className="text-sm text-muted-foreground">
                          Configure payment gateway settings
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 hover:bg-muted/50 cursor-pointer" onClick={() => navigate('/admin/communication-center')}>
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Database className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Communication Templates</h3>
                        <p className="text-sm text-muted-foreground">
                          Manage message templates and settings
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-muted/30">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <Shield className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-muted-foreground">Custom Form Fields</h3>
                        <p className="text-sm text-muted-foreground">
                          Coming soon
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-4">Quick Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate('/admin/user-management')}>
                      Manage Users
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate('/admin/admin-management')}>
                      Manage Admins
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate('/admin/event-management')}>
                      Manage Events
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate('/admin/trip-management')}>
                      Manage Trips
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Third-Party Integrations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">WhatsApp Business API</h3>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Connect your WhatsApp Business account for automated messaging
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">SMTP Email Configuration</h3>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Set up SMTP server for sending automated emails
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">SMS Gateway</h3>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Configure SMS gateway for text message notifications
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-muted-foreground">Google Calendar Sync</h3>
                      <Button variant="outline" size="sm" disabled>Coming Soon</Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Sync events with Google Calendar
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default SystemAdministration;
