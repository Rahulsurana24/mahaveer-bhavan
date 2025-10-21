import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Plus,
  X,
  Save,
  Trash2,
  Download,
  AlertCircle,
  Users,
  ClipboardList
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loading } from '@/components/ui/loading';

type AssignmentTemplate = 'bus' | 'train' | 'flight' | 'hotel' | 'none';

interface CustomField {
  name: string;
  type: 'text' | 'number' | 'date';
  label: string;
  required: boolean;
}

interface Member {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  photo_url: string;
  membership_type: string;
  registered_at: string;
  assignment_data?: Record<string, any>;
}

interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  transport_type: string;
  assignment_template: AssignmentTemplate;
  custom_fields: CustomField[];
}

const TripAssignments = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AssignmentTemplate>('none');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isAddFieldDialogOpen, setIsAddFieldDialogOpen] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, Record<string, any>>>({});

  useEffect(() => {
    if (tripId) {
      loadTripAndMembers();
    }
  }, [tripId]);

  const loadTripAndMembers = async () => {
    try {
      setLoading(true);

      // Load trip details
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;

      setTrip(tripData);
      setSelectedTemplate(tripData.assignment_template || 'none');
      setCustomFields(tripData.custom_fields || []);

      // Load registered members with existing assignments
      const { data: registrationsData, error: regError } = await supabase
        .from('trip_registrations')
        .select(`
          member_id,
          registered_at,
          registration_status,
          members (
            id,
            full_name,
            email,
            phone,
            photo_url,
            membership_type
          )
        `)
        .eq('trip_id', tripId)
        .eq('registration_status', 'confirmed');

      if (regError) throw regError;

      // Load existing assignments
      const { data: assignmentsData, error: assignError } = await supabase
        .from('trip_assignments')
        .select('member_id, assignment_data')
        .eq('trip_id', tripId);

      if (assignError) throw assignError;

      // Map assignments by member_id
      const assignmentMap: Record<string, Record<string, any>> = {};
      assignmentsData?.forEach((a: any) => {
        assignmentMap[a.member_id] = a.assignment_data || {};
      });
      setAssignments(assignmentMap);

      // Format members data
      const membersWithAssignments = registrationsData?.map((reg: any) => ({
        ...reg.members,
        registered_at: reg.registered_at,
        assignment_data: assignmentMap[reg.member_id] || {}
      })) || [];

      setMembers(membersWithAssignments);
    } catch (error: any) {
      console.error('Error loading trip assignments:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load trip assignments',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = async (template: AssignmentTemplate) => {
    try {
      setSelectedTemplate(template);

      // Update trip with new template
      const { error } = await supabase
        .from('trips')
        .update({ assignment_template: template })
        .eq('id', tripId);

      if (error) throw error;

      toast({
        title: 'Template Updated',
        description: `Assignment template changed to ${template}`,
      });
    } catch (error: any) {
      console.error('Error updating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive'
      });
    }
  };

  const handleAddCustomField = async (field: CustomField) => {
    try {
      const updatedFields = [...customFields, field];
      setCustomFields(updatedFields);

      // Update trip with new custom fields
      const { error } = await supabase
        .from('trips')
        .update({ custom_fields: updatedFields })
        .eq('id', tripId);

      if (error) throw error;

      toast({
        title: 'Field Added',
        description: `Custom field "${field.label}" added successfully`,
      });
      setIsAddFieldDialogOpen(false);
    } catch (error: any) {
      console.error('Error adding custom field:', error);
      toast({
        title: 'Error',
        description: 'Failed to add custom field',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveCustomField = async (index: number) => {
    try {
      const updatedFields = customFields.filter((_, i) => i !== index);
      setCustomFields(updatedFields);

      // Update trip with new custom fields
      const { error } = await supabase
        .from('trips')
        .update({ custom_fields: updatedFields })
        .eq('id', tripId);

      if (error) throw error;

      toast({
        title: 'Field Removed',
        description: 'Custom field removed successfully',
      });
    } catch (error: any) {
      console.error('Error removing custom field:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove custom field',
        variant: 'destructive'
      });
    }
  };

  const handleAssignmentChange = (memberId: string, fieldName: string, value: any) => {
    setAssignments(prev => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || {}),
        [fieldName]: value
      }
    }));
  };

  const handleSaveAssignment = async (memberId: string) => {
    try {
      setSaving(true);
      const assignmentData = assignments[memberId] || {};

      const { error } = await supabase
        .from('trip_assignments')
        .upsert({
          trip_id: tripId,
          member_id: memberId,
          assignment_data: assignmentData
        }, {
          onConflict: 'trip_id,member_id'
        });

      if (error) throw error;

      toast({
        title: 'Assignment Saved',
        description: 'Travel details saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving assignment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save assignment',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAllAssignments = async () => {
    try {
      setSaving(true);

      const assignmentRecords = Object.entries(assignments).map(([memberId, data]) => ({
        trip_id: tripId,
        member_id: memberId,
        assignment_data: data
      }));

      const { error } = await supabase
        .from('trip_assignments')
        .upsert(assignmentRecords, {
          onConflict: 'trip_id,member_id'
        });

      if (error) throw error;

      toast({
        title: 'All Assignments Saved',
        description: `Saved assignments for ${assignmentRecords.length} members`,
      });
    } catch (error: any) {
      console.error('Error saving all assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to save assignments',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClearAssignment = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('trip_assignments')
        .delete()
        .eq('trip_id', tripId)
        .eq('member_id', memberId);

      if (error) throw error;

      setAssignments(prev => {
        const updated = { ...prev };
        delete updated[memberId];
        return updated;
      });

      toast({
        title: 'Assignment Cleared',
        description: 'Travel details cleared successfully',
      });
    } catch (error: any) {
      console.error('Error clearing assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear assignment',
        variant: 'destructive'
      });
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Member ID', ...getTemplateFields().map(f => f.label), ...customFields.map(f => f.label)];
    const rows = members.map(member => {
      const assignmentData = assignments[member.id] || {};
      return [
        member.full_name,
        member.email,
        member.phone,
        member.id,
        ...getTemplateFields().map(f => assignmentData[f.name] || ''),
        ...customFields.map(f => assignmentData[f.name] || '')
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${trip?.title}-assignments.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Assignments exported to CSV',
    });
  };

  const getTemplateFields = (): CustomField[] => {
    switch (selectedTemplate) {
      case 'bus':
        return [{ name: 'seat_number', type: 'text', label: 'Seat Number', required: true }];
      case 'train':
        return [
          { name: 'coach_number', type: 'text', label: 'Coach Number', required: true },
          { name: 'berth_number', type: 'text', label: 'Berth Number', required: true },
          { name: 'pnr', type: 'text', label: 'PNR Number', required: true }
        ];
      case 'flight':
        return [
          { name: 'flight_number', type: 'text', label: 'Flight Number', required: true },
          { name: 'seat_number', type: 'text', label: 'Seat Number', required: true },
          { name: 'pnr', type: 'text', label: 'PNR Number', required: true },
          { name: 'terminal', type: 'text', label: 'Terminal', required: false }
        ];
      case 'hotel':
        return [
          { name: 'room_number', type: 'text', label: 'Room Number', required: true },
          { name: 'room_type', type: 'text', label: 'Room Type', required: false },
          { name: 'floor', type: 'number', label: 'Floor', required: false }
        ];
      default:
        return [];
    }
  };

  const allFields = [...getTemplateFields(), ...customFields];

  if (loading) {
    return (
      <AdminLayout title="Trip Assignments">
        <div className="flex justify-center items-center h-64">
          <Loading size="lg" />
        </div>
      </AdminLayout>
    );
  }

  if (!trip) {
    return (
      <AdminLayout title="Trip Assignments">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Trip not found</AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Trip Assignments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/trips')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Trips
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{trip.title}</h2>
              <p className="text-muted-foreground">
                {trip.destination} • {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={handleSaveAllAssignments} disabled={saving}>
              {saving ? (
                <>
                  <Loading size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save All
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Trip Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Trip Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-muted-foreground">Transport</Label>
                <p className="font-medium">{trip.transport_type}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Registered Members</Label>
                <p className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {members.length}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Assignments Completed</Label>
                <p className="font-medium">
                  {Object.keys(assignments).length}/{members.length}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Template</Label>
                <Badge variant={selectedTemplate === 'none' ? 'secondary' : 'default'}>
                  {selectedTemplate === 'none' ? 'Not Set' : selectedTemplate.charAt(0).toUpperCase() + selectedTemplate.slice(1)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignment Template Section */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment Template</CardTitle>
            <CardDescription>
              Select a template based on trip type. Template fields will be shown for all members.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Template Type</Label>
              <Select value={selectedTemplate} onValueChange={(value) => handleTemplateChange(value as AssignmentTemplate)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Custom Fields Only)</SelectItem>
                  <SelectItem value="bus">Bus Trip (Seat Number)</SelectItem>
                  <SelectItem value="train">Train Trip (Coach, Berth, PNR)</SelectItem>
                  <SelectItem value="flight">Flight Trip (Flight, Seat, PNR, Terminal)</SelectItem>
                  <SelectItem value="hotel">Hotel Accommodation (Room, Type, Floor)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate !== 'none' && (
              <Alert>
                <AlertDescription>
                  <strong>Template Fields:</strong> {getTemplateFields().map(f => f.label).join(', ')}
                </AlertDescription>
              </Alert>
            )}

            {/* Custom Fields */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Custom Fields</Label>
                <Dialog open={isAddFieldDialogOpen} onOpenChange={setIsAddFieldDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Custom Field
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <AddCustomFieldDialog onAdd={handleAddCustomField} />
                  </DialogContent>
                </Dialog>
              </div>

              {customFields.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customFields.map((field, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-2">
                      {field.label} ({field.type})
                      {field.required && <span className="text-red-500">*</span>}
                      <button
                        onClick={() => handleRemoveCustomField(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Members Assignment Table */}
        <Card>
          <CardHeader>
            <CardTitle>Member Assignments</CardTitle>
            <CardDescription>
              Assign travel details to each registered member
            </CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No confirmed registrations yet. Members need to register for this trip first.
                </AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Member ID</TableHead>
                    {allFields.map(field => (
                      <TableHead key={field.name}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </TableHead>
                    ))}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={member.photo_url || '/default-avatar.png'}
                            alt={member.full_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium">{member.full_name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{member.id}</TableCell>
                      {allFields.map(field => (
                        <TableCell key={field.name}>
                          <Input
                            type={field.type}
                            value={assignments[member.id]?.[field.name] || ''}
                            onChange={(e) => handleAssignmentChange(member.id, field.name, e.target.value)}
                            placeholder={field.label}
                            className="w-full"
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveAssignment(member.id)}
                            disabled={saving}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleClearAssignment(member.id)}
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
      </div>
    </AdminLayout>
  );
};

const AddCustomFieldDialog = ({ onAdd }: { onAdd: (field: CustomField) => void }) => {
  const [fieldData, setFieldData] = useState<CustomField>({
    name: '',
    type: 'text',
    label: '',
    required: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Generate name from label if not provided
    const name = fieldData.name || fieldData.label.toLowerCase().replace(/\s+/g, '_');
    onAdd({ ...fieldData, name });
    setFieldData({ name: '', type: 'text', label: '', required: false });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Add Custom Field</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Field Label *</Label>
          <Input
            value={fieldData.label}
            onChange={(e) => setFieldData({ ...fieldData, label: e.target.value })}
            placeholder="e.g., Passport Number"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Field Type *</Label>
          <Select value={fieldData.type} onValueChange={(value: any) => setFieldData({ ...fieldData, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="date">Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="required"
            checked={fieldData.required}
            onChange={(e) => setFieldData({ ...fieldData, required: e.target.checked })}
            className="rounded border-gray-300"
          />
          <Label htmlFor="required">Required field</Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit">Add Field</Button>
      </DialogFooter>
    </form>
  );
};

export default TripAssignments;
