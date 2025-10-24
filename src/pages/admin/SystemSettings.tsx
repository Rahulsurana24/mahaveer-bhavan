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
import { Building, Mail, MessageSquare, CreditCard, Save, Shield, ShieldCheck, ShieldOff, Key, AlertCircle } from "lucide-react";
import { TwoFactorSetup } from "@/components/admin/TwoFactorSetup";
import { Badge } from "@/components/ui/badge";

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
        const value = setting.value; // Already parsed by Supabase (JSONB type)
        
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
            if (typeof value === 'object' && value !== null) {
              setOrgPhone(value.phone || "");
              setOrgEmail(value.email || "");
              setOrgWebsite(value.website || "");
            }
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
        .update({ value }) // Supabase handles JSONB automatically
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="organization"><Building className="h-4 w-4 mr-2" />Organization</TabsTrigger>
            <TabsTrigger value="email"><Mail className="h-4 w-4 mr-2" />Email</TabsTrigger>
            <TabsTrigger value="whatsapp"><MessageSquare className="h-4 w-4 mr-2" />WhatsApp</TabsTrigger>
            <TabsTrigger value="payment"><CreditCard className="h-4 w-4 mr-2" />Payment</TabsTrigger>
            <TabsTrigger value="security"><Shield className="h-4 w-4 mr-2" />Security</TabsTrigger>
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

          <TabsContent value="security">
            <SecuritySettings />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

// Security Settings Component
const SecuritySettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSetup, setShowSetup] = useState(false);
  const [show2FAInfo, setShow2FAInfo] = useState(false);

  // Fetch current user's 2FA status
  const { data: twoFactorStatus, isLoading } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('admin_two_factor')
        .select('is_enabled, enabled_at, last_verified_at, backup_codes_used')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  // Disable 2FA mutation
  const disable2FAMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('admin_two_factor')
        .update({ 
          is_enabled: false,
          disabled_at: new Date().toISOString(),
          disabled_by: user.id
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await supabase.rpc('log_2fa_action', {
        p_user_id: user.id,
        p_action: 'disabled'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      toast({
        title: 'Two-Factor Authentication Disabled',
        description: 'Your account is no longer protected by 2FA'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleDisable2FA = () => {
    if (confirm('Are you sure you want to disable Two-Factor Authentication? This will make your account less secure.')) {
      disable2FAMutation.mutate();
    }
  };

  if (isLoading) {
    return <Loading size="lg" text="Loading security settings..." />;
  }

  const is2FAEnabled = twoFactorStatus?.is_enabled;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Account Security</CardTitle>
          <CardDescription>Manage two-factor authentication and security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 2FA Status Card */}
          <div className={`border rounded-lg p-4 ${is2FAEnabled ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {is2FAEnabled ? (
                  <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <ShieldOff className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">Two-Factor Authentication</h3>
                    <Badge variant={is2FAEnabled ? 'default' : 'secondary'} className={is2FAEnabled ? 'bg-green-500' : ''}>
                      {is2FAEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {is2FAEnabled 
                      ? 'Your account is protected with an additional security layer'
                      : 'Add an extra layer of security to your account by requiring a verification code'
                    }
                  </p>
                  {is2FAEnabled && twoFactorStatus?.enabled_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Enabled on {new Date(twoFactorStatus.enabled_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2FA Actions */}
          <div className="space-y-4">
            {!is2FAEnabled ? (
              <>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-400">
                      <p className="font-semibold mb-1">Recommended Security Enhancement</p>
                      <p>
                        Two-Factor Authentication (2FA) significantly improves account security by requiring
                        both your password and a time-based code from your phone.
                      </p>
                    </div>
                  </div>
                </div>
                <Button onClick={() => setShowSetup(true)} className="w-full">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Enable Two-Factor Authentication
                </Button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-muted-foreground mb-1">Last Verified</div>
                    <div className="font-medium">
                      {twoFactorStatus?.last_verified_at 
                        ? new Date(twoFactorStatus.last_verified_at).toLocaleDateString()
                        : 'Never'
                      }
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-muted-foreground mb-1">Backup Codes Used</div>
                    <div className="font-medium">
                      {twoFactorStatus?.backup_codes_used || 0} / 8
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShow2FAInfo(true)}>
                    <Key className="h-4 w-4 mr-2" />
                    Regenerate Backup Codes
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={handleDisable2FA}
                    disabled={disable2FAMutation.isPending}
                  >
                    <ShieldOff className="h-4 w-4 mr-2" />
                    {disable2FAMutation.isPending ? 'Disabling...' : 'Disable 2FA'}
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Information Section */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2 text-sm">How 2FA Works</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span>1.</span>
                <span>Download an authenticator app (Google Authenticator or Authy)</span>
              </li>
              <li className="flex gap-2">
                <span>2.</span>
                <span>Scan the QR code provided during setup</span>
              </li>
              <li className="flex gap-2">
                <span>3.</span>
                <span>Enter the 6-digit code when logging in</span>
              </li>
              <li className="flex gap-2">
                <span>4.</span>
                <span>Save backup codes in case you lose access to your device</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 2FA Setup Dialog */}
      <TwoFactorSetup 
        isOpen={showSetup}
        onClose={() => setShowSetup(false)}
        onSuccess={() => {
          setShowSetup(false);
          queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
        }}
      />
    </>
  );
};

export default SystemSettings;
