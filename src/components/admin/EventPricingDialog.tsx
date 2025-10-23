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

interface EventPricingDialogProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventPricingDialog({
  eventId,
  eventTitle,
  open,
  onOpenChange
}: EventPricingDialogProps) {
  // Fetch existing pricing
  const { data: existingPricing, isLoading } = useQuery({
    queryKey: ['event-pricing', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_pricing')
        .select('*')
        .eq('event_id', eventId);

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
      .from('event_pricing')
      .delete()
      .eq('event_id', eventId);

    // Insert new pricing
    const pricingEntries = Object.entries(pricing).map(([type, price]) => ({
      event_id: eventId,
      membership_type: type,
      price: parseFloat(price)
    }));

    if (pricingEntries.length > 0) {
      const { error } = await supabase
        .from('event_pricing')
        .insert(pricingEntries);

      if (error) throw error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Event Pricing</DialogTitle>
          <DialogDescription>
            Set different registration fees for different membership types for "{eventTitle}"
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading pricing...</div>
        ) : (
          <DynamicPricingTable
            initialPricing={existingPricing || {}}
            onSave={handleSave}
            title="Registration Fees by Membership Type"
            description="Leave empty for free registration. Members will see their respective price when registering."
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
