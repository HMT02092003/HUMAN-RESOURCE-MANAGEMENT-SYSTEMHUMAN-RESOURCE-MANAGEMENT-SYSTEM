/**
 * Face Validation Utilities
 * Comprehensive validation pipeline for face recognition attendance system
 */

/**
 * Calculate blur score using Laplacian variance method
 * Lower score = more blur
 * @param {Object} face - Face detection result from expo-face-detector
 * @returns {number} Blur score (higher = sharper)
 */
export const calculateBlurScore = (face) => {
  // expo-face-detector doesn't provide blur directly
  // We rely on face detection confidence as a proxy
  // In production, use native module or server-side check
  return face.rollAngle !== undefined ? 100 : 0; // Placeholder
};

/**
 * Calculate lighting quality from face bounds
 * @param {Object} face - Face detection result
 * @returns {Object} { brightness: number, isGood: boolean }
 */
export const calculateLighting = (face) => {
  // expo-face-detector doesn't provide lighting info
  // This would require native image processing or server-side check
  // Placeholder implementation
  return {
    brightness: 128, // 0-255 range
    isGood: true, // Assume good for now
  };
};

/**
 * Normalize angle to -180 to 180 range
 * @param {number} angle - Angle in degrees
 * @returns {number} Normalized angle
 */
export const normalizeAngle = (angle) => {
  let norm = angle % 360;
  if (norm > 180) norm -= 360;
  if (norm < -180) norm += 360;
  return norm;
};

/**
 * Validate head pose (yaw, pitch, roll angles)
 * @param {Object} face - Face detection result with yawAngle, rollAngle
 * @param {number} maxAngle - Maximum allowed angle deviation (degrees)
 * @returns {Object} { isValid: boolean, reason: string, angles: object }
 */
export const validateHeadPose = (face, maxAngle = 25) => {
  if (!face.yawAngle || !face.rollAngle) {
    return {
      isValid: false,
      reason: 'Không phát hiện góc khuôn mặt',
      angles: {},
    };
  }

  const yaw = normalizeAngle(face.yawAngle);
  const roll = normalizeAngle(face.rollAngle);

  // Yaw: left-right rotation
  if (Math.abs(yaw) > maxAngle) {
    if (yaw > 0) {
      return {
        isValid: false,
        reason: 'ĐỪNG QUAY ĐẦU SANG TRÁI',
        angles: { yaw, roll },
      };
    } else {
      return {
        isValid: false,
        reason: 'ĐỪNG QUAY ĐẦU SANG PHẢI',
        angles: { yaw, roll },
      };
    }
  }

  // Roll: tilting
  if (Math.abs(roll) > maxAngle) {
    return {
      isValid: false,
      reason: 'ĐỪNG NGHIÊNG ĐẦU',
      angles: { yaw, roll },
    };
  }

  return {
    isValid: true,
    reason: 'Góc khuôn mặt hợp lệ',
    angles: { yaw, roll },
  };
};

/**
 * Select the best face from multiple detections
 * Prioritizes: largest face + closest to center
 * @param {Array} faces - Array of face detection results
 * @param {number} frameWidth - Camera frame width
 * @param {number} frameHeight - Camera frame height
 * @returns {Object|null} Best face or null
 */
export const selectMainFace = (faces, frameWidth, frameHeight) => {
  if (!faces || faces.length === 0) return null;
  if (faces.length === 1) return faces[0];

  const centerX = frameWidth / 2;
  const centerY = frameHeight / 2;

  let bestFace = null;
  let bestScore = -Infinity;

  for (const face of faces) {
    const { bounds } = face;
    const faceWidth = bounds.size.width;
    const faceHeight = bounds.size.height;
    const area = faceWidth * faceHeight;

    // Calculate face center
    const faceCenterX = bounds.origin.x + faceWidth / 2;
    const faceCenterY = bounds.origin.y + faceHeight / 2;

    // Distance from frame center (normalized)
    const distanceX = Math.abs(faceCenterX - centerX) / frameWidth;
    const distanceY = Math.abs(faceCenterY - centerY) / frameHeight;
    const centerDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    // Combined score: 70% area, 30% center proximity
    // Larger area and closer to center = higher score
    const areaScore = area / (frameWidth * frameHeight);
    const proximityScore = 1 - centerDistance;
    const score = areaScore * 0.7 + proximityScore * 0.3;

    if (score > bestScore) {
      bestScore = score;
      bestFace = face;
    }
  }

  return bestFace;
};

/**
 * Validate face size relative to frame
 * @param {Object} face - Face detection result
 * @param {number} frameWidth - Camera frame width
 * @param {number} frameHeight - Camera frame height
 * @param {Object} thresholds - { minSize, maxSize } as percentage of frame
 * @returns {Object} { isValid: boolean, reason: string, sizePercent: number }
 */
export const validateFaceSize = (
  face,
  frameWidth,
  frameHeight,
  thresholds = { minSize: 10, maxSize: 50 }  // Lower min for masks
) => {
  const { bounds } = face;
  const faceArea = bounds.size.width * bounds.size.height;
  const frameArea = frameWidth * frameHeight;
  const sizePercent = (faceArea / frameArea) * 100;

  if (sizePercent < thresholds.minSize) {
    return {
      isValid: false,
      reason: 'ĐI LẠI GẦN HƠN',
      sizePercent: sizePercent.toFixed(1),
    };
  }

  if (sizePercent > thresholds.maxSize) {
    return {
      isValid: false,
      reason: 'LÙI RA XA HƠN',
      sizePercent: sizePercent.toFixed(1),
    };
  }

  return {
    isValid: true,
    reason: 'Kích thước hợp lệ',
    sizePercent: sizePercent.toFixed(1),
  };
};

/**
 * Validate face position (not too close to edges)
 * @param {Object} face - Face detection result
 * @param {number} frameWidth - Camera frame width
 * @param {number} frameHeight - Camera frame height
 * @param {number} edgeThreshold - Minimum distance from edge (percentage)
 * @returns {Object} { isValid: boolean, reason: string }
 */
export const validateFacePosition = (
  face,
  frameWidth,
  frameHeight,
  edgeThreshold = 15
) => {
  const { bounds } = face;
  const edgeMarginX = frameWidth * (edgeThreshold / 100);
  const edgeMarginY = frameHeight * (edgeThreshold / 100);

  const faceLeft = bounds.origin.x;
  const faceRight = bounds.origin.x + bounds.size.width;
  const faceTop = bounds.origin.y;
  const faceBottom = bounds.origin.y + bounds.size.height;

  // Check if face is too close to edges
  if (faceLeft < edgeMarginX) {
    return { isValid: false, reason: 'DI CHUYỂN QUA PHẢI' };
  }
  if (faceRight > frameWidth - edgeMarginX) {
    return { isValid: false, reason: 'DI CHUYỂN QUA TRÁI' };
  }
  if (faceTop < edgeMarginY) {
    return { isValid: false, reason: 'DI CHUYỂN XUỐNG DƯỚI' };
  }
  if (faceBottom > frameHeight - edgeMarginY) {
    return { isValid: false, reason: 'DI CHUYỂN LÊN TRÊN' };
  }

  return { isValid: true, reason: 'Vị trí hợp lệ' };
};

/**
 * Comprehensive face validation pipeline
 * Checks ALL conditions before allowing capture
 * @param {Array} faces - Array of detected faces
 * @param {Object} frameSize - { width, height }
 * @param {Object} options - Validation options
 * @returns {Object} { isValid: boolean, message: string, selectedFace: object }
 */
export const validateFaceForCapture = (
  faces,
  frameSize,
  options = {
    maxAngle: 25,
    minFaceSize: 15,
    maxFaceSize: 50,
    edgeThreshold: 15,
    requireStableFrames: 3, // Must be valid for N consecutive frames
  }
) => {
  // Step 1: Check if any faces detected
  if (!faces || faces.length === 0) {
    return {
      isValid: false,
      message: 'KHÔNG PHÁT HIỆN KHUÔN MẶT',
      selectedFace: null,
      stage: 'detection',
    };
  }

  // Step 2: Multi-face handling - select main face
  const mainFace = selectMainFace(faces, frameSize.width, frameSize.height);
  
  if (!mainFace) {
    return {
      isValid: false,
      message: 'KHÔNG XÁC ĐỊNH ĐƯỢC KHUÔN MẶT CHÍNH',
      selectedFace: null,
      stage: 'selection',
    };
  }

  // If multiple faces, warn user
  if (faces.length > 1) {
    return {
      isValid: false,
      message: `PHÁT HIỆN ${faces.length} NGƯỜI - CHỈ 1 NGƯỜI ĐƯỢC PHÉP`,
      selectedFace: mainFace,
      stage: 'multi-face',
    };
  }

  // Step 3: Validate face size
  const sizeValidation = validateFaceSize(
    mainFace,
    frameSize.width,
    frameSize.height,
    { minSize: options.minFaceSize, maxSize: options.maxFaceSize }
  );

  if (!sizeValidation.isValid) {
    return {
      isValid: false,
      message: sizeValidation.reason,
      selectedFace: mainFace,
      stage: 'size',
      details: { sizePercent: sizeValidation.sizePercent },
    };
  }

  // Step 4: Validate face position
  const positionValidation = validateFacePosition(
    mainFace,
    frameSize.width,
    frameSize.height,
    options.edgeThreshold
  );

  if (!positionValidation.isValid) {
    return {
      isValid: false,
      message: positionValidation.reason,
      selectedFace: mainFace,
      stage: 'position',
    };
  }

  // Step 5: Validate head pose (angles)
  const poseValidation = validateHeadPose(mainFace, options.maxAngle);

  if (!poseValidation.isValid) {
    return {
      isValid: false,
      message: poseValidation.reason,
      selectedFace: mainFace,
      stage: 'pose',
      details: { angles: poseValidation.angles },
    };
  }

  // Step 6: All validations passed!
  return {
    isValid: true,
    message: 'HOÀN HẢO! ĐANG CHỤP...',
    selectedFace: mainFace,
    stage: 'ready',
    details: {
      sizePercent: sizeValidation.sizePercent,
      angles: poseValidation.angles,
    },
  };
};

/**
 * Stability tracker for requiring N consecutive valid frames
 * Usage: Track validation results over time to avoid false positives
 */
export class StabilityTracker {
  constructor(requiredFrames = 3) {
    this.requiredFrames = requiredFrames;
    this.validFrameCount = 0;
    this.lastValidationState = null;
  }

  update(isValid) {
    if (isValid) {
      this.validFrameCount++;
    } else {
      this.validFrameCount = 0;
    }
    this.lastValidationState = isValid;
    return this.isStable();
  }

  isStable() {
    return this.validFrameCount >= this.requiredFrames;
  }

  reset() {
    this.validFrameCount = 0;
    this.lastValidationState = null;
  }

  getProgress() {
    return Math.min(100, (this.validFrameCount / this.requiredFrames) * 100);
  }
}
