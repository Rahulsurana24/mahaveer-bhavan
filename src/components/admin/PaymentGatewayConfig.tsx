import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Save, Eye, EyeOff, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GatewayConfig {
  id: string;
  provider: string;
  api_key: string;
  api_secret: string;
  is_test_mode: boolean;
  is_active: boolean;
  config_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function PaymentGatewayConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);

  const [formData, setFormData] = useState({
    provider: 'razorpay',
    api_key: '',
    api_secret: '',
    is_test_mode: true,
    is_active: false
  });

  // Check if user is superadmin
  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('role_id, user_roles(name)')
          .eq('auth_id', user.id)
          .single();

        const isSuperAdmin = (data as any)?.user_roles?.name === 'superadmin';
        setIsSuperAdmin(isSuperAdmin);
      }
    };
    checkRole();
  }, []);

  // Fetch gateway configurations
  const { data: gateways, isLoading } = useQuery({
    queryKey: ['payment-gateway-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_gateway_config')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as GatewayConfig[];
    },
    enabled: isSuperAdmin
  });

  // Load active gateway into form
  useEffect(() => {
    if (gateways && gateways.length > 0) {
      const activeGateway = gateways.find(g => g.is_active) || gateways[0];
      setFormData({
        provider: activeGateway.provider,
        api_key: activeGateway.api_key,
        api_secret: activeGateway.api_secret,
        is_test_mode: activeGateway.is_test_mode,
        is_active: activeGateway.is_active
      });
    }
  }, [gateways]);

  // Save gateway configuration
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Deactivate all existing gateways for this provider if activating new one
      if (data.is_active) {
        await supabase
          .from('payment_gateway_config')
          .update({ is_active: false })
          .eq('provider', data.provider);
      }

      // Check if config exists
      const { data: existing } = await supabase
        .from('payment_gateway_config')
        .select('id')
        .eq('provider', data.provider)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('payment_gateway_config')
          .update(data)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('payment_gateway_config')
          .insert(data);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-gateway-config'] });
      toast({
        title: 'Success',
        description: 'Payment gateway configuration saved successfully',
      });
    },
    onError: (error) => {
      console.error('Error saving gateway config:', error);
      toast({
        title: 'Error',
        description: 'Failed to save payment gateway configuration',
        variant: 'destructive',
      });
    }
  });

  const handleSave = () => {
    if (!formData.api_key || !formData.api_secret) {
      toast({
        title: 'Validation Error',
        description: 'API Key and API Secret are required',
        variant: 'destructive',
      });
      return;
    }

    saveMutation.mutate(formData);
  };

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              Only superadmins can configure payment gateways.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading gateway configuration...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Gateway Configuration
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configure payment gateway settings for accepting online donations
            </p>
          </div>
          {formData.is_active && (
            <Badge variant="default">Active</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label htmlFor="provider">Payment Provider</Label>
          <Select
            value={formData.provider}
            onValueChange={(value) => setFormData({ ...formData, provider: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="razorpay">Razorpay</SelectItem>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="paytm">Paytm</SelectItem>
              <SelectItem value="phonepe">PhonePe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <div className="relative">
            <Input
              id="api-key"
              type={showApiKey ? 'text' : 'password'}
              placeholder="Enter API Key"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* API Secret */}
        <div className="space-y-2">
          <Label htmlFor="api-secret">API Secret</Label>
          <div className="relative">
            <Input
              id="api-secret"
              type={showApiSecret ? 'text' : 'password'}
              placeholder="Enter API Secret"
              value={formData.api_secret}
              onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowApiSecret(!showApiSecret)}
            >
              {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Test Mode Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label htmlFor="test-mode" className="font-medium">Test Mode</Label>
            <p className="text-sm text-muted-foreground">
              Enable test mode for development and testing
            </p>
          </div>
          <Switch
            id="test-mode"
            checked={formData.is_test_mode}
            onCheckedChange={(checked) => setFormData({ ...formData, is_test_mode: checked })}
          />
        </div>

        {/* Active Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label htmlFor="active" className="font-medium">Activate Gateway</Label>
            <p className="text-sm text-muted-foreground">
              Enable this gateway for accepting payments
            </p>
          </div>
          <Switch
            id="active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>

        {/* Warning */}
        {formData.is_active && formData.is_test_mode && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              <strong>Warning:</strong> Gateway is active in test mode. Switch to production mode before accepting real payments.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
