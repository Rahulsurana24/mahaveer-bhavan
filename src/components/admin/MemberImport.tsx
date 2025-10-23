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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import * as XLSX from 'xlsx';

interface MemberImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportRow {
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  membership_type: string;
  address: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

interface ImportResult {
  row: number;
  data: ImportRow;
  status: 'success' | 'error';
  error?: string;
  memberId?: string;
}

export function MemberImport({ open, onOpenChange }: MemberImportProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const downloadTemplate = () => {
    const template = [
      {
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+911234567890',
        date_of_birth: '1990-01-15',
        gender: 'male',
        membership_type: 'regular',
        address: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        postal_code: '400001',
        country: 'India'
      },
      {
        full_name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '+919876543210',
        date_of_birth: '1985-05-20',
        gender: 'female',
        membership_type: 'premium',
        address: '456 Park Avenue',
        city: 'Delhi',
        state: 'Delhi',
        postal_code: '110001',
        country: 'India'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    XLSX.writeFile(wb, 'member_import_template.xlsx');

    toast({
      title: 'Template Downloaded',
      description: 'Use this template to prepare your member data',
    });
  };

  const generateMemberId = async (membershipType: string): Promise<string> => {
    const prefix = membershipType === 'premium' ? 'P' : membershipType === 'regular' ? 'R' : 'H';
    const { data, error } = await supabase
      .from('members')
      .select('id')
      .ilike('id', `${prefix}%`)
      .order('id', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return `${prefix}00001`;
    }

    const lastId = data[0].id;
    const lastNumber = parseInt(lastId.substring(1));
    const nextNumber = lastNumber + 1;
    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
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

  const validateRow = (row: any, index: number): { valid: boolean; error?: string } => {
    if (!row.full_name || typeof row.full_name !== 'string' || row.full_name.trim() === '') {
      return { valid: false, error: 'Full name is required' };
    }

    if (!row.email || typeof row.email !== 'string' || !row.email.includes('@')) {
      return { valid: false, error: 'Valid email is required' };
    }

    if (!row.phone || typeof row.phone !== 'string' || row.phone.trim() === '') {
      return { valid: false, error: 'Phone number is required' };
    }

    if (!row.date_of_birth || typeof row.date_of_birth !== 'string') {
      return { valid: false, error: 'Date of birth is required' };
    }

    if (!row.gender || !['male', 'female', 'other'].includes(row.gender)) {
      return { valid: false, error: 'Gender must be male, female, or other' };
    }

    if (!row.membership_type || !['regular', 'premium', 'honorary'].includes(row.membership_type)) {
      return { valid: false, error: 'Membership type must be regular, premium, or honorary' };
    }

    if (!row.address || typeof row.address !== 'string' || row.address.trim() === '') {
      return { valid: false, error: 'Address is required' };
    }

    return { valid: true };
  };

  const handleImport = async () => {
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
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ImportRow[];

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
          import_type: 'members',
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
        const rowNumber = i + 2; // Excel row number (1-indexed + header row)

        try {
          // Validate row
          const validation = validateRow(row, i);
          if (!validation.valid) {
            throw new Error(validation.error);
          }

          // Check if email already exists
          const { data: existingMember } = await supabase
            .from('members')
            .select('id')
            .eq('email', row.email)
            .single();

          if (existingMember) {
            throw new Error('Email already exists');
          }

          // Generate member ID
          const memberId = await generateMemberId(row.membership_type);

          // Insert member
          const { error: insertError } = await supabase
            .from('members')
            .insert({
              id: memberId,
              full_name: row.full_name.trim(),
              email: row.email.trim().toLowerCase(),
              phone: row.phone.trim(),
              date_of_birth: row.date_of_birth,
              gender: row.gender,
              membership_type: row.membership_type,
              address: row.address.trim(),
              city: row.city?.trim() || '',
              state: row.state?.trim() || '',
              postal_code: row.postal_code?.trim() || '',
              country: row.country?.trim() || 'India',
              status: 'active',
              photo_url: '/placeholder.svg',
              emergency_contact: {}
            });

          if (insertError) throw insertError;

          importResults.push({
            row: rowNumber,
            data: row,
            status: 'success',
            memberId
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

      queryClient.invalidateQueries({ queryKey: ['members'] });

      toast({
        title: 'Import Completed',
        description: `Successfully imported ${successCount} members. ${failCount} failed.`,
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
            Import Members from Excel
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file to bulk import member data
          </DialogDescription>
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Required columns:</strong> full_name, email, phone, date_of_birth, gender, membership_type, address
                <br />
                <strong>Optional columns:</strong> city, state, postal_code, country
                <br />
                <strong>Membership types:</strong> regular, premium, honorary
                <br />
                <strong>Gender values:</strong> male, female, other
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
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
                  disabled={importing}
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
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Member ID / Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{result.row}</TableCell>
                      <TableCell>{result.data.full_name}</TableCell>
                      <TableCell>{result.data.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                            {result.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {result.status === 'success' ? result.memberId : result.error}
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
              <Button onClick={handleImport} disabled={!file || importing}>
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
