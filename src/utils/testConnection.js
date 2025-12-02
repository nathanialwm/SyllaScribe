// Utility to test API connection
export async function testAPIConnection() {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    console.log('API Connection Test:', data);
    return { connected: true, data };
  } catch (error) {
    console.error('API Connection Test Failed:', error);
    return { connected: false, error: error.message };
  }
}

