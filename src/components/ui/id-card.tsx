import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { generateMemberQRCode } from '@/utils/qrCode';
import { generateIDCardPDF } from '@/utils/pdfGenerator';
import { Button } from '@/components/ui/button';
import { Download, Share2, Printer, ArrowLeft, CheckCircle } from 'lucide-react';
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
    ? new Date(member.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '/')
    : '01/01/1990';
  
  const expirationDate = member.created_at
    ? new Date(new Date(member.created_at).setFullYear(new Date(member.created_at).getFullYear() + 1)).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '/')
    : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '/');

  const isValid = member.status === 'active' || !member.status;

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* ID Card */}
      <Card id="member-id-card" className="overflow-hidden shadow-xl print:shadow-none bg-gradient-to-b from-primary/5 to-background">
        {/* Header with Back Button */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 print:hidden">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">ID Card</h1>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-8 space-y-6">
          {/* Photo and QR Code Row */}
          <div className="flex justify-center items-start gap-6">
            {/* Member Photo */}
            <div className="flex-shrink-0">
              <div className="w-28 h-28 rounded-2xl overflow-hidden bg-primary/10 border-4 border-primary/20 shadow-lg">
                <img 
                  src={member.photo_url || '/placeholder-avatar.png'} 
                  alt={member.full_name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* QR Code */}
            {qrCode && (
              <div className="flex-shrink-0">
                <div className="w-28 h-28 bg-white p-2 rounded-xl shadow-lg border-2 border-primary/10">
                  <img 
                    src={qrCode} 
                    alt="Member QR Code"
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Member Name */}
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold text-foreground">{member.full_name}</h2>
            <p className="text-sm text-muted-foreground">{member.membership_type}</p>
          </div>

          {/* Member Details Grid */}
          <div className="space-y-4 bg-background rounded-xl p-6 border border-border">
            {/* Birth Date and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Birth date</p>
                <p className="font-semibold text-foreground">{birthDate}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-green-600">Valid</span>
                  <CheckCircle className="w-4 h-4 text-green-600 fill-green-600" />
                </div>
              </div>
            </div>

            {/* Phone and ID Number */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Phone No.</p>
                <p className="font-semibold text-foreground">{member.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">ID No.</p>
                <p className="font-semibold text-foreground font-mono">{member.id}</p>
              </div>
            </div>

            {/* Email and Expiration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">E-mail</p>
                <p className="font-semibold text-foreground text-sm break-all">{member.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Expiration date</p>
                <p className="font-semibold text-foreground">{expirationDate}</p>
              </div>
            </div>
          </div>

          {/* Large QR Code for Scanning */}
          <div className="space-y-3">
            <p className="text-center text-sm font-medium text-muted-foreground">Scan QR Code</p>
            {qrCode && (
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-2xl shadow-lg border-2 border-primary/10">
                  <img 
                    src={qrCode} 
                    alt="Member QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground font-mono">{member.id}</p>
          </div>

          {/* Back to Home Button */}
          <Button 
            onClick={handleBack}
            variant="outline" 
            className="w-full h-12 text-base font-medium print:hidden"
          >
            Back to home
          </Button>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <Button 
          onClick={handleDownload} 
          className="flex-1 gap-2 bg-primary hover:bg-primary/90 h-11"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
        <Button 
          onClick={handleShare} 
          variant="outline" 
          className="flex-1 gap-2 border-primary text-primary hover:bg-primary/10 h-11"
        >
          <Share2 className="w-4 h-4" />
          Share
        </Button>
        <Button 
          onClick={handlePrint} 
          variant="outline" 
          className="flex-1 gap-2 h-11"
        >
          <Printer className="w-4 h-4" />
          Print
        </Button>
      </div>

      {/* Organization Footer */}
      <div className="text-center text-sm text-muted-foreground print:hidden">
        <p className="font-medium">Mahaveer Bhavan</p>
        <p className="text-xs">www.mahaveerbhavan.org</p>
      </div>
    </div>
  );
};