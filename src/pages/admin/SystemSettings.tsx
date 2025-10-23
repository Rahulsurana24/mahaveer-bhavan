import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/ui/loading";
import { Building, Mail, MessageSquare, CreditCard, Save, Shield } from "lucide-react";

const SystemSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [orgName, setOrgName] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");

  const [whatsappApiKey, setWhatsappApiKey] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");

  const [razorpayKey, setRazorpayKey] = useState("");
  const [razorpaySecret, setRazorpaySecret] = useState("");

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');
      if (error) throw error;
      return data;
    }
  });

  // Load settings into state
  useEffect(() => {
    if (settings) {
      settings.forEach((setting: any) => {
        const value = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
        
        switch (setting.key) {
          case 'organization_name': setOrgName(value); break;
          case 'email_smtp_host': setSmtpHost(value); break;
          case 'email_smtp_port': setSmtpPort(value); break;
          case 'email_smtp_user': setSmtpUser(value); break;
          case 'email_smtp_password': setSmtpPassword(value); break;
          case 'email_from_address': setFromEmail(value); break;
          case 'whatsapp_api_key': setWhatsappApiKey(value); break;
          case 'whatsapp_phone_number': setWhatsappPhone(value); break;
          case 'payment_razorpay_key': setRazorpayKey(value); break;
          case 'payment_razorpay_secret': setRazorpaySecret(value); break;
          case 'organization_contact':
            setOrgPhone(value.phone || "");
            setOrgEmail(value.email || "");
            setOrgWebsite(value.website || "");
            break;
        }
      });
    }
  }, [settings]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: JSON.stringify(value) })
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({ title: "Saved", description: "Settings updated successfully." });
    }
  });

  const saveOrg = () => {
    updateMutation.mutate({ key: 'organization_name', value: orgName });
    updateMutation.mutate({ key: 'organization_contact', value: { phone: orgPhone, email: orgEmail, website: orgWebsite } });
  };

  const saveEmail = () => {
    updateMutation.mutate({ key: 'email_smtp_host', value: smtpHost });
    updateMutation.mutate({ key: 'email_smtp_port', value: smtpPort });
    updateMutation.mutate({ key: 'email_smtp_user', value: smtpUser });
    updateMutation.mutate({ key: 'email_smtp_password', value: smtpPassword });
    updateMutation.mutate({ key: 'email_from_address', value: fromEmail });
  };

  const saveWhatsApp = () => {
    updateMutation.mutate({ key: 'whatsapp_api_key', value: whatsappApiKey });
    updateMutation.mutate({ key: 'whatsapp_phone_number', value: whatsappPhone });
  };

  const savePayment = () => {
    updateMutation.mutate({ key: 'payment_razorpay_key', value: razorpayKey });
    updateMutation.mutate({ key: 'payment_razorpay_secret', value: razorpaySecret });
  };

  if (isLoading) {
    return (
      <AdminLayout title="System Settings">
        <Loading size="lg" text="Loading settings..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="System Settings">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">System Settings</h2>
            <p className="text-muted-foreground">Configure organization and integrations</p>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Super Admin Only</span>
          </div>
        </div>

        <Tabs defaultValue="organization">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="organization"><Building className="h-4 w-4 mr-2" />Organization</TabsTrigger>
            <TabsTrigger value="email"><Mail className="h-4 w-4 mr-2" />Email</TabsTrigger>
            <TabsTrigger value="whatsapp"><MessageSquare className="h-4 w-4 mr-2" />WhatsApp</TabsTrigger>
            <TabsTrigger value="payment"><CreditCard className="h-4 w-4 mr-2" />Payment</TabsTrigger>
          </TabsList>

          <TabsContent value="organization">
            <Card>
              <CardHeader>
                <CardTitle>Organization Information</CardTitle>
                <CardDescription>Manage your organization's contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Mahaveer Bhavan" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} placeholder="+91 1234567890" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)} placeholder="contact@example.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input value={orgWebsite} onChange={(e) => setOrgWebsite(e.target.value)} placeholder="https://example.com" />
                </div>
                <Button onClick={saveOrg} className="w-full"><Save className="h-4 w-4 mr-2" />Save</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>SMTP settings for sending emails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>SMTP Username</Label>
                  <Input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="your-email@gmail.com" />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Password</Label>
                  <Input type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>From Email</Label>
                  <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="noreply@example.com" />
                </div>
                <Button onClick={saveEmail} className="w-full"><Save className="h-4 w-4 mr-2" />Save</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp">
            <Card>
              <CardHeader>
                <CardTitle>WhatsApp Business API</CardTitle>
                <CardDescription>Configure WhatsApp messaging</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input type="password" value={whatsappApiKey} onChange={(e) => setWhatsappApiKey(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Business Phone</Label>
                  <Input value={whatsappPhone} onChange={(e) => setWhatsappPhone(e.target.value)} placeholder="+91 1234567890" />
                </div>
                <Button onClick={saveWhatsApp} className="w-full"><Save className="h-4 w-4 mr-2" />Save</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Payment Gateway</CardTitle>
                <CardDescription>Razorpay configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Razorpay Key ID</Label>
                  <Input value={razorpayKey} onChange={(e) => setRazorpayKey(e.target.value)} placeholder="rzp_live_..." />
                </div>
                <div className="space-y-2">
                  <Label>Razorpay Secret</Label>
                  <Input type="password" value={razorpaySecret} onChange={(e) => setRazorpaySecret(e.target.value)} />
                </div>
                <Button onClick={savePayment} className="w-full"><Save className="h-4 w-4 mr-2" />Save</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default SystemSettings;
