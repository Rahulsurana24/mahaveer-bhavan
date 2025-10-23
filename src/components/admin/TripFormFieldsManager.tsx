import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, FileText, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface TripFormFieldsManagerProps {
  tripId: string;
  tripTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  field_options?: any;
  required: boolean;
  description?: string;
}

interface TripCustomField extends CustomField {
  display_order: number;
}

export function TripFormFieldsManager({ tripId, tripTitle, open, onOpenChange }: TripFormFieldsManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // New field state
  const [showNewField, setShowNewField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldDescription, setNewFieldDescription] = useState('');
  const [newFieldOptions, setNewFieldOptions] = useState(''); // comma-separated

  // Fetch all available custom fields
  const { data: allFields = [] } = useQuery({
    queryKey: ['custom-form-fields'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_form_fields')
        .select('*')
        .order('field_label');
      if (error) throw error;
      return data as CustomField[];
    },
    enabled: open
  });

  // Fetch trip's selected custom fields
  const { data: tripFields = [], refetch: refetchTripFields } = useQuery({
    queryKey: ['trip-custom-fields', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_custom_fields')
        .select(`
          display_order,
          custom_form_fields:field_id (
            id,
            field_name,
            field_label,
            field_type,
            field_options,
            required,
            description
          )
        `)
        .eq('trip_id', tripId)
        .order('display_order');

      if (error) throw error;

      return (data || []).map(item => ({
        ...(item.custom_form_fields as any),
        display_order: item.display_order
      })) as TripCustomField[];
    },
    enabled: open
  });

  // Create new custom field mutation
  const createFieldMutation = useMutation({
    mutationFn: async (fieldData: any) => {
      const { data, error } = await supabase
        .from('custom_form_fields')
        .insert([fieldData])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-form-fields'] });
      toast({ title: 'Success', description: 'Custom field created successfully' });
      resetNewFieldForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create custom field',
        variant: 'destructive'
      });
    }
  });

  // Add field to trip mutation
  const addFieldToTripMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      const maxOrder = tripFields.length > 0 ? Math.max(...tripFields.map(f => f.display_order)) : -1;

      const { error } = await supabase
        .from('trip_custom_fields')
        .insert([{
          trip_id: tripId,
          field_id: fieldId,
          display_order: maxOrder + 1
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchTripFields();
      toast({ title: 'Success', description: 'Field added to trip form' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add field',
        variant: 'destructive'
      });
    }
  });

  // Remove field from trip mutation
  const removeFieldFromTripMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      const { error } = await supabase
        .from('trip_custom_fields')
        .delete()
        .eq('trip_id', tripId)
        .eq('field_id', fieldId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchTripFields();
      toast({ title: 'Success', description: 'Field removed from trip form' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove field',
        variant: 'destructive'
      });
    }
  });

  // Reorder field mutation
  const reorderFieldMutation = useMutation({
    mutationFn: async ({ fieldId, newOrder }: { fieldId: string; newOrder: number }) => {
      const { error } = await supabase
        .from('trip_custom_fields')
        .update({ display_order: newOrder })
        .eq('trip_id', tripId)
        .eq('field_id', fieldId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchTripFields();
    }
  });

  const resetNewFieldForm = () => {
    setNewFieldName('');
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldRequired(false);
    setNewFieldDescription('');
    setNewFieldOptions('');
    setShowNewField(false);
  };

  const handleCreateField = () => {
    if (!newFieldName || !newFieldLabel) {
      toast({
        title: 'Validation Error',
        description: 'Field name and label are required',
        variant: 'destructive'
      });
      return;
    }

    let fieldOptions = null;
    if (newFieldType === 'select' && newFieldOptions) {
      fieldOptions = newFieldOptions.split(',').map(opt => opt.trim()).filter(Boolean);
    }

    createFieldMutation.mutate({
      field_name: newFieldName,
      field_label: newFieldLabel,
      field_type: newFieldType,
      field_options: fieldOptions,
      required: newFieldRequired,
      description: newFieldDescription || null
    });
  };

  const handleMoveField = (fieldId: string, direction: 'up' | 'down') => {
    const currentIndex = tripFields.findIndex(f => f.id === fieldId);
    if (currentIndex === -1) return;

    if (direction === 'up' && currentIndex > 0) {
      const prevField = tripFields[currentIndex - 1];
      reorderFieldMutation.mutate({ fieldId, newOrder: prevField.display_order });
      reorderFieldMutation.mutate({ fieldId: prevField.id, newOrder: tripFields[currentIndex].display_order });
    } else if (direction === 'down' && currentIndex < tripFields.length - 1) {
      const nextField = tripFields[currentIndex + 1];
      reorderFieldMutation.mutate({ fieldId, newOrder: nextField.display_order });
      reorderFieldMutation.mutate({ fieldId: nextField.id, newOrder: tripFields[currentIndex].display_order });
    }
  };

  const availableFields = allFields.filter(f => !tripFields.find(tf => tf.id === f.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Manage Registration Form Fields
          </DialogTitle>
          <DialogDescription>
            Configure custom fields for "{tripTitle}" registration form
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Form Fields */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Current Form Fields</h3>
            {tripFields.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No custom fields added yet. Add fields from the library below.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {tripFields.map((field, index) => (
                  <Card key={field.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{field.field_label}</span>
                            <Badge variant="outline">{field.field_type}</Badge>
                            {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                          </div>
                          {field.description && (
                            <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveField(field.id, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveField(field.id, 'down')}
                            disabled={index === tripFields.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFieldFromTripMutation.mutate(field.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Available Fields Library */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Available Fields</h3>
            {availableFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">All available fields have been added to this trip.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableFields.map((field) => (
                  <Card key={field.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{field.field_label}</span>
                            <Badge variant="outline" className="text-xs">{field.field_type}</Badge>
                          </div>
                          {field.description && (
                            <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addFieldToTripMutation.mutate(field.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Create New Field */}
          <div>
            {!showNewField ? (
              <Button variant="outline" onClick={() => setShowNewField(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Custom Field
              </Button>
            ) : (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Create New Field</h3>
                    <Button size="sm" variant="ghost" onClick={resetNewFieldForm}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Field Name (Unique Identifier) *</Label>
                      <Input
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        placeholder="e.g., emergency_contact"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Field Label (Display Name) *</Label>
                      <Input
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        placeholder="e.g., Emergency Contact"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Field Type *</Label>
                      <Select value={newFieldType} onValueChange={setNewFieldType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="textarea">Text Area</SelectItem>
                          <SelectItem value="select">Dropdown Select</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Required Field</Label>
                      <Select
                        value={newFieldRequired ? 'yes' : 'no'}
                        onValueChange={(v) => setNewFieldRequired(v === 'yes')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">Optional</SelectItem>
                          <SelectItem value="yes">Required</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {newFieldType === 'select' && (
                    <div className="space-y-2">
                      <Label>Options (comma-separated)</Label>
                      <Input
                        value={newFieldOptions}
                        onChange={(e) => setNewFieldOptions(e.target.value)}
                        placeholder="Option 1, Option 2, Option 3"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Textarea
                      value={newFieldDescription}
                      onChange={(e) => setNewFieldDescription(e.target.value)}
                      placeholder="Helper text for this field"
                      rows={2}
                    />
                  </div>

                  <Button
                    onClick={handleCreateField}
                    disabled={createFieldMutation.isPending}
                    className="w-full"
                  >
                    {createFieldMutation.isPending ? 'Creating...' : 'Create Field'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
