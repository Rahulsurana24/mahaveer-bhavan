import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Edit, Trash2, CheckCircle, Info, Mail, MessageSquare, Send } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';

interface Template {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  purpose: string;
  channel: string;
  placeholders: string[] | null;
  sms_character_limit: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TemplateManagerProps {
  onUseTemplate?: (template: Template) => void;
}

// Available placeholders for different purposes
const PLACEHOLDER_OPTIONS = {
  member: ['[Member Name]', '[Member Email]', '[Member Phone]'],
  event: ['[Event Title]', '[Event Date]', '[Event Location]'],
  trip: ['[Trip Title]', '[Trip Date]', '[Trip Destination]', '[Trip Seat Number]'],
  donation: ['[Donation Amount]', '[Donation Type]', '[Receipt Number]']
};

export function TemplateManager({ onUseTemplate }: TemplateManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Filters
  const [filterPurpose, setFilterPurpose] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    purpose: 'general',
    channel: 'email'
  });

  // Fetch templates with filters
  const { data: templates, isLoading } = useQuery({
    queryKey: ['communication-templates', filterPurpose, filterChannel],
    queryFn: async () => {
      let query = supabase
        .from('communication_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (filterPurpose !== 'all') {
        query = query.eq('purpose', filterPurpose);
      }

      if (filterChannel !== 'all') {
        query = query.eq('channel', filterChannel);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Template[];
    }
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('communication_templates')
        .insert({
          name: data.name,
          subject: data.subject || null,
          body: data.body,
          template_type: data.template_type,
          created_by: userData.user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
      toast({
        title: 'Success',
        description: 'Template created successfully',
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive',
      });
    }
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('communication_templates')
        .update({
          name: data.name,
          subject: data.subject || null,
          body: data.body,
          template_type: data.template_type
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
      toast({
        title: 'Success',
        description: 'Template updated successfully',
      });
      setIsEditDialogOpen(false);
      setEditingTemplate(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive',
      });
    }
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('communication_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      body: '',
      template_type: 'general'
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.body) {
      toast({
        title: 'Validation Error',
        description: 'Name and body are required',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject || '',
      body: template.body,
      template_type: template.template_type || 'general'
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingTemplate || !formData.name || !formData.body) {
      toast({
        title: 'Validation Error',
        description: 'Name and body are required',
        variant: 'destructive',
      });
      return;
    }
    updateMutation.mutate({ id: editingTemplate.id, data: formData });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleUseTemplate = (template: Template) => {
    if (onUseTemplate) {
      onUseTemplate(template);
      toast({
        title: 'Template Loaded',
        description: `Template "${template.name}" has been loaded`,
      });
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById('template-body') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.body;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = before + placeholder + ' ' + after;
      setFormData({ ...formData, body: newText });

      // Set cursor position after inserted placeholder
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length + 1, start + placeholder.length + 1);
      }, 0);
    }
  };

  const getCharacterCount = () => {
    const count = formData.body.length;
    if (formData.channel === 'sms') {
      const smsCount = Math.ceil(count / 160);
      return `${count} characters (${smsCount} SMS${smsCount !== 1 ? 's' : ''})`;
    }
    return `${count} characters`;
  };

  if (isLoading) {
    return <div>Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Message Templates
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage reusable message templates with dynamic placeholders
              </p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="filter-purpose">Filter by Purpose</Label>
              <Select value={filterPurpose} onValueChange={setFilterPurpose}>
                <SelectTrigger id="filter-purpose">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Purposes</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="trip">Trip</SelectItem>
                  <SelectItem value="donation">Donation</SelectItem>
                  <SelectItem value="membership">Membership</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="confirmation">Confirmation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="filter-channel">Filter by Channel</Label>
              <Select value={filterChannel} onValueChange={setFilterChannel}>
                <SelectTrigger id="filter-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="push">Push Notification</SelectItem>
                  <SelectItem value="multi">Multi-Channel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Template List */}
          {!templates || templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {filterPurpose !== 'all' || filterChannel !== 'all'
                ? 'No templates match your filters.'
                : 'No templates yet. Create your first template to get started.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {template.purpose}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {template.channel === 'email' && <Mail className="h-3 w-3" />}
                        {template.channel === 'sms' && <MessageSquare className="h-3 w-3" />}
                        {template.channel === 'whatsapp' && <Send className="h-3 w-3" />}
                        <span className="capitalize text-sm">{template.channel}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {template.subject || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {new Date(template.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onUseTemplate && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUseTemplate(template)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Use
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
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

      {/* Create Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Create a reusable message template with dynamic placeholders
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Template Name *</Label>
                <Input
                  id="create-name"
                  placeholder="e.g., Event Reminder"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-purpose">Purpose *</Label>
                <Select
                  value={formData.purpose}
                  onValueChange={(value) => setFormData({ ...formData, purpose: value })}
                >
                  <SelectTrigger id="create-purpose">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="trip">Trip</SelectItem>
                    <SelectItem value="donation">Donation</SelectItem>
                    <SelectItem value="membership">Membership</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="confirmation">Confirmation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-channel">Channel *</Label>
              <Select
                value={formData.channel}
                onValueChange={(value) => setFormData({ ...formData, channel: value })}
              >
                <SelectTrigger id="create-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      SMS
                    </div>
                  </SelectItem>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      WhatsApp
                    </div>
                  </SelectItem>
                  <SelectItem value="push">Push Notification</SelectItem>
                  <SelectItem value="multi">Multi-Channel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Channel-specific alerts */}
            {formData.channel === 'sms' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  SMS messages are limited to 160 characters per message. Longer messages will be split into multiple SMS.
                </AlertDescription>
              </Alert>
            )}

            {formData.channel === 'whatsapp' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  WhatsApp supports *bold*, _italic_, and ~strikethrough~ formatting. Use emojis to make messages engaging.
                </AlertDescription>
              </Alert>
            )}

            {(formData.channel === 'email' || formData.channel === 'multi') && (
              <div className="space-y-2">
                <Label htmlFor="create-subject">Subject {formData.channel === 'email' ? '*' : '(For Email)'}</Label>
                <Input
                  id="create-subject"
                  placeholder="Message subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="template-body">Message Body *</Label>
                <span className="text-xs text-muted-foreground">{getCharacterCount()}</span>
              </div>

              {/* Placeholder Insert Buttons */}
              <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="w-full text-xs font-semibold text-muted-foreground mb-1">
                  Insert Placeholders:
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="text-xs text-muted-foreground">Member:</div>
                  {PLACEHOLDER_OPTIONS.member.map((ph) => (
                    <Button
                      key={ph}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertPlaceholder(ph)}
                      className="h-7 text-xs"
                    >
                      {ph}
                    </Button>
                  ))}
                </div>
                {(formData.purpose === 'event' || formData.purpose === 'reminder' || formData.purpose === 'confirmation') && (
                  <div className="flex flex-wrap gap-2">
                    <div className="text-xs text-muted-foreground">Event:</div>
                    {PLACEHOLDER_OPTIONS.event.map((ph) => (
                      <Button
                        key={ph}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertPlaceholder(ph)}
                        className="h-7 text-xs"
                      >
                        {ph}
                      </Button>
                    ))}
                  </div>
                )}
                {formData.purpose === 'trip' && (
                  <div className="flex flex-wrap gap-2">
                    <div className="text-xs text-muted-foreground">Trip:</div>
                    {PLACEHOLDER_OPTIONS.trip.map((ph) => (
                      <Button
                        key={ph}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertPlaceholder(ph)}
                        className="h-7 text-xs"
                      >
                        {ph}
                      </Button>
                    ))}
                  </div>
                )}
                {formData.purpose === 'donation' && (
                  <div className="flex flex-wrap gap-2">
                    <div className="text-xs text-muted-foreground">Donation:</div>
                    {PLACEHOLDER_OPTIONS.donation.map((ph) => (
                      <Button
                        key={ph}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertPlaceholder(ph)}
                        className="h-7 text-xs"
                      >
                        {ph}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <Textarea
                id="template-body"
                placeholder="Enter template content... Click placeholder buttons above to insert dynamic fields."
                rows={10}
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              />
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
              {createMutation.isPending ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update the template details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Template Name *</Label>
                <Input
                  id="edit-name"
                  placeholder="e.g., Event Reminder"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Type</Label>
                <Select
                  value={formData.template_type}
                  onValueChange={(value) => setFormData({ ...formData, template_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="donation">Donation</SelectItem>
                    <SelectItem value="membership">Membership</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-subject">Subject (Optional)</Label>
              <Input
                id="edit-subject"
                placeholder="Message subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-body">Message Body *</Label>
              <Textarea
                id="edit-body"
                placeholder="Enter template content..."
                rows={8}
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingTemplate(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
