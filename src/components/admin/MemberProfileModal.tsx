import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Activity, CreditCard, Shield, Calendar, DollarSign, LogIn, Edit, Save, KeyRound } from "lucide-react";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";

interface MemberProfileModalProps {
  memberId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MemberProfileModal({ memberId, isOpen, onClose }: MemberProfileModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // Fetch member data
  const { data: member, isLoading } = useQuery({
    queryKey: ['member-profile', memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (error) throw error;
      setFormData(data);
      return data;
    },
    enabled: isOpen && !!memberId
  });

  // Fetch activity data
  const { data: activities } = useQuery({
    queryKey: ['member-activities', memberId],
    queryFn: async () => {
      const activities: any[] = [];

      // Fetch event registrations
      const { data: events } = await supabase
        .from('event_registrations')
        .select(`
          id,
          registered_at,
          attended,
          status,
          events(title, date)
        `)
        .eq('member_id', memberId)
        .order('registered_at', { ascending: false });

      events?.forEach(event => {
        activities.push({
          type: 'event',
          title: event.events?.title,
          date: event.events?.date,
          attended: event.attended,
          timestamp: event.registered_at
        });
      });

      // Fetch donations
      const { data: donations } = await supabase
        .from('donations')
        .select('id, amount, created_at, payment_status')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      donations?.forEach(donation => {
        activities.push({
          type: 'donation',
          amount: donation.amount,
          status: donation.payment_status,
          timestamp: donation.created_at
        });
      });

      // Fetch user profile for last login
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('last_login, login_count')
        .eq('auth_id', member?.auth_id)
        .single();

      if (profile?.last_login) {
        activities.push({
          type: 'login',
          loginCount: profile.login_count,
          timestamp: profile.last_login
        });
      }

      // Sort all activities by timestamp
      return activities.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    },
    enabled: isOpen && !!memberId && !!member
  });

  // Update member mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('members')
        .update(data)
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-profile', memberId] });
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      toast({
        title: "Success",
        description: "Member profile updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update member profile",
        variant: "destructive",
      });
    }
  });

  // Password reset mutation
  const passwordResetMutation = useMutation({
    mutationFn: async () => {
      if (!member?.email) throw new Error("No email found");

      const { error } = await supabase.auth.resetPasswordForEmail(member.email, {
        redirectTo: `${window.location.origin}/change-password`
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Password Reset Sent",
        description: "Password reset email has been sent to the member",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleStatusToggle = (checked: boolean) => {
    const newStatus = checked ? 'active' : 'deactivated';
    setFormData({ ...formData, status: newStatus });
    updateMutation.mutate({ status: newStatus });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Member Profile: {member?.full_name}
            <Badge variant={member?.status === 'active' ? 'default' : 'secondary'}>
              {member?.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="h-4 w-4 mr-2" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="idcard">
              <CreditCard className="h-4 w-4 mr-2" />
              ID Card
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Personal Information</h3>
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button onClick={handleSave} size="sm" disabled={updateMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button onClick={() => {
                        setIsEditing(false);
                        setFormData(member);
                      }} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Member ID</Label>
                    <Input value={member?.id} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Membership Type</Label>
                    {isEditing ? (
                      <Select value={formData.membership_type} onValueChange={(value) => setFormData({...formData, membership_type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Karyakarta">Karyakarta (KR)</SelectItem>
                          <SelectItem value="Tapasvi">Tapasvi (TP)</SelectItem>
                          <SelectItem value="Labharti">Labharti (LB)</SelectItem>
                          <SelectItem value="Trustee">Trustee (TR)</SelectItem>
                          <SelectItem value="Extra">Extra (EX)</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={member?.membership_type} disabled />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={member?.email} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    {isEditing ? (
                      <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={member?.gender} disabled />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Postal Code</Label>
                    <Input
                      value={formData.postal_code}
                      onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {activities?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No activity recorded yet
                  </div>
                ) : (
                  activities?.map((activity, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            {activity.type === 'event' && <Calendar className="h-5 w-5 text-blue-500" />}
                            {activity.type === 'donation' && <DollarSign className="h-5 w-5 text-green-500" />}
                            {activity.type === 'login' && <LogIn className="h-5 w-5 text-purple-500" />}
                          </div>
                          <div className="flex-1">
                            {activity.type === 'event' && (
                              <>
                                <p className="font-medium">Event Registration: {activity.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  Attended: {activity.attended ? 'Yes' : 'No'} " {format(new Date(activity.date), 'MMM dd, yyyy')}
                                </p>
                              </>
                            )}
                            {activity.type === 'donation' && (
                              <>
                                <p className="font-medium">Donation: ¹{Number(activity.amount).toLocaleString('en-IN')}</p>
                                <p className="text-sm text-muted-foreground">
                                  Status: {activity.status} " {format(new Date(activity.timestamp), 'MMM dd, yyyy')}
                                </p>
                              </>
                            )}
                            {activity.type === 'login' && (
                              <>
                                <p className="font-medium">Last Login</p>
                                <p className="text-sm text-muted-foreground">
                                  Total logins: {activity.loginCount} " {format(new Date(activity.timestamp), 'MMM dd, yyyy HH:mm')}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ID Card Tab */}
          <TabsContent value="idcard" className="flex-1">
            <div className="flex items-center justify-center h-[500px]">
              <Card className="w-96">
                <CardHeader className="bg-primary text-primary-foreground">
                  <CardTitle className="text-center">Member ID Card</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="text-center">
                    <div className="h-24 w-24 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                      <User className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold">{member?.full_name}</h3>
                    <p className="text-muted-foreground">{member?.membership_type}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID:</span>
                      <span className="font-mono font-bold">{member?.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="truncate ml-2">{member?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{member?.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={member?.status === 'active' ? 'default' : 'secondary'}>
                        {member?.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="pt-4">
                    <Button className="w-full">
                      Download ID Card
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="flex-1">
            <div className="h-[500px] p-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Account Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Account Active</p>
                      <p className="text-sm text-muted-foreground">
                        {member?.status === 'active' ? 'Member can access the system' : 'Member cannot access the system'}
                      </p>
                    </div>
                    <Switch
                      checked={member?.status === 'active'}
                      onCheckedChange={handleStatusToggle}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Password Reset</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Send a password reset link to the member's email address.
                  </p>
                  <Button
                    onClick={() => passwordResetMutation.mutate()}
                    disabled={passwordResetMutation.isPending}
                  >
                    <KeyRound className="h-4 w-4 mr-2" />
                    Send Password Reset Email
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Member Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{member?.created_at && format(new Date(member.created_at), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span>{member?.updated_at && format(new Date(member.updated_at), 'MMM dd, yyyy')}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
