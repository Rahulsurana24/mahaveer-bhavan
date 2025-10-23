import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TripLogisticsManager } from './TripLogisticsManager';

interface TripLogisticsDialogProps {
  tripId: string;
  tripTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TripLogisticsDialog({
  tripId,
  tripTitle,
  open,
  onOpenChange
}: TripLogisticsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trip Logistics & Assignments</DialogTitle>
          <DialogDescription>
            Manage room assignments, seat allocations, and travel details for "{tripTitle}"
          </DialogDescription>
        </DialogHeader>

        <TripLogisticsManager tripId={tripId} />
      </DialogContent>
    </Dialog>
  );
}
