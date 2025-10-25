import QRCode from 'react-native-qrcode-svg';

/**
 * QR Code generation utilities
 * Used for member ID cards and attendance tracking
 */

/**
 * Generate QR code data for member ID
 * @param {Object} memberData - Member information
 * @returns {string} JSON string for QR code
 */
export const generateMemberQRData = (memberData) => {
  const qrData = {
    member_id: memberData.member_id,
    name: memberData.full_name,
    membership_type: memberData.membership_type,
    issued_at: new Date().toISOString(),
    version: '1.0'
  };

  return JSON.stringify(qrData);
};

/**
 * Parse QR code data
 * @param {string} qrDataString - QR code data string
 * @returns {Object|null} Parsed member data or null if invalid
 */
export const parseMemberQRData = (qrDataString) => {
  try {
    const data = JSON.parse(qrDataString);

    // Validate required fields
    if (!data.member_id || !data.name) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Invalid QR data:', error);
    return null;
  }
};

/**
 * Validate member QR code
 * @param {Object} qrData - Parsed QR data
 * @returns {boolean} True if valid
 */
export const validateMemberQRCode = (qrData) => {
  if (!qrData) return false;

  // Check required fields
  if (!qrData.member_id || !qrData.name || !qrData.membership_type) {
    return false;
  }

  // Check version compatibility
  if (qrData.version !== '1.0') {
    console.warn('QR code version mismatch');
  }

  return true;
};

/**
 * Generate QR code for event registration
 * @param {Object} registrationData - Registration information
 * @returns {string} JSON string for QR code
 */
export const generateEventQRData = (registrationData) => {
  const qrData = {
    type: 'event_registration',
    registration_id: registrationData.id,
    event_id: registrationData.event_id,
    member_id: registrationData.member_id,
    issued_at: new Date().toISOString()
  };

  return JSON.stringify(qrData);
};

// Default QR code component options
export const defaultQRCodeOptions = {
  size: 200,
  color: '#000000',
  backgroundColor: '#FFFFFF',
  logo: null,
  logoSize: 50,
  logoBackgroundColor: '#FFFFFF',
  logoMargin: 2,
  logoBorderRadius: 5,
  quietZone: 10,
  enableLinearGradient: false,
  ecl: 'M', // Error correction level: L, M, Q, H
};

/**
 * Get QR code options for ID card
 * @param {Object} customOptions - Custom options to override defaults
 * @returns {Object} QR code options
 */
export const getIDCardQROptions = (customOptions = {}) => {
  return {
    ...defaultQRCodeOptions,
    size: 150,
    ...customOptions
  };
};
