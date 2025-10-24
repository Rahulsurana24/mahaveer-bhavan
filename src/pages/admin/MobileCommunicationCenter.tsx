import { useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mail,
  MessageSquare,
  Send,
  Calendar,
  Users,
  FileText,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type RecipientFilter = {
  type: 'all' | 'membership_type' | 'status' | 'specific';
  membershipType?: string;
  status?: string;
  memberIds?: string[];
};

const MobileCommunicationCenter = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Compose form state
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['email']);
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>({
    type: 'all',
  });
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isRecipientSheetOpen, setIsRecipientSheetOpen] = useState(false);
  const [isScheduleSheetOpen, setIsScheduleSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

  // Count recipients based on filter
  const { data: recipientCount = 0 } = useQuery({
    queryKey: ['recipient-count', recipientFilter],
    queryFn: async () => {
      let query = supabase.from('members').select('*', { count: 'exact', head: true });

      if (recipientFilter.type === 'membership_type' && recipientFilter.membershipType) {
        query = query.eq('membership_type', recipientFilter.membershipType);
      }

      if (recipientFilter.type === 'status' && recipientFilter.status) {
        query = query.eq('status', recipientFilter.status);
      }

      if (recipientFilter.type === 'specific' && recipientFilter.memberIds?.length) {
        query = query.in('id', recipientFilter.memberIds);
      }

      const { count } = await query;
      return count || 0;
    },
  });

  // Fetch message history
  const { data: messageHistory = [] } = useQuery({
    queryKey: ['message-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });

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

      const { error } = await supabase.from('message_logs').insert({
        subject: data.subject || null,
        body: data.body,
        recipient_filter: data.recipientFilter as any,
        recipient_count: data.recipientCount,
        channels: data.channels,
        status: data.scheduledFor ? 'scheduled' : 'pending',
        sent_by: userData.user?.id,
        scheduled_for: data.scheduledFor || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['message-history'] });

      const description = scheduledDate
        ? 'Message scheduled successfully'
        : 'Message sent successfully';

      toast({
        title: '✓ Success',
        description,
      });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    },
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
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
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
      channels: selectedChannels,
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
      scheduledFor,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-[#00A36C]" />;
      case 'pending':
        return <Loader2 className="h-4 w-4 text-[#B8860B] animate-spin" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      sent: 'bg-[#00A36C]',
      pending: 'bg-[#B8860B]',
      scheduled: 'bg-blue-500',
      failed: 'bg-red-500',
    };
    return (
      <Badge className={cn(colors[status] || 'bg-gray-500', 'text-white border-0')}>
        {status}
      </Badge>
    );
  };

  return (
    <MobileLayout title="Communication Center">
      <div className="px-4 py-4 space-y-4">
        {/* Tab Switcher */}
        <div className="flex gap-2 bg-[#252525] p-1 rounded-lg">
          <Button
            variant={activeTab === 'compose' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('compose')}
            className={cn(
              'flex-1',
              activeTab === 'compose'
                ? 'bg-[#00A36C] text-white'
                : 'text-gray-400 hover:text-white'
            )}
          >
            <Send className="h-4 w-4 mr-2" />
            Compose
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('history')}
            className={cn(
              'flex-1',
              activeTab === 'history'
                ? 'bg-[#00A36C] text-white'
                : 'text-gray-400 hover:text-white'
            )}
          >
            <FileText className="h-4 w-4 mr-2" />
            History
          </Button>
        </div>

        {/* Compose Tab */}
        {activeTab === 'compose' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Channel Selection */}
            <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white">Channels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant={selectedChannels.includes('email') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleChannelToggle('email')}
                    className={cn(
                      'flex-1',
                      selectedChannels.includes('email')
                        ? 'bg-[#00A36C] hover:bg-[#00A36C]/90 border-0'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    )}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                  <Button
                    variant={selectedChannels.includes('sms') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleChannelToggle('sms')}
                    className={cn(
                      'flex-1',
                      selectedChannels.includes('sms')
                        ? 'bg-[#00A36C] hover:bg-[#00A36C]/90 border-0'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    )}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    SMS
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recipients */}
            <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
              <CardContent className="p-4">
                <Sheet open={isRecipientSheetOpen} onOpenChange={setIsRecipientSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>
                          {recipientFilter.type === 'all'
                            ? 'All Members'
                            : recipientFilter.type === 'membership_type'
                            ? `${recipientFilter.membershipType} Members`
                            : recipientFilter.type === 'status'
                            ? `${recipientFilter.status} Members`
                            : 'Specific Members'}
                        </span>
                      </div>
                      <Badge className="bg-[#00A36C] border-0">{recipientCount}</Badge>
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    className="bg-[#1C1C1C] border-white/10 max-h-[80vh]"
                  >
                    <SheetHeader>
                      <SheetTitle className="text-white">Select Recipients</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300">Target Audience</Label>
                        <Select
                          value={recipientFilter.type}
                          onValueChange={(value: any) =>
                            setRecipientFilter({ ...recipientFilter, type: value })
                          }
                        >
                          <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#252525] border-white/10">
                            <SelectItem value="all">All Members</SelectItem>
                            <SelectItem value="membership_type">By Membership Type</SelectItem>
                            <SelectItem value="status">By Status</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {recipientFilter.type === 'membership_type' && (
                        <div className="space-y-2">
                          <Label className="text-gray-300">Membership Type</Label>
                          <Select
                            value={recipientFilter.membershipType}
                            onValueChange={(value) =>
                              setRecipientFilter({ ...recipientFilter, membershipType: value })
                            }
                          >
                            <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#252525] border-white/10">
                              <SelectItem value="Trustee">Trustee</SelectItem>
                              <SelectItem value="Tapasvi">Tapasvi</SelectItem>
                              <SelectItem value="Karyakarta">Karyakarta</SelectItem>
                              <SelectItem value="Labharti">Labharti</SelectItem>
                              <SelectItem value="Extra">Extra</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {recipientFilter.type === 'status' && (
                        <div className="space-y-2">
                          <Label className="text-gray-300">Status</Label>
                          <Select
                            value={recipientFilter.status}
                            onValueChange={(value) =>
                              setRecipientFilter({ ...recipientFilter, status: value })
                            }
                          >
                            <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#252525] border-white/10">
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <Button
                        className="w-full bg-[#00A36C] hover:bg-[#00A36C]/90"
                        onClick={() => setIsRecipientSheetOpen(false)}
                      >
                        Apply ({recipientCount} recipients)
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </CardContent>
            </Card>

            {/* Subject (if Email selected) */}
            {selectedChannels.includes('email') && (
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-4 space-y-2">
                  <Label className="text-gray-300">Subject</Label>
                  <Input
                    placeholder="Enter message subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  />
                </CardContent>
              </Card>
            )}

            {/* Message Body */}
            <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
              <CardContent className="p-4 space-y-2">
                <Label className="text-gray-300">Message</Label>
                <Textarea
                  placeholder="Type your message here..."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="min-h-[200px] bg-white/5 border-white/10 text-white placeholder:text-gray-500 resize-none"
                />
                <div className="text-xs text-gray-400 text-right">
                  {messageBody.length} characters
                </div>
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
              <CardContent className="p-4">
                <Sheet open={isScheduleSheetOpen} onOpenChange={setIsScheduleSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {scheduledDate
                        ? `Scheduled for ${format(
                            new Date(`${scheduledDate}T${scheduledTime}`),
                            'MMM dd, yyyy h:mm a'
                          )}`
                        : 'Schedule Message (Optional)'}
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    className="bg-[#1C1C1C] border-white/10 max-h-[80vh]"
                  >
                    <SheetHeader>
                      <SheetTitle className="text-white">Schedule Message</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300">Date</Label>
                        <Input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="bg-[#252525] border-white/10 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300">Time</Label>
                        <Input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="bg-[#252525] border-white/10 text-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 bg-[#252525] border-white/10 text-white"
                          onClick={() => {
                            setScheduledDate('');
                            setScheduledTime('');
                            setIsScheduleSheetOpen(false);
                          }}
                        >
                          Clear
                        </Button>
                        <Button
                          className="flex-1 bg-[#00A36C] hover:bg-[#00A36C]/90"
                          onClick={() => setIsScheduleSheetOpen(false)}
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-2 sticky bottom-4">
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={sendMessageMutation.isPending}
                className="flex-1 bg-[#252525] border-white/10 text-white hover:bg-white/10"
              >
                Clear
              </Button>
              {scheduledDate && scheduledTime ? (
                <Button
                  onClick={handleSchedule}
                  disabled={sendMessageMutation.isPending}
                  className="flex-1 bg-[#B8860B] hover:bg-[#B8860B]/90"
                >
                  {sendMessageMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleSendNow}
                  disabled={sendMessageMutation.isPending}
                  className="flex-1 bg-[#00A36C] hover:bg-[#00A36C]/90"
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
              )}
            </div>
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="text-sm text-gray-400">{messageHistory.length} messages</div>

            {messageHistory.length === 0 ? (
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-12 text-center">
                  <Mail className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                  <div className="text-gray-400">No message history</div>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence>
                {messageHistory.map((message: any, index: number) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">{getStatusIcon(message.status)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex-1 min-w-0">
                                {message.subject && (
                                  <h3 className="font-semibold text-white text-sm truncate">
                                    {message.subject}
                                  </h3>
                                )}
                                <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                                  {message.body}
                                </p>
                              </div>
                              {getStatusBadge(message.status)}
                            </div>

                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                <span>{message.recipient_count} recipients</span>
                              </div>
                              <div className="flex gap-1">
                                {message.channels?.map((channel: string) => (
                                  <Badge
                                    key={channel}
                                    className="h-4 bg-white/10 text-gray-300 border-0"
                                  >
                                    {channel}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div className="text-xs text-gray-500 mt-2">
                              {message.scheduled_for
                                ? `Scheduled for ${format(
                                    new Date(message.scheduled_for),
                                    'MMM dd, h:mm a'
                                  )}`
                                : format(new Date(message.created_at), 'MMM dd, yyyy h:mm a')}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        )}
      </div>
    </MobileLayout>
  );
};

export default MobileCommunicationCenter;
