import { useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loading } from '@/components/ui/loading';
import { useMemberData } from '@/hooks/useMemberData';
import { Download, FileImage, FileText, RefreshCw, CheckCircle, QrCode, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import QRCodeSVG from 'qrcode.react';

const IDCardPage = () => {
  const { user } = useAuth();
  const { member, loading } = useMemberData();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const requestIDUpdateMutation = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error('No member found');

      // Create a notification for admins
      const { error } = await supabase
        .from('admin_notifications')
        .insert({
          type: 'id_card_update_request',
          title: 'ID Card Update Request',
          message: `${member.full_name} (ID: ${member.id?.slice(0, 8)}) has requested an ID card update.`,
          member_id: member.id,
          priority: 'normal'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Request Submitted",
        description: "Your ID card update request has been sent to administrators.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    }
  });

  const downloadAsImage = async () => {
    if (!cardRef.current) return;

    try {
      setDownloading(true);

      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#1C1C1C',
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `mahaveer-bhavan-id-${member?.id?.slice(0, 8)}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 1.0);
      link.click();

      toast({
        title: "Download Complete",
        description: "ID card saved as JPG image",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Could not download ID card image",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const downloadAsPDF = async () => {
    if (!cardRef.current) return;

    try {
      setDownloading(true);

      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#1C1C1C',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 85;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const x = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
      const y = 20;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`mahaveer-bhavan-id-${member?.id?.slice(0, 8)}.pdf`);

      toast({
        title: "Download Complete",
        description: "ID card saved as PDF",
      });
    } catch (error) {
      console.error('PDF error:', error);
      toast({
        title: "Download Failed",
        description: "Could not download ID card PDF",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <MobileLayout title="Digital ID Card">
        <div className="flex justify-center items-center min-h-screen bg-[#1C1C1C]">
          <Loading size="lg" text="Loading your ID card..." />
        </div>
      </MobileLayout>
    );
  }

  if (!member) {
    return (
      <MobileLayout title="Digital ID Card">
        <div className="text-center py-8 px-4 bg-[#1C1C1C] min-h-screen">
          <p className="text-gray-400">Member profile not found. Please complete your registration.</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Digital ID Card">
      <div className="min-h-screen bg-[#1C1C1C] py-6 px-4">
        {/* Instructional Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-r from-[#00A36C]/20 to-[#B8860B]/20 border-[#00A36C]/30">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-[#00A36C] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">About Your Digital ID</h3>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    Present this ID at events and activities. The QR code allows instant verification by administrators for secure check-in.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Digital ID Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-6"
        >
          <div
            ref={cardRef}
            className="relative mx-auto max-w-md bg-gradient-to-br from-[#252525] via-[#2a2a2a] to-[#1C1C1C] rounded-3xl overflow-hidden shadow-2xl"
            style={{
              border: '2px solid',
              borderImage: 'linear-gradient(135deg, #B8860B, #00A36C) 1',
            }}
          >
            {/* Decorative Pattern Overlay */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)',
              }} />
            </div>

            {/* Card Header with Trust Branding */}
            <div className="relative bg-gradient-to-r from-[#00A36C] to-[#008556] p-6 text-center">
              <div className="flex justify-center mb-3">
                <div className="h-16 w-16 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">श्री</span>
                </div>
              </div>
              <h2 className="text-white font-bold text-lg mb-1">
                Sree Mahaveer Swami
              </h2>
              <p className="text-white/90 text-sm font-medium">
                Charitable Trust
              </p>
            </div>

            {/* Card Body */}
            <div className="relative p-6 space-y-6">
              {/* Member Photo and Details */}
              <div className="flex items-start gap-4">
                <div className="relative flex-shrink-0">
                  <Avatar className="h-24 w-24 border-4 border-[#B8860B] shadow-xl">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-[#00A36C] to-[#008556] text-white text-2xl font-bold">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-[#B8860B] text-white border-2 border-[#1C1C1C] shadow-lg text-xs px-2">
                      {member.membership_type || 'Member'}
                    </Badge>
                  </div>
                </div>

                <div className="flex-1 pt-2">
                  <h3 className="text-white font-bold text-xl mb-2 leading-tight">
                    {member.full_name}
                  </h3>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">Member ID:</span>
                      <span className="text-[#B8860B] font-mono font-semibold text-sm">
                        {member.id?.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    {member.date_of_birth && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs">DOB:</span>
                        <span className="text-white text-xs">
                          {new Date(member.date_of_birth).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="flex items-center justify-center pt-4 pb-2">
                <div className="bg-white p-4 rounded-2xl shadow-xl">
                  <QRCodeSVG
                    value={`MAHAVEER_MEMBER:${member.id}`}
                    size={140}
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>

              <div className="text-center">
                <p className="text-gray-400 text-xs flex items-center justify-center gap-2">
                  <QrCode className="h-3 w-3" />
                  Scan for instant verification
                </p>
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">Status</p>
                  <Badge className={cn(
                    "flex items-center gap-1",
                    member.status === 'active'
                      ? "bg-[#00A36C]/20 text-[#00A36C] border border-[#00A36C]/30"
                      : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                  )}>
                    <CheckCircle className="h-3 w-3" />
                    {member.status || 'Active'}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs mb-0.5">Valid Until</p>
                  <p className="text-white text-sm font-semibold">
                    Lifetime
                  </p>
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="relative bg-gradient-to-r from-[#B8860B]/20 to-[#00A36C]/20 p-4 text-center border-t border-white/10">
              <p className="text-gray-400 text-xs">
                This digital ID is property of Sree Mahaveer Swami Charitable Trust
              </p>
            </div>
          </div>
        </motion.div>

        {/* Download Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="space-y-3 mb-6"
        >
          <h3 className="text-white font-semibold text-sm mb-3">Download Options</h3>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={downloadAsPDF}
              disabled={downloading}
              className="bg-gradient-to-r from-[#B8860B] to-[#9a7209] hover:from-[#9a7209] hover:to-[#B8860B] text-white font-semibold h-auto py-4 flex flex-col items-center gap-2"
            >
              {downloading ? (
                <Loading size="sm" />
              ) : (
                <>
                  <FileText className="h-6 w-6" />
                  <span className="text-xs">Download PDF</span>
                </>
              )}
            </Button>

            <Button
              onClick={downloadAsImage}
              disabled={downloading}
              className="bg-gradient-to-r from-[#00A36C] to-[#008556] hover:from-[#008556] hover:to-[#00A36C] text-white font-semibold h-auto py-4 flex flex-col items-center gap-2"
            >
              {downloading ? (
                <Loading size="sm" />
              ) : (
                <>
                  <FileImage className="h-6 w-6" />
                  <span className="text-xs">Download JPG</span>
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* ID Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-4 space-y-4">
              <div>
                <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-[#B8860B]" />
                  ID Card Management
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed mb-4">
                  If you've recently updated your profile photo, name, or membership information, you can request a new ID card from administrators.
                </p>
              </div>

              <Button
                onClick={() => requestIDUpdateMutation.mutate()}
                disabled={requestIDUpdateMutation.isPending}
                variant="outline"
                className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-[#B8860B]"
              >
                {requestIDUpdateMutation.isPending ? (
                  <>
                    <Loading size="sm" />
                    <span className="ml-2">Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Request ID Card Update
                  </>
                )}
              </Button>

              <div className="pt-3 border-t border-white/10">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-500 text-xs leading-relaxed">
                    Your request will be reviewed by administrators. You'll receive a notification once your updated ID card is ready.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Usage Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="mt-6"
        >
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <QrCode className="h-4 w-4 text-[#00A36C]" />
                How to Use Your ID
              </h3>
              <ul className="space-y-2 text-gray-400 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-[#00A36C] font-bold mt-0.5">•</span>
                  <span>Present this digital ID at all Trust events and activities</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00A36C] font-bold mt-0.5">•</span>
                  <span>Allow event staff to scan the QR code for instant check-in</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00A36C] font-bold mt-0.5">•</span>
                  <span>Download and save offline for areas with poor connectivity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00A36C] font-bold mt-0.5">•</span>
                  <span>Keep your profile information up-to-date for accurate ID details</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default IDCardPage;
