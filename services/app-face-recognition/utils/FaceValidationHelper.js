/**
 * Face Validation Helper - Local validation before sending to backend
 * Reduces server load by validating face quality on client side
 */

import * as FaceDetector from 'expo-face-detector';

export class FaceValidationHelper {
  /**
   * Validate face using expo-face-detector (local, fast)
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

    const { bounds, rollAngle, yawAngle, smilingProbability } = face;
    const { width: imgWidth, height: imgHeight } = imageSize;

    // Calculate face size percentage
    const faceWidth = bounds.size.width;
    const faceHeight = bounds.size.height;
    const faceArea = faceWidth * faceHeight;
    const imageArea = imgWidth * imgHeight;
    const facePercent = (faceArea / imageArea) * 100;

    validation.details.facePercent = facePercent.toFixed(1);
    validation.details.rollAngle = rollAngle?.toFixed(1);
    validation.details.yawAngle = yawAngle?.toFixed(1);

    // Validation Rule 1: Face Size (15-70% of image area)
    if (facePercent < 15) {
      validation.isValid = false;
      validation.message = 'DI LẠI GẦN HƠN';
      validation.color = '#FF9500';
      validation.details.reason = 'Face too small';
      return validation;
    }

    if (facePercent > 70) {
      validation.isValid = false;
      validation.message = 'LÙI RA XA HƠN';
      validation.color = '#FF9500';
      validation.details.reason = 'Face too large';
      return validation;
    }

    // Validation Rule 2: Head Rotation (Roll - tilt head left/right)
    if (rollAngle && Math.abs(rollAngle) > 25) {
      validation.isValid = false;
      validation.message = 'GIỮ ĐẦU THẲNG';
      validation.color = '#FF9500';
      validation.details.reason = 'Head tilted';
      return validation;
    }

    // Validation Rule 3: Face Orientation (Yaw - turn head left/right)
    if (yawAngle && Math.abs(yawAngle) > 30) {
      validation.isValid = false;
      validation.message = 'NHÌN THẲNG VÀO CAMERA';
      validation.color = '#FF9500';
      validation.details.reason = 'Face not frontal';
      return validation;
    }

    // Validation Rule 4: Face Position (not too close to edges)
    const centerX = bounds.origin.x + bounds.size.width / 2;
    const centerY = bounds.origin.y + bounds.size.height / 2;
    
    const horizontalMargin = imgWidth * 0.15; // 15% margin
    const verticalMargin = imgHeight * 0.15;

    if (centerX < horizontalMargin || centerX > imgWidth - horizontalMargin) {
      validation.isValid = false;
      validation.message = 'GIỮ MẶT TRONG KHUNG';
      validation.color = '#FF9500';
      validation.details.reason = 'Face too close to edge';
      return validation;
    }

    if (centerY < verticalMargin || centerY > imgHeight - verticalMargin) {
      validation.isValid = false;
      validation.message = 'GIỮ MẶT TRONG KHUNG';
      validation.color = '#FF9500';
      validation.details.reason = 'Face too close to top/bottom';
      return validation;
    }

    // All checks passed
    validation.details.reason = 'All checks passed';
    return validation;
  }

  /**
   * Validate multiple faces
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

    if (faces.length > 1) {
      return {
        isValid: false,
        message: 'CHỈ ĐƯỢC CÓ 1 NGƯỜI',
        color: '#FF9500',
        faceCount: faces.length
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
