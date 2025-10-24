import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bell, Plus, Edit, Trash2, Info, Power, Clock } from 'lucide-react';

interface PushNotificationConfig {
  id: string;
  name: string;
  description: string | null;
  event_type: string;
  trigger_condition: any;
  notification_title: string;
  notification_body: string;
  notification_data: any;
  recipient_filter: any;
  is_enabled: boolean;
  send_delay_minutes: number;
  created_at: string;
  updated_at: string;
}

const EVENT_TYPES = [
  { value: 'new_registration', label: 'New Registration', description: 'When a new member registers' },
  { value: 'event_reminder', label: 'Event Reminder', description: 'Remind members about upcoming events' },
  { value: 'trip_reminder', label: 'Trip Reminder', description: 'Remind members about upcoming trips' },
  { value: 'donation_received', label: 'Donation Received', description: 'Thank members for donations' },
  { value: 'payment_due', label: 'Payment Due', description: 'Remind members about pending payments' },
  { value: 'membership_expiry', label: 'Membership Expiry', description: 'Warn about expiring memberships' },
  { value: 'announcement_published', label: 'Announcement Published', description: 'Notify about new announcements' },
  { value: 'message_received', label: 'Message Received', description: 'Notify about new messages' },
  { value: 'comment_received', label: 'Comment Received', description: 'Notify about new comments' },
];

export function PushNotificationManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PushNotificationConfig | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_type: 'announcement_published',
    notification_title: '',
    notification_body: '',
    send_delay_minutes: 0,
    is_enabled: true
  });

  // Fetch push notification configs
  const { data: configs, isLoading } = useQuery({
    queryKey: ['push-notification-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('push_notification_config')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PushNotificationConfig[];
    }
  });

  // Create config mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('push_notification_config')
        .insert({
          name: data.name,
          description: data.description || null,
          event_type: data.event_type,
          trigger_condition: {},
          notification_title: data.notification_title,
          notification_body: data.notification_body,
          notification_data: {},
          recipient_filter: {},
          is_enabled: data.is_enabled,
          send_delay_minutes: data.send_delay_minutes,
          created_by: userData.user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-notification-configs'] });
      toast({
        title: 'Success',
        description: 'Push notification configuration created successfully',
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create configuration',
        variant: 'destructive',
      });
    }
  });

  // Update config mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('push_notification_config')
        .update({
          name: data.name,
          description: data.description || null,
          event_type: data.event_type,
          notification_title: data.notification_title,
          notification_body: data.notification_body,
          is_enabled: data.is_enabled,
          send_delay_minutes: data.send_delay_minutes
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-notification-configs'] });
      toast({
        title: 'Success',
        description: 'Configuration updated successfully',
      });
      setIsEditDialogOpen(false);
      setEditingConfig(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update configuration',
        variant: 'destructive',
      });
    }
  });

  // Toggle enabled mutation
  const toggleEnabledMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('push_notification_config')
        .update({ is_enabled: enabled })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-notification-configs'] });
      toast({
        title: 'Success',
        description: 'Configuration status updated',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    }
  });

  // Delete config mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('push_notification_config')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-notification-configs'] });
      toast({
        title: 'Success',
        description: 'Configuration deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete configuration',
        variant: 'destructive',
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      event_type: 'announcement_published',
      notification_title: '',
      notification_body: '',
      send_delay_minutes: 0,
      is_enabled: true
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.notification_title || !formData.notification_body) {
      toast({
        title: 'Validation Error',
        description: 'Name, title, and body are required',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (config: PushNotificationConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      description: config.description || '',
      event_type: config.event_type,
      notification_title: config.notification_title,
      notification_body: config.notification_body,
      send_delay_minutes: config.send_delay_minutes,
      is_enabled: config.is_enabled
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingConfig || !formData.name || !formData.notification_title || !formData.notification_body) {
      toast({
        title: 'Validation Error',
        description: 'Name, title, and body are required',
        variant: 'destructive',
      });
      return;
    }
    updateMutation.mutate({ id: editingConfig.id, data: formData });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this configuration? This cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleEnabled = (id: string, currentlyEnabled: boolean) => {
    toggleEnabledMutation.mutate({ id, enabled: !currentlyEnabled });
  };

  const getEventTypeLabel = (eventType: string) => {
    return EVENT_TYPES.find(et => et.value === eventType)?.label || eventType;
  };

  if (isLoading) {
    return <div>Loading configurations...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Automated Push Notifications
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure automated push notifications triggered by system events
              </p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Configuration
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Automated notifications are sent to members when specific events occur in the system.
              Configure the trigger event, message content, and delay timing.
            </AlertDescription>
          </Alert>

          {!configs || configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No automated notifications configured yet. Create your first configuration to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Notification</TableHead>
                  <TableHead>Delay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{config.name}</div>
                        {config.description && (
                          <div className="text-xs text-muted-foreground">{config.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {getEventTypeLabel(config.event_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <div className="font-medium text-sm">{config.notification_title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {config.notification_body}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {config.send_delay_minutes === 0
                          ? 'Immediate'
                          : `${config.send_delay_minutes}m`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={config.is_enabled}
                          onCheckedChange={() => handleToggleEnabled(config.id, config.is_enabled)}
                        />
                        <Badge variant={config.is_enabled ? 'default' : 'secondary'}>
                          {config.is_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(config)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(config.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Configuration Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Automated Push Notification</DialogTitle>
            <DialogDescription>
              Configure an automated push notification that triggers on system events
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Configuration Name *</Label>
              <Input
                id="create-name"
                placeholder="e.g., Welcome New Members"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-description">Description (Optional)</Label>
              <Input
                id="create-description"
                placeholder="Brief description of this notification"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-event-type">Trigger Event *</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => setFormData({ ...formData, event_type: value })}
              >
                <SelectTrigger id="create-event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((eventType) => (
                    <SelectItem key={eventType.value} value={eventType.value}>
                      <div>
                        <div className="font-medium">{eventType.label}</div>
                        <div className="text-xs text-muted-foreground">{eventType.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-title">Notification Title *</Label>
              <Input
                id="create-title"
                placeholder="e.g., Welcome to Sree Mahaveer Seva!"
                value={formData.notification_title}
                onChange={(e) => setFormData({ ...formData, notification_title: e.target.value })}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                {formData.notification_title.length}/50 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-body">Notification Body *</Label>
              <Textarea
                id="create-body"
                placeholder="e.g., Thank you for joining our community. Jaya Jinendra!"
                rows={4}
                value={formData.notification_body}
                onChange={(e) => setFormData({ ...formData, notification_body: e.target.value })}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {formData.notification_body.length}/200 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-delay">Send Delay (minutes)</Label>
              <Input
                id="create-delay"
                type="number"
                min={0}
                max={1440}
                value={formData.send_delay_minutes}
                onChange={(e) => setFormData({ ...formData, send_delay_minutes: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Delay before sending notification (0 for immediate, max 1440 for 24 hours)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="create-enabled"
                checked={formData.is_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
              />
              <Label htmlFor="create-enabled" className="cursor-pointer">
                Enable this notification
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Configuration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Configuration Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Push Notification Configuration</DialogTitle>
            <DialogDescription>
              Update the automated push notification settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Configuration Name *</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Welcome New Members"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Input
                id="edit-description"
                placeholder="Brief description of this notification"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-event-type">Trigger Event *</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => setFormData({ ...formData, event_type: value })}
              >
                <SelectTrigger id="edit-event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((eventType) => (
                    <SelectItem key={eventType.value} value={eventType.value}>
                      <div>
                        <div className="font-medium">{eventType.label}</div>
                        <div className="text-xs text-muted-foreground">{eventType.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-title">Notification Title *</Label>
              <Input
                id="edit-title"
                placeholder="e.g., Welcome to Sree Mahaveer Seva!"
                value={formData.notification_title}
                onChange={(e) => setFormData({ ...formData, notification_title: e.target.value })}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                {formData.notification_title.length}/50 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-body">Notification Body *</Label>
              <Textarea
                id="edit-body"
                placeholder="e.g., Thank you for joining our community. Jaya Jinendra!"
                rows={4}
                value={formData.notification_body}
                onChange={(e) => setFormData({ ...formData, notification_body: e.target.value })}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {formData.notification_body.length}/200 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-delay">Send Delay (minutes)</Label>
              <Input
                id="edit-delay"
                type="number"
                min={0}
                max={1440}
                value={formData.send_delay_minutes}
                onChange={(e) => setFormData({ ...formData, send_delay_minutes: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Delay before sending notification (0 for immediate, max 1440 for 24 hours)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-enabled"
                checked={formData.is_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
              />
              <Label htmlFor="edit-enabled" className="cursor-pointer">
                Enable this notification
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingConfig(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update Configuration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
