import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, CheckCircle, XCircle, FileText, Download, Eye, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loading } from "@/components/ui/loading";
import { format } from "date-fns";

const DonationVerification = () => {
  const [donations, setDonations] = useState<any[]>([]);
  const [filteredDonations, setFilteredDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [generate80G, setGenerate80G] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchDonations();
  }, []);

  useEffect(() => {
    filterDonations();
  }, [searchTerm, donations, activeTab]);

  const fetchDonations = async () => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          members (
            id,
            full_name,
            email,
            phone,
            photo_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (error: any) {
      console.error('Error fetching donations:', error);
      toast({
        title: "Error",
        description: "Failed to load donations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterDonations = () => {
    let filtered = donations;

    // Filter by tab
    if (activeTab === "pending") {
      filtered = filtered.filter(d => d.status === 'pending');
    } else if (activeTab === "verified") {
      filtered = filtered.filter(d => d.status === 'verified');
    } else if (activeTab === "rejected") {
      filtered = filtered.filter(d => d.status === 'rejected');
    }

    // Filter by search
    if (searchTerm) {
      filtered = filtered.filter(d =>
        d.members?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.members?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.transaction_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDonations(filtered);
  };

  const handleVerifyDonation = async () => {
    if (!selectedDonation || !user) return;

    try {
      const { error } = await supabase.rpc('verify_donation', {
        p_donation_id: selectedDonation.id,
        p_verified_by: user.id,
        p_receipt_number: receiptNumber || null,
        p_generate_certificate: generate80G
      });

      if (error) throw error;

      toast({
        title: "Donation Verified",
        description: `Donation of ₹${selectedDonation.amount} has been verified successfully.`,
      });

      setIsVerifyDialogOpen(false);
      setSelectedDonation(null);
      setReceiptNumber("");
      setGenerate80G(true);
      fetchDonations();
    } catch (error: any) {
      console.error('Error verifying donation:', error);
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify donation",
        variant: "destructive",
      });
    }
  };

  const handleRejectDonation = async () => {
    if (!selectedDonation || !user || !rejectionReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Rejection reason is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.rpc('reject_donation', {
        p_donation_id: selectedDonation.id,
        p_rejected_by: user.id,
        p_rejection_reason: rejectionReason.trim()
      });

      if (error) throw error;

      toast({
        title: "Donation Rejected",
        description: "Donation has been rejected and member has been notified.",
      });

      setIsRejectDialogOpen(false);
      setSelectedDonation(null);
      setRejectionReason("");
      fetchDonations();
    } catch (error: any) {
      console.error('Error rejecting donation:', error);
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject donation",
        variant: "destructive",
      });
    }
  };

  const openVerifyDialog = (donation: any) => {
    setSelectedDonation(donation);
    setReceiptNumber("");
    setGenerate80G(true);
    setIsVerifyDialogOpen(true);
  };

  const openRejectDialog = (donation: any) => {
    setSelectedDonation(donation);
    setRejectionReason("");
    setIsRejectDialogOpen(true);
  };

  const openImageDialog = (donation: any) => {
    setSelectedDonation(donation);
    setIsImageDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: "outline", icon: Clock, label: "Pending" },
      verified: { variant: "default", icon: CheckCircle, label: "Verified" },
      rejected: { variant: "destructive", icon: XCircle, label: "Rejected" },
    };

    const { variant, icon: Icon, label } = config[status] || config.pending;

    return (
      <Badge variant={variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const getPendingCount = () => donations.filter(d => d.status === 'pending').length;
  const getVerifiedCount = () => donations.filter(d => d.status === 'verified').length;
  const getRejectedCount = () => donations.filter(d => d.status === 'rejected').length;

  const getTotalAmount = (status?: string) => {
    const filtered = status ? donations.filter(d => d.status === status) : donations;
    return filtered.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  };

  if (loading) {
    return (
      <AdminLayout title="Donation Verification">
        <div className="flex justify-center items-center h-64">
          <Loading size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Donation Verification">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Donation Verification</h2>
          <p className="text-muted-foreground">Review and verify member donation submissions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Pending Verification</div>
            <div className="text-2xl font-bold text-orange-600">{getPendingCount()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              ₹{getTotalAmount('pending').toLocaleString()}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Verified</div>
            <div className="text-2xl font-bold text-green-600">{getVerifiedCount()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              ₹{getTotalAmount('verified').toLocaleString()}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Rejected</div>
            <div className="text-2xl font-bold text-red-600">{getRejectedCount()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              ₹{getTotalAmount('rejected').toLocaleString()}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Donations</div>
            <div className="text-2xl font-bold text-blue-600">{donations.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              ₹{getTotalAmount().toLocaleString()}
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by member name, email, transaction ID, or receipt number..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending" className="relative">
              Pending Verification
              {getPendingCount() > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {getPendingCount()}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="verified">
              Verified ({getVerifiedCount()})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({getRejectedCount()})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({donations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === "pending" && "Pending Donations"}
                  {activeTab === "verified" && "Verified Donations"}
                  {activeTab === "rejected" && "Rejected Donations"}
                  {activeTab === "all" && "All Donations"}
                  {" "}({filteredDonations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeTab === "pending" && filteredDonations.length > 0 && (
                  <Alert className="mb-4">
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      {filteredDonations.length} donation{filteredDonations.length > 1 ? 's' : ''} awaiting verification
                    </AlertDescription>
                  </Alert>
                )}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Transaction Ref</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDonations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            No donations found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDonations.map((donation) => (
                          <TableRow key={donation.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {donation.members?.photo_url ? (
                                  <img
                                    src={donation.members.photo_url}
                                    alt={donation.members.full_name}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-xs font-medium">
                                      {donation.members?.full_name?.charAt(0)}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium">{donation.members?.full_name}</div>
                                  <div className="text-sm text-muted-foreground">{donation.members?.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-green-600">
                                ₹{parseFloat(donation.amount).toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{donation.purpose || 'General'}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {donation.transaction_reference ? (
                                  <div className="font-mono">{donation.transaction_reference}</div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                                {donation.screenshot_url && (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 h-auto"
                                    onClick={() => openImageDialog(donation)}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View Screenshot
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {format(new Date(donation.created_at), 'MMM dd, yyyy')}
                              </div>
                              {donation.receipt_number && (
                                <div className="text-xs text-muted-foreground font-mono">
                                  {donation.receipt_number}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(donation.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {donation.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => openVerifyDialog(donation)}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Verify
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => openRejectDialog(donation)}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {donation.status === 'verified' && donation.certificate_url && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(donation.certificate_url, '_blank')}
                                  >
                                    <FileText className="h-4 w-4 mr-1" />
                                    Certificate
                                  </Button>
                                )}
                                {donation.status === 'rejected' && donation.rejection_reason && (
                                  <div className="text-xs text-destructive max-w-xs">
                                    {donation.rejection_reason}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Verify Dialog */}
        <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verify Donation</DialogTitle>
              <DialogDescription>
                Confirm payment receipt and generate receipt for member
              </DialogDescription>
            </DialogHeader>
            {selectedDonation && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Donation Details:</p>
                  <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
                    <p><span className="font-medium">Member:</span> {selectedDonation.members?.full_name}</p>
                    <p><span className="font-medium">Amount:</span> ₹{parseFloat(selectedDonation.amount).toLocaleString()}</p>
                    <p><span className="font-medium">Purpose:</span> {selectedDonation.purpose || 'General'}</p>
                    {selectedDonation.transaction_reference && (
                      <p><span className="font-medium">Transaction Ref:</span> {selectedDonation.transaction_reference}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receipt-number">Receipt Number (Optional)</Label>
                  <Input
                    id="receipt-number"
                    placeholder="Auto-generated if left empty"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="generate-80g"
                    checked={generate80G}
                    onChange={(e) => setGenerate80G(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="generate-80g" className="cursor-pointer">
                    Generate 80G Tax Exemption Certificate
                  </Label>
                </div>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Member will receive a notification with receipt details and certificate (if enabled).
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVerifyDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleVerifyDonation} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify Donation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Donation</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejection. This will be shared with the member.
              </DialogDescription>
            </DialogHeader>
            {selectedDonation && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Donation: ₹{parseFloat(selectedDonation.amount).toLocaleString()} from {selectedDonation.members?.full_name}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="E.g., Payment not received, Screenshot unclear, Transaction mismatch..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                  />
                </div>
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Member will be notified with this reason.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRejectDonation}
                variant="destructive"
                disabled={!rejectionReason.trim()}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Donation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Screenshot Dialog */}
        <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Payment Screenshot</DialogTitle>
              <DialogDescription>
                Screenshot uploaded by {selectedDonation?.members?.full_name}
              </DialogDescription>
            </DialogHeader>
            {selectedDonation?.screenshot_url && (
              <div className="space-y-4">
                <img
                  src={selectedDonation.screenshot_url}
                  alt="Payment Screenshot"
                  className="w-full rounded-lg border"
                />
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedDonation.screenshot_url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Full Size
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default DonationVerification;
