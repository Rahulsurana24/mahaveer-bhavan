import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loading } from "@/components/ui/loading";
import {
  Building,
  Mail,
  MessageSquare,
  CreditCard,
  Save,
  Shield,
  ShieldCheck,
  ShieldOff,
  Key,
  AlertCircle,
  Upload,
  Eye,
  EyeOff,
  Lock,
  Globe,
  FileText,
  Receipt,
  Settings,
  ExternalLink,
  CalendarDays,
  Sliders
} from "lucide-react";
import { TwoFactorSetup } from "@/components/admin/TwoFactorSetup";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const EnhancedSystemSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Organization settings
  const [orgName, setOrgName] = useState("");
  const [orgLegalAddress, setOrgLegalAddress] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");
  const [systemContactEmail, setSystemContactEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [orgLogoUrl, setOrgLogoUrl] = useState("");

  // Security settings
  const [defaultPassword, setDefaultPassword] = useState("");
  const [showDefaultPassword, setShowDefaultPassword] = useState(false);
  const [mandatory2FA, setMandatory2FA] = useState(false);
  const [passwordMinLength, setPasswordMinLength] = useState(8);
  const [passwordRequireUppercase, setPasswordRequireUppercase] = useState(false);
  const [passwordRequireSpecial, setPasswordRequireSpecial] = useState(false);
  const [passwordRequireNumbers, setPasswordRequireNumbers] = useState(true);

  // Timezone & Locale
  const [systemTimezone, setSystemTimezone] = useState("Asia/Kolkata");
  const [systemLocale, setSystemLocale] = useState("en-IN");

  // Legal documents
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [privacyPolicy, setPrivacyPolicy] = useState("");

  // Email settings
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");

  // WhatsApp settings
  const [whatsappApiKey, setWhatsappApiKey] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");

  // Payment settings
  const [razorpayKey, setRazorpayKey] = useState("");
  const [razorpaySecret, setRazorpaySecret] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfscCode, setBankIfscCode] = useState("");
  const [bankBranch, setBankBranch] = useState("");

  // 80G Tax settings
  const [tax80gEnabled, setTax80gEnabled] = useState(true);
  const [tax80gPan, setTax80gPan] = useState("");
  const [tax80gRegNumber, setTax80gRegNumber] = useState("");
  const [tax80gValidFrom, setTax80gValidFrom] = useState("");
  const [tax80gValidTo, setTax80gValidTo] = useState("");
  const [tax80gDisclaimer, setTax80gDisclaimer] = useState("");

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
        const value = setting.value;

        switch (setting.key) {
          // Organization
          case 'organization_name': setOrgName(typeof value === 'string' ? value : ''); break;
          case 'organization_legal_address': setOrgLegalAddress(typeof value === 'string' ? value : ''); break;
          case 'organization_logo_url': setOrgLogoUrl(typeof value === 'string' ? value : ''); break;
          case 'system_contact_email': setSystemContactEmail(typeof value === 'string' ? value : ''); break;
          case 'support_phone_number': setSupportPhone(typeof value === 'string' ? value : ''); break;
          case 'organization_contact':
            if (typeof value === 'object' && value !== null) {
              setOrgPhone(value.phone || "");
              setOrgEmail(value.email || "");
              setOrgWebsite(value.website || "");
            }
            break;

          // Security
          case 'default_password': setDefaultPassword(typeof value === 'string' ? value : ''); break;
          case 'mandatory_2fa_for_admins': setMandatory2FA(value === true); break;
          case 'password_min_length': setPasswordMinLength(typeof value === 'number' ? value : 8); break;
          case 'password_require_uppercase': setPasswordRequireUppercase(value === true); break;
          case 'password_require_special': setPasswordRequireSpecial(value === true); break;
          case 'password_require_numbers': setPasswordRequireNumbers(value === true); break;

          // Timezone & Locale
          case 'system_timezone': setSystemTimezone(typeof value === 'string' ? value : 'Asia/Kolkata'); break;
          case 'system_locale': setSystemLocale(typeof value === 'string' ? value : 'en-IN'); break;

          // Legal
          case 'terms_and_conditions': setTermsAndConditions(typeof value === 'string' ? value : ''); break;
          case 'privacy_policy': setPrivacyPolicy(typeof value === 'string' ? value : ''); break;

          // Email
          case 'email_smtp_host': setSmtpHost(typeof value === 'string' ? value : ''); break;
          case 'email_smtp_port': setSmtpPort(typeof value === 'string' ? value : '587'); break;
          case 'email_smtp_user': setSmtpUser(typeof value === 'string' ? value : ''); break;
          case 'email_smtp_password': setSmtpPassword(typeof value === 'string' ? value : ''); break;
          case 'email_from_address': setFromEmail(typeof value === 'string' ? value : ''); break;

          // WhatsApp
          case 'whatsapp_api_key': setWhatsappApiKey(typeof value === 'string' ? value : ''); break;
          case 'whatsapp_phone_number': setWhatsappPhone(typeof value === 'string' ? value : ''); break;

          // Payment
          case 'payment_razorpay_key': setRazorpayKey(typeof value === 'string' ? value : ''); break;
          case 'payment_razorpay_secret': setRazorpaySecret(typeof value === 'string' ? value : ''); break;
          case 'bank_account_name': setBankAccountName(typeof value === 'string' ? value : ''); break;
          case 'bank_account_number': setBankAccountNumber(typeof value === 'string' ? value : ''); break;
          case 'bank_ifsc_code': setBankIfscCode(typeof value === 'string' ? value : ''); break;
          case 'bank_branch': setBankBranch(typeof value === 'string' ? value : ''); break;

          // 80G Tax
          case 'tax_80g_enabled': setTax80gEnabled(value === true); break;
          case 'tax_80g_pan': setTax80gPan(typeof value === 'string' ? value : ''); break;
          case 'tax_80g_registration_number': setTax80gRegNumber(typeof value === 'string' ? value : ''); break;
          case 'tax_80g_valid_from': setTax80gValidFrom(typeof value === 'string' ? value : ''); break;
          case 'tax_80g_valid_to': setTax80gValidTo(typeof value === 'string' ? value : ''); break;
          case 'tax_80g_disclaimer': setTax80gDisclaimer(typeof value === 'string' ? value : ''); break;
        }
      });
    }
  }, [settings]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('system_settings')
        .update({
          value,
          updated_by: user?.id
        })
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({ title: "Saved", description: "Settings updated successfully." });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Save functions
  const saveOrganization = () => {
    updateMutation.mutate({ key: 'organization_name', value: orgName });
    updateMutation.mutate({ key: 'organization_legal_address', value: orgLegalAddress });
    updateMutation.mutate({ key: 'system_contact_email', value: systemContactEmail });
    updateMutation.mutate({ key: 'support_phone_number', value: supportPhone });
    updateMutation.mutate({ key: 'organization_contact', value: { phone: orgPhone, email: orgEmail, website: orgWebsite } });
    if (orgLogoUrl) {
      updateMutation.mutate({ key: 'organization_logo_url', value: orgLogoUrl });
    }
  };

  const saveSecurity = () => {
    if (defaultPassword.length < 8) {
      toast({
        title: "Invalid Password",
        description: "Default password must be at least 8 characters",
        variant: "destructive"
      });
      return;
    }
    updateMutation.mutate({ key: 'default_password', value: defaultPassword });
    updateMutation.mutate({ key: 'mandatory_2fa_for_admins', value: mandatory2FA });
    updateMutation.mutate({ key: 'password_min_length', value: passwordMinLength });
    updateMutation.mutate({ key: 'password_require_uppercase', value: passwordRequireUppercase });
    updateMutation.mutate({ key: 'password_require_special', value: passwordRequireSpecial });
    updateMutation.mutate({ key: 'password_require_numbers', value: passwordRequireNumbers });
  };

  const saveLocale = () => {
    updateMutation.mutate({ key: 'system_timezone', value: systemTimezone });
    updateMutation.mutate({ key: 'system_locale', value: systemLocale });
  };

  const saveLegal = () => {
    updateMutation.mutate({ key: 'terms_and_conditions', value: termsAndConditions });
    updateMutation.mutate({ key: 'privacy_policy', value: privacyPolicy });
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
    updateMutation.mutate({ key: 'bank_account_name', value: bankAccountName });
    updateMutation.mutate({ key: 'bank_account_number', value: bankAccountNumber });
    updateMutation.mutate({ key: 'bank_ifsc_code', value: bankIfscCode });
    updateMutation.mutate({ key: 'bank_branch', value: bankBranch });
  };

  const saveTaxConfig = () => {
    updateMutation.mutate({ key: 'tax_80g_enabled', value: tax80gEnabled });
    updateMutation.mutate({ key: 'tax_80g_pan', value: tax80gPan });
    updateMutation.mutate({ key: 'tax_80g_registration_number', value: tax80gRegNumber });
    updateMutation.mutate({ key: 'tax_80g_valid_from', value: tax80gValidFrom });
    updateMutation.mutate({ key: 'tax_80g_valid_to', value: tax80gValidTo });
    updateMutation.mutate({ key: 'tax_80g_disclaimer', value: tax80gDisclaimer });
  };

  // Logo upload handler
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `trust-logo-${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('gallery')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('gallery')
        .getPublicUrl(fileName);

      setOrgLogoUrl(publicUrl);
      toast({ title: "Success", description: "Logo uploaded successfully" });
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message,
        variant: "destructive"
      });
    }
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
            <h2 className="text-2xl font-bold">System Settings & Configuration</h2>
            <p className="text-muted-foreground">Manage global system settings, security policies, and integrations</p>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Super Admin Only</span>
          </div>
        </div>

        <Tabs defaultValue="organization" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:grid-cols-7">
            <TabsTrigger value="organization"><Building className="h-4 w-4 mr-1" />Organization</TabsTrigger>
            <TabsTrigger value="security"><Shield className="h-4 w-4 mr-1" />Security</TabsTrigger>
            <TabsTrigger value="financial"><Receipt className="h-4 w-4 mr-1" />Financial</TabsTrigger>
            <TabsTrigger value="communication"><MessageSquare className="h-4 w-4 mr-1" />Communication</TabsTrigger>
            <TabsTrigger value="legal"><FileText className="h-4 w-4 mr-1" />Legal</TabsTrigger>
            <TabsTrigger value="customization"><Sliders className="h-4 w-4 mr-1" />Custom</TabsTrigger>
            <TabsTrigger value="advanced"><Settings className="h-4 w-4 mr-1" />Advanced</TabsTrigger>
          </TabsList>

          {/* ORGANIZATION TAB */}
          <TabsContent value="organization" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trust Branding & Information</CardTitle>
                <CardDescription>Configure organization identity and contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Trust Logo */}
                <div className="space-y-2">
                  <Label>Trust Logo</Label>
                  <div className="flex items-center gap-4">
                    {orgLogoUrl && (
                      <img src={orgLogoUrl} alt="Trust Logo" className="h-16 w-16 object-contain border rounded" />
                    )}
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Used across Admin Panel and Digital ID Cards
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Trust Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Trust Name</Label>
                    <Input
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Mahaveer Bhavan Trust"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Legal Registered Address</Label>
                    <Textarea
                      value={orgLegalAddress}
                      onChange={(e) => setOrgLegalAddress(e.target.value)}
                      placeholder="Enter full legal address"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input
                      value={orgPhone}
                      onChange={(e) => setOrgPhone(e.target.value)}
                      placeholder="+91 1234567890"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={orgEmail}
                      onChange={(e) => setOrgEmail(e.target.value)}
                      placeholder="contact@mahaveerbhavan.org"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                      value={orgWebsite}
                      onChange={(e) => setOrgWebsite(e.target.value)}
                      placeholder="https://mahaveerbhavan.org"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>System Support Email</Label>
                    <Input
                      type="email"
                      value={systemContactEmail}
                      onChange={(e) => setSystemContactEmail(e.target.value)}
                      placeholder="support@mahaveerbhavan.org"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Support Phone Number</Label>
                    <Input
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      placeholder="+91 1234567890"
                    />
                  </div>
                </div>

                <Separator />

                {/* Timezone & Locale */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Timezone & Locale Settings
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Primary Timezone</Label>
                      <Select value={systemTimezone} onValueChange={setSystemTimezone}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                          <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                          <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                          <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>System Locale</Label>
                      <Select value={systemLocale} onValueChange={setSystemLocale}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en-IN">English (India)</SelectItem>
                          <SelectItem value="en-US">English (US)</SelectItem>
                          <SelectItem value="hi-IN">Hindi (India)</SelectItem>
                          <SelectItem value="gu-IN">Gujarati (India)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button onClick={saveLocale} variant="outline" size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save Timezone & Locale
                  </Button>
                </div>

                <Button onClick={saveOrganization} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Organization Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECURITY TAB */}
          <TabsContent value="security" className="space-y-4">
            {/* Default Password */}
            <Card>
              <CardHeader>
                <CardTitle>Default Password Management</CardTitle>
                <CardDescription>
                  Global default password for all newly created accounts (members and admins)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-yellow-500/50 bg-yellow-500/10">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <AlertDescription className="text-sm">
                    Changing this password affects only NEW accounts. Existing users who have set their own password are not impacted.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Global Default Password</Label>
                  <div className="relative">
                    <Input
                      type={showDefaultPassword ? "text" : "password"}
                      value={defaultPassword}
                      onChange={(e) => setDefaultPassword(e.target.value)}
                      placeholder="Enter default password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDefaultPassword(!showDefaultPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showDefaultPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current default: {defaultPassword || "7483085263"}
                  </p>
                </div>

                <Button onClick={saveSecurity} className="w-full">
                  <Lock className="h-4 w-4 mr-2" />
                  Update Default Password
                </Button>
              </CardContent>
            </Card>

            {/* Password Policies */}
            <Card>
              <CardHeader>
                <CardTitle>Password Complexity Requirements</CardTitle>
                <CardDescription>Define password strength requirements for all users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Minimum Password Length</Label>
                  <Input
                    type="number"
                    min={6}
                    max={32}
                    value={passwordMinLength}
                    onChange={(e) => setPasswordMinLength(parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Uppercase Letters</Label>
                      <p className="text-xs text-muted-foreground">At least one uppercase character (A-Z)</p>
                    </div>
                    <Switch
                      checked={passwordRequireUppercase}
                      onCheckedChange={setPasswordRequireUppercase}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Numbers</Label>
                      <p className="text-xs text-muted-foreground">At least one numeric digit (0-9)</p>
                    </div>
                    <Switch
                      checked={passwordRequireNumbers}
                      onCheckedChange={setPasswordRequireNumbers}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Special Characters</Label>
                      <p className="text-xs text-muted-foreground">At least one symbol (!@#$%^&*)</p>
                    </div>
                    <Switch
                      checked={passwordRequireSpecial}
                      onCheckedChange={setPasswordRequireSpecial}
                    />
                  </div>
                </div>

                <Button onClick={saveSecurity} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Password Policies
                </Button>
              </CardContent>
            </Card>

            {/* 2FA Policy */}
            <Card>
              <CardHeader>
                <CardTitle>Administrator 2FA Policy</CardTitle>
                <CardDescription>Enforce two-factor authentication for admin accounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base">Mandatory 2FA for All Admins</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      When enabled, all administrators must set up 2FA on their next login
                    </p>
                  </div>
                  <Switch
                    checked={mandatory2FA}
                    onCheckedChange={setMandatory2FA}
                  />
                </div>

                <Alert className="border-blue-500/50 bg-blue-500/10">
                  <ShieldCheck className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-sm">
                    Individual admins can enable/disable 2FA for their own account in their Security settings.
                    This toggle enforces 2FA for ALL admin roles.
                  </AlertDescription>
                </Alert>

                <Button onClick={saveSecurity} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save 2FA Policy
                </Button>
              </CardContent>
            </Card>

            {/* Personal 2FA Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Your Account Security</CardTitle>
                <CardDescription>Manage two-factor authentication for your account</CardDescription>
              </CardHeader>
              <CardContent>
                <SecuritySettings />
              </CardContent>
            </Card>

            {/* View Audit Logs */}
            <Card>
              <CardHeader>
                <CardTitle>System Audit Logs</CardTitle>
                <CardDescription>View complete history of administrative actions</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Audit logs track all critical admin actions including user edits, deletions,
                    financial changes, and bulk operations. All actions are timestamped and attributed.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={() => navigate('/admin/audit-logs')}
                  variant="outline"
                  className="w-full mt-4"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Audit Logs
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FINANCIAL TAB */}
          <TabsContent value="financial" className="space-y-4">
            {/* Payment Gateway */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Gateway Configuration</CardTitle>
                <CardDescription>Razorpay integration for online payments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-red-500/50 bg-red-500/10">
                  <Lock className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-sm text-red-400">
                    These credentials are highly sensitive. Never share them publicly.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Razorpay Key ID</Label>
                  <Input
                    value={razorpayKey}
                    onChange={(e) => setRazorpayKey(e.target.value)}
                    placeholder="rzp_live_..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Razorpay Key Secret</Label>
                  <Input
                    type="password"
                    value={razorpaySecret}
                    onChange={(e) => setRazorpaySecret(e.target.value)}
                    placeholder="Enter secret key"
                  />
                </div>

                <Button onClick={savePayment} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Payment Gateway
                </Button>
              </CardContent>
            </Card>

            {/* Bank Account Details */}
            <Card>
              <CardHeader>
                <CardTitle>Trust Bank Account Details</CardTitle>
                <CardDescription>Primary bank account for cash reconciliation and receipts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Account Name</Label>
                    <Input
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      placeholder="Mahaveer Bhavan Trust"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input
                      type="password"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="Enter account number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>IFSC Code</Label>
                    <Input
                      value={bankIfscCode}
                      onChange={(e) => setBankIfscCode(e.target.value.toUpperCase())}
                      placeholder="HDFC0001234"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Bank Branch</Label>
                    <Input
                      value={bankBranch}
                      onChange={(e) => setBankBranch(e.target.value)}
                      placeholder="Mumbai Main Branch"
                    />
                  </div>
                </div>

                <Button onClick={savePayment} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Bank Details
                </Button>
              </CardContent>
            </Card>

            {/* 80G Tax Receipt Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>80G Tax Exemption Configuration</CardTitle>
                <CardDescription>
                  Legal information required for generating tax-deductible donation receipts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base">Enable 80G Tax Receipts</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Allow generation of 80G-compliant donation receipts
                    </p>
                  </div>
                  <Switch
                    checked={tax80gEnabled}
                    onCheckedChange={setTax80gEnabled}
                  />
                </div>

                {tax80gEnabled && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Trust PAN Number</Label>
                        <Input
                          value={tax80gPan}
                          onChange={(e) => setTax80gPan(e.target.value.toUpperCase())}
                          placeholder="AAATT1234F"
                          maxLength={10}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>80G Registration Number</Label>
                        <Input
                          value={tax80gRegNumber}
                          onChange={(e) => setTax80gRegNumber(e.target.value)}
                          placeholder="Enter registration number"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Valid From Date</Label>
                        <Input
                          type="date"
                          value={tax80gValidFrom}
                          onChange={(e) => setTax80gValidFrom(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Valid To Date</Label>
                        <Input
                          type="date"
                          value={tax80gValidTo}
                          onChange={(e) => setTax80gValidTo(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Legal Disclaimer Text</Label>
                        <Textarea
                          value={tax80gDisclaimer}
                          onChange={(e) => setTax80gDisclaimer(e.target.value)}
                          placeholder="This donation is eligible for tax deduction under Section 80G..."
                          rows={4}
                        />
                      </div>
                    </div>
                  </>
                )}

                <Button onClick={saveTaxConfig} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save 80G Configuration
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* COMMUNICATION TAB */}
          <TabsContent value="communication" className="space-y-4">
            {/* Email Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration (SMTP)</CardTitle>
                <CardDescription>Settings for sending system emails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      placeholder="587"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>SMTP Username</Label>
                  <Input
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="your-email@gmail.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>SMTP Password</Label>
                  <Input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>From Email Address</Label>
                  <Input
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="noreply@mahaveerbhavan.org"
                  />
                </div>

                <Button onClick={saveEmail} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Email Settings
                </Button>
              </CardContent>
            </Card>

            {/* WhatsApp Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>WhatsApp Business API</CardTitle>
                <CardDescription>Configure WhatsApp messaging for automated notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>WhatsApp API Key</Label>
                  <Input
                    type="password"
                    value={whatsappApiKey}
                    onChange={(e) => setWhatsappApiKey(e.target.value)}
                    placeholder="Enter API key"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Business Phone Number</Label>
                  <Input
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="+91 1234567890"
                  />
                </div>

                <Button onClick={saveWhatsApp} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save WhatsApp Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LEGAL TAB */}
          <TabsContent value="legal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
                <CardDescription>
                  Legal terms linked to registration forms and member dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder="Enter the full text of your Terms & Conditions..."
                  rows={10}
                  className="font-mono text-sm"
                />
                <Button onClick={saveLegal} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Terms & Conditions
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Privacy Policy</CardTitle>
                <CardDescription>
                  Privacy policy linked to registration forms and member dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={privacyPolicy}
                  onChange={(e) => setPrivacyPolicy(e.target.value)}
                  placeholder="Enter the full text of your Privacy Policy..."
                  rows={10}
                  className="font-mono text-sm"
                />
                <Button onClick={saveLegal} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Privacy Policy
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CUSTOMIZATION TAB */}
          <TabsContent value="customization" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dynamic Form Fields</CardTitle>
                <CardDescription>
                  Manage custom fields for member registration forms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Sliders className="h-4 w-4" />
                  <AlertDescription>
                    Dynamic form field management allows you to add custom fields to registration forms
                    based on membership type, with configurable validation and conditional visibility.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={() => navigate('/admin/form-fields')}
                  variant="outline"
                  className="w-full mt-4"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage Form Fields
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distributable Item Types</CardTitle>
                <CardDescription>
                  Define resource types for distribution attendance lists
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Sliders className="h-4 w-4" />
                  <AlertDescription>
                    Item types are used when creating distribution lists (e.g., "Deepavali Gift Bag", "New Member Kit").
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={() => navigate('/admin/item-types')}
                  variant="outline"
                  className="w-full mt-4"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage Item Types
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Festival Calendar</CardTitle>
                <CardDescription>
                  Manage predefined festivals for the member calendar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <CalendarDays className="h-4 w-4" />
                  <AlertDescription>
                    Upload and manage the list of festivals that automatically populate member calendars.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={() => navigate('/admin/calendar')}
                  variant="outline"
                  className="w-full mt-4"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage Festival Calendar
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ADVANCED TAB */}
          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>System-level configuration and diagnostics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Advanced settings are for system administrators only. Changes here may affect system behavior.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" onClick={() => navigate('/admin/database-management')}>
                    Database Management
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/admin/backup-restore')}>
                    Backup & Restore
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/admin/api-logs')}>
                    API Logs
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/admin/system-health')}>
                    System Health
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

// Security Settings Component (moved from original)
const SecuritySettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSetup, setShowSetup] = useState(false);

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
    return <Loading size="sm" text="Loading..." />;
  }

  const is2FAEnabled = twoFactorStatus?.is_enabled;

  return (
    <>
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
                  : 'Add an extra layer of security to your account'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 mt-4">
        {!is2FAEnabled ? (
          <Button onClick={() => setShowSetup(true)} className="w-full">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Enable Two-Factor Authentication
          </Button>
        ) : (
          <div className="flex gap-2">
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
        )}
      </div>

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

export default EnhancedSystemSettings;
