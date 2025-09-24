import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DollarSign, 
  Heart, 
  Gift, 
  CreditCard,
  Receipt,
  Download,
  Calendar,
  Target,
  Repeat
} from "lucide-react";

const Donations = () => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);

  const quickAmounts = [100, 500, 1000, 2000, 5000, 10000];
  
  const purposes = [
    { value: "general", label: "General Donation", icon: Heart },
    { value: "temple", label: "Temple Maintenance", icon: Gift },
    { value: "charity", label: "Charity Activities", icon: Target },
    { value: "education", label: "Education Programs", icon: Calendar }
  ];

  const donationHistory = [
    {
      id: "DON-001",
      amount: 5000,
      purpose: "General Donation",
      date: "2024-01-10",
      method: "UPI",
      status: "completed",
      receiptNumber: "REC-2024-001"
    },
    {
      id: "DON-002",
      amount: 2500,
      purpose: "Temple Maintenance",
      date: "2024-01-05",
      method: "Credit Card",
      status: "completed",
      receiptNumber: "REC-2024-002"
    },
    {
      id: "DON-003",
      amount: 1000,
      purpose: "Charity Activities",
      date: "2023-12-28",
      method: "Bank Transfer",
      status: "completed",
      receiptNumber: "REC-2023-156"
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "completed": "default",
      "pending": "secondary",
      "failed": "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const totalAmount = selectedAmount || parseInt(customAmount) || 0;

  return (
    <MainLayout title="Donations">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Support Our Mission</h1>
          <p className="text-muted-foreground">
            Your generous donations help us serve the community and maintain our sacred spaces
          </p>
        </div>

        <Tabs defaultValue="donate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="donate">Make Donation</TabsTrigger>
            <TabsTrigger value="history">Donation History</TabsTrigger>
            <TabsTrigger value="recurring">Recurring Donations</TabsTrigger>
          </TabsList>

          {/* Make Donation */}
          <TabsContent value="donate" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Donation Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Donation Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Quick Amount Selection */}
                  <div className="space-y-3">
                    <Label>Select Amount (₹)</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {quickAmounts.map((amount) => (
                        <Button
                          key={amount}
                          variant={selectedAmount === amount ? "default" : "outline"}
                          onClick={() => {
                            setSelectedAmount(amount);
                            setCustomAmount("");
                          }}
                        >
                          ₹{amount.toLocaleString()}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Amount */}
                  <div className="space-y-2">
                    <Label>Or enter custom amount</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount in ₹"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setSelectedAmount(null);
                      }}
                    />
                  </div>

                  {/* Purpose Selection */}
                  <div className="space-y-3">
                    <Label>Donation Purpose</Label>
                    <div className="grid grid-cols-1 gap-3">
                      {purposes.map((purpose) => {
                        const Icon = purpose.icon;
                        return (
                          <Button key={purpose.value} variant="outline" className="justify-start h-auto p-4">
                            <Icon className="h-5 w-5 mr-3" />
                            <div className="text-left">
                              <div className="font-medium">{purpose.label}</div>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recurring Donation */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Repeat className="h-5 w-5" />
                      <div>
                        <Label>Make this a recurring donation</Label>
                        <p className="text-sm text-muted-foreground">Automatically donate monthly</p>
                      </div>
                    </div>
                    <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea 
                      placeholder="Add any special message or dedication..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Amount Summary */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span>Donation Amount</span>
                      <span className="font-bold text-2xl">₹{totalAmount.toLocaleString()}</span>
                    </div>
                    {isRecurring && (
                      <p className="text-sm text-muted-foreground">Monthly recurring donation</p>
                    )}
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-3">
                    <Label>Payment Method</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Credit/Debit Card</SelectItem>
                        <SelectItem value="netbanking">Net Banking</SelectItem>
                        <SelectItem value="wallet">Digital Wallet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email for Receipt</Label>
                      <Input type="email" placeholder="your@email.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input type="tel" placeholder="+91 99999 99999" />
                    </div>
                  </div>

                  {/* Donate Button */}
                  <Button 
                    className="w-full" 
                    size="lg"
                    disabled={totalAmount === 0}
                  >
                    Donate ₹{totalAmount.toLocaleString()}
                  </Button>

                  {/* Tax Benefits */}
                  <div className="text-sm text-muted-foreground text-center space-y-1">
                    <p>🏆 Your donation is eligible for 80G tax benefits</p>
                    <p>📧 Receipt will be sent to your email automatically</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Donation History */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Your Donation History</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download All Receipts
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {donationHistory.map((donation) => (
                      <TableRow key={donation.id}>
                        <TableCell>{donation.date}</TableCell>
                        <TableCell className="font-medium">₹{donation.amount.toLocaleString()}</TableCell>
                        <TableCell>{donation.purpose}</TableCell>
                        <TableCell>{donation.method}</TableCell>
                        <TableCell>{getStatusBadge(donation.status)}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Receipt className="h-4 w-4 mr-2" />
                            {donation.receiptNumber}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Donated</p>
                      <p className="text-2xl font-bold">₹8,500</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Donations Made</p>
                      <p className="text-2xl font-bold">3</p>
                    </div>
                    <Gift className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tax Savings</p>
                      <p className="text-2xl font-bold">₹2,550</p>
                    </div>
                    <Receipt className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Recurring Donations */}
          <TabsContent value="recurring" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Repeat className="h-5 w-5" />
                  Recurring Donations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Repeat className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Recurring Donations</h3>
                  <p className="text-muted-foreground mb-4">
                    Set up a recurring donation to support our mission consistently
                  </p>
                  <Button>Set Up Recurring Donation</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Donations;