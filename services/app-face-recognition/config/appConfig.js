/**
 * App Configuration - UI & Camera Settings
 * =========================================
 * Config cho camera và UI để tối ưu cho Mi 10T Lite
 */

import { PixelRatio } from 'react-native';

/**
 * Camera Configuration
 */
export const CAMERA_CONFIG = {
  // Quality settings - Tối ưu cho Mi 10T Lite
  QUALITY: 0.7,  // 70% quality (balance giữa size và chất lượng)
  
  // Ratio - Dùng 4:3 cho ảnh chân dung tốt hơn
  RATIO: '4:3',
  
  // Skip processing để capture nhanh hơn
  SKIP_PROCESSING: true,
  
  // Front camera by default
  DEFAULT_TYPE: 'front',
};

/**
 * Batch Registration Configuration - 4 Steps
 */
export const BATCH_CONFIG = {
  // Số lượng ảnh mỗi bước
  IMAGES_PER_STEP: 10,    // 10 ảnh mỗi bước
  TOTAL_STEPS: 4,         // 4 bước
  TOTAL_IMAGES: 40,       // Tổng 40 ảnh
  
  // Timing
  CAPTURE_INTERVAL: 250,  // 250ms giữa mỗi lần chụp (4 fps)
  
  // UI brightness (tăng độ sáng màn hình khi đăng ký)
  SCREEN_BRIGHTNESS: 1.0,  // 100% brightness
  
  // Step definitions
  STEPS: [
    {
      id: 1,
      name: 'CHÍNH DIỆN',
      icon: '😀',
      instruction: 'Nhìn thẳng vào camera\nGiữ mặt ngay trung tâm',
      color: '#4CAF50',
    },
    {
      id: 2,
      name: 'GÓC PHẢI',
      icon: '↗️',
      instruction: 'Xoay mặt sang phải 30-45°\nGiữ yên khi chụp',
      color: '#2196F3',
    },
    {
      id: 3,
      name: 'GÓC TRÁI',
      icon: '↖️',
      instruction: 'Xoay mặt sang trái 30-45°\nGiữ yên khi chụp',
      color: '#FF9800',
    },
    {
      id: 4,
      name: 'ĐEO KHẨU TRANG',
      icon: '😷',
      instruction: 'Đeo khẩu trang che mũi + miệng\nNhìn thẳng vào camera',
      color: '#9C27B0',
    },
  ],
  
  // Guide text
  GUIDE_TEXT: {
    IDLE: (stepName) => `Sẵn sàng chụp: ${stepName}\nBấm nút bên dưới để bắt đầu`,
    CAPTURING: (count, total) => `Đang chụp... ${count}/${total}`,
    COMPLETED: (stepName) => `✅ Hoàn thành: ${stepName}`,
    NO_FACE: 'Không thấy khuôn mặt',
    READY: '✓ Phát hiện khuôn mặt',
  },
};

/**
 * Face Detection Configuration
 */
export const FACE_DETECTION_CONFIG = {
  MODE: 'fast',  // Fast mode cho realtime
  DETECT_LANDMARKS: 'none',
  RUN_CLASSIFICATIONS: 'none',
  MIN_DETECTION_INTERVAL: 100,  // 100ms
  TRACKING: true,
};

/**
 * UI Configuration
 */
export const UI_CONFIG = {
  // Colors
  COLORS: {
    SUCCESS: '#4CAF50',
    WARNING: '#FF9800',
    ERROR: '#F44336',
    PRIMARY: '#2196F3',
    GOLD: '#FFD700',
  },
  
  // Frame size (tỉ lệ so với screen width)
  FACE_FRAME_WIDTH_RATIO: 0.7,
  FACE_FRAME_HEIGHT_RATIO: 0.9,
  
  // Progress bar
  PROGRESS_BAR_HEIGHT: 6,
  
  // Badge
  BADGE_PADDING: 15,
  BADGE_BORDER_RADIUS: 20,
};

/**
 * Network Configuration
 */
export const NETWORK_CONFIG = {
  // Timeout settings
  REQUEST_TIMEOUT: 30000,  // 30s cho batch upload
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,  // 2s
  
  // FormData settings
  MULTIPART_BOUNDARY: '----WebKitFormBoundary7MA4YWxkTrZu0gW',
};

/**
 * Storage Keys
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info',
  SERVER_IP: 'server_ip',
};

export default {
  CAMERA_CONFIG,
  BATCH_CONFIG,
  FACE_DETECTION_CONFIG,
  UI_CONFIG,
  NETWORK_CONFIG,
  STORAGE_KEYS,
};
