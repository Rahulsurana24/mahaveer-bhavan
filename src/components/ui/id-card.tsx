import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { generateMemberQRCode } from '@/utils/qrCode';
import { generateIDCardPDF } from '@/utils/pdfGenerator';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface IDCardProps {
  member: {
    id: string;
    full_name: string;
    membership_type: string;
    photo_url: string;
    email: string;
    phone: string;
  };
}

export const IDCard = ({ member }: IDCardProps) => {
  const [qrCode, setQrCode] = useState<string>('');
  const { toast } = useToast();

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
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link Copied',
        description: 'ID card link copied to clipboard'
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card id="member-id-card" className="w-full max-w-md mx-auto p-6 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 mx-auto mb-2 bg-primary-foreground rounded-full flex items-center justify-center">
            <span className="text-primary font-bold text-lg">M</span>
          </div>
          <h2 className="text-lg font-bold">Sree Mahaveer Swami</h2>
          <p className="text-sm opacity-90">Charitable Trust</p>
        </div>

        {/* Member Info */}
        <div className="flex items-center space-x-4 mb-4">
          <img 
            src={member.photo_url} 
            alt={member.full_name}
            className="w-16 h-16 rounded-full object-cover border-2 border-primary-foreground"
          />
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{member.full_name}</h3>
            <p className="text-sm opacity-90">{member.membership_type}</p>
            <p className="text-xs opacity-80">ID: {member.id}</p>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          {qrCode && (
            <img 
              src={qrCode} 
              alt="Member QR Code"
              className="w-20 h-20 bg-white p-1 rounded"
            />
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs opacity-80">
          <p>Valid Member</p>
          <p>Issued: {new Date().getFullYear()}</p>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-center">
        <Button onClick={handleDownload} className="gap-2">
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
        <Button onClick={handleShare} variant="outline" className="gap-2">
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </div>
    </div>
  );
};