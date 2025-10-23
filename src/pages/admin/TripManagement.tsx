import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Users, FileText, Calendar, DollarSign, Plane, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TripPricingDialog } from '@/components/admin/TripPricingDialog';
import { TripLogisticsDialog } from '@/components/admin/TripLogisticsDialog';
import { TripFormFieldsManager } from '@/components/admin/TripFormFieldsManager';
import { TripAllocationImport } from '@/components/admin/TripAllocationImport';

const TripManagement = () => {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<any>(null);
  const [pricingTrip, setPricingTrip] = useState<any>(null);
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
  const [logisticsTrip, setLogisticsTrip] = useState<any>(null);
  const [isLogisticsDialogOpen, setIsLogisticsDialogOpen] = useState(false);
  const [formFieldsTrip, setFormFieldsTrip] = useState<any>(null);
  const [isFormFieldsDialogOpen, setIsFormFieldsDialogOpen] = useState(false);
  const [isAllocationImportOpen, setIsAllocationImportOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error loading trips:', error);
      toast({
        title: 'Error',
        description: 'Failed to load trips',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Trip deleted successfully'
      });
      loadTrips();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete trip: ' + error.message,
        variant: 'destructive'
      });
    }
  });

  const handleDelete = (tripId: string) => {
    if (confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
      deleteMutation.mutate(tripId);
    }
  };

  const handleEdit = (trip: any) => {
    setEditingTrip(trip);
    setIsEditDialogOpen(true);
  };

  const handleManagePricing = (trip: any) => {
    setPricingTrip(trip);
    setIsPricingDialogOpen(true);
  };

  const handleManageLogistics = (trip: any) => {
    setLogisticsTrip(trip);
    setIsLogisticsDialogOpen(true);
  };

  const handleManageFormFields = (trip: any) => {
    setFormFieldsTrip(trip);
    setIsFormFieldsDialogOpen(true);
  };

  return (
    <AdminLayout title="Trip Management">
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">Trip Management</h2>
            <p className="text-muted-foreground">Manage trips and travel programs</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAllocationImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import Allocations
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Trip
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Trips ({trips.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading trips...</p>
            ) : trips.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No trips found</h3>
                <p className="text-muted-foreground mb-4">Get started by creating your first trip</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Trip
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip Name</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell className="font-medium">{trip.title}</TableCell>
                      <TableCell>{trip.destination}</TableCell>
                      <TableCell>
                        {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{trip.capacity}</TableCell>
                      <TableCell>₹{trip.price}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          trip.status === 'open' ? 'bg-green-100 text-green-800' : 
                          trip.status === 'published' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {trip.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(trip)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleManagePricing(trip)}>
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleManageLogistics(trip)}>
                            <Plane className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleManageFormFields(trip)}>
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => handleDelete(trip.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Trip Dialog */}
        {editingTrip && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Trip</DialogTitle>
              </DialogHeader>
              <EditTripForm 
                trip={editingTrip}
                onSuccess={() => {
                  setIsEditDialogOpen(false);
                  setEditingTrip(null);
                  loadTrips();
                }} 
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Trip Pricing Dialog */}
        {pricingTrip && (
          <TripPricingDialog
            tripId={pricingTrip.id}
            tripTitle={pricingTrip.title}
            open={isPricingDialogOpen}
            onOpenChange={setIsPricingDialogOpen}
          />
        )}

        {/* Trip Logistics Dialog */}
        {logisticsTrip && (
          <TripLogisticsDialog
            tripId={logisticsTrip.id}
            tripTitle={logisticsTrip.title}
            open={isLogisticsDialogOpen}
            onOpenChange={setIsLogisticsDialogOpen}
          />
        )}

        {/* Trip Form Fields Manager Dialog */}
        {formFieldsTrip && (
          <TripFormFieldsManager
            tripId={formFieldsTrip.id}
            tripTitle={formFieldsTrip.title}
            open={isFormFieldsDialogOpen}
            onOpenChange={setIsFormFieldsDialogOpen}
          />
        )}

        {/* Trip Allocation Import Dialog */}
        <TripAllocationImport
          open={isAllocationImportOpen}
          onOpenChange={setIsAllocationImportOpen}
        />
      </div>
    </AdminLayout>
  );
};

const TripForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    destination: '',
    start_date: '',
    end_date: '',
    departure_time: '',
    return_time: '',
    transport_type: '',
    capacity: '',
    price: '',
    itinerary: {},
    inclusions: [],
    exclusions: [],
    target_audience: ['Karyakarta', 'Labharti', 'Tapasvi', 'Trustee', 'Extra'],
    registration_fee: '',
    status: 'open'
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('trips')
        .insert({
          ...formData,
          capacity: parseInt(formData.capacity),
          price: parseFloat(formData.price),
          registration_fee: parseFloat(formData.registration_fee || '0')
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Trip created successfully'
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to create trip',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Trip Name *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Destination *</Label>
          <Input
            value={formData.destination}
            onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description *</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date *</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>End Date *</Label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Departure Time *</Label>
          <Input
            type="time"
            value={formData.departure_time}
            onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Return Time *</Label>
          <Input
            type="time"
            value={formData.return_time}
            onChange={(e) => setFormData({ ...formData, return_time: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Transport Type *</Label>
          <Select
            value={formData.transport_type}
            onValueChange={(value) => setFormData({ ...formData, transport_type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Bus">Bus</SelectItem>
              <SelectItem value="Train">Train</SelectItem>
              <SelectItem value="Flight">Flight</SelectItem>
              <SelectItem value="Private Vehicle">Private Vehicle</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Capacity *</Label>
          <Input
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Price (₹) *</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            required
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating...' : 'Create Trip'}
      </Button>
    </form>
  );
};

const EditTripForm = ({ trip, onSuccess }: { trip: any; onSuccess: () => void }) => {
  const [formData, setFormData] = useState({
    title: trip.title || '',
    description: trip.description || '',
    destination: trip.destination || '',
    start_date: trip.start_date || '',
    end_date: trip.end_date || '',
    departure_time: trip.departure_time || '',
    return_time: trip.return_time || '',
    transport_type: trip.transport_type || '',
    capacity: trip.capacity?.toString() || '',
    price: trip.price?.toString() || '',
    status: trip.status || 'open'
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('trips')
        .update({
          ...formData,
          capacity: parseInt(formData.capacity),
          price: parseFloat(formData.price)
        })
        .eq('id', trip.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Trip updated successfully'
      });
      onSuccess();
    } catch (error) {
      console.error('Error updating trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to update trip',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Trip Name *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Destination *</Label>
          <Input
            value={formData.destination}
            onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description *</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date *</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>End Date *</Label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Departure Time *</Label>
          <Input
            type="time"
            value={formData.departure_time}
            onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Return Time *</Label>
          <Input
            type="time"
            value={formData.return_time}
            onChange={(e) => setFormData({ ...formData, return_time: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Transport Type *</Label>
          <Select
            value={formData.transport_type}
            onValueChange={(value) => setFormData({ ...formData, transport_type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Bus">Bus</SelectItem>
              <SelectItem value="Train">Train</SelectItem>
              <SelectItem value="Flight">Flight</SelectItem>
              <SelectItem value="Private Vehicle">Private Vehicle</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Capacity *</Label>
          <Input
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Price (₹) *</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Status *</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Updating...' : 'Update Trip'}
      </Button>
    </form>
  );
};

export default TripManagement;