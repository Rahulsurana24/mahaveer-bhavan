import { useState, useEffect } from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Heart,
  Download,
  Receipt,
  Repeat,
  Shield,
  CheckCircle,
  Edit2,
  Pause,
  X,
  ChevronRight,
  Calendar,
  FileText,
  TrendingUp,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMemberData } from "@/hooks/useMemberData";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loading } from "@/components/ui/loading";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Donations = () => {
  const { member } = useMemberData();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedPurpose, setSelectedPurpose] = useState("general");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState("monthly");
  const [notes, setNotes] = useState("");
  const [filterYear, setFilterYear] = useState("all");

  // Predefined amounts
  const quickAmounts = [501, 1001, 2001, 5001, 10001, 25001];

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Fetch donation purposes
  const { data: purposes } = useQuery({
    queryKey: ['donation-purposes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donation_purposes')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data || [
        { id: 'general', name: 'General Donation', description: 'Support overall trust activities' },
        { id: 'education', name: 'Education Fund', description: 'Support educational programs' },
        { id: 'trips', name: 'Trip Subsidies', description: 'Help members attend trips' },
        { id: 'events', name: 'Event Sponsorship', description: 'Sponsor community events' }
      ];
    }
  });

  // Fetch donation history
  const { data: donations, isLoading: loadingHistory } = useQuery({
    queryKey: ['donations', member?.id, filterYear],
    queryFn: async () => {
      if (!member) return [];

      let query = supabase
        .from('donations')
        .select('*')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false });

      if (filterYear !== 'all') {
        const year = parseInt(filterYear);
        query = query
          .gte('created_at', `${year}-01-01`)
          .lt('created_at', `${year + 1}-01-01`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!member
  });

  // Fetch recurring donations
  const { data: recurringDonations } = useQuery({
    queryKey: ['recurring-donations', member?.id],
    queryFn: async () => {
      if (!member) return [];

      const { data, error } = await supabase
        .from('recurring_donations')
        .select('*')
        .eq('member_id', member.id)
        .in('status', ['active', 'paused'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!member
  });

  // Fetch Razorpay keys from settings
  const { data: razorpaySettings } = useQuery({
    queryKey: ['razorpay-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .in('setting_key', ['razorpay_key_id', 'razorpay_key_secret'])
        .limit(2);

      if (error) throw error;

      const keyId = data.find(s => s.setting_key === 'razorpay_key_id')?.setting_value;
      return { keyId };
    }
  });

  // Calculate totals
  const totalDonated = donations?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
  const donationCount = donations?.length || 0;
  const taxSavings = Math.floor(totalDonated * 0.30); // 30% tax savings under 80G

  const totalAmount = selectedAmount || parseInt(customAmount) || 0;

  // Donation mutation
  const donateMutation = useMutation({
    mutationFn: async ({ amount, purpose, isRecurring, frequency, notes }: any) => {
      if (!member) throw new Error('Not authenticated');

      // Create donation record
      const { data: donation, error } = await supabase
        .from('donations')
        .insert({
          member_id: member.id,
          amount,
          purpose,
          notes,
          status: 'pending',
          payment_method: 'razorpay'
        })
        .select()
        .single();

      if (error) throw error;

      // If recurring, create recurring donation record
      if (isRecurring) {
        const { error: recurringError } = await supabase
          .from('recurring_donations')
          .insert({
            member_id: member.id,
            amount,
            frequency,
            purpose,
            status: 'active',
            next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
          });

        if (recurringError) throw recurringError;
      }

      return donation;
    },
    onSuccess: (donation) => {
      initializeRazorpay(donation);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process donation",
        variant: "destructive"
      });
    }
  });

  const initializeRazorpay = (donation: any) => {
    if (!razorpaySettings?.keyId) {
      toast({
        title: "Error",
        description: "Payment gateway not configured",
        variant: "destructive"
      });
      return;
    }

    const options = {
      key: razorpaySettings.keyId,
      amount: donation.amount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      name: 'Sree Mahaveer Swami Charitable Trust',
      description: `Donation - ${purposes?.find(p => p.id === donation.purpose)?.name}`,
      order_id: donation.id,
      handler: async function (response: any) {
        // Update donation status
        await supabase
          .from('donations')
          .update({
            status: 'completed',
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            completed_at: new Date().toISOString()
          })
          .eq('id', donation.id);

        queryClient.invalidateQueries({ queryKey: ['donations'] });
        queryClient.invalidateQueries({ queryKey: ['recurring-donations'] });

        toast({
          title: "Donation Successful!",
          description: "Thank you for your generous contribution",
        });

        // Reset form
        setSelectedAmount(null);
        setCustomAmount("");
        setNotes("");
      },
      prefill: {
        name: member?.full_name,
        email: member?.email,
        contact: member?.phone
      },
      theme: {
        color: '#00A36C'
      }
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  const handleDonate = () => {
    if (totalAmount === 0) {
      toast({
        title: "Invalid Amount",
        description: "Please select or enter an amount",
        variant: "destructive"
      });
      return;
    }

    donateMutation.mutate({
      amount: totalAmount,
      purpose: selectedPurpose,
      isRecurring,
      frequency: recurringFrequency,
      notes
    });
  };

  const downloadReceipt = (donation: any) => {
    const pdf = new jsPDF();

    // Header
    pdf.setFontSize(20);
    pdf.setTextColor(0, 163, 108);
    pdf.text('Sree Mahaveer Swami Charitable Trust', 105, 20, { align: 'center' });

    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Donation Receipt', 105, 35, { align: 'center' });

    // Receipt details
    pdf.setFontSize(12);
    pdf.text(`Receipt Number: ${donation.receipt_number || donation.id?.slice(0, 8)}`, 20, 55);
    pdf.text(`Date: ${new Date(donation.created_at).toLocaleDateString()}`, 20, 65);
    pdf.text(`Donor Name: ${member?.full_name}`, 20, 75);
    pdf.text(`Member ID: ${member?.id?.slice(0, 8)}`, 20, 85);
    pdf.text(`Amount: ₹${donation.amount.toLocaleString()}`, 20, 95);
    pdf.text(`Purpose: ${purposes?.find(p => p.id === donation.purpose)?.name || 'General'}`, 20, 105);
    pdf.text(`Payment Method: ${donation.payment_method || 'Razorpay'}`, 20, 115);

    // Tax info
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text('This donation is eligible for 80G tax deduction', 20, 135);

    // Footer
    pdf.setFontSize(8);
    pdf.text('Generated digitally - No signature required', 105, 280, { align: 'center' });

    pdf.save(`receipt-${donation.id?.slice(0, 8)}.pdf`);

    toast({
      title: "Receipt Downloaded",
      description: "Your donation receipt has been saved",
    });
  };

  // Pause/Resume recurring donation
  const toggleRecurringMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase
        .from('recurring_donations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-donations'] });
      toast({
        title: "Updated",
        description: "Recurring donation status updated",
      });
    }
  });

  return (
    <MobileLayout title="Donations">
      <div className="min-h-screen bg-[#1C1C1C]">
        <Tabs defaultValue="donate" className="w-full">
          <TabsList className="w-full bg-gradient-to-r from-[#252525] to-[#1C1C1C] border-b border-white/10 rounded-none h-14 px-4">
            <TabsTrigger
              value="donate"
              className="flex-1 data-[state=active]:bg-[#00A36C] data-[state=active]:text-white"
            >
              <Heart className="h-4 w-4 mr-2" />
              Donate
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1 data-[state=active]:bg-[#00A36C] data-[state=active]:text-white"
            >
              <Receipt className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger
              value="recurring"
              className="flex-1 data-[state=active]:bg-[#00A36C] data-[state=active]:text-white"
            >
              <Repeat className="h-4 w-4 mr-2" />
              Recurring
            </TabsTrigger>
          </TabsList>

          {/* Make Donation Tab */}
          <TabsContent value="donate" className="px-4 py-6 space-y-6">
            {/* Info Banner */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-gradient-to-r from-[#00A36C]/20 to-[#B8860B]/20 border-[#00A36C]/30">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Shield className="h-5 w-5 text-[#00A36C] flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-white font-semibold text-sm mb-1">Secure Donation</h3>
                      <p className="text-gray-300 text-xs leading-relaxed">
                        Your contribution supports our community. All transactions are secure and eligible for 80G tax benefits.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Amount Selection */}
            <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#B8860B]" />
                  Select Amount
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {quickAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant={selectedAmount === amount ? "default" : "outline"}
                      onClick={() => {
                        setSelectedAmount(amount);
                        setCustomAmount("");
                      }}
                      className={cn(
                        "h-16 flex flex-col items-center justify-center",
                        selectedAmount === amount
                          ? "bg-gradient-to-r from-[#00A36C] to-[#008556] text-white border-[#00A36C]"
                          : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                      )}
                    >
                      <span className="text-lg font-bold">₹{amount.toLocaleString()}</span>
                    </Button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-400 text-sm">Custom Amount (₹)</Label>
                  <Input
                    type="number"
                    placeholder="Enter custom amount"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedAmount(null);
                    }}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-lg h-14"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Purpose Selection */}
            <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Heart className="h-5 w-5 text-[#B8860B]" />
                  Donation Purpose
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedPurpose} onValueChange={setSelectedPurpose}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#252525] border-white/10">
                    {purposes?.map((purpose) => (
                      <SelectItem key={purpose.id} value={purpose.id} className="text-white">
                        {purpose.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-gray-400 text-xs mt-2">
                  {purposes?.find(p => p.id === selectedPurpose)?.description}
                </p>
              </CardContent>
            </Card>

            {/* Recurring Option */}
            <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Repeat className="h-5 w-5 text-[#B8860B]" />
                    <div>
                      <Label className="text-white text-sm font-semibold">Recurring Donation</Label>
                      <p className="text-gray-400 text-xs">Set up automatic payments</p>
                    </div>
                  </div>
                  <Switch
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                    className="data-[state=checked]:bg-[#00A36C]"
                  />
                </div>

                {isRecurring && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Select value={recurringFrequency} onValueChange={setRecurringFrequency}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#252525] border-white/10">
                        <SelectItem value="monthly" className="text-white">Monthly</SelectItem>
                        <SelectItem value="quarterly" className="text-white">Quarterly</SelectItem>
                        <SelectItem value="yearly" className="text-white">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
              <CardContent className="p-4 space-y-2">
                <Label className="text-gray-400 text-sm">Notes (Optional)</Label>
                <Textarea
                  placeholder="Add a message or dedication..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 resize-none"
                />
              </CardContent>
            </Card>

            {/* Amount Summary */}
            {totalAmount > 0 && (
              <Card className="bg-gradient-to-r from-[#00A36C]/20 to-[#B8860B]/20 border-[#00A36C]/30">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-gray-300 text-sm">Total Amount</span>
                      {isRecurring && (
                        <p className="text-gray-400 text-xs">
                          {recurringFrequency.charAt(0).toUpperCase() + recurringFrequency.slice(1)} payment
                        </p>
                      )}
                    </div>
                    <span className="text-3xl font-bold text-white">₹{totalAmount.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Donate Button */}
            <Button
              onClick={handleDonate}
              disabled={totalAmount === 0 || donateMutation.isPending}
              className="w-full bg-gradient-to-r from-[#00A36C] to-[#008556] hover:from-[#008556] hover:to-[#00A36C] text-white font-bold h-14 text-lg"
              size="lg"
            >
              {donateMutation.isPending ? (
                <>
                  <Loading size="sm" />
                  <span className="ml-2">Processing...</span>
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5 mr-2" />
                  Proceed to Secure Payment
                </>
              )}
            </Button>

            {/* Tax Info */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-3">
                <div className="flex items-start gap-2 text-xs text-gray-400">
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#00A36C]" />
                  <div className="space-y-1">
                    <p>✅ Eligible for 80G tax deduction (30% tax savings)</p>
                    <p>📧 Digital receipt sent automatically</p>
                    <p>🔒 Secured by Razorpay payment gateway</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Donation History Tab */}
          <TabsContent value="history" className="px-4 py-6 space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-4 text-center">
                  <div className="h-10 w-10 rounded-full bg-[#00A36C]/20 mx-auto mb-2 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-[#00A36C]" />
                  </div>
                  <p className="text-xl font-bold text-white">₹{totalDonated.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">Total</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-4 text-center">
                  <div className="h-10 w-10 rounded-full bg-[#B8860B]/20 mx-auto mb-2 flex items-center justify-center">
                    <Heart className="h-5 w-5 text-[#B8860B]" />
                  </div>
                  <p className="text-xl font-bold text-white">{donationCount}</p>
                  <p className="text-xs text-gray-400">Donations</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-4 text-center">
                  <div className="h-10 w-10 rounded-full bg-[#00A36C]/20 mx-auto mb-2 flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-[#00A36C]" />
                  </div>
                  <p className="text-xl font-bold text-white">₹{taxSavings.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">Tax Saved</p>
                </CardContent>
              </Card>
            </div>

            {/* Filter */}
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Filter by year" />
              </SelectTrigger>
              <SelectContent className="bg-[#252525] border-white/10">
                <SelectItem value="all" className="text-white">All Time</SelectItem>
                <SelectItem value="2024" className="text-white">2024</SelectItem>
                <SelectItem value="2023" className="text-white">2023</SelectItem>
              </SelectContent>
            </Select>

            {/* Donation List */}
            {loadingHistory ? (
              <div className="flex justify-center py-12">
                <Loading size="lg" />
              </div>
            ) : donations && donations.length > 0 ? (
              <div className="space-y-3">
                {donations.map((donation) => (
                  <Card key={donation.id} className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-white font-bold text-lg">₹{donation.amount.toLocaleString()}</h3>
                          <p className="text-gray-400 text-sm">{purposes?.find(p => p.id === donation.purpose)?.name || 'General'}</p>
                        </div>
                        <Badge className={cn(
                          "text-xs",
                          donation.status === 'completed'
                            ? "bg-[#00A36C]/20 text-[#00A36C] border border-[#00A36C]/30"
                            : donation.status === 'pending'
                            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        )}>
                          {donation.status}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(donation.created_at).toLocaleDateString()}
                        </span>
                        <span>{donation.payment_method || 'Razorpay'}</span>
                      </div>

                      {donation.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadReceipt(donation)}
                          className="w-full bg-white/5 border-white/10 text-[#B8860B] hover:bg-white/10"
                        >
                          <Download className="h-3 w-3 mr-2" />
                          Download Receipt
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-12 text-center">
                  <Receipt className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-white font-semibold text-lg mb-2">No Donations Yet</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Your contribution history will appear here
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Recurring Donations Tab */}
          <TabsContent value="recurring" className="px-4 py-6 space-y-6">
            {recurringDonations && recurringDonations.length > 0 ? (
              <div className="space-y-4">
                {recurringDonations.map((recurring) => (
                  <Card key={recurring.id} className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-white font-bold text-xl mb-1">
                            ₹{recurring.amount.toLocaleString()}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            {purposes?.find(p => p.id === recurring.purpose)?.name || 'General'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className="bg-[#B8860B]/20 text-[#B8860B] border border-[#B8860B]/30 text-xs">
                              {recurring.frequency}
                            </Badge>
                            <Badge className={cn(
                              "text-xs",
                              recurring.status === 'active'
                                ? "bg-[#00A36C]/20 text-[#00A36C] border border-[#00A36C]/30"
                                : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                            )}>
                              {recurring.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Next Payment:</span>
                          <span className="text-white font-medium">
                            {new Date(recurring.next_payment_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleRecurringMutation.mutate({
                            id: recurring.id,
                            newStatus: recurring.status === 'active' ? 'paused' : 'active'
                          })}
                          className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                        >
                          {recurring.status === 'active' ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" />
                              Pause
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Resume
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleRecurringMutation.mutate({
                            id: recurring.id,
                            newStatus: 'cancelled'
                          })}
                          className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-12 text-center">
                  <Repeat className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-white font-semibold text-lg mb-2">No Recurring Donations</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Set up automatic monthly donations to support consistently
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default Donations;
