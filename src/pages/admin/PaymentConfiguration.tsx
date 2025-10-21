import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Building2, QrCode, Upload, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/ui/loading";

const PaymentConfiguration = () => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    upi_id: "",
    upi_qr_code_url: "",
    bank_account_name: "",
    bank_account_number: "",
    bank_ifsc_code: "",
    bank_name: "",
    bank_branch: "",
    instructions: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchConfiguration();
  }, []);

  const fetchConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_configuration')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConfig(data);
        setFormData({
          upi_id: data.upi_id || "",
          upi_qr_code_url: data.upi_qr_code_url || "",
          bank_account_name: data.bank_account_name || "",
          bank_account_number: data.bank_account_number || "",
          bank_ifsc_code: data.bank_ifsc_code || "",
          bank_name: data.bank_name || "",
          bank_branch: data.bank_branch || "",
          instructions: data.instructions || "",
        });
      }
    } catch (error: any) {
      console.error('Error fetching configuration:', error);
      toast({
        title: "Error",
        description: "Failed to load payment configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQRCodeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `upi-qr-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-qr-codes')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-qr-codes')
        .getPublicUrl(filePath);

      setFormData({ ...formData, upi_qr_code_url: publicUrl });
      toast({
        title: "Success",
        description: "QR code uploaded successfully",
      });
    } catch (error: any) {
      console.error('QR code upload error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload QR code",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    try {
      setSaving(true);

      if (config) {
        // Update existing configuration
        const { error } = await supabase
          .from('payment_configuration')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        // Create new configuration
        const { error } = await supabase
          .from('payment_configuration')
          .insert([{
            ...formData,
            is_active: true,
          }]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Payment configuration saved successfully",
      });

      fetchConfiguration();
    } catch (error: any) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  if (loading) {
    return (
      <AdminLayout title="Payment Configuration">
        <div className="flex justify-center items-center h-64">
          <Loading size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Payment Configuration">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Payment Configuration</h2>
          <p className="text-muted-foreground">Configure payment details for accepting donations</p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            These payment details will be displayed to members when they make donations. Ensure all information is accurate.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="upi" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upi">UPI Details</TabsTrigger>
            <TabsTrigger value="bank">Bank Details</TabsTrigger>
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
          </TabsList>

          {/* UPI Tab */}
          <TabsContent value="upi">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  UPI Payment Details
                </CardTitle>
                <CardDescription>
                  Configure UPI ID and QR code for instant payments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="upi-id">UPI ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="upi-id"
                      placeholder="trust@okicici or 9876543210@paytm"
                      value={formData.upi_id}
                      onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                    />
                    {formData.upi_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(formData.upi_id, "UPI ID")}
                      >
                        Copy
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Members will use this UPI ID for payments
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qr-code">UPI QR Code</Label>
                  <div className="flex gap-4 items-start">
                    <div className="flex-1">
                      <Input
                        id="qr-code"
                        type="file"
                        accept="image/*"
                        onChange={handleQRCodeUpload}
                        disabled={uploading}
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        Upload a QR code image generated from your payment app
                      </p>
                    </div>
                    {uploading && <Loading size="sm" />}
                  </div>
                  {formData.upi_qr_code_url && (
                    <div className="mt-4">
                      <Label>Current QR Code</Label>
                      <div className="mt-2 p-4 border rounded-lg bg-white inline-block">
                        <img
                          src={formData.upi_qr_code_url}
                          alt="UPI QR Code"
                          className="w-48 h-48 object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank Tab */}
          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Bank Account Details
                </CardTitle>
                <CardDescription>
                  Configure bank account for direct transfers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account-name">Account Name</Label>
                    <Input
                      id="account-name"
                      placeholder="Sree Mahaveer Swami Charitable Trust"
                      value={formData.bank_account_name}
                      onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-number">Account Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="account-number"
                        placeholder="1234567890"
                        value={formData.bank_account_number}
                        onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                      />
                      {formData.bank_account_number && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(formData.bank_account_number, "Account Number")}
                        >
                          Copy
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ifsc-code">IFSC Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="ifsc-code"
                        placeholder="SBIN0001234"
                        value={formData.bank_ifsc_code}
                        onChange={(e) => setFormData({ ...formData, bank_ifsc_code: e.target.value.toUpperCase() })}
                      />
                      {formData.bank_ifsc_code && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(formData.bank_ifsc_code, "IFSC Code")}
                        >
                          Copy
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-name">Bank Name</Label>
                    <Input
                      id="bank-name"
                      placeholder="State Bank of India"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="bank-branch">Branch Name (Optional)</Label>
                    <Input
                      id="bank-branch"
                      placeholder="Main Branch, City Name"
                      value={formData.bank_branch}
                      onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                    />
                  </div>
                </div>

                {/* Preview */}
                {formData.bank_account_number && formData.bank_ifsc_code && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <Label className="mb-3 block">Preview (as shown to members)</Label>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Name:</span>
                        <span className="font-medium">{formData.bank_account_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Number:</span>
                        <span className="font-mono font-medium">{formData.bank_account_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IFSC Code:</span>
                        <span className="font-mono font-medium">{formData.bank_ifsc_code}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bank Name:</span>
                        <span className="font-medium">{formData.bank_name}</span>
                      </div>
                      {formData.bank_branch && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Branch:</span>
                          <span className="font-medium">{formData.bank_branch}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Instructions Tab */}
          <TabsContent value="instructions">
            <Card>
              <CardHeader>
                <CardTitle>Payment Instructions</CardTitle>
                <CardDescription>
                  Additional instructions displayed to members during donation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Example: Please send payment confirmation screenshot after donation. All donations are eligible for 80G tax benefits."
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    rows={6}
                  />
                  <p className="text-sm text-muted-foreground">
                    These instructions will be shown to members on the donation page
                  </p>
                </div>

                {formData.instructions && (
                  <Alert>
                    <Check className="h-4 w-4" />
                    <AlertDescription>
                      {formData.instructions}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSaveConfiguration} disabled={saving} size="lg">
            {saving ? (
              <>
                <Loading size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PaymentConfiguration;
