import axios from 'axios';
import FormData from 'form-data';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';
const API_GATEWAY_URL = `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`;

class AIService {
  /**
   * Register face with AI service
   */
  static async registerFace(formData: FormData, authToken?: string, userData?: any): Promise<any> {
    try {
      const headers: any = {
        ...formData.getHeaders(),
      };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');

      const response = await axios.post(
        `${AI_SERVICE_URL}/api/register-face`,
        formData,
        { headers, timeout: 30000 }
      );
      return response.data;
    } catch (error: any) {
      console.error(`❌ [AIService] Failed to register face:`, error.message);
      throw error;
    }
  }

  /**
   * Verify face with AI service
   */
  static async verifyFace(formData: FormData, authToken?: string, userData?: any): Promise<any> {
    try {
      const headers: any = {
        ...formData.getHeaders(),
      };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');

      const response = await axios.post(
        `${AI_SERVICE_URL}/api/verify-face`,
        formData,
        { headers, timeout: 30000 }
      );
      return response.data;
    } catch (error: any) {
      console.error(`❌ [AIService] Failed to verify face:`, error.message);
      throw error;
    }
  }

  /**
   * Delete face embedding from AI service
   */
  static async deleteFace(userId: number, authToken?: string): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;

      const response = await axios.delete(
        `${API_GATEWAY_URL}/api/ai/face/${userId}`,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error(`❌ [AIService] Failed to delete face for user ${userId}:`, error.message);
      throw error;
    }
  }
}

export default AIService;
