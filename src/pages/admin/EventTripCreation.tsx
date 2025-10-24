import { useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Upload,
  FileText,
  Image as ImageIcon,
  Video,
  Users,
  DollarSign,
  Calendar,
  MapPin,
  Sparkles,
  AlertCircle,
  Eye,
  Edit,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface CustomField {
  tempId: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'number' | 'email' | 'phone';
  field_options: string[];
  is_required: boolean;
  placeholder: string;
  help_text: string;
  display_order: number;
}

interface PricingTier {
  membership_type: string;
  price: number;
}

const EventTripCreation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  // Step 1: Basic Info
  const [basicInfo, setBasicInfo] = useState({
    activity_name: '',
    activity_type: 'event' as 'event' | 'trip',
    destination: '',
    start_date: '',
    end_date: '',
    description: '',
  });

  // Step 2: Media Upload
  const [mediaFiles, setMediaFiles] = useState({
    itinerary_document: null as File | null,
    promotional_photos: [] as File[],
    promotional_videos: [] as File[],
  });

  // Step 3: Target Audience & Registration
  const [registrationSettings, setRegistrationSettings] = useState({
    target_membership_types: ['Tapasvi', 'Karyakarta', 'Labharti', 'Trustee', 'Extra'],
    registration_open: true,
    registration_deadline: '',
    max_participants: '',
    allow_online_payment: true,
    allow_cash_payment: true,
    payment_gateway: 'razorpay' as 'razorpay' | 'stripe',
  });

  // Step 4: Pricing
  const [pricing, setPricing] = useState<PricingTier[]>([
    { membership_type: 'Tapasvi', price: 0 },
    { membership_type: 'Karyakarta', price: 0 },
    { membership_type: 'Labharti', price: 0 },
    { membership_type: 'Trustee', price: 0 },
    { membership_type: 'Extra', price: 0 },
  ]);

  // Step 5: Custom Form Builder
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isAddFieldDialogOpen, setIsAddFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [newField, setNewField] = useState<CustomField>({
    tempId: Date.now().toString(),
    field_name: '',
    field_label: '',
    field_type: 'text',
    field_options: [],
    is_required: false,
    placeholder: '',
    help_text: '',
    display_order: 0,
  });

  // Step 6: Review
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async () => {
      // Validate required fields
      if (!basicInfo.activity_name || !basicInfo.start_date || !basicInfo.end_date) {
        throw new Error('Please fill in all required fields');
      }

      // Step 1: Create the main event/trip record
      const { data: eventData, error: eventError } = await supabase
        .from('events_trips')
        .insert([
          {
            activity_name: basicInfo.activity_name,
            activity_type: basicInfo.activity_type,
            destination: basicInfo.destination || null,
            start_date: basicInfo.start_date,
            end_date: basicInfo.end_date,
            description: basicInfo.description || null,
            registration_open: registrationSettings.registration_open,
            registration_deadline: registrationSettings.registration_deadline || null,
            max_participants: registrationSettings.max_participants
              ? parseInt(registrationSettings.max_participants)
              : null,
            target_membership_types: registrationSettings.target_membership_types,
            allow_online_payment: registrationSettings.allow_online_payment,
            allow_cash_payment: registrationSettings.allow_cash_payment,
            payment_gateway: registrationSettings.payment_gateway,
            status: status,
          },
        ])
        .select()
        .single();

      if (eventError) throw eventError;
      if (!eventData) throw new Error('Failed to create event');

      const eventId = eventData.id;

      // Step 2: Insert pricing tiers for selected membership types
      const pricingToInsert = pricing
        .filter(p => registrationSettings.target_membership_types.includes(p.membership_type))
        .filter(p => p.price > 0)
        .map(p => ({
          event_trip_id: eventId,
          membership_type: p.membership_type,
          price: p.price,
          currency: 'INR',
        }));

      if (pricingToInsert.length > 0) {
        const { error: pricingError } = await supabase
          .from('event_pricing')
          .insert(pricingToInsert);

        if (pricingError) throw pricingError;
      }

      // Step 3: Insert custom fields
      if (customFields.length > 0) {
        const fieldsToInsert = customFields.map((field, index) => ({
          event_trip_id: eventId,
          field_name: field.field_name,
          field_label: field.field_label,
          field_type: field.field_type,
          field_options: field.field_options.length > 0 ? JSON.stringify(field.field_options) : null,
          is_required: field.is_required,
          placeholder: field.placeholder || null,
          help_text: field.help_text || null,
          display_order: index + 1,
        }));

        const { error: fieldsError } = await supabase
          .from('event_custom_fields')
          .insert(fieldsToInsert);

        if (fieldsError) throw fieldsError;
      }

      // TODO: Step 4: Upload media files to storage (requires Supabase storage setup)
      // For now, we'll skip media upload

      return { eventId, eventName: basicInfo.activity_name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: '✓ Event Created Successfully',
        description: `${data.eventName} has been ${status === 'draft' ? 'saved as draft' : 'published'}`,
      });

      // Navigate to event list or registration management
      setTimeout(() => {
        navigate('/admin/event-management');
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Creating Event',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const nextStep = () => {
    // Validate current step before proceeding
    if (currentStep === 1) {
      if (!basicInfo.activity_name || !basicInfo.start_date || !basicInfo.end_date) {
        toast({
          title: 'Required Fields Missing',
          description: 'Please fill in activity name, start date, and end date',
          variant: 'destructive',
        });
        return;
      }
      if (new Date(basicInfo.end_date) < new Date(basicInfo.start_date)) {
        toast({
          title: 'Invalid Dates',
          description: 'End date must be after start date',
          variant: 'destructive',
        });
        return;
      }
    }

    if (currentStep === 4) {
      // Validate pricing
      const selectedTypes = registrationSettings.target_membership_types;
      const hasInvalidPricing = pricing.some(
        p => selectedTypes.includes(p.membership_type) && p.price <= 0
      );
      if (hasInvalidPricing) {
        toast({
          title: 'Pricing Required',
          description: 'Please set prices for all selected membership types',
          variant: 'destructive',
        });
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddField = () => {
    if (!newField.field_name || !newField.field_label) {
      toast({
        title: 'Required Fields Missing',
        description: 'Please provide field name and label',
        variant: 'destructive',
      });
      return;
    }

    if (editingField) {
      // Update existing field
      setCustomFields(
        customFields.map(f => (f.tempId === editingField.tempId ? { ...newField, tempId: editingField.tempId } : f))
      );
      toast({ title: '✓ Field Updated' });
    } else {
      // Add new field
      setCustomFields([...customFields, { ...newField, tempId: Date.now().toString() }]);
      toast({ title: '✓ Field Added' });
    }

    // Reset form
    setNewField({
      tempId: Date.now().toString(),
      field_name: '',
      field_label: '',
      field_type: 'text',
      field_options: [],
      is_required: false,
      placeholder: '',
      help_text: '',
      display_order: 0,
    });
    setEditingField(null);
    setIsAddFieldDialogOpen(false);
  };

  const handleEditField = (field: CustomField) => {
    setEditingField(field);
    setNewField({ ...field });
    setIsAddFieldDialogOpen(true);
  };

  const handleDeleteField = (tempId: string) => {
    setCustomFields(customFields.filter(f => f.tempId !== tempId));
    toast({ title: '✓ Field Removed' });
  };

  const handleToggleMembershipType = (type: string) => {
    const current = registrationSettings.target_membership_types;
    if (current.includes(type)) {
      setRegistrationSettings({
        ...registrationSettings,
        target_membership_types: current.filter(t => t !== type),
      });
    } else {
      setRegistrationSettings({
        ...registrationSettings,
        target_membership_types: [...current, type],
      });
    }
  };

  const calculateDuration = () => {
    if (basicInfo.start_date && basicInfo.end_date) {
      const start = new Date(basicInfo.start_date);
      const end = new Date(basicInfo.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return `${days} ${days === 1 ? 'day' : 'days'}`;
    }
    return 'N/A';
  };

  const getFieldTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      text: FileText,
      textarea: FileText,
      select: ArrowRight,
      radio: CheckCircle,
      checkbox: Check,
      date: Calendar,
      number: DollarSign,
      email: '@',
      phone: '📞',
    };
    return icons[type] || FileText;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#00A36C]" />
              Basic Information
            </h3>

            <div className="space-y-2">
              <Label className="text-gray-300">Activity Type *</Label>
              <Select
                value={basicInfo.activity_type}
                onValueChange={(value: 'event' | 'trip') =>
                  setBasicInfo({ ...basicInfo, activity_type: value })
                }
              >
                <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#252525] border-white/10">
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="trip">Trip</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Activity Name *</Label>
              <Input
                placeholder="e.g., Shimla Spiritual Retreat"
                value={basicInfo.activity_name}
                onChange={e => setBasicInfo({ ...basicInfo, activity_name: e.target.value })}
                className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">
                Destination {basicInfo.activity_type === 'trip' && '*'}
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="e.g., Shimla, Himachal Pradesh"
                  value={basicInfo.destination}
                  onChange={e => setBasicInfo({ ...basicInfo, destination: e.target.value })}
                  className="pl-10 bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Start Date *</Label>
                <Input
                  type="date"
                  value={basicInfo.start_date}
                  onChange={e => setBasicInfo({ ...basicInfo, start_date: e.target.value })}
                  className="bg-[#252525] border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">End Date *</Label>
                <Input
                  type="date"
                  value={basicInfo.end_date}
                  onChange={e => setBasicInfo({ ...basicInfo, end_date: e.target.value })}
                  className="bg-[#252525] border-white/10 text-white"
                />
              </div>
            </div>

            {basicInfo.start_date && basicInfo.end_date && (
              <div className="bg-[#00A36C]/10 border border-[#00A36C]/20 rounded-lg p-3">
                <div className="text-sm text-[#00A36C] flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Duration: {calculateDuration()}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-gray-300">Description</Label>
              <Textarea
                placeholder="Describe the event/trip details..."
                value={basicInfo.description}
                onChange={e => setBasicInfo({ ...basicInfo, description: e.target.value })}
                rows={4}
                className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#00A36C]" />
              Media & Documents
            </h3>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-400">
                  <p className="font-semibold mb-1">Media Upload</p>
                  <p>File upload functionality requires Supabase storage configuration. You can skip this step for now and add media later.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Itinerary Document (PDF/Word)
              </Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setMediaFiles({ ...mediaFiles, itinerary_document: file });
                  }
                }}
                className="bg-[#252525] border-white/10 text-white"
              />
              {mediaFiles.itinerary_document && (
                <div className="text-xs text-gray-400 mt-1">
                  Selected: {mediaFiles.itinerary_document.name}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Promotional Photos
              </Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={e => {
                  const files = Array.from(e.target.files || []);
                  setMediaFiles({ ...mediaFiles, promotional_photos: files });
                }}
                className="bg-[#252525] border-white/10 text-white"
              />
              {mediaFiles.promotional_photos.length > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  Selected: {mediaFiles.promotional_photos.length} photo(s)
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <Video className="h-4 w-4" />
                Promotional Videos
              </Label>
              <Input
                type="file"
                accept="video/*"
                multiple
                onChange={e => {
                  const files = Array.from(e.target.files || []);
                  setMediaFiles({ ...mediaFiles, promotional_videos: files });
                }}
                className="bg-[#252525] border-white/10 text-white"
              />
              {mediaFiles.promotional_videos.length > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  Selected: {mediaFiles.promotional_videos.length} video(s)
                </div>
              )}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-[#00A36C]" />
              Target Audience & Registration
            </h3>

            <div className="space-y-2">
              <Label className="text-gray-300">Target Membership Types *</Label>
              <div className="flex flex-wrap gap-2">
                {['Trustee', 'Tapasvi', 'Karyakarta', 'Labharti', 'Extra'].map(type => (
                  <Badge
                    key={type}
                    onClick={() => handleToggleMembershipType(type)}
                    className={cn(
                      'cursor-pointer transition-all',
                      registrationSettings.target_membership_types.includes(type)
                        ? 'bg-[#00A36C] hover:bg-[#00A36C]/90'
                        : 'bg-gray-600 hover:bg-gray-500'
                    )}
                  >
                    {registrationSettings.target_membership_types.includes(type) && (
                      <Check className="h-3 w-3 mr-1" />
                    )}
                    {type}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-400">
                {registrationSettings.target_membership_types.length} type(s) selected
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Registration Deadline</Label>
              <Input
                type="date"
                value={registrationSettings.registration_deadline}
                onChange={e =>
                  setRegistrationSettings({
                    ...registrationSettings,
                    registration_deadline: e.target.value,
                  })
                }
                className="bg-[#252525] border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Maximum Participants</Label>
              <Input
                type="number"
                placeholder="Leave empty for unlimited"
                value={registrationSettings.max_participants}
                onChange={e =>
                  setRegistrationSettings({
                    ...registrationSettings,
                    max_participants: e.target.value,
                  })
                }
                className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-gray-300">Payment Options</Label>

              <div className="flex items-center justify-between bg-[#252525] p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#00A36C]" />
                  <span className="text-white">Allow Online Payment</span>
                </div>
                <Button
                  size="sm"
                  variant={registrationSettings.allow_online_payment ? 'default' : 'outline'}
                  onClick={() =>
                    setRegistrationSettings({
                      ...registrationSettings,
                      allow_online_payment: !registrationSettings.allow_online_payment,
                    })
                  }
                  className={cn(
                    registrationSettings.allow_online_payment
                      ? 'bg-[#00A36C] hover:bg-[#00A36C]/90'
                      : 'bg-transparent border-white/10 text-white'
                  )}
                >
                  {registrationSettings.allow_online_payment ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              <div className="flex items-center justify-between bg-[#252525] p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#B8860B]" />
                  <span className="text-white">Allow Cash Payment</span>
                </div>
                <Button
                  size="sm"
                  variant={registrationSettings.allow_cash_payment ? 'default' : 'outline'}
                  onClick={() =>
                    setRegistrationSettings({
                      ...registrationSettings,
                      allow_cash_payment: !registrationSettings.allow_cash_payment,
                    })
                  }
                  className={cn(
                    registrationSettings.allow_cash_payment
                      ? 'bg-[#00A36C] hover:bg-[#00A36C]/90'
                      : 'bg-transparent border-white/10 text-white'
                  )}
                >
                  {registrationSettings.allow_cash_payment ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              {registrationSettings.allow_online_payment && (
                <div className="space-y-2 pt-2">
                  <Label className="text-gray-300">Payment Gateway</Label>
                  <Select
                    value={registrationSettings.payment_gateway}
                    onValueChange={(value: 'razorpay' | 'stripe') =>
                      setRegistrationSettings({
                        ...registrationSettings,
                        payment_gateway: value,
                      })
                    }
                  >
                    <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#252525] border-white/10">
                      <SelectItem value="razorpay">Razorpay</SelectItem>
                      <SelectItem value="stripe">Stripe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#00A36C]" />
              Pricing Configuration
            </h3>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-400">
                  Set prices for each selected membership type. Only types selected in the previous step are shown.
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {pricing
                .filter(p => registrationSettings.target_membership_types.includes(p.membership_type))
                .map((tier, index) => (
                  <div key={tier.membership_type} className="bg-[#252525] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-gray-300 flex items-center gap-2">
                        <Badge
                          className={cn(
                            'bg-gradient-to-r from-[#00A36C] to-[#B8860B] text-white border-0'
                          )}
                        >
                          {tier.membership_type}
                        </Badge>
                      </Label>
                      <span className="text-xs text-gray-400">INR</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400">₹</span>
                      <Input
                        type="number"
                        placeholder="0"
                        value={tier.price || ''}
                        onChange={e => {
                          const newPricing = [...pricing];
                          newPricing[index] = {
                            ...tier,
                            price: parseFloat(e.target.value) || 0,
                          };
                          setPricing(newPricing);
                        }}
                        className="pl-8 bg-[#1C1C1C] border-white/10 text-white text-lg font-semibold"
                      />
                    </div>
                  </div>
                ))}
            </div>

            {registrationSettings.target_membership_types.length === 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-400">
                    No membership types selected. Go back to Step 3 to select target audience.
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#00A36C]" />
                Custom Registration Fields
              </h3>
              <Button
                size="sm"
                onClick={() => {
                  setEditingField(null);
                  setNewField({
                    tempId: Date.now().toString(),
                    field_name: '',
                    field_label: '',
                    field_type: 'text',
                    field_options: [],
                    is_required: false,
                    placeholder: '',
                    help_text: '',
                    display_order: 0,
                  });
                  setIsAddFieldDialogOpen(true);
                }}
                className="bg-[#00A36C] hover:bg-[#00A36C]/90"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Field
              </Button>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-400">
                  <p className="font-semibold mb-1">Custom Form Builder</p>
                  <p>Add custom fields specific to this event/trip registration (e.g., Preferred Language, Dietary Preferences, Emergency Contact).</p>
                </div>
              </div>
            </div>

            {customFields.length === 0 ? (
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <div className="text-gray-400 mb-4">No custom fields added yet</div>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddFieldDialogOpen(true)}
                    className="bg-[#252525] border-white/10 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Field
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {customFields.map((field, index) => {
                  const Icon = getFieldTypeIcon(field.field_type);
                  return (
                    <Card
                      key={field.tempId}
                      className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-[#00A36C]/20 flex items-center justify-center text-[#00A36C] flex-shrink-0">
                              {typeof Icon === 'string' ? Icon : <Icon className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-white font-medium">{field.field_label}</h4>
                                {field.is_required && (
                                  <Badge className="h-5 bg-red-500/20 text-red-400 text-xs border-0">
                                    Required
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                Type: {field.field_type}
                                {field.field_options.length > 0 && (
                                  <span> · Options: {field.field_options.join(', ')}</span>
                                )}
                              </div>
                              {field.help_text && (
                                <div className="text-xs text-gray-500 mt-1">{field.help_text}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditField(field)}
                              className="h-8 w-8 p-0 hover:bg-white/5"
                            >
                              <Edit className="h-3 w-3 text-gray-400" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteField(field.tempId)}
                              className="h-8 w-8 p-0 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3 w-3 text-red-400" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </motion.div>
        );

      case 6:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Eye className="h-5 w-5 text-[#00A36C]" />
              Review & Publish
            </h3>

            {/* Basic Info Summary */}
            <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
              <CardContent className="p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#00A36C]" />
                  Basic Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <Badge className="bg-[#00A36C] text-white border-0">
                      {basicInfo.activity_type}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white font-medium">{basicInfo.activity_name}</span>
                  </div>
                  {basicInfo.destination && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Destination:</span>
                      <span className="text-white">{basicInfo.destination}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Duration:</span>
                    <span className="text-white">
                      {format(new Date(basicInfo.start_date), 'MMM dd')} -{' '}
                      {format(new Date(basicInfo.end_date), 'MMM dd, yyyy')} ({calculateDuration()})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Target Audience Summary */}
            <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
              <CardContent className="p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#00A36C]" />
                  Target Audience
                </h4>
                <div className="flex flex-wrap gap-2">
                  {registrationSettings.target_membership_types.map(type => (
                    <Badge key={type} className="bg-gradient-to-r from-[#00A36C] to-[#B8860B] text-white border-0">
                      {type}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Max Participants:</span>
                    <span className="text-white">
                      {registrationSettings.max_participants || 'Unlimited'}
                    </span>
                  </div>
                  {registrationSettings.registration_deadline && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Deadline:</span>
                      <span className="text-white">
                        {format(new Date(registrationSettings.registration_deadline), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pricing Summary */}
            <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
              <CardContent className="p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#00A36C]" />
                  Pricing
                </h4>
                <div className="space-y-2">
                  {pricing
                    .filter(p => registrationSettings.target_membership_types.includes(p.membership_type))
                    .map(tier => (
                      <div key={tier.membership_type} className="flex justify-between text-sm">
                        <span className="text-gray-400">{tier.membership_type}:</span>
                        <span className="text-white font-semibold">₹{tier.price.toLocaleString()}</span>
                      </div>
                    ))}
                </div>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="text-xs text-gray-400">
                    Payment: {registrationSettings.allow_online_payment && 'Online'}{' '}
                    {registrationSettings.allow_online_payment && registrationSettings.allow_cash_payment && '+'}{' '}
                    {registrationSettings.allow_cash_payment && 'Cash'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custom Fields Summary */}
            {customFields.length > 0 && (
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#00A36C]" />
                    Custom Fields ({customFields.length})
                  </h4>
                  <div className="space-y-1">
                    {customFields.map(field => (
                      <div key={field.tempId} className="text-sm text-gray-400">
                        • {field.field_label} ({field.field_type})
                        {field.is_required && <span className="text-red-400"> *</span>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Publish Options */}
            <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
              <CardContent className="p-4">
                <Label className="text-gray-300 mb-3 block">Publish Status</Label>
                <div className="space-y-2">
                  <div
                    onClick={() => setStatus('draft')}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg cursor-pointer border-2 transition-all',
                      status === 'draft'
                        ? 'bg-[#00A36C]/20 border-[#00A36C]'
                        : 'bg-[#1C1C1C] border-white/10 hover:border-white/20'
                    )}
                  >
                    <div>
                      <div className="text-white font-medium">Save as Draft</div>
                      <div className="text-xs text-gray-400">Not visible to members yet</div>
                    </div>
                    {status === 'draft' && <CheckCircle className="h-5 w-5 text-[#00A36C]" />}
                  </div>
                  <div
                    onClick={() => setStatus('published')}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg cursor-pointer border-2 transition-all',
                      status === 'published'
                        ? 'bg-[#00A36C]/20 border-[#00A36C]'
                        : 'bg-[#1C1C1C] border-white/10 hover:border-white/20'
                    )}
                  >
                    <div>
                      <div className="text-white font-medium">Publish Now</div>
                      <div className="text-xs text-gray-400">Visible to members immediately</div>
                    </div>
                    {status === 'published' && <CheckCircle className="h-5 w-5 text-[#00A36C]" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <MobileLayout title="Create Event / Trip">
      <div className="px-4 py-4 pb-24">
        {/* Progress Indicator */}
        <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm text-[#00A36C] font-semibold">
                {Math.round((currentStep / totalSteps) * 100)}%
              </span>
            </div>
            <div className="w-full bg-[#1C1C1C] rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-[#00A36C] to-[#B8860B] h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Basic</span>
              <span>Media</span>
              <span>Audience</span>
              <span>Pricing</span>
              <span>Fields</span>
              <span>Review</span>
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>

        {/* Navigation Buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#1C1C1C] border-t border-white/10 p-4">
          <div className="flex gap-3 max-w-screen-sm mx-auto">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={prevStep}
                className="flex-1 bg-[#252525] border-white/10 text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            {currentStep < totalSteps ? (
              <Button onClick={nextStep} className="flex-1 bg-[#00A36C] hover:bg-[#00A36C]/90">
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => createEventMutation.mutate()}
                disabled={createEventMutation.isPending}
                className="flex-1 bg-gradient-to-r from-[#00A36C] to-[#B8860B] hover:opacity-90"
              >
                {createEventMutation.isPending ? (
                  'Creating...'
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {status === 'draft' ? 'Save Draft' : 'Publish Event'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Add Field Dialog */}
      <Dialog open={isAddFieldDialogOpen} onOpenChange={setIsAddFieldDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-y-auto bg-[#1C1C1C] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingField ? 'Edit Custom Field' : 'Add Custom Field'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a custom registration field for this event/trip
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Field Name (Internal) *</Label>
              <Input
                placeholder="e.g., preferred_language"
                value={newField.field_name}
                onChange={e => setNewField({ ...newField, field_name: e.target.value })}
                className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
              />
              <p className="text-xs text-gray-500">
                Used for database storage (lowercase, no spaces)
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Field Label (Display) *</Label>
              <Input
                placeholder="e.g., Preferred Language"
                value={newField.field_label}
                onChange={e => setNewField({ ...newField, field_label: e.target.value })}
                className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Field Type</Label>
              <Select
                value={newField.field_type}
                onValueChange={(value: any) => setNewField({ ...newField, field_type: value })}
              >
                <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#252525] border-white/10">
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="textarea">Textarea</SelectItem>
                  <SelectItem value="select">Select (Dropdown)</SelectItem>
                  <SelectItem value="radio">Radio Buttons</SelectItem>
                  <SelectItem value="checkbox">Checkboxes</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {['select', 'radio', 'checkbox'].includes(newField.field_type) && (
              <div className="space-y-2">
                <Label className="text-gray-300">Options (comma-separated)</Label>
                <Input
                  placeholder="e.g., Hindi, English, Gujarati"
                  value={newField.field_options.join(', ')}
                  onChange={e =>
                    setNewField({
                      ...newField,
                      field_options: e.target.value.split(',').map(o => o.trim()),
                    })
                  }
                  className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-gray-300">Placeholder Text</Label>
              <Input
                placeholder="e.g., Select your preferred language"
                value={newField.placeholder}
                onChange={e => setNewField({ ...newField, placeholder: e.target.value })}
                className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Help Text</Label>
              <Textarea
                placeholder="Additional instructions for this field"
                value={newField.help_text}
                onChange={e => setNewField({ ...newField, help_text: e.target.value })}
                rows={2}
                className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="flex items-center justify-between bg-[#252525] p-3 rounded-lg">
              <Label className="text-gray-300">Required Field</Label>
              <Button
                size="sm"
                variant={newField.is_required ? 'default' : 'outline'}
                onClick={() => setNewField({ ...newField, is_required: !newField.is_required })}
                className={cn(
                  newField.is_required
                    ? 'bg-[#00A36C] hover:bg-[#00A36C]/90'
                    : 'bg-transparent border-white/10 text-white'
                )}
              >
                {newField.is_required ? 'Yes' : 'No'}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddFieldDialogOpen(false);
                setEditingField(null);
              }}
              className="bg-[#252525] border-white/10 text-white"
            >
              Cancel
            </Button>
            <Button onClick={handleAddField} className="bg-[#00A36C] hover:bg-[#00A36C]/90">
              {editingField ? 'Update Field' : 'Add Field'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default EventTripCreation;
