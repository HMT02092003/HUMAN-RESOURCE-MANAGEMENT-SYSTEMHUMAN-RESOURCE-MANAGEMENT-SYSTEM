// Minimal JS wrapper to satisfy TS import and allow controller to call recognition.
// Replace this implementation with a real face recognition bridge when ready.

/**
 * @typedef {Object} RecognizeResult
 * @property {boolean} success
 * @property {boolean} recognized
 * @property {string=} message
 * @property {number=} userId
 * @property {Object=} userInfo
 * @property {number=} confidence
 */

/**
 * Recognize face from image path. Currently returns a default non-recognized result.
 * @param {string} imagePath
 * @param {*} _connection - Database connection (unused in stub)
 * @returns {Promise<RecognizeResult>}
 */
export async function recognize_face_from_image(imagePath, _connection) {
  if (!imagePath) {
    return {
      success: false,
      recognized: false,
      message: 'Không có đường dẫn ảnh hợp lệ'
    };
  }

  // TODO: Implement real face recognition by bridging to Python or a Node library
  return {
    success: true,
    recognized: false,
    message: 'Stub nhận diện: Chưa tích hợp AI'
  };
}

export default { recognize_face_from_image };


