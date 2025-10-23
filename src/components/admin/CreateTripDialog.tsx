import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function CreateTripDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: "", description: "", destination: "", startDate: "", endDate: "",
    departureTime: "", returnTime: "", capacity: "", price: "",
    transportType: "Bus", status: "draft"
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('trips').insert([{
        title: data.title,
        description: data.description,
        destination: data.destination,
        start_date: data.startDate,
        end_date: data.endDate,
        departure_time: data.departureTime,
        return_time: data.returnTime,
        capacity: parseInt(data.capacity),
        price: parseFloat(data.price),
        transport_type: data.transportType,
        status: data.status
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trips'] });
      toast({ title: "Success", description: "Trip created successfully!" });
      setOpen(false);
      setFormData({ title: "", description: "", destination: "", startDate: "", endDate: "", departureTime: "", returnTime: "", capacity: "", price: "", transportType: "Bus", status: "draft" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-2" />Create Trip</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Trip</DialogTitle>
          <DialogDescription>Plan a new trip for members</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Trip Title *</Label>
              <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Destination *</Label>
              <Input value={formData.destination} onChange={(e) => setFormData({...formData, destination: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Transport *</Label>
              <Select value={formData.transportType} onValueChange={(v) => setFormData({...formData, transportType: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bus">Bus</SelectItem>
                  <SelectItem value="Train">Train</SelectItem>
                  <SelectItem value="Flight">Flight</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input type="date" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input type="date" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Departure Time *</Label>
              <Input type="time" value={formData.departureTime} onChange={(e) => setFormData({...formData, departureTime: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Return Time *</Label>
              <Input type="time" value={formData.returnTime} onChange={(e) => setFormData({...formData, returnTime: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Capacity *</Label>
              <Input type="number" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Price (₹) *</Label>
              <Input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Trip"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
