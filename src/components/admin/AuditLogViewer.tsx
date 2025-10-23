import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
  user_profiles?: {
    full_name: string;
    email: string;
  };
}

export function AuditLogViewer() {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch audit logs
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
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
      return data as AuditLog[];
    }
  });

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "create": "default",
      "update": "secondary",
      "delete": "destructive",
      "login": "outline",
      "logout": "outline"
    };

    const actionType = action.toLowerCase().split(' ')[0];
    return <Badge variant={variants[actionType] || "outline"}>{action}</Badge>;
  };

  const filteredLogs = auditLogs?.filter((log) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(search) ||
      log.target_type?.toLowerCase().includes(search) ||
      log.user_profiles?.full_name.toLowerCase().includes(search) ||
      log.user_profiles?.email.toLowerCase().includes(search)
    );
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading audit logs...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Audit Logs
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Track all administrative actions and system changes
            </p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
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
            {searchTerm ? 'No logs found matching your search.' : 'No audit logs yet.'}
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {log.user_profiles?.full_name || 'System'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {log.user_profiles?.email || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.target_type ? (
                        <div>
                          <div className="font-medium capitalize">{log.target_type}</div>
                          {log.target_id && (
                            <div className="text-xs text-muted-foreground">
                              {log.target_id.substring(0, 8)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.details ? (
                        <div className="max-w-xs truncate text-xs text-muted-foreground">
                          {JSON.stringify(log.details)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.ip_address || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredLogs?.length || 0} of {auditLogs?.length || 0} total logs
        </div>
      </CardContent>
    </Card>
  );
}
