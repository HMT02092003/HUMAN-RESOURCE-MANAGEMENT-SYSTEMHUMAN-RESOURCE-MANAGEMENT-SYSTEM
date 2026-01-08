/**
 * API Configuration - Centralized API URLs
 * 
 * Uses Expo Constants to determine the host machine's IP address.
 * This works for:
 * - Physical devices (LAN IP)
 * - Android Emulator (10.0.2.2 via logic or hostUri)
 * - iOS Simulator (localhost)
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

class APIConfig {
  constructor() {
    this._baseURL = null;
  }

  /**
   * Resolve the Gateway Base URL dynamically
   */
  getGatewayURL() {
    if (this._baseURL) return this._baseURL;

    // 1. Try to get from Expo Host URI (most reliable for LAN development)
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
    
    // Log for debugging
    console.log('[APIConfig] Resolving Host URI:', hostUri);

    if (hostUri) {
      const host = hostUri.split(':')[0];
      // Note: We use port 4000 for the Gateway
      this._baseURL = `http://${host}:4000`;
      console.log('[APIConfig] Resolved Gateway URL from Expo:', this._baseURL);
      return this._baseURL;
    }

    // 2. Android Emulator Fallback (standard IP)
    if (Platform.OS === 'android' && !Constants.isDevice) {
        this._baseURL = 'http://10.0.2.2:4000';
        console.log('[APIConfig] Resolved Android Emulator Gateway:', this._baseURL);
        return this._baseURL;
    }

    // 3. IOS Simulator / General Fallback
    this._baseURL = 'http://127.0.0.1:4000';
    console.log('[APIConfig] Fallback to localhost:', this._baseURL);
    return this._baseURL;
  }

  /**
   * Helper to get full URL for an endpoint
   */
  getURL(endpoint) {
    const base = this.getGatewayURL();
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }
}

const apiConfig = new APIConfig();
export default apiConfig;
