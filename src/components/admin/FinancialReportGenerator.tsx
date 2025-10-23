import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Table as TableIcon, Loader2 } from 'lucide-react';

interface ReportGeneratorProps {
  children?: React.ReactNode;
}

export function FinancialReportGenerator({ children }: ReportGeneratorProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [includeOptions, setIncludeOptions] = useState({
    donations: true,
    eventFees: true,
    tripFees: true,
    summary: true,
    donorList: false
  });

  const handleGenerateCSV = async () => {
    if (!startDate || !endDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select both start and end dates',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Fetch data based on selected options
      const allData: any[] = [];

      // Fetch donations
      if (includeOptions.donations) {
        const { data: donations, error } = await supabase
          .from('donations')
          .select(`
            *,
            members(full_name, email)
          `)
          .gte('created_at', startDate)
          .lte('created_at', `${endDate}T23:59:59`)
          .eq('status', 'completed')
          .order('created_at', { ascending: true });

        if (error) throw error;

        donations?.forEach((d) => {
          allData.push({
            Type: 'Donation',
            Date: new Date(d.created_at).toLocaleDateString(),
            Donor: d.members?.full_name || 'Anonymous',
            Email: d.members?.email || '',
            Amount: d.amount,
            Method: d.payment_method,
            Purpose: d.purpose || 'General',
            Receipt: d.receipt_number || '',
            Status: d.status
          });
        });
      }

      // Fetch event registrations with fees
      if (includeOptions.eventFees) {
        const { data: eventRegs, error } = await supabase
          .from('event_registrations')
          .select(`
            *,
            members(full_name, email),
            events(title)
          `)
          .gte('registered_at', startDate)
          .lte('registered_at', `${endDate}T23:59:59`)
          .eq('payment_status', 'completed')
          .order('registered_at', { ascending: true });

        if (error) throw error;

        eventRegs?.forEach((r) => {
          if (r.amount_paid && r.amount_paid > 0) {
            allData.push({
              Type: 'Event Fee',
              Date: new Date(r.registered_at).toLocaleDateString(),
              Donor: r.members?.full_name || 'Unknown',
              Email: r.members?.email || '',
              Amount: r.amount_paid,
              Method: 'Event Registration',
              Purpose: `Event: ${r.events?.title || 'Unknown'}`,
              Receipt: '',
              Status: r.payment_status
            });
          }
        });
      }

      // Fetch trip registrations with fees
      if (includeOptions.tripFees) {
        const { data: tripRegs, error } = await supabase
          .from('trip_registrations')
          .select(`
            *,
            members(full_name, email),
            trips(title)
          `)
          .gte('registered_at', startDate)
          .lte('registered_at', `${endDate}T23:59:59`)
          .eq('payment_status', 'completed')
          .order('registered_at', { ascending: true });

        if (error) throw error;

        tripRegs?.forEach((r) => {
          if (r.amount_paid && r.amount_paid > 0) {
            allData.push({
              Type: 'Trip Fee',
              Date: new Date(r.registered_at).toLocaleDateString(),
              Donor: r.members?.full_name || 'Unknown',
              Email: r.members?.email || '',
              Amount: r.amount_paid,
              Method: 'Trip Registration',
              Purpose: `Trip: ${r.trips?.title || 'Unknown'}`,
              Receipt: '',
              Status: r.payment_status
            });
          }
        });
      }

      if (allData.length === 0) {
        toast({
          title: 'No Data',
          description: 'No financial records found for the selected date range',
          variant: 'destructive',
        });
        return;
      }

      // Generate CSV
      const headers = Object.keys(allData[0]).join(',');
      const rows = allData.map(row =>
        Object.values(row).map(val =>
          typeof val === 'string' && val.includes(',') ? `"${val}"` : val
        ).join(',')
      );
      const csv = [headers, ...rows].join('\n');

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: `Financial report generated with ${allData.length} records`,
      });

      setOpen(false);
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate financial report',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleOption = (option: keyof typeof includeOptions) => {
    setIncludeOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  // Calculate total if summary is included
  const totalAmount = includeOptions.summary ? 0 : 0; // Would be calculated from data

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Financial Report</DialogTitle>
          <DialogDescription>
            Export financial data as CSV for the selected date range
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Include Options */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Include in Report</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="donations"
                checked={includeOptions.donations}
                onCheckedChange={() => handleToggleOption('donations')}
              />
              <Label htmlFor="donations" className="font-normal cursor-pointer">
                Donations
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="eventFees"
                checked={includeOptions.eventFees}
                onCheckedChange={() => handleToggleOption('eventFees')}
              />
              <Label htmlFor="eventFees" className="font-normal cursor-pointer">
                Event Registration Fees
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="tripFees"
                checked={includeOptions.tripFees}
                onCheckedChange={() => handleToggleOption('tripFees')}
              />
              <Label htmlFor="tripFees" className="font-normal cursor-pointer">
                Trip Registration Fees
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="summary"
                checked={includeOptions.summary}
                onCheckedChange={() => handleToggleOption('summary')}
              />
              <Label htmlFor="summary" className="font-normal cursor-pointer">
                Include Summary Statistics
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="donorList"
                checked={includeOptions.donorList}
                onCheckedChange={() => handleToggleOption('donorList')}
              />
              <Label htmlFor="donorList" className="font-normal cursor-pointer">
                Include Donor Contact Information
              </Label>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateCSV} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <TableIcon className="h-4 w-4 mr-2" />
                  Generate CSV
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
