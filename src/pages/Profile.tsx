import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card3D } from "@/components/3d/Card3D";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Camera,
  QrCode,
  Edit,
  Save,
  Upload
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMemberData } from "@/hooks/useMemberData";
import { Loading } from "@/components/ui/loading";

const Profile = () => {
  const { member, loading, error } = useMemberData();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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
        emergency_contact: member.emergency_contact || {}
      });
    }
  }, [member]);

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
        .update({ photo_url: publicUrl })
        .eq('id', member.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Profile photo updated successfully",
      });

      window.location.reload();
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

  const handleSaveChanges = async () => {
    if (!member) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          emergency_contact: formData.emergency_contact
        })
        .eq('id', member.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditing(false);
    } catch (error: any) {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const getMembershipBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "Trustee": "default",
      "Tapasvi": "secondary",
      "Karyakarta": "outline",
      "Labharti": "destructive",
      "Extra": "secondary"
    };
    return <Badge variant={variants[type] || "outline"}>{type}</Badge>;
  };

  if (loading) {
    return (
      <MainLayout title="Profile">
        <div className="flex justify-center items-center min-h-screen bg-black">
          <Loading size="lg" text="Loading profile..." />
        </div>
      </MainLayout>
    );
  }

  if (error || !member) {
    return (
      <MainLayout title="Profile">
        <div className="flex justify-center items-center min-h-screen bg-black">
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="p-8 text-center">
              <p className="text-white/60">Failed to load profile. Please try again.</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Profile">
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 px-4 py-6 space-y-6">
        {/* Profile Header */}
        <Card3D intensity={8}>
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 rounded-full blur-2xl opacity-40"></div>
                  <Avatar className="relative h-24 w-24 border-4 border-orange-500 shadow-xl shadow-orange-500/30">
                    <AvatarImage src={member.photo_url} alt={member.full_name} />
                    <AvatarFallback className="text-lg bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold">
                      {member.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute -bottom-2 -right-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <Button
                      size="icon"
                      className="h-8 w-8 rounded-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 cursor-pointer shadow-lg"
                      asChild
                      disabled={uploading}
                    >
                      <span>
                        {uploading ? <Upload className="h-4 w-4 animate-pulse" /> : <Camera className="h-4 w-4" />}
                      </span>
                    </Button>
                  </label>
                </div>

                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-white">{member.full_name}</h1>
                      <p className="text-white/60 mt-1">{member.email}</p>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Badge variant="outline" className="font-mono bg-white/5 border-white/20 text-white">
                          {member.id?.slice(0, 8)}
                        </Badge>
                        <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
                          {member.membership_type}
                        </Badge>
                        <Badge className={member.status === 'active' ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/5 border-white/20 text-white/60"}>
                          {member.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 md:mt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/id-card')}
                        className="bg-white/5 border-white/20 text-white hover:bg-white/10 rounded-xl"
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        ID Card
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (isEditing) {
                            handleSaveChanges();
                          } else {
                            setIsEditing(true);
                          }
                        }}
                        className={isEditing
                          ? "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-xl"
                          : "bg-white/5 border-white/20 text-white hover:bg-white/10 rounded-xl"}
                      >
                        {isEditing ? (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </>
                        ) : (
                          <>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-white/80">
                      <Phone className="h-4 w-4 text-orange-500" />
                      <span>{member.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <Calendar className="h-4 w-4 text-orange-500" />
                      <span>Member since {new Date(member.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <MapPin className="h-4 w-4 text-orange-500" />
                      <span className="line-clamp-1">{member.address || 'No address provided'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <User className="h-4 w-4 text-orange-500" />
                      <span>{member.gender || 'Not specified'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Card3D>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
            <TabsTrigger value="personal" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white text-white/60">
              Personal Info
            </TabsTrigger>
            <TabsTrigger value="emergency" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white text-white/60">
              Emergency Contact
            </TabsTrigger>
          </TabsList>

          {/* Personal Information */}
          <TabsContent value="personal" className="space-y-6">
            <Card3D intensity={8}>
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <User className="h-5 w-5 text-orange-500" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="full-name" className="text-white/80">Full Name</Label>
                      <Input
                        id="full-name"
                        value={formData.full_name || ''}
                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                        disabled={!isEditing}
                        className="bg-white/5 border-white/10 text-white rounded-xl disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white/80">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        disabled={!isEditing}
                        className="bg-white/5 border-white/10 text-white rounded-xl disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-white/80">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        disabled={!isEditing}
                        className="bg-white/5 border-white/10 text-white rounded-xl disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="membership" className="text-white/80">Membership Type</Label>
                      <Input
                        id="membership"
                        value={member.membership_type}
                        disabled
                        className="bg-white/5 border-white/10 text-white rounded-xl opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-white/80">City</Label>
                      <Input
                        id="city"
                        value={formData.city || ''}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        disabled={!isEditing}
                        className="bg-white/5 border-white/10 text-white rounded-xl disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-white/80">State</Label>
                      <Input
                        id="state"
                        value={formData.state || ''}
                        onChange={(e) => setFormData({...formData, state: e.target.value})}
                        disabled={!isEditing}
                        className="bg-white/5 border-white/10 text-white rounded-xl disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal-code" className="text-white/80">Postal Code</Label>
                      <Input
                        id="postal-code"
                        value={formData.postal_code || ''}
                        onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                        disabled={!isEditing}
                        className="bg-white/5 border-white/10 text-white rounded-xl disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-white/80">Full Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      disabled={!isEditing}
                      rows={3}
                      className="bg-white/5 border-white/10 text-white rounded-xl disabled:opacity-50"
                    />
                  </div>
                </CardContent>
              </Card>
            </Card3D>
          </TabsContent>

          {/* Emergency Contact */}
          <TabsContent value="emergency" className="space-y-6">
            <Card3D intensity={8}>
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergency-name" className="text-white/80">Contact Name</Label>
                      <Input
                        id="emergency-name"
                        value={formData.emergency_contact?.name || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          emergency_contact: {...formData.emergency_contact, name: e.target.value}
                        })}
                        disabled={!isEditing}
                        className="bg-white/5 border-white/10 text-white rounded-xl disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency-relationship" className="text-white/80">Relationship</Label>
                      <Input
                        id="emergency-relationship"
                        value={formData.emergency_contact?.relationship || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          emergency_contact: {...formData.emergency_contact, relationship: e.target.value}
                        })}
                        disabled={!isEditing}
                        className="bg-white/5 border-white/10 text-white rounded-xl disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency-phone" className="text-white/80">Phone Number</Label>
                      <Input
                        id="emergency-phone"
                        type="tel"
                        value={formData.emergency_contact?.phone || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          emergency_contact: {...formData.emergency_contact, phone: e.target.value}
                        })}
                        disabled={!isEditing}
                        className="bg-white/5 border-white/10 text-white rounded-xl disabled:opacity-50"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Card3D>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Profile;