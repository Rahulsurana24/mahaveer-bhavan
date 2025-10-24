import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign } from 'lucide-react';

interface TripRegistrationDialogProps {
  tripId: string;
  tripTitle: string;
  tripPrice: number;
  memberId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  field_options?: string[];
  required: boolean;
  description?: string;
}

export function TripRegistrationDialog({
  tripId,
  tripTitle,
  tripPrice,
  memberId,
  open,
  onOpenChange,
  onSuccess
}: TripRegistrationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Fetch custom fields for this trip
  const { data: customFields = [], isLoading } = useQuery({
    queryKey: ['trip-form-fields', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_custom_fields')
        .select(`
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

      return (data || []).map(item => item.custom_form_fields) as CustomField[];
    },
    enabled: open
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const initialData: Record<string, any> = {};
      customFields.forEach(field => {
        if (field.field_type === 'checkbox') {
          initialData[field.field_name] = false;
        } else {
          initialData[field.field_name] = '';
        }
      });
      setFormData(initialData);
    }
  }, [open, customFields]);

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async () => {
      // Validate required fields
      for (const field of customFields) {
        if (field.required) {
          const value = formData[field.field_name];
          if (field.field_type === 'checkbox' && !value) {
            throw new Error(`${field.field_label} is required`);
          } else if (field.field_type !== 'checkbox' && (!value || value.trim() === '')) {
            throw new Error(`${field.field_label} is required`);
          }
        }
      }

      // Insert trip registration
      const { error } = await supabase
        .from('trip_registrations')
        .insert({
          trip_id: tripId,
          member_id: memberId,
          status: 'registered',
          payment_status: 'pending'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Registration Successful',
        description: `You have been registered for ${tripTitle}`
      });
      queryClient.invalidateQueries({ queryKey: ['trip-registrations'] });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to register for trip',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate();
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const renderField = (field: CustomField) => {
    const value = formData[field.field_name] || '';

    switch (field.field_type) {
      case 'text':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.field_label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <Input
              value={value}
              onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
              required={field.required}
              placeholder={`Enter ${field.field_label.toLowerCase()}`}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.field_label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <Textarea
              value={value}
              onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
              required={field.required}
              placeholder={`Enter ${field.field_label.toLowerCase()}`}
              rows={3}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.field_label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <Select
              value={value}
              onValueChange={(val) => handleFieldChange(field.field_name, val)}
              required={field.required}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.field_label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {(field.field_options || []).map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.field_label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <Input
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
              required={field.required}
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.field_label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <Input
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
              required={field.required}
              placeholder={`Enter ${field.field_label.toLowerCase()}`}
            />
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-start space-x-3 space-y-0 py-2">
            <Checkbox
              checked={value}
              onCheckedChange={(checked) => handleFieldChange(field.field_name, checked)}
              required={field.required}
            />
            <div className="space-y-1 leading-none">
              <Label className="font-normal">
                {field.field_label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register for Trip</DialogTitle>
          <DialogDescription>
            Complete the registration form for "{tripTitle}"
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Trip Price Display */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Trip Fee</p>
                  <p className="text-xs text-muted-foreground">Payment pending after registration</p>
                </div>
                <div className="flex items-center gap-1 text-2xl font-bold text-primary">
                  <DollarSign className="h-5 w-5" />
                  ₹{tripPrice}
                </div>
              </div>
            </div>

            {/* Custom Form Fields */}
            {customFields.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Registration Information</h3>
                {customFields.map(field => renderField(field))}
              </div>
            )}

            {customFields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No additional information required for this trip
              </p>
            )}

            {/* Submit Button */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="flex-1"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  `Register - ₹${tripPrice}`
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
