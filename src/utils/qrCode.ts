import QRCode from 'qrcode';

export const generateQRCode = async (data: string): Promise<string> => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

export const generateMemberQRCode = async (memberId: string): Promise<string> => {
  const memberData = {
    id: memberId,
    timestamp: Date.now(),
    type: 'member_verification'
  };
  
  const qrData = JSON.stringify(memberData);
  return generateQRCode(qrData);
};