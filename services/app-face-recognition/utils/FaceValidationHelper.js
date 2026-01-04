/**
 * Face Validation Helper - Local validation before sending to backend
 * Reduces server load by validating face quality on client side
 */

import * as FaceDetector from 'expo-face-detector';

export class FaceValidationHelper {
  /**
   * Validate face using expo-face-detector (local, fast)
   * Simplified version - only check essential criteria
   * @param {Object} face - Face object from expo-face-detector
   * @param {Object} imageSize - { width, height } of the image
   * @returns {Object} { isValid, message, details }
   */
  static validateFaceLocally(face, imageSize) {
    const validation = {
      isValid: true,
      message: '✓ KHUÔN MẶT HỢP LỆ',
      details: {},
      color: '#4CAF50'
    };

    if (!face) {
      validation.isValid = false;
      validation.message = 'KHÔNG PHÁT HIỆN KHUÔN MẶT';
      validation.color = '#FF6B6B';
      return validation;
    }

    const { bounds } = face;
    const { width: imgWidth, height: imgHeight } = imageSize;

    // Calculate face size percentage
    const faceWidth = bounds.size.width;
    const faceHeight = bounds.size.height;
    const faceArea = faceWidth * faceHeight;
    const imageArea = imgWidth * imgHeight;
    const facePercent = (faceArea / imageArea) * 100;

    validation.details.facePercent = facePercent.toFixed(1);

    // Validation Rule: Face Size (mobile-friendly: 10-85% of image area)
    // Cho phép range rộng hơn để linh hoạt
    if (facePercent < 10) {
      validation.isValid = false;
      validation.message = 'DI LẠI GẦN HƠN';
      validation.color = '#FF9500';
      validation.details.reason = 'Face too small';
      return validation;
    }

    if (facePercent > 85) {
      validation.isValid = false;
      validation.message = 'LÙI RA XA HƠN';
      validation.color = '#FF9500';
      validation.details.reason = 'Face too large';
      return validation;
    }

    // All checks passed
    validation.details.reason = 'All checks passed';
    return validation;
  }

  /**
   * Validate multiple faces - Allow multiple but warn
   * @param {Array} faces - Array of face objects
   * @returns {Object} validation result
   */
  static validateMultipleFaces(faces) {
    if (!faces || faces.length === 0) {
      return {
        isValid: false,
        message: 'KHÔNG PHÁT HIỆN KHUÔN MẶT',
        color: '#FF6B6B',
        faceCount: 0
      };
    }

    // Cho phép nhiều người nhưng sẽ lấy mặt lớn nhất
    if (faces.length > 1) {
      return {
        isValid: true,
        message: `PHÁT HIỆN ${faces.length} NGƯỜI - CHỌN MẶT LỚN NHẤT`,
        color: '#FF9500',
        faceCount: faces.length,
        warning: true
      };
    }

    return {
      isValid: true,
      faceCount: 1
    };
  }

  /**
   * Get the largest face from multiple faces
   * @param {Array} faces - Array of face objects
   * @returns {Object} largest face
   */
  static getLargestFace(faces) {
    if (!faces || faces.length === 0) return null;
    
    return faces.reduce((largest, current) => {
      const currentArea = current.bounds.size.width * current.bounds.size.height;
      const largestArea = largest.bounds.size.width * largest.bounds.size.height;
      return currentArea > largestArea ? current : largest;
    });
  }

  /**
   * Calculate face quality score (0-100)
   * @param {Object} face - Face object
   * @param {Object} imageSize - Image size
   * @returns {number} Quality score
   */
  static calculateQualityScore(face, imageSize) {
    if (!face) return 0;

    let score = 100;
    const { bounds, rollAngle, yawAngle } = face;
    const faceArea = bounds.size.width * bounds.size.height;
    const imageArea = imageSize.width * imageSize.height;
    const facePercent = (faceArea / imageArea) * 100;

    // Deduct points for size
    if (facePercent < 15) score -= 30;
    else if (facePercent < 25) score -= 15;
    else if (facePercent > 70) score -= 20;
    else if (facePercent > 60) score -= 10;

    // Deduct points for rotation
    if (rollAngle) {
      const rollPenalty = Math.min(Math.abs(rollAngle), 30);
      score -= rollPenalty;
    }

    // Deduct points for yaw
    if (yawAngle) {
      const yawPenalty = Math.min(Math.abs(yawAngle), 30);
      score -= yawPenalty;
    }

    return Math.max(0, Math.min(100, score));
  }
}

export default FaceValidationHelper;
