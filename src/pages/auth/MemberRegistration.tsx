import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Camera, Check, Loader2, Upload, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Registration form schema
const registrationSchema = z.object({
  // Step 1: Personal Information
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  email: z.string().email('Invalid email address'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['Male', 'Female', 'Other'], { required_error: 'Gender is required' }),

  // Step 2: Address
  street_address: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postal_code: z.string().min(5, 'Postal code is required'),
  country: z.string().min(2, 'Country is required'),

  // Step 3: Membership & Emergency
  role_id: z.string().min(1, 'Membership type is required'),
  emergency_contact_name: z.string().min(2, 'Emergency contact name is required'),
  emergency_contact_phone: z.string().min(10, 'Emergency contact phone is required'),
  emergency_contact_relationship: z.string().min(2, 'Relationship is required'),

  // Password
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string()
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const MemberRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: 'onBlur'
  });

  // Fetch user roles
  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid File',
          description: 'Please select an image file',
          variant: 'destructive'
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Image must be less than 5MB',
          variant: 'destructive'
        });
        return;
      }

      setPhotoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // Step navigation
  const goToNextStep = async () => {
    let fieldsToValidate: (keyof RegistrationFormData)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ['full_name', 'phone', 'email', 'date_of_birth', 'gender'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['street_address', 'city', 'state', 'postal_code', 'country'];
    } else if (currentStep === 3) {
      fieldsToValidate = ['role_id', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship'];
    }

    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      setCurrentStep(currentStep + 1);
    } else {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields correctly',
        variant: 'destructive'
      });
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit registration
  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Upload photo if provided
      let photoUrl = null;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${authData.user.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('member-photos')
          .upload(fileName, photoFile);

        if (uploadError) {
          console.error('Photo upload error:', uploadError);
          // Continue even if photo upload fails
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('member-photos')
            .getPublicUrl(fileName);
          photoUrl = publicUrl;
        }
      }

      // Create member profile
      const { error: memberError } = await supabase
        .from('members')
        .insert([{
          auth_id: authData.user.id,
          full_name: data.full_name,
          phone: data.phone,
          email: data.email,
          date_of_birth: data.date_of_birth,
          gender: data.gender,
          street_address: data.street_address,
          city: data.city,
          state: data.state,
          postal_code: data.postal_code,
          country: data.country,
          role_id: data.role_id,
          emergency_contact_name: data.emergency_contact_name,
          emergency_contact_phone: data.emergency_contact_phone,
          emergency_contact_relationship: data.emergency_contact_relationship,
          photo_url: photoUrl,
          status: 'pending', // Pending approval by admin
          date_registered: new Date().toISOString()
        }]);

      if (memberError) throw memberError;

      toast({
        title: 'Registration Successful!',
        description: 'Your account has been created. Please check your email to verify your account.'
      });

      navigate('/auth/registration-success');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'An error occurred during registration',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1C1C1C] to-[#2D2D2D] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-4 border-2 border-[#00A36C]">
            <img
              src="/lovable-uploads/b6ff16cc-cf72-4a45-807f-fe1e91fcd72d.png"
              alt="Logo"
              className="w-16 h-16 rounded-full"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Member Registration</h1>
          <p className="text-gray-400">Join the Sree Mahaveer Seva Community</p>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6 bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-300 mb-2">
                <span>Step {currentStep} of {totalSteps}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-gray-400 mt-3">
                <span className={currentStep >= 1 ? 'text-[#00A36C]' : ''}>Personal</span>
                <span className={currentStep >= 2 ? 'text-[#00A36C]' : ''}>Address</span>
                <span className={currentStep >= 3 ? 'text-[#00A36C]' : ''}>Membership</span>
                <span className={currentStep >= 4 ? 'text-[#00A36C]' : ''}>Photo & Finish</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">
                {currentStep === 1 && 'Personal Information'}
                {currentStep === 2 && 'Address Details'}
                {currentStep === 3 && 'Membership & Emergency Contact'}
                {currentStep === 4 && 'Photo Upload & Password'}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {currentStep === 1 && 'Basic personal details'}
                {currentStep === 2 && 'Your residential address'}
                {currentStep === 3 && 'Select membership type and emergency contact'}
                {currentStep === 4 && 'Upload photo and set your password'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-gray-300">Full Name *</Label>
                    <Input
                      id="full_name"
                      {...register('full_name')}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                      placeholder="Enter your full name"
                    />
                    {errors.full_name && (
                      <p className="text-sm text-red-400">{errors.full_name.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-gray-300">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        {...register('phone')}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                        placeholder="+91 1234567890"
                      />
                      {errors.phone && (
                        <p className="text-sm text-red-400">{errors.phone.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        {...register('email')}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                        placeholder="email@example.com"
                      />
                      {errors.email && (
                        <p className="text-sm text-red-400">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth" className="text-gray-300">Date of Birth *</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        {...register('date_of_birth')}
                        className="bg-white/10 border-white/20 text-white"
                      />
                      {errors.date_of_birth && (
                        <p className="text-sm text-red-400">{errors.date_of_birth.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender" className="text-gray-300">Gender *</Label>
                      <Select onValueChange={(value) => setValue('gender', value as any)}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.gender && (
                        <p className="text-sm text-red-400">{errors.gender.message}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Address */}
              {currentStep === 2 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="street_address" className="text-gray-300">Street Address *</Label>
                    <Input
                      id="street_address"
                      {...register('street_address')}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                      placeholder="123 Main Street, Apartment 4B"
                    />
                    {errors.street_address && (
                      <p className="text-sm text-red-400">{errors.street_address.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-gray-300">City *</Label>
                      <Input
                        id="city"
                        {...register('city')}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                        placeholder="Mumbai"
                      />
                      {errors.city && (
                        <p className="text-sm text-red-400">{errors.city.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-gray-300">State *</Label>
                      <Input
                        id="state"
                        {...register('state')}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                        placeholder="Maharashtra"
                      />
                      {errors.state && (
                        <p className="text-sm text-red-400">{errors.state.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postal_code" className="text-gray-300">Postal Code *</Label>
                      <Input
                        id="postal_code"
                        {...register('postal_code')}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                        placeholder="400001"
                      />
                      {errors.postal_code && (
                        <p className="text-sm text-red-400">{errors.postal_code.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-gray-300">Country *</Label>
                      <Input
                        id="country"
                        {...register('country')}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                        placeholder="India"
                        defaultValue="India"
                      />
                      {errors.country && (
                        <p className="text-sm text-red-400">{errors.country.message}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Membership & Emergency Contact */}
              {currentStep === 3 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="role_id" className="text-gray-300">Membership Type *</Label>
                    {rolesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-[#00A36C]" />
                      </div>
                    ) : (
                      <Select onValueChange={(value) => setValue('role_id', value)}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select membership type" />
                        </SelectTrigger>
                        <SelectContent>
                          {userRoles?.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {errors.role_id && (
                      <p className="text-sm text-red-400">{errors.role_id.message}</p>
                    )}
                  </div>

                  <Alert className="bg-blue-500/10 border-blue-500/30">
                    <AlertDescription className="text-sm text-gray-300">
                      Emergency contact will be notified in case of urgent situations during events or trips.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_name" className="text-gray-300">Emergency Contact Name *</Label>
                    <Input
                      id="emergency_contact_name"
                      {...register('emergency_contact_name')}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                      placeholder="Full name"
                    />
                    {errors.emergency_contact_name && (
                      <p className="text-sm text-red-400">{errors.emergency_contact_name.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_phone" className="text-gray-300">Emergency Contact Phone *</Label>
                      <Input
                        id="emergency_contact_phone"
                        type="tel"
                        {...register('emergency_contact_phone')}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                        placeholder="+91 1234567890"
                      />
                      {errors.emergency_contact_phone && (
                        <p className="text-sm text-red-400">{errors.emergency_contact_phone.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_relationship" className="text-gray-300">Relationship *</Label>
                      <Input
                        id="emergency_contact_relationship"
                        {...register('emergency_contact_relationship')}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                        placeholder="e.g., Spouse, Parent"
                      />
                      {errors.emergency_contact_relationship && (
                        <p className="text-sm text-red-400">{errors.emergency_contact_relationship.message}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Step 4: Photo & Password */}
              {currentStep === 4 && (
                <>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Profile Photo (Optional)</Label>
                    {!photoPreview ? (
                      <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center">
                        <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="hidden"
                          id="photo-upload"
                        />
                        <Label
                          htmlFor="photo-upload"
                          className="cursor-pointer inline-flex items-center gap-2 text-[#00A36C] hover:underline"
                        >
                          <Upload className="h-4 w-4" />
                          Choose Photo
                        </Label>
                        <p className="text-xs text-gray-400 mt-2">Max size: 5MB (JPG, PNG)</p>
                      </div>
                    ) : (
                      <div className="relative inline-block">
                        <img
                          src={photoPreview}
                          alt="Profile preview"
                          className="w-32 h-32 rounded-full object-cover border-4 border-[#00A36C]"
                        />
                        <Button
                          type="button"
                          onClick={removePhoto}
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 rounded-full h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <Alert className="bg-yellow-500/10 border-yellow-500/30">
                    <AlertDescription className="text-sm text-gray-300">
                      Create a secure password with at least 8 characters. You'll use this to login to your account.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-300">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      {...register('password')}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="Minimum 8 characters"
                    />
                    {errors.password && (
                      <p className="text-sm text-red-400">{errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm_password" className="text-gray-300">Confirm Password *</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      {...register('confirm_password')}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="Re-enter password"
                    />
                    {errors.confirm_password && (
                      <p className="text-sm text-red-400">{errors.confirm_password.message}</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 1 ? () => navigate('/auth/welcome') : goToPreviousStep}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {currentStep === 1 ? 'Cancel' : 'Previous'}
            </Button>

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={goToNextStep}
                className="bg-[#00A36C] hover:bg-[#008F5C] text-white"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#00A36C] hover:bg-[#008F5C] text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Complete Registration
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberRegistration;
