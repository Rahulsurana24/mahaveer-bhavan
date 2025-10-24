import { useState } from 'react';
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Mail,
  Phone,
  Send,
  Calendar,
  Loader2,
  FileSpreadsheet
} from "lucide-react";
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { TemplateManager } from '@/components/admin/TemplateManager';
import { RecipientSelector, RecipientFilter } from '@/components/admin/RecipientSelector';
import { MessageLogsViewer } from '@/components/admin/MessageLogsViewer';
import { BulkMessaging } from '@/components/admin/BulkMessaging';

const CommunicationCenter = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Compose form state
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>({
    type: 'all'
  });
  const [recipientCount, setRecipientCount] = useState(0);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['email']);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isBulkMessagingOpen, setIsBulkMessagingOpen] = useState(false);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: {
      subject: string;
      body: string;
      recipientFilter: RecipientFilter;
      recipientCount: number;
      channels: string[];
      scheduledFor?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      // Insert into message_logs for email/SMS
      const { error: logError } = await supabase
        .from('message_logs')
        .insert({
          subject: data.subject || null,
          body: data.body,
          recipient_filter: data.recipientFilter as any,
          recipient_count: data.recipientCount,
          channels: data.channels,
          status: data.scheduledFor ? 'scheduled' : 'pending',
          sent_by: userData.user?.id,
          scheduled_for: data.scheduledFor || null
        });

      if (logError) throw logError;

      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['message-logs'] });

      const description = scheduledDate
        ? 'Message scheduled successfully'
        : 'Message sent successfully';

      toast({
        title: 'Success',
        description
      });
      resetForm();
    },
    onError: (error: Error) => {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    setSubject('');
    setMessageBody('');
    setRecipientFilter({ type: 'all' });
    setSelectedChannels(['email']);
    setScheduledDate('');
    setScheduledTime('');
  };

  const handleChannelToggle = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  const handleSendNow = () => {
    if (!messageBody.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Message body is required',
        variant: 'destructive',
      });
      return;
    }

    if (selectedChannels.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one channel',
        variant: 'destructive',
      });
      return;
    }

    if (recipientCount === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select recipients',
        variant: 'destructive',
      });
      return;
    }

    sendMessageMutation.mutate({
      subject,
      body: messageBody,
      recipientFilter,
      recipientCount,
      channels: selectedChannels
    });
  };

  const handleSchedule = () => {
    if (!messageBody.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Message body is required',
        variant: 'destructive',
      });
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      toast({
        title: 'Validation Error',
        description: 'Please select date and time for scheduling',
        variant: 'destructive',
      });
      return;
    }

    if (selectedChannels.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one channel',
        variant: 'destructive',
      });
      return;
    }

    if (recipientCount === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select recipients',
        variant: 'destructive',
      });
      return;
    }

    const scheduledFor = `${scheduledDate}T${scheduledTime}:00`;

    sendMessageMutation.mutate({
      subject,
      body: messageBody,
      recipientFilter,
      recipientCount,
      channels: selectedChannels,
      scheduledFor
    });
  };

  const handleUseTemplate = (template: any) => {
    setSubject(template.subject || '');
    setMessageBody(template.body);
    toast({
      title: 'Template Loaded',
      description: `Template "${template.name}" has been loaded into the composer`,
    });
  };

  return (
    <AdminLayout title="Communication Center">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">Communication Center</h2>
            <p className="text-muted-foreground">Send multi-channel messages to members</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsBulkMessagingOpen(true)} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Bulk Messaging
            </Button>
          </div>
        </div>

        <Tabs defaultValue="compose" className="space-y-6">
          <TabsList>
            <TabsTrigger value="compose">Compose Message</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="history">Message History</TabsTrigger>
          </TabsList>

          {/* Compose Message Tab */}
          <TabsContent value="compose" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Compose Area */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Compose New Message</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Channel Selection */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Select Channels</Label>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="channel-email"
                            checked={selectedChannels.includes('email')}
                            onCheckedChange={() => handleChannelToggle('email')}
                          />
                          <Label
                            htmlFor="channel-email"
                            className="flex items-center gap-2 cursor-pointer font-normal"
                          >
                            <Mail className="h-4 w-4 text-blue-500" />
                            Email
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="channel-sms"
                            checked={selectedChannels.includes('sms')}
                            onCheckedChange={() => handleChannelToggle('sms')}
                          />
                          <Label
                            htmlFor="channel-sms"
                            className="flex items-center gap-2 cursor-pointer font-normal"
                          >
                            <Phone className="h-4 w-4 text-orange-500" />
                            SMS
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject {selectedChannels.includes('email') && '(Required for Email)'}</Label>
                      <Input
                        id="subject"
                        placeholder="Enter message subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                      />
                    </div>

                    {/* Message Body - Using Plain Textarea for simplicity */}
                    <div className="space-y-2">
                      <Label htmlFor="message">Message Content</Label>
                      <div className="border rounded-md">
                        <textarea
                          id="message"
                          className="w-full min-h-[200px] p-4 rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          placeholder="Type your message here..."
                          value={messageBody}
                          onChange={(e) => setMessageBody(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Scheduling */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Schedule Message (Optional)
                      </Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="schedule-date">Date</Label>
                          <Input
                            id="schedule-date"
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="schedule-time">Time</Label>
                          <Input
                            id="schedule-time"
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={resetForm}
                        disabled={sendMessageMutation.isPending}
                      >
                        Clear
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleSchedule}
                        disabled={sendMessageMutation.isPending}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        {sendMessageMutation.isPending ? 'Scheduling...' : 'Schedule'}
                      </Button>
                      <Button
                        onClick={handleSendNow}
                        disabled={sendMessageMutation.isPending}
                      >
                        {sendMessageMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Now
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recipient Selection Sidebar */}
              <div className="lg:col-span-1">
                <RecipientSelector
                  value={recipientFilter}
                  onChange={setRecipientFilter}
                  onCountChange={setRecipientCount}
                />
              </div>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <TemplateManager onUseTemplate={handleUseTemplate} />
          </TabsContent>

          {/* Message History Tab */}
          <TabsContent value="history" className="space-y-6">
            <MessageLogsViewer />
          </TabsContent>
        </Tabs>

        {/* Bulk Messaging Dialog */}
        <BulkMessaging
          open={isBulkMessagingOpen}
          onOpenChange={setIsBulkMessagingOpen}
        />
      </div>
    </AdminLayout>
  );
};

export default CommunicationCenter;
