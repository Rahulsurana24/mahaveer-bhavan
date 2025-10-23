import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MEMBERSHIP_TYPES = [
  { value: 'Karyakarta', label: 'Karyakarta (KR)' },
  { value: 'Tapasvi', label: 'Tapasvi (TP)' },
  { value: 'Labharti', label: 'Labharti (LB)' },
  { value: 'Trustee', label: 'Trustee (TR)' },
  { value: 'Extra', label: 'Extra (EX)' }
];

interface PricingData {
  [key: string]: string; // membership_type -> price
}

interface DynamicPricingTableProps {
  initialPricing?: PricingData;
  onSave: (pricing: PricingData) => Promise<void>;
  title?: string;
  description?: string;
}

export function DynamicPricingTable({
  initialPricing = {},
  onSave,
  title = "Membership Type Pricing",
  description = "Set different prices for different membership types. Leave empty if not applicable."
}: DynamicPricingTableProps) {
  const [pricing, setPricing] = useState<PricingData>(initialPricing);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setPricing(initialPricing);
  }, [initialPricing]);

  const handlePriceChange = (membershipType: string, value: string) => {
    setPricing(prev => ({
      ...prev,
      [membershipType]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Filter out empty values
      const validPricing: PricingData = {};
      Object.entries(pricing).forEach(([type, price]) => {
        if (price && price.trim() !== '') {
          validPricing[type] = price;
        }
      });

      await onSave(validPricing);
      toast({
        title: "Success",
        description: "Pricing saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save pricing",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const calculateTotal = () => {
    let total = 0;
    Object.values(pricing).forEach(price => {
      const num = parseFloat(price);
      if (!isNaN(num)) total += num;
    });
    return total;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membership Type</TableHead>
              <TableHead>Price (¹)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MEMBERSHIP_TYPES.map((type) => {
              const price = pricing[type.value] || '';
              const isSet = price && price.trim() !== '';

              return (
                <TableRow key={type.value}>
                  <TableCell className="font-medium">{type.label}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => handlePriceChange(type.value, e.target.value)}
                      className="max-w-[150px]"
                      min="0"
                      step="0.01"
                    />
                  </TableCell>
                  <TableCell>
                    {isSet ? (
                      <span className="text-green-500 text-sm"> Eligible</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not set</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">
              {Object.values(pricing).filter(p => p && p.trim() !== '').length} membership types configured
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Pricing"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
