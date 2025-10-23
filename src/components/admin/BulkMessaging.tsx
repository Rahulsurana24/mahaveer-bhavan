import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, Send, FileSpreadsheet, CheckCircle, XCircle, Info, Mail, MessageSquare } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BulkMessagingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MessageRow {
  email?: string;
  phone?: string;
  member_id?: string;
  subject?: string;
  message: string;
}

interface SendResult {
  row: number;
  recipient: string;
  status: 'success' | 'error';
  error?: string;
}

export function BulkMessaging({ open, onOpenChange }: BulkMessagingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'manual' | 'excel'>('manual');
  const [messageType, setMessageType] = useState<'email' | 'sms' | 'both'>('email');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SendResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Manual mode state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedMembershipTypes, setSelectedMembershipTypes] = useState<string[]>([]);
  const [includeAllMembers, setIncludeAllMembers] = useState(false);

  // Fetch members for manual mode
  const { data: members = [] } = useQuery({
    queryKey: ['members-for-messaging'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('id, full_name, email, phone, membership_type')
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;
      return data;
    },
    enabled: open && mode === 'manual'
  });

  const downloadTemplate = () => {
    const template = [
      {
        member_id: 'R00001',
        email: 'member@example.com',
        phone: '+911234567890',
        subject: 'Important Update',
        message: 'Your personalized message here'
      },
      {
        member_id: 'P00045',
        email: 'member2@example.com',
        phone: '+919876543210',
        subject: 'Event Reminder',
        message: 'Another personalized message'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Messages');
    XLSX.writeFile(wb, 'bulk_messaging_template.xlsx');

    toast({
      title: 'Template Downloaded',
      description: 'Use this template to prepare bulk messages',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast({
          title: 'Invalid File',
          description: 'Please upload an Excel file (.xlsx or .xls)',
          variant: 'destructive'
        });
        return;
      }

      setFile(selectedFile);
      setResults([]);
      setShowResults(false);
    }
  };

  const handleSendManual = async () => {
    if (!message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Message content is required',
        variant: 'destructive'
      });
      return;
    }

    if (messageType === 'email' && !subject.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Subject is required for email messages',
        variant: 'destructive'
      });
      return;
    }

    if (!includeAllMembers && selectedMembershipTypes.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one membership type or enable "All Members"',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    setProgress(0);
    setResults([]);

    try {
      // Get current user profile
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_id', userData.user?.id)
        .single();

      // Filter members
      const targetMembers = includeAllMembers
        ? members
        : members.filter(m => selectedMembershipTypes.includes(m.membership_type));

      // Create import log
      const { data: importLog } = await supabase
        .from('import_logs')
        .insert({
          import_type: 'bulk_messaging',
          file_name: 'Manual Bulk Message',
          total_rows: targetMembers.length,
          imported_by: profile?.id,
          status: 'processing'
        })
        .select()
        .single();

      const sendResults: SendResult[] = [];
      let successCount = 0;
      let failCount = 0;

      // Send messages
      for (let i = 0; i < targetMembers.length; i++) {
        const member = targetMembers[i];

        try {
          // Log the message
          const { error } = await supabase
            .from('message_logs')
            .insert({
              recipient_type: 'member',
              recipient_id: member.id,
              channel: messageType === 'both' ? 'email' : messageType,
              subject: messageType !== 'sms' ? subject : null,
              message_content: message,
              status: 'sent',
              sent_by: profile?.id
            });

          if (error) throw error;

          // Create notification for member
          const { data: memberProfile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('email', member.email)
            .single();

          if (memberProfile) {
            await supabase.rpc('create_notification', {
              p_user_id: memberProfile.id,
              p_title: subject || 'New Message',
              p_message: message.substring(0, 200),
              p_type: 'info'
            });
          }

          sendResults.push({
            row: i + 1,
            recipient: member.full_name,
            status: 'success'
          });
          successCount++;

        } catch (error: any) {
          sendResults.push({
            row: i + 1,
            recipient: member.full_name,
            status: 'error',
            error: error.message
          });
          failCount++;
        }

        setProgress(Math.round(((i + 1) / targetMembers.length) * 100));
      }

      // Update import log
      if (importLog) {
        await supabase
          .from('import_logs')
          .update({
            successful_rows: successCount,
            failed_rows: failCount,
            status: failCount === 0 ? 'completed' : 'partial',
            completed_at: new Date().toISOString()
          })
          .eq('id', importLog.id);
      }

      setResults(sendResults);
      setShowResults(true);

      toast({
        title: 'Messages Sent',
        description: `Successfully sent ${successCount} messages. ${failCount} failed.`,
        variant: failCount === 0 ? 'default' : 'destructive'
      });

    } catch (error: any) {
      toast({
        title: 'Send Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendFromExcel = async () => {
    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please select an Excel file',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    setProgress(0);
    setResults([]);

    try {
      // Read file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as MessageRow[];

      if (jsonData.length === 0) {
        throw new Error('Excel file is empty');
      }

      // Get current user profile
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_id', userData.user?.id)
        .single();

      // Create import log
      const { data: importLog } = await supabase
        .from('import_logs')
        .insert({
          import_type: 'bulk_messaging',
          file_name: file.name,
          total_rows: jsonData.length,
          imported_by: profile?.id,
          status: 'processing'
        })
        .select()
        .single();

      const sendResults: SendResult[] = [];
      let successCount = 0;
      let failCount = 0;

      // Process each row
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNumber = i + 2;

        try {
          if (!row.message) {
            throw new Error('Message content is required');
          }

          // Log the message
          const { error } = await supabase
            .from('message_logs')
            .insert({
              recipient_type: row.member_id ? 'member' : 'custom',
              recipient_id: row.member_id || null,
              channel: messageType === 'both' ? 'email' : messageType,
              subject: row.subject || subject,
              message_content: row.message,
              status: 'sent',
              sent_by: profile?.id
            });

          if (error) throw error;

          sendResults.push({
            row: rowNumber,
            recipient: row.email || row.phone || row.member_id || 'Unknown',
            status: 'success'
          });
          successCount++;

        } catch (error: any) {
          sendResults.push({
            row: rowNumber,
            recipient: row.email || row.phone || row.member_id || 'Unknown',
            status: 'error',
            error: error.message
          });
          failCount++;
        }

        setProgress(Math.round(((i + 1) / jsonData.length) * 100));
      }

      // Update import log
      if (importLog) {
        await supabase
          .from('import_logs')
          .update({
            successful_rows: successCount,
            failed_rows: failCount,
            status: failCount === 0 ? 'completed' : 'partial',
            completed_at: new Date().toISOString()
          })
          .eq('id', importLog.id);
      }

      setResults(sendResults);
      setShowResults(true);

      toast({
        title: 'Messages Sent',
        description: `Successfully sent ${successCount} messages. ${failCount} failed.`,
        variant: failCount === 0 ? 'default' : 'destructive'
      });

    } catch (error: any) {
      toast({
        title: 'Send Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const handleToggleMembershipType = (type: string) => {
    setSelectedMembershipTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const membershipTypes = ['regular', 'premium', 'honorary'];
  const recipientCount = includeAllMembers
    ? members.length
    : members.filter(m => selectedMembershipTypes.includes(m.membership_type)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Bulk Messaging
          </DialogTitle>
          <DialogDescription>
            Send messages to multiple members via email or SMS
          </DialogDescription>
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-6">
            {/* Mode Selection */}
            <div className="flex gap-2">
              <Button
                variant={mode === 'manual' ? 'default' : 'outline'}
                onClick={() => setMode('manual')}
                className="flex-1"
              >
                <Mail className="h-4 w-4 mr-2" />
                Manual Selection
              </Button>
              <Button
                variant={mode === 'excel' ? 'default' : 'outline'}
                onClick={() => setMode('excel')}
                className="flex-1"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel Import
              </Button>
            </div>

            {/* Message Type */}
            <div className="space-y-2">
              <Label>Message Type</Label>
              <Select value={messageType} onValueChange={(v: any) => setMessageType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="sms">SMS Only</SelectItem>
                  <SelectItem value="both">Both Email & SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === 'manual' ? (
              <>
                {/* Manual Mode */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Select member groups and compose your message. The message will be sent to all selected members.
                  </AlertDescription>
                </Alert>

                {/* Recipient Selection */}
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="all-members"
                        checked={includeAllMembers}
                        onCheckedChange={(checked) => setIncludeAllMembers(checked as boolean)}
                      />
                      <Label htmlFor="all-members">Send to All Members ({members.length})</Label>
                    </div>

                    {!includeAllMembers && (
                      <div className="space-y-2">
                        <Label>Select Membership Types</Label>
                        <div className="flex gap-2">
                          {membershipTypes.map(type => (
                            <div key={type} className="flex items-center space-x-2">
                              <Checkbox
                                id={type}
                                checked={selectedMembershipTypes.includes(type)}
                                onCheckedChange={() => handleToggleMembershipType(type)}
                              />
                              <Label htmlFor={type} className="capitalize">{type}</Label>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Selected recipients: {recipientCount}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Message Composition */}
                {messageType !== 'sms' && (
                  <div className="space-y-2">
                    <Label>Subject *</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Enter email subject"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Message *</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message here..."
                    rows={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    {message.length} characters {messageType === 'sms' && `(${Math.ceil(message.length / 160)} SMS)`}
                  </p>
                </div>

                {sending && (
                  <div className="space-y-2">
                    <Label>Sending Progress</Label>
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm text-center text-muted-foreground">{progress}%</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Excel Mode */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Upload an Excel file with columns: member_id (optional), email, phone, subject, message
                  </AlertDescription>
                </Alert>

                <div>
                  <Button onClick={downloadTemplate} variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download Excel Template
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Select Excel File</Label>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={sending}
                  />
                  {file && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {file.name}
                    </p>
                  )}
                </div>

                {sending && (
                  <div className="space-y-2">
                    <Label>Sending Progress</Label>
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm text-center text-muted-foreground">{progress}%</p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {results.filter(r => r.status === 'success').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Sent</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {results.filter(r => r.status === 'error').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold">{results.length}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </CardContent>
              </Card>
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{result.row}</TableCell>
                      <TableCell>{result.recipient}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {result.status === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                            {result.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-red-600">
                        {result.error || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          {!showResults ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
                Cancel
              </Button>
              <Button
                onClick={mode === 'manual' ? handleSendManual : handleSendFromExcel}
                disabled={sending || (mode === 'excel' && !file) || (mode === 'manual' && recipientCount === 0)}
              >
                {sending ? (
                  <>
                    <Send className="h-4 w-4 mr-2 animate-pulse" />
                    Sending {progress}%
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Messages
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => {
              setShowResults(false);
              setFile(null);
              setResults([]);
              setMessage('');
              setSubject('');
              onOpenChange(false);
            }}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
