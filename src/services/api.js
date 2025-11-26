const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Helper function to make authenticated requests
const fetchWithAuth = async (url, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Auth API
export const authAPI = {
  register: async (email, password, name) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    // Store token in localStorage
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    // Store token in localStorage
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: () => {
    return !!getAuthToken();
  }
};

// Courses API
export const coursesAPI = {
  getAll: async () => {
    return fetchWithAuth(`${API_BASE_URL}/courses`);
  },

  getById: async (id) => {
    return fetchWithAuth(`${API_BASE_URL}/courses/${id}`);
  },

  create: async (courseData) => {
    return fetchWithAuth(`${API_BASE_URL}/courses`, {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  },

  update: async (id, courseData) => {
    return fetchWithAuth(`${API_BASE_URL}/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  },

  delete: async (id) => {
    return fetchWithAuth(`${API_BASE_URL}/courses/${id}`, {
      method: 'DELETE',
    });
  }
};

// Enrollments API
export const enrollmentsAPI = {
  getAll: async () => {
    return fetchWithAuth(`${API_BASE_URL}/enrollments`);
  },

  getById: async (id) => {
    return fetchWithAuth(`${API_BASE_URL}/enrollments/${id}`);
  },

  create: async (enrollmentData) => {
    return fetchWithAuth(`${API_BASE_URL}/enrollments`, {
      method: 'POST',
      body: JSON.stringify(enrollmentData),
    });
  },

  addGrade: async (id, gradeData) => {
    return fetchWithAuth(`${API_BASE_URL}/enrollments/${id}/grades`, {
      method: 'POST',
      body: JSON.stringify(gradeData),
    });
  },

  delete: async (id) => {
    return fetchWithAuth(`${API_BASE_URL}/enrollments/${id}`, {
      method: 'DELETE',
    });
  }
};
