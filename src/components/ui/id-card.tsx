import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { generateMemberQRCode } from '@/utils/qrCode';
import { generateIDCardPDF } from '@/utils/pdfGenerator';
import { Button } from '@/components/ui/button';
import { Download, Share2, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface IDCardProps {
  member: {
    id: string;
    full_name: string;
    membership_type: string;
    photo_url: string;
    email: string;
    phone: string;
    created_at?: string;
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

  // Calculate dates
  const joinDate = member.created_at 
    ? new Date(member.created_at).toLocaleDateString('en-GB').replace(/\//g, '/')
    : new Date().toLocaleDateString('en-GB').replace(/\//g, '/');
  
  const expireDate = member.created_at
    ? new Date(new Date(member.created_at).setFullYear(new Date(member.created_at).getFullYear() + 1)).toLocaleDateString('en-GB').replace(/\//g, '/')
    : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-GB').replace(/\//g, '/');

  return (
    <div className="space-y-6">
      {/* ID Card */}
      <Card id="member-id-card" className="w-full max-w-3xl mx-auto overflow-hidden shadow-lg print:shadow-none">
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[400px]">
          {/* Left Side - Colored Background with Photo and Details */}
          <div className="bg-gradient-to-br from-teal-600 to-teal-800 text-white p-8 flex flex-col justify-between">
            {/* Organization Name */}
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold tracking-wide uppercase">Mahaveer Bhavan</h2>
              <div className="h-0.5 w-20 bg-white/50 mx-auto mt-2"></div>
            </div>

            {/* Member Photo */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="w-32 h-32 rounded-full border-4 border-white/30 overflow-hidden bg-white shadow-lg">
                <img 
                  src={member.photo_url || '/placeholder-avatar.png'} 
                  alt={member.full_name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Member Name and Type */}
              <div className="text-center">
                <h3 className="text-xl font-bold mb-1">{member.full_name}</h3>
                <p className="text-sm bg-white/20 px-4 py-1 rounded-full inline-block">
                  {member.membership_type}
                </p>
              </div>
            </div>

            {/* Member Details */}
            <div className="space-y-2 text-sm border-t border-white/20 pt-4">
              <div className="flex justify-between">
                <span className="text-white/80">ID No:</span>
                <span className="font-semibold">{member.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/80">Department:</span>
                <span className="font-semibold">{member.membership_type}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-white/80">Email:</span>
                <span className="font-medium text-xs break-all">{member.email}</span>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mt-4">
              {qrCode ? (
                <div className="bg-white p-2 rounded">
                  <img 
                    src={qrCode} 
                    alt="Member QR Code"
                    className="w-20 h-20"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 bg-white/10 rounded flex items-center justify-center">
                  <span className="text-xs">Loading QR...</span>
                </div>
              )}
            </div>

            {/* Print Card Button */}
            <div className="mt-4 print:hidden">
              <Button 
                onClick={handlePrint}
                variant="secondary"
                size="sm"
                className="w-full bg-white text-teal-800 hover:bg-white/90"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Card
              </Button>
            </div>
          </div>

          {/* Right Side - White Background with Terms */}
          <div className="bg-white p-8 flex flex-col justify-between text-gray-800">
            {/* Organization Name */}
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold tracking-wide uppercase text-teal-800">Mahaveer Bhavan</h2>
              <div className="h-0.5 w-20 bg-teal-600 mx-auto mt-2"></div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex-1">
              <h3 className="text-center font-bold text-base mb-4 tracking-wide">TERMS & CONDITIONS</h3>
              
              <ul className="space-y-3 text-xs text-gray-700">
                <li className="flex gap-2">
                  <span className="font-bold shrink-0">1.</span>
                  <span>Identification must be worn at all times during working hours for identification purposes.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold shrink-0">2.</span>
                  <span>Authorized User The ID card is strictly for official use and should not be used for unauthorized purposes.</span>
                </li>
              </ul>
            </div>

            {/* Dates */}
            <div className="space-y-3 border-t border-gray-200 pt-6 mt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-600">Join</span>
                <span className="font-bold">{joinDate}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-600">Expire</span>
                <span className="font-bold">{expireDate}</span>
              </div>
            </div>

            {/* Website Footer */}
            <div className="text-center mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">www.mahaveerbhavan.org</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center print:hidden">
        <Button onClick={handleDownload} className="gap-2 bg-teal-600 hover:bg-teal-700">
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
        <Button onClick={handleShare} variant="outline" className="gap-2 border-teal-600 text-teal-600 hover:bg-teal-50">
          <Share2 className="w-4 h-4" />
          Share
        </Button>
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer className="w-4 h-4" />
          Print
        </Button>
      </div>

      {/* Print Instructions */}
      <div className="text-center text-sm text-muted-foreground print:hidden">
        <p>Tip: Use the Print button for best results when printing the ID card</p>
      </div>
    </div>
  );
};