// API configuration
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_PORT = '5030';

// Function to derive default API URL from environment or Expo dev host
export const getDefaultApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  const expoHost = hostUri ? hostUri.split(':')[0] : null;

  if (expoHost) {
    return `http://${expoHost}:${API_PORT}/api`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${API_PORT}/api`;
  }

  return `http://localhost:${API_PORT}/api`;
};

// Function to validate URL and check if it's reachable
export const testApiConnection = async (url, timeout = 5000) => {
  try {
    console.log('Testing API connection to:', url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('API connection test failed:', error);
    return false;
  }
};

// Function to get the appropriate base URL
export const getBaseUrl = async () => {
  // If EXPO_PUBLIC_API_URL is set, prioritize it directly
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  try {
    // Try to get the stored custom URL next
    const storedUrl = await AsyncStorage.getItem('custom_api_url');
    if (storedUrl) {
      console.log('Found custom API URL in storage:', storedUrl);
      const isReachable = await testApiConnection(storedUrl);
      if (isReachable) {
        console.log('Custom API URL is reachable');
        return storedUrl;
      }
    }
  } catch (error) {
    console.error('Error reading or testing API URLs:', error);
  }

  // Derive from Expo host or local dev options
  const defaultUrl = getDefaultApiUrl();
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  const expoHost = hostUri ? hostUri.split(':')[0] : null;

  const possibleUrls = [defaultUrl];
  if (expoHost) {
    possibleUrls.push(`http://${expoHost}:${API_PORT}/api`);
  }
  if (Platform.OS === 'android') {
    possibleUrls.push(`http://10.0.2.2:${API_PORT}/api`);
  }
  possibleUrls.push(`http://localhost:${API_PORT}/api`);
  possibleUrls.push(`http://127.0.0.1:${API_PORT}/api`);

  // Remove duplicates
  const uniqueUrls = [...new Set(possibleUrls)];

  let baseUrl = null;
  for (const url of uniqueUrls) {
    try {
      console.log('Trying API URL:', url);
      const isReachable = await testApiConnection(url);
      if (isReachable) {
        console.log('Found reachable API URL:', url);
        baseUrl = url;
        break;
      }
    } catch (e) {
      console.log('Failed testing URL:', url, e);
    }
  }

  if (!baseUrl) {
    baseUrl = defaultUrl;
  }

  console.log('Using API base URL:', baseUrl);
  return baseUrl;
};

// Initial default resolved from EXPO_PUBLIC_API_URL or Expo dev host
export let API_BASE_URL = getDefaultApiUrl();

// Set a custom API URL (can be called from settings screen)
export const setCustomApiUrl = async (url) => {
  try {
    await AsyncStorage.setItem('custom_api_url', url);
    API_BASE_URL = url;
    console.log('Custom API URL saved:', url);
    return true;
  } catch (error) {
    console.log('Error saving custom API URL:', error);
    return false;
  }
};

// Initialize the API URL
(async () => {
  try {
    API_BASE_URL = await getBaseUrl();
  } catch (error) {
    console.log('Error initializing API URL:', error);
  }
})();

// App configuration
export const APP_VERSION = '1.0.0';
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Theme configuration
export const COLORS = {
  primary: '#003366',
  secondary: '#2196F3',
  accent: '#03DAC6',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  error: '#B00020',
  text: '#212121',
  placeholder: '#9E9E9E',
  disabled: '#BDBDBD',
};

// Storage keys
export const STORAGE_KEYS = {
  authToken: 'fieldWorkerToken',
  userData: 'fieldWorkerData',
  settings: 'appSettings'
};
