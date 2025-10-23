import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  MessageSquare,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Search,
  Calendar as CalendarIcon
} from 'lucide-react';
import { format } from 'date-fns';

interface MessageLog {
  id: string;
  subject: string | null;
  body: string;
  recipient_filter: Record<string, any>;
  recipient_count: number;
  channels: string[];
  status: string;
  sent_by: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
  user_profiles?: {
    full_name: string;
    email: string;
  };
}

export function MessageLogsViewer() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<MessageLog | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Fetch message logs
  const { data: messageLogs, isLoading } = useQuery({
    queryKey: ['message-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_logs')
        .select(`
          *,
          user_profiles (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as MessageLog[];
    }
  });

  const getChannelIcon = (channel: string) => {
    const icons: Record<string, any> = {
      whatsapp: MessageSquare,
      email: Mail,
      sms: Phone
    };
    const Icon = icons[channel.toLowerCase()] || MessageSquare;
    return <Icon className="h-3 w-3" />;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, any> = {
      sent: { variant: 'default', icon: CheckCircle, text: 'Sent' },
      pending: { variant: 'secondary', icon: Clock, text: 'Pending' },
      scheduled: { variant: 'secondary', icon: CalendarIcon, text: 'Scheduled' },
      failed: { variant: 'destructive', icon: XCircle, text: 'Failed' }
    };

    const statusConfig = config[status] || config.pending;
    const Icon = statusConfig.icon;

    return (
      <Badge variant={statusConfig.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {statusConfig.text}
      </Badge>
    );
  };

  const getRecipientDescription = (filter: Record<string, any>) => {
    if (!filter || !filter.type) return 'Unknown';

    switch (filter.type) {
      case 'all':
        return 'All Members';
      case 'membership_type':
        return `Membership: ${filter.membershipType || 'N/A'}`;
      case 'event_registration':
        return 'Event Registrations';
      case 'trip_registration':
        return 'Trip Registrations';
      case 'custom':
        return 'Custom Filter';
      default:
        return 'Unknown';
    }
  };

  const handleViewDetails = (message: MessageLog) => {
    setSelectedMessage(message);
    setIsDetailDialogOpen(true);
  };

  const filteredLogs = messageLogs?.filter((log) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.subject?.toLowerCase().includes(search) ||
      log.body.toLowerCase().includes(search) ||
      log.status.toLowerCase().includes(search)
    );
  });

  if (isLoading) {
    return <div>Loading message history...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Message History</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredLogs || filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No messages found matching your search.' : 'No messages sent yet.'}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject/Message</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="font-medium truncate">
                            {log.subject || 'No Subject'}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {log.body.substring(0, 60)}
                            {log.body.length > 60 && '...'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {log.channels.map((channel) => (
                            <Badge key={channel} variant="outline" className="flex items-center gap-1">
                              {getChannelIcon(channel)}
                              {channel}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.recipient_count}</div>
                          <div className="text-xs text-muted-foreground">
                            {getRecipientDescription(log.recipient_filter)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {log.user_profiles?.full_name || 'System'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {log.sent_at
                            ? format(new Date(log.sent_at), 'MMM dd, yyyy HH:mm')
                            : log.scheduled_for
                            ? format(new Date(log.scheduled_for), 'MMM dd, yyyy HH:mm')
                            : format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Message Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
            <DialogDescription>
              Complete information about the sent message
            </DialogDescription>
          </DialogHeader>

          {selectedMessage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedMessage.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Recipients</Label>
                  <div className="mt-1 font-medium">{selectedMessage.recipient_count}</div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Channels</Label>
                <div className="flex gap-2 mt-1">
                  {selectedMessage.channels.map((channel) => (
                    <Badge key={channel} variant="outline" className="flex items-center gap-1">
                      {getChannelIcon(channel)}
                      {channel}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Subject</Label>
                <div className="mt-1 font-medium">
                  {selectedMessage.subject || <span className="text-muted-foreground">No subject</span>}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Message Body</Label>
                <div className="mt-1 p-4 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">
                  {selectedMessage.body}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Recipient Filter</Label>
                <div className="mt-1 text-sm">
                  {getRecipientDescription(selectedMessage.recipient_filter)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Sent By</Label>
                  <div className="mt-1 text-sm">
                    {selectedMessage.user_profiles?.full_name || 'System'}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                  <div className="mt-1 text-sm">
                    {selectedMessage.sent_at
                      ? format(new Date(selectedMessage.sent_at), 'PPpp')
                      : selectedMessage.scheduled_for
                      ? `Scheduled: ${format(new Date(selectedMessage.scheduled_for), 'PPpp')}`
                      : format(new Date(selectedMessage.created_at), 'PPpp')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper Label component for details view
function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}
