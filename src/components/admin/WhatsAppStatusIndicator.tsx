import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const WHATSAPP_API_URL = import.meta.env.VITE_WHATSAPP_API_URL || 'http://localhost:3001/api/whatsapp';

interface WhatsAppStatus {
  status: string;
  is_ready: boolean;
  session: {
    phone_number: string | null;
    error_message: string | null;
  } | null;
}

export function WhatsAppStatusIndicator() {
  const { data, isLoading, error } = useQuery<WhatsAppStatus>({
    queryKey: ['whatsapp-status-indicator'],
    queryFn: async () => {
      const response = await fetch(`${WHATSAPP_API_URL}/status`);
      if (!response.ok) throw new Error('Failed to fetch status');
      return response.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: 1,
    retryDelay: 5000
  });

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">WhatsApp</span>
      </Badge>
    );
  }

  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="gap-1.5 cursor-help">
              <AlertCircle className="h-3 w-3" />
              <span className="text-xs">WhatsApp</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">WhatsApp server not connected</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const status = data?.status || 'disconnected';
  const isReady = data?.is_ready || false;
  const phoneNumber = data?.session?.phone_number;

  const getStatusConfig = () => {
    if (isReady && status === 'ready') {
      return {
        variant: 'default' as const,
        color: 'bg-green-500',
        icon: <MessageSquare className="h-3 w-3" />,
        tooltip: phoneNumber ? `Connected as +${phoneNumber}` : 'WhatsApp Connected'
      };
    }

    if (status === 'connecting' || status === 'authenticated' || status === 'qr_ready') {
      return {
        variant: 'outline' as const,
        color: 'bg-yellow-500',
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        tooltip: 'Connecting to WhatsApp...'
      };
    }

    return {
      variant: 'secondary' as const,
      color: 'bg-gray-400',
      icon: <MessageSquare className="h-3 w-3" />,
      tooltip: 'WhatsApp Disconnected'
    };
  };

  const config = getStatusConfig();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className="gap-1.5 cursor-help">
            <div className="relative">
              {config.icon}
              <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${config.color} ${isReady ? 'animate-pulse' : ''}`} />
            </div>
            <span className="text-xs">WhatsApp</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
