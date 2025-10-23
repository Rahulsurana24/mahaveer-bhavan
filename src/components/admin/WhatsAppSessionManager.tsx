import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  QrCode,
  Phone,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Power
} from 'lucide-react';

const WHATSAPP_API_URL = import.meta.env.VITE_WHATSAPP_API_URL || 'http://localhost:3001/api/whatsapp';

interface WhatsAppStatus {
  status: string;
  is_ready: boolean;
  qr_code: string | null;
  session: {
    phone_number: string | null;
    last_seen_at: string | null;
    error_message: string | null;
  } | null;
}

export function WhatsAppSessionManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pollingEnabled, setPollingEnabled] = useState(false);

  // Fetch WhatsApp status
  const { data: statusData, isLoading, error, refetch } = useQuery<WhatsAppStatus>({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const response = await fetch(`${WHATSAPP_API_URL}/status`);
      if (!response.ok) {
        throw new Error('Failed to fetch WhatsApp status');
      }
      return response.json();
    },
    refetchInterval: pollingEnabled ? 3000 : false, // Poll every 3 seconds when waiting for QR/connection
    retry: 3
  });

  // Enable polling when waiting for QR or authenticating
  useEffect(() => {
    if (statusData?.status) {
      const shouldPoll = ['connecting', 'qr_ready', 'authenticated'].includes(statusData.status);
      setPollingEnabled(shouldPoll);
    }
  }, [statusData?.status]);

  // Request QR code mutation
  const requestQRMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${WHATSAPP_API_URL}/request-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to request QR code');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'QR Code Requested',
        description: 'Please wait while we generate your QR code...'
      });
      setPollingEnabled(true);
      // Refetch immediately
      setTimeout(() => refetch(), 1000);
    },
    onError: (error: Error) => {
      toast({
        title: 'Connection Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${WHATSAPP_API_URL}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disconnect');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Disconnected',
        description: 'WhatsApp session has been disconnected'
      });
      setPollingEnabled(false);
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Disconnect Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      disconnected: {
        label: 'Disconnected',
        variant: 'secondary',
        icon: XCircle
      },
      connecting: {
        label: 'Connecting...',
        variant: 'outline',
        icon: Loader2
      },
      qr_ready: {
        label: 'Scan QR Code',
        variant: 'outline',
        icon: QrCode
      },
      authenticated: {
        label: 'Authenticating...',
        variant: 'outline',
        icon: Loader2
      },
      ready: {
        label: 'Connected',
        variant: 'default',
        icon: CheckCircle
      },
      error: {
        label: 'Error',
        variant: 'destructive',
        icon: AlertTriangle
      }
    };

    const config = statusConfig[status] || statusConfig.disconnected;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1.5 px-3 py-1">
        <Icon className={`h-3.5 w-3.5 ${status === 'connecting' || status === 'authenticated' ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to connect to WhatsApp server. Make sure the server is running on port 3001.
            </AlertDescription>
          </Alert>
          <Button onClick={() => refetch()} className="mt-4" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    );
  }

  const status = statusData?.status || 'disconnected';
  const isReady = statusData?.is_ready || false;
  const qrCode = statusData?.qr_code;
  const phoneNumber = statusData?.session?.phone_number;
  const errorMessage = statusData?.session?.error_message;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <MessageSquare className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-lg">WhatsApp Connection</CardTitle>
              <CardDescription>Manage your WhatsApp Web session</CardDescription>
            </div>
          </div>
          {getStatusBadge(status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Connected State */}
        {isReady && phoneNumber && (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="font-semibold">WhatsApp is connected and ready!</div>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5" />
                  Connected as: <span className="font-mono">+{phoneNumber}</span>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
              <Button
                onClick={() => disconnectMutation.mutate()}
                variant="destructive"
                size="sm"
                disabled={disconnectMutation.isPending}
              >
                <Power className="h-4 w-4 mr-2" />
                {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>
          </div>
        )}

        {/* QR Code Display */}
        {status === 'qr_ready' && qrCode && (
          <div className="space-y-4">
            <Alert>
              <QrCode className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold">Scan QR Code with WhatsApp</div>
                <ol className="mt-2 ml-4 text-sm space-y-1 list-decimal">
                  <li>Open WhatsApp on your phone</li>
                  <li>Go to Settings → Linked Devices</li>
                  <li>Tap "Link a Device"</li>
                  <li>Scan the QR code below</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="flex flex-col items-center justify-center bg-white p-8 rounded-lg border-2 border-dashed">
              <img
                src={qrCode}
                alt="WhatsApp QR Code"
                className="w-64 h-64 object-contain"
              />
              <p className="mt-4 text-sm text-muted-foreground text-center">
                QR code will expire in 5 minutes. Click "Connect WhatsApp" to generate a new one.
              </p>
            </div>

            <div className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
              <p className="text-sm text-muted-foreground">Waiting for scan...</p>
            </div>
          </div>
        )}

        {/* Connecting/Authenticating State */}
        {(status === 'connecting' || status === 'authenticated') && !qrCode && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-semibold">
                {status === 'connecting' ? 'Initializing WhatsApp Web...' : 'Authenticating...'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Please wait</p>
            </div>
          </div>
        )}

        {/* Disconnected State */}
        {status === 'disconnected' && !requestQRMutation.isPending && (
          <div className="space-y-4">
            <Alert>
              <MessageSquare className="h-4 w-4" />
              <AlertDescription>
                Connect your WhatsApp account to send messages to members via WhatsApp.
                Your session will remain active even after closing the browser.
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => requestQRMutation.mutate()}
              className="w-full"
              size="lg"
            >
              <QrCode className="h-5 w-5 mr-2" />
              Connect WhatsApp
            </Button>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && errorMessage && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold">Connection Error</div>
                <p className="mt-1 text-sm">{errorMessage}</p>
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => requestQRMutation.mutate()}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconnect
            </Button>
          </div>
        )}

        {/* Info Section */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> Keep the WhatsApp server running for the connection to work.
            Your session is stored securely and will persist across browser sessions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
