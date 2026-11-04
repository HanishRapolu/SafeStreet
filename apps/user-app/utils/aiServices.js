import { getBaseUrl } from '../config';
import { getAuthToken } from './auth';

class AIServices {
  constructor() {
    this.backendBaseUrl = null;
    this.initializeUrls();
  }

  async initializeUrls() {
    try {
      this.backendBaseUrl = await getBaseUrl();
    } catch (error) {
      console.error('Error getting base URL:', error);
      this.backendBaseUrl = 'http://localhost:5030/api';
    }
  }

  async getBackendUrl() {
    if (!this.backendBaseUrl) {
      this.backendBaseUrl = await getBaseUrl();
    }
    return this.backendBaseUrl;
  }

  // Convert image to base64 (helper utility)
  async imageToBase64(imageUri) {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1]; 
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw new Error('Failed to process image for AI analysis');
    }
  }

  /**
   * Unified Road and Damage Analysis via Backend Proxy
   * Calls POST {backend}/fieldworker/damage/analyze (multipart, field "image", with auth token)
   */
  async analyzeRoadDamage(imageUri) {
    try {
      console.log('Sending image to backend for road & damage analysis...');
      const baseUrl = await this.getBackendUrl();
      const token = await getAuthToken();

      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        name: 'road_damage.jpg',
        type: 'image/jpeg',
      });

      const response = await fetch(`${baseUrl}/fieldworker/damage/analyze`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Analysis request failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log('Backend analysis response received:', {
        success: result.success,
        isRoad: result.isRoad,
        severity: result.severity,
        priority: result.priority,
        damageType: result.primary?.damageType
      });

      return result;
    } catch (error) {
      console.error('Error in analyzeRoadDamage:', error);
      throw error;
    }
  }

  /**
   * Generate Damage Summary via Backend Proxy
   */
  async generateDamageSummary(damageDetails) {
    try {
      console.log('Generating damage summary...');
      
      const { location, damageType, severity, priority } = damageDetails;
      
      // Validate required fields
      if (!location || !damageType || !severity || !priority) {
        throw new Error('Missing required details for summary generation');
      }

      const defaultSummary = `${damageType} detected at ${location}. This damage has a ${String(severity).toLowerCase()} severity level that requires attention.`;

      // Call backend AI summary endpoint
      const baseUrl = await this.getBackendUrl();
      if (baseUrl) {
        try {
          const token = await getAuthToken();
          const response = await fetch(`${baseUrl}/ai/generate-summary`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({
              location,
              damageType,
              severity,
              priority
            })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.summary) {
              return {
                summary: result.summary,
                success: true
              };
            }
          }
        } catch (backendError) {
          console.log('Backend AI summary service failed, using default summary:', backendError.message);
        }
      }

      return {
        summary: defaultSummary,
        success: true
      };
    } catch (error) {
      console.error('Error generating damage summary:', error);
      throw error;
    }
  }
}

export const aiServices = new AIServices();
