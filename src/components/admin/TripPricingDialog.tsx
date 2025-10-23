import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DynamicPricingTable } from './DynamicPricingTable';

interface TripPricingDialogProps {
  tripId: string;
  tripTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TripPricingDialog({
  tripId,
  tripTitle,
  open,
  onOpenChange
}: TripPricingDialogProps) {
  // Fetch existing pricing
  const { data: existingPricing, isLoading } = useQuery({
    queryKey: ['trip-pricing', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_pricing')
        .select('*')
        .eq('trip_id', tripId);

      if (error) throw error;

      // Convert to format expected by DynamicPricingTable
      const pricingData: Record<string, string> = {};
      data.forEach((item) => {
        pricingData[item.membership_type] = item.price.toString();
      });

      return pricingData;
    },
    enabled: open
  });

  const handleSave = async (pricing: Record<string, string>) => {
    // Delete existing pricing
    await supabase
      .from('trip_pricing')
      .delete()
      .eq('trip_id', tripId);

    // Insert new pricing
    const pricingEntries = Object.entries(pricing).map(([type, price]) => ({
      trip_id: tripId,
      membership_type: type,
      price: parseFloat(price)
    }));

    if (pricingEntries.length > 0) {
      const { error } = await supabase
        .from('trip_pricing')
        .insert(pricingEntries);

      if (error) throw error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Trip Pricing</DialogTitle>
          <DialogDescription>
            Set different trip fees for different membership types for "{tripTitle}"
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading pricing...</div>
        ) : (
          <DynamicPricingTable
            initialPricing={existingPricing || {}}
            onSave={handleSave}
            title="Trip Fees by Membership Type"
            description="Leave empty for default trip price. Members will see their respective price when registering."
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
