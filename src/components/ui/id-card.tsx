import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { generateMemberQRCode } from '@/utils/qrCode';
import { generateIDCardPDF } from '@/utils/pdfGenerator';
import { Button } from '@/components/ui/button';
import { Download, Share2, Printer, ArrowLeft, CheckCircle, Mail, Phone, Calendar, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface IDCardProps {
  member: {
    id: string;
    full_name: string;
    membership_type: string;
    photo_url: string;
    email: string;
    phone: string;
    created_at?: string;
    status?: string;
  };
}

export const IDCard = ({ member }: IDCardProps) => {
  const [qrCode, setQrCode] = useState<string>('');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const generateQR = async () => {
      try {
        const qrCodeData = await generateMemberQRCode(member.id);
        setQrCode(qrCodeData);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    };

    generateQR();
  }, [member.id]);

  const handleDownload = async () => {
    try {
      await generateIDCardPDF('member-id-card', `${member.full_name}-id-card.pdf`);
      toast({
        title: 'Success',
        description: 'ID card downloaded successfully!'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download ID card',
        variant: 'destructive'
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Mahaveer Bhavan ID Card',
          text: `${member.full_name} - Member ID: ${member.id}`,
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link Copied',
        description: 'ID card link copied to clipboard'
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Calculate dates
  const birthDate = member.created_at 
    ? new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Jan 1, 1990';
  
  const expirationDate = member.created_at
    ? new Date(new Date(member.created_at).setFullYear(new Date(member.created_at).getFullYear() + 1)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const isValid = member.status === 'active' || !member.status;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={handleBack}
          className="text-white/70 hover:text-white hover:bg-white/10 mb-4 print:hidden"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Main ID Card with Glassmorphism */}
        <Card id="member-id-card" className="overflow-hidden border-0 bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-2xl shadow-2xl print:shadow-none">
          {/* Header Section with Gradient */}
          <div className="relative bg-gradient-to-r from-orange-500 to-red-600 px-8 py-12 print:py-6">
            {/* Decorative orbs */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 text-center space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Digital ID Card</h1>
              <p className="text-white/90 text-sm font-medium">Mahaveer Bhavan Community</p>
            </div>
          </div>

          {/* Profile Section */}
          <div className="relative px-8 py-10 space-y-8">
            {/* Profile Photo - Centered */}
            <div className="flex justify-center -mt-24 print:-mt-16">
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl blur-2xl opacity-40"></div>
                
                {/* Photo container */}
                <div className="relative w-40 h-40 rounded-3xl overflow-hidden border-4 border-zinc-900/50 shadow-2xl bg-zinc-800">
                  <img 
                    src={member.photo_url || '/placeholder-avatar.png'} 
                    alt={member.full_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Verified badge */}
                {isValid && (
                  <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-2xl p-2 border-4 border-zinc-900 shadow-xl">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Member Info */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white">{member.full_name}</h2>
              <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-orange-500/20 to-red-600/20 border border-orange-500/30 rounded-full">
                <p className="text-sm font-semibold text-orange-400">{member.membership_type}</p>
              </div>
            </div>

            {/* Details Grid with Icons - Glassmorphism */}
            <div className="grid grid-cols-2 gap-4">
              {/* Email */}
              <div className="col-span-2 bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-5 hover:bg-white/10 transition-all">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/50 font-medium mb-1">Email Address</p>
                    <p className="text-sm text-white font-medium break-all">{member.email}</p>
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-5 hover:bg-white/10 transition-all">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                      <Phone className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-white/50 font-medium mb-1">Phone</p>
                    <p className="text-sm text-white font-medium">{member.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Member ID */}
              <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-5 hover:bg-white/10 transition-all">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                      <Hash className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-white/50 font-medium mb-1">Member ID</p>
                    <p className="text-sm text-white font-medium font-mono">{member.id.slice(0, 8)}</p>
                  </div>
                </div>
              </div>

              {/* Join Date */}
              <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-5 hover:bg-white/10 transition-all">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-white/50 font-medium mb-1">Joined</p>
                    <p className="text-sm text-white font-medium">{birthDate}</p>
                  </div>
                </div>
              </div>

              {/* Expiration */}
              <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-5 hover:bg-white/10 transition-all">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-white/50 font-medium mb-1">Valid Until</p>
                    <p className="text-sm text-white font-medium">{expirationDate}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm font-semibold text-white/70">Scan for Quick Access</p>
              </div>
              
              {qrCode ? (
                <div className="flex justify-center">
                  <div className="relative">
                    {/* QR glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl blur-2xl opacity-20"></div>
                    
                    {/* QR container */}
                    <div className="relative bg-white p-6 rounded-3xl shadow-2xl">
                      <img 
                        src={qrCode} 
                        alt="Member QR Code"
                        className="w-56 h-56"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="w-64 h-64 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center backdrop-blur-xl">
                    <span className="text-sm text-white/50">Loading QR Code...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Status Badge */}
            {isValid && (
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-500/20 border border-green-500/30 rounded-2xl">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-semibold text-green-400">Active Member</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Action Buttons with Premium Styling */}
        <div className="grid grid-cols-3 gap-3 print:hidden">
          <Button 
            onClick={handleDownload} 
            className="h-14 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/30 rounded-2xl transition-all hover:scale-105"
          >
            <Download className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Download</span>
          </Button>
          <Button 
            onClick={handleShare} 
            className="h-14 bg-white/5 border border-white/20 hover:bg-white/10 text-white rounded-2xl backdrop-blur-xl transition-all hover:scale-105"
          >
            <Share2 className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Share</span>
          </Button>
          <Button 
            onClick={handlePrint} 
            className="h-14 bg-white/5 border border-white/20 hover:bg-white/10 text-white rounded-2xl backdrop-blur-xl transition-all hover:scale-105"
          >
            <Printer className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Print</span>
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-white/40 text-sm print:hidden">
          <p className="font-medium">Mahaveer Bhavan Community</p>
          <p className="text-xs mt-1">© 2025 All rights reserved</p>
        </div>
      </div>
    </div>
  );
};