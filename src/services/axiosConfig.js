import axios from 'axios';

axios.defaults.baseURL = 'http://localhost:5000';

// Add request interceptor
axios.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors gracefully
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    
    if (error.response) {
      const status = error.response.status;
      const url = error.config?.url || '';
      
      if ((status === 401 && url.includes('/getUser')) || 
          (status === 409 && url.includes('/createUser'))) {
        
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default axios;

