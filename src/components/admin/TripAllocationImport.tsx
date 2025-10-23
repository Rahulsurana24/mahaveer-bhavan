import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, Info } from 'lucide-react';
import * as XLSX from 'xlsx';

interface TripAllocationImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AllocationRow {
  member_id: string;
  room_number?: string;
  bus_seat_number?: string;
  train_seat_number?: string;
  pnr_number?: string;
  flight_ticket_number?: string;
  additional_notes?: string;
}

interface ImportResult {
  row: number;
  data: AllocationRow;
  status: 'success' | 'error';
  error?: string;
}

export function TripAllocationImport({ open, onOpenChange }: TripAllocationImportProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Fetch trips
  const { data: trips = [] } = useQuery({
    queryKey: ['trips-for-allocation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('id, title, start_date')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open
  });

  const downloadTemplate = () => {
    if (!selectedTripId) {
      toast({
        title: 'No Trip Selected',
        description: 'Please select a trip first',
        variant: 'destructive'
      });
      return;
    }

    const template = [
      {
        member_id: 'R00001',
        room_number: '101',
        bus_seat_number: 'A1',
        train_seat_number: '',
        pnr_number: '',
        flight_ticket_number: '',
        additional_notes: 'Window seat preferred'
      },
      {
        member_id: 'P00045',
        room_number: '102',
        bus_seat_number: 'A2',
        train_seat_number: 'B12',
        pnr_number: '1234567890',
        flight_ticket_number: '',
        additional_notes: ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trip Allocations');
    XLSX.writeFile(wb, 'trip_allocation_template.xlsx');

    toast({
      title: 'Template Downloaded',
      description: 'Use this template to prepare trip allocations',
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

  const validateRow = (row: any): { valid: boolean; error?: string } => {
    if (!row.member_id || typeof row.member_id !== 'string' || row.member_id.trim() === '') {
      return { valid: false, error: 'Member ID is required' };
    }

    // At least one allocation field must be provided
    if (!row.room_number && !row.bus_seat_number && !row.train_seat_number &&
        !row.pnr_number && !row.flight_ticket_number) {
      return { valid: false, error: 'At least one allocation field is required' };
    }

    return { valid: true };
  };

  const handleImport = async () => {
    if (!selectedTripId) {
      toast({
        title: 'No Trip Selected',
        description: 'Please select a trip first',
        variant: 'destructive'
      });
      return;
    }

    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please select an Excel file to import',
        variant: 'destructive'
      });
      return;
    }

    setImporting(true);
    setProgress(0);
    setResults([]);

    try {
      // Read file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as AllocationRow[];

      if (jsonData.length === 0) {
        throw new Error('Excel file is empty');
      }

      // Get current user profile ID for import logging
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_id', userData.user?.id)
        .single();

      // Create import log
      const { data: importLog, error: logError } = await supabase
        .from('import_logs')
        .insert({
          import_type: 'trip_allocations',
          file_name: file.name,
          total_rows: jsonData.length,
          imported_by: profile?.id,
          status: 'processing'
        })
        .select()
        .single();

      if (logError) throw logError;

      const importResults: ImportResult[] = [];
      let successCount = 0;
      let failCount = 0;

      // Process each row
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNumber = i + 2;

        try {
          // Validate row
          const validation = validateRow(row);
          if (!validation.valid) {
            throw new Error(validation.error);
          }

          // Check if member exists
          const { data: member, error: memberError } = await supabase
            .from('members')
            .select('id')
            .eq('id', row.member_id.trim())
            .single();

          if (memberError || !member) {
            throw new Error('Member not found');
          }

          // Check if member is registered for trip
          const { data: registration } = await supabase
            .from('trip_registrations')
            .select('id')
            .eq('trip_id', selectedTripId)
            .eq('member_id', row.member_id.trim())
            .single();

          if (!registration) {
            throw new Error('Member not registered for this trip');
          }

          // Upsert trip assignment
          const { error: assignmentError } = await supabase
            .from('trip_assignments')
            .upsert({
              trip_id: selectedTripId,
              member_id: row.member_id.trim(),
              room_number: row.room_number?.trim() || null,
              bus_seat_number: row.bus_seat_number?.trim() || null,
              train_seat_number: row.train_seat_number?.trim() || null,
              pnr_number: row.pnr_number?.trim() || null,
              flight_ticket_number: row.flight_ticket_number?.trim() || null,
              additional_notes: row.additional_notes?.trim() || null
            }, {
              onConflict: 'trip_id,member_id'
            });

          if (assignmentError) throw assignmentError;

          importResults.push({
            row: rowNumber,
            data: row,
            status: 'success'
          });
          successCount++;

        } catch (error: any) {
          importResults.push({
            row: rowNumber,
            data: row,
            status: 'error',
            error: error.message
          });
          failCount++;
        }

        setProgress(Math.round(((i + 1) / jsonData.length) * 100));
      }

      // Update import log
      await supabase
        .from('import_logs')
        .update({
          successful_rows: successCount,
          failed_rows: failCount,
          status: failCount === 0 ? 'completed' : 'partial',
          completed_at: new Date().toISOString(),
          error_details: importResults.filter(r => r.status === 'error').map(r => ({
            row: r.row,
            error: r.error
          }))
        })
        .eq('id', importLog.id);

      setResults(importResults);
      setShowResults(true);

      queryClient.invalidateQueries({ queryKey: ['trip-assignments'] });

      toast({
        title: 'Import Completed',
        description: `Successfully imported ${successCount} allocations. ${failCount} failed.`,
        variant: failCount === 0 ? 'default' : 'destructive'
      });

    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  const getStatusIcon = (status: 'success' | 'error') => {
    return status === 'success' ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Trip Allocations from Excel
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file to bulk assign rooms, seats, and travel details
          </DialogDescription>
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Required column:</strong> member_id
                <br />
                <strong>Optional columns:</strong> room_number, bus_seat_number, train_seat_number, pnr_number, flight_ticket_number, additional_notes
                <br />
                <strong>Note:</strong> Members must be registered for the selected trip
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Trip *</Label>
                <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a trip" />
                  </SelectTrigger>
                  <SelectContent>
                    {trips.map((trip) => (
                      <SelectItem key={trip.id} value={trip.id}>
                        {trip.title} - {new Date(trip.start_date).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Button onClick={downloadTemplate} variant="outline" className="w-full" disabled={!selectedTripId}>
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
                  disabled={importing || !selectedTripId}
                />
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {file.name}
                  </p>
                )}
              </div>

              {importing && (
                <div className="space-y-2">
                  <Label>Import Progress</Label>
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-center text-muted-foreground">{progress}%</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {results.filter(r => r.status === 'success').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {results.filter(r => r.status === 'error').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{results.length}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead>Member ID</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Bus/Train</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{result.row}</TableCell>
                      <TableCell className="font-mono">{result.data.member_id}</TableCell>
                      <TableCell>{result.data.room_number || '-'}</TableCell>
                      <TableCell>
                        {result.data.bus_seat_number || result.data.train_seat_number || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
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
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={!file || !selectedTripId || importing}>
                {importing ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-pulse" />
                    Importing {progress}%
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Start Import
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => {
              setShowResults(false);
              setFile(null);
              setResults([]);
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
