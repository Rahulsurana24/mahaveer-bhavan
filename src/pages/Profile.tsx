import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Camera,
  Lock,
  Bell,
  Heart,
  CreditCard,
  Shield,
  Eye,
  EyeOff,
  Save,
  Edit2,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMemberData } from "@/hooks/useMemberData";
import { Loading } from "@/components/ui/loading";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const Profile = () => {
  const { member, loading, error } = useMemberData();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (member) {
      setFormData({
        full_name: member.full_name || '',
        email: member.email || '',
        phone: member.phone || '',
        address: member.address || '',
        city: member.city || '',
        state: member.state || '',
        postal_code: member.postal_code || '',
        emergency_contact_name: member.emergency_contact_name || '',
        emergency_contact_phone: member.emergency_contact_phone || '',
        emergency_contact_relationship: member.emergency_contact_relationship || '',
        notification_email: member.notification_email ?? true,
        notification_sms: member.notification_sms ?? true,
        notification_whatsapp: member.notification_whatsapp ?? true
      });
    }
  }, [member]);

  // Fetch event registrations count
  const { data: eventCount } = useQuery({
    queryKey: ['event-registrations-count', member?.id],
    queryFn: async () => {
      if (!member) return 0;
      const { count, error } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('member_id', member.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!member
  });

  // Fetch donation summary
  const { data: donationSummary } = useQuery({
    queryKey: ['donation-summary', member?.id],
    queryFn: async () => {
      if (!member) return { total: 0, count: 0 };
      const { data, error } = await supabase
        .from('donations')
        .select('amount')
        .eq('member_id', member.id)
        .eq('status', 'completed');

      if (error) throw error;

      const total = data.reduce((sum, d) => sum + (d.amount || 0), 0);
      return { total, count: data.length };
    },
    enabled: !!member
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !member) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${member.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('member-photos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', member.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Profile photo updated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    } catch (error: any) {
      console.error('Photo upload error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!member) throw new Error('No member found');

      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          postal_code: data.postal_code,
          emergency_contact_name: data.emergency_contact_name,
          emergency_contact_phone: data.emergency_contact_phone,
          emergency_contact_relationship: data.emergency_contact_relationship,
          notification_email: data.notification_email,
          notification_sms: data.notification_sms,
          notification_whatsapp: data.notification_whatsapp
        })
        .eq('id', member.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      if (data.newPassword !== data.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (data.newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    }
  });

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  if (loading) {
    return (
      <MobileLayout title="Profile">
        <div className="flex justify-center items-center min-h-screen bg-[#1C1C1C]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  if (error || !member) {
    return (
      <MobileLayout title="Profile">
        <div className="flex justify-center items-center min-h-screen bg-[#1C1C1C]">
          <p className="text-gray-400">Failed to load profile. Please try again.</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Profile">
      <div className="min-h-screen bg-[#1C1C1C] pb-6">
        {/* Profile Header with Large Image */}
        <div className="bg-gradient-to-b from-[#252525] to-[#1C1C1C] px-6 py-8 border-b border-white/10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <div className="relative mb-6">
              <Avatar className="h-32 w-32 border-4 border-[#B8860B] shadow-2xl">
                <AvatarImage src={member.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-[#00A36C] to-[#008556] text-white text-4xl font-bold">
                  {getInitials(member.full_name)}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-full bg-gradient-to-r from-[#00A36C] to-[#008556] hover:from-[#008556] hover:to-[#00A36C] shadow-lg"
                  asChild
                  disabled={uploading}
                >
                  <span>
                    <Camera className="h-5 w-5" />
                  </span>
                </Button>
              </label>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">{member.full_name}</h2>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              <Badge className="bg-[#B8860B]/20 text-[#B8860B] border border-[#B8860B]/30">
                <CreditCard className="h-3 w-3 mr-1" />
                ID: {member.id?.slice(0, 8)}
              </Badge>
              <Badge className="bg-[#00A36C]/20 text-[#00A36C] border border-[#00A36C]/30">
                {member.membership_type || 'Member'}
              </Badge>
              <Badge className={cn(
                "border",
                member.status === 'active'
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-gray-500/20 text-gray-400 border-gray-500/30"
              )}>
                <CheckCircle className="h-3 w-3 mr-1" />
                {member.status}
              </Badge>
            </div>

            {/* Primary Details */}
            <div className="space-y-2 text-center">
              {member.date_of_birth && (
                <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>Born {new Date(member.date_of_birth).toLocaleDateString()}</span>
                </div>
              )}
              {member.gender && (
                <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                  <User className="h-4 w-4" />
                  <span>{member.gender}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Editable Sections */}
        <div className="px-4 mt-6 space-y-4">
          {/* Edit Mode Toggle */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-white">Profile Information</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="bg-white/5 border-white/10 text-[#B8860B] hover:bg-white/10"
            >
              {isEditing ? <Save className="h-4 w-4 mr-2" /> : <Edit2 className="h-4 w-4 mr-2" />}
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          </div>

          {/* Contact Details */}
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Phone className="h-5 w-5 text-[#B8860B]" />
                Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-400 text-sm">Email Address</Label>
                <Input
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-white/5 border-white/10 text-white opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-400 text-sm">Phone Number</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  disabled={!isEditing}
                  className="bg-white/5 border-white/10 text-white disabled:opacity-50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Address Details */}
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#B8860B]" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-400 text-sm">Street Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  disabled={!isEditing}
                  className="bg-white/5 border-white/10 text-white disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-400 text-sm">City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    disabled={!isEditing}
                    className="bg-white/5 border-white/10 text-white disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-400 text-sm">State/Province</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    disabled={!isEditing}
                    className="bg-white/5 border-white/10 text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-400 text-sm">Postal/Zip Code</Label>
                <Input
                  value={formData.postal_code}
                  onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                  disabled={!isEditing}
                  className="bg-white/5 border-white/10 text-white disabled:opacity-50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#B8860B]" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-400 text-sm">Contact Name</Label>
                <Input
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                  disabled={!isEditing}
                  className="bg-white/5 border-white/10 text-white disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-400 text-sm">Contact Phone</Label>
                <Input
                  type="tel"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                  disabled={!isEditing}
                  className="bg-white/5 border-white/10 text-white disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-400 text-sm">Relationship</Label>
                <Input
                  value={formData.emergency_contact_relationship}
                  onChange={(e) => setFormData({...formData, emergency_contact_relationship: e.target.value})}
                  disabled={!isEditing}
                  placeholder="e.g., Spouse, Parent, Sibling"
                  className="bg-white/5 border-white/10 text-white disabled:opacity-50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Changes Button */}
          {isEditing && (
            <Button
              onClick={() => updateProfileMutation.mutate(formData)}
              disabled={updateProfileMutation.isPending}
              className="w-full bg-gradient-to-r from-[#00A36C] to-[#008556] hover:from-[#008556] hover:to-[#00A36C] font-semibold"
              size="lg"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loading size="sm" />
                  <span className="ml-2">Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save All Changes
                </>
              )}
            </Button>
          )}

          {/* Account Security */}
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Lock className="h-5 w-5 text-[#B8860B]" />
                Account Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="password" className="border-white/10">
                  <AccordionTrigger className="text-white hover:text-[#B8860B]">
                    Change Password
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label className="text-gray-400 text-sm">Current Password</Label>
                      <div className="relative">
                        <Input
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                          className="bg-white/5 border-white/10 text-white pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full text-gray-400 hover:text-white"
                          onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                        >
                          {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-400 text-sm">New Password</Label>
                      <div className="relative">
                        <Input
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                          className="bg-white/5 border-white/10 text-white pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full text-gray-400 hover:text-white"
                          onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                        >
                          {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-400 text-sm">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                          className="bg-white/5 border-white/10 text-white pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full text-gray-400 hover:text-white"
                          onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                        >
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <Button
                      onClick={() => changePasswordMutation.mutate(passwordData)}
                      disabled={changePasswordMutation.isPending || !passwordData.currentPassword || !passwordData.newPassword}
                      className="w-full bg-gradient-to-r from-[#B8860B] to-[#9a7209] hover:from-[#9a7209] hover:to-[#B8860B]"
                    >
                      {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Bell className="h-5 w-5 text-[#B8860B]" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white text-sm">Email Notifications</Label>
                  <p className="text-xs text-gray-400">Receive updates via email</p>
                </div>
                <Switch
                  checked={formData.notification_email}
                  onCheckedChange={(checked) => {
                    setFormData({...formData, notification_email: checked});
                    if (!isEditing) {
                      updateProfileMutation.mutate({...formData, notification_email: checked});
                    }
                  }}
                  className="data-[state=checked]:bg-[#00A36C]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white text-sm">SMS Notifications</Label>
                  <p className="text-xs text-gray-400">Receive text messages</p>
                </div>
                <Switch
                  checked={formData.notification_sms}
                  onCheckedChange={(checked) => {
                    setFormData({...formData, notification_sms: checked});
                    if (!isEditing) {
                      updateProfileMutation.mutate({...formData, notification_sms: checked});
                    }
                  }}
                  className="data-[state=checked]:bg-[#00A36C]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white text-sm">WhatsApp Messages</Label>
                  <p className="text-xs text-gray-400">Receive WhatsApp updates</p>
                </div>
                <Switch
                  checked={formData.notification_whatsapp}
                  onCheckedChange={(checked) => {
                    setFormData({...formData, notification_whatsapp: checked});
                    if (!isEditing) {
                      updateProfileMutation.mutate({...formData, notification_whatsapp: checked});
                    }
                  }}
                  className="data-[state=checked]:bg-[#00A36C]"
                />
              </div>
            </CardContent>
          </Card>

          {/* System Records */}
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#B8860B]" />
                System Records
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <div>
                  <p className="text-white text-sm font-medium">Member Since</p>
                  <p className="text-gray-400 text-xs">
                    {new Date(member.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <Badge className="bg-[#00A36C]/20 text-[#00A36C] border border-[#00A36C]/30">
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">Total Donations</p>
                  <p className="text-gray-400 text-xs">
                    {donationSummary?.count || 0} donations made
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[#B8860B] text-lg font-bold">
                    ₹{(donationSummary?.total || 0).toLocaleString()}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/donations')}
                    className="text-xs text-gray-400 hover:text-[#B8860B] h-auto p-0"
                  >
                    View History →
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-white text-sm font-medium">Event Registrations</p>
                  <p className="text-gray-400 text-xs">Events attended or registered</p>
                </div>
                <div className="text-right">
                  <p className="text-[#00A36C] text-2xl font-bold">{eventCount || 0}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/events')}
                    className="text-xs text-gray-400 hover:text-[#00A36C] h-auto p-0"
                  >
                    View Events →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Profile;
