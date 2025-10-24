import { useState } from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Heart, 
  Gift, 
  Receipt,
  Download,
  Target,
  Repeat,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

const Donations = () => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [activeTab, setActiveTab] = useState("donate");
  
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

  const totalAmount = selectedAmount || parseInt(customAmount) || 0;

  return (
    <MobileLayout title="Donations">
      <div className="space-y-4">
        {/* Pill Tabs */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-b">
          {[
            { value: "donate", label: "Donate" },
            { value: "history", label: "History" },
            { value: "recurring", label: "Recurring" }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeTab === tab.value
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Make Donation Tab */}
        {activeTab === "donate" && (
          <div className="px-4 space-y-4 pb-4">
            <div className="text-center py-2">
              <p className="text-sm text-gray-600">
                Support our mission and community
              </p>
            </div>

            {/* Quick Amount Selection */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <Label>Select Amount (₹)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant={selectedAmount === amount ? "default" : "outline"}
                      onClick={() => {
                        setSelectedAmount(amount);
                        setCustomAmount("");
                      }}
                      size="sm"
                    >
                      ₹{amount.toLocaleString()}
                    </Button>
                  ))}
                </div>

                {/* Custom Amount */}
                <div className="space-y-2">
                  <Label>Or custom amount</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedAmount(null);
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Purpose Selection */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <Label>Donation Purpose</Label>
                <div className="grid grid-cols-1 gap-2">
                  {purposes.map((purpose) => {
                    const Icon = purpose.icon;
                    return (
                      <Button key={purpose.value} variant="outline" className="justify-start h-auto p-3" size="sm">
                        <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="text-sm">{purpose.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recurring Option */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-primary" />
                    <div>
                      <Label className="text-sm">Recurring donation</Label>
                      <p className="text-xs text-gray-500">Monthly automatic</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsRecurring(!isRecurring)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      isRecurring ? "bg-primary" : "bg-gray-200"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        isRecurring ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea 
                  placeholder="Add message or dedication..."
                  rows={3}
                  className="text-sm"
                />
              </CardContent>
            </Card>

            {/* Amount Summary */}
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Amount</span>
                  <span className="text-2xl font-bold text-primary">₹{totalAmount.toLocaleString()}</span>
                </div>
                {isRecurring && (
                  <p className="text-xs text-gray-600 mt-1">Monthly recurring</p>
                )}
              </CardContent>
            </Card>

            {/* Donate Button */}
            <Button 
              className="w-full" 
              size="lg"
              disabled={totalAmount === 0}
            >
              Donate ₹{totalAmount.toLocaleString()}
            </Button>

            {/* Tax Info */}
            <div className="text-xs text-gray-500 text-center space-y-1 pb-2">
              <p>🏆 Eligible for 80G tax benefits</p>
              <p>📧 Receipt sent automatically</p>
            </div>
          </div>
        )}

        {/* Donation History Tab */}
        {activeTab === "history" && (
          <div className="px-4 space-y-4 pb-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <DollarSign className="h-6 w-6 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">₹8,500</p>
                  <p className="text-xs text-gray-500">Total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Gift className="h-6 w-6 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">3</p>
                  <p className="text-xs text-gray-500">Donations</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Receipt className="h-6 w-6 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">₹2,550</p>
                  <p className="text-xs text-gray-500">Tax Saved</p>
                </CardContent>
              </Card>
            </div>

            {/* Donation List */}
            <div className="space-y-3">
              {donationHistory.map((donation) => (
                <Card key={donation.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base">₹{donation.amount.toLocaleString()}</h3>
                        <p className="text-sm text-gray-600">{donation.purpose}</p>
                      </div>
                      <Badge variant="default" className="text-xs">
                        {donation.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{donation.date}</span>
                      <span>{donation.method}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      <Receipt className="h-3 w-3 mr-2" />
                      {donation.receiptNumber}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button variant="outline" size="sm" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download All Receipts
            </Button>
          </div>
        )}

        {/* Recurring Donations Tab */}
        {activeTab === "recurring" && (
          <div className="px-4 pb-4">
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Repeat className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recurring Donations</h3>
              <p className="text-sm text-gray-500 text-center mb-4">
                Set up a recurring donation to support consistently
              </p>
              <Button onClick={() => setActiveTab("donate")}>
                Set Up Recurring Donation
              </Button>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default Donations;