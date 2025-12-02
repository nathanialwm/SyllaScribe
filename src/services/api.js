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
    headers["HTTP-Referer"] = import.meta.env.VITE_SITE_URL || "http://localhost:5173";
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
    try {
      console.log('Registering user:', { email, name });
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const responseData = await response.json().catch(() => ({ error: 'Failed to parse response' }));

      if (!response.ok) {
        console.error('Registration failed:', response.status, responseData);
        // Show details if available (more helpful error messages)
        const errorMsg = responseData.details || responseData.error || 'Registration failed';
        throw new Error(errorMsg);
      }

      console.log('Registration successful:', responseData);
      // Store token in localStorage
      if (responseData.token) {
        localStorage.setItem('authToken', responseData.token);
        localStorage.setItem('user', JSON.stringify(responseData.user));
      }
      return responseData;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  login: async (email, password) => {
    try {
      console.log('Logging in user:', { email });
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const responseData = await response.json().catch(() => ({ error: 'Failed to parse response' }));

      if (!response.ok) {
        console.error('Login failed:', response.status, responseData);
        throw new Error(responseData.error || responseData.details || 'Login failed');
      }

      console.log('Login successful:', responseData);
      // Store token in localStorage
      if (responseData.token) {
        localStorage.setItem('authToken', responseData.token);
        localStorage.setItem('user', JSON.stringify(responseData.user));
      }
      return responseData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
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
  },

  updateSettings: async (settings) => {
    return fetchWithAuth(`${API_BASE_URL}/auth/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  deleteAccount: async () => {
    return fetchWithAuth(`${API_BASE_URL}/auth/account`, {
      method: 'DELETE',
    });
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

  getGrade: async (id) => {
    return fetchWithAuth(`${API_BASE_URL}/courses/${id}/grade`);
  },

  delete: async (id) => {
    return fetchWithAuth(`${API_BASE_URL}/courses/${id}`, {
      method: 'DELETE',
    });
  }
};

// Enrollments API
export const enrollmentsAPI = {
  getAll: async (archived) => {
    const url = archived !== undefined 
      ? `${API_BASE_URL}/enrollments?archived=${archived}`
      : `${API_BASE_URL}/enrollments`;
    return fetchWithAuth(url);
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

  update: async (id, enrollmentData) => {
    return fetchWithAuth(`${API_BASE_URL}/enrollments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(enrollmentData),
    });
  },

  addGrade: async (id, gradeData) => {
    return fetchWithAuth(`${API_BASE_URL}/enrollments/${id}/grades`, {
      method: 'POST',
      body: JSON.stringify(gradeData),
    });
  },

  updateGradeStatus: async (id, assignmentId, status, score) => {
    return fetchWithAuth(`${API_BASE_URL}/enrollments/${id}/grades/${assignmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, score }),
    });
  },

  delete: async (id) => {
    return fetchWithAuth(`${API_BASE_URL}/enrollments/${id}`, {
      method: 'DELETE',
    });
  }
};

// AI API
export const aiAPI = {
  // Test the AI connection with a simple message
  test: async (message) => {
    return fetchWithAuth(`${API_BASE_URL}/ai/test`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  // Analyze an image with AI vision
  analyzeImage: async (imageUrl, prompt = "What is in this image?") => {
    return fetchWithAuth(`${API_BASE_URL}/ai/analyze-image`, {
      method: 'POST',
      body: JSON.stringify({ imageUrl, prompt }),
    });
  },

  // Send a chat message to AI
  chat: async (messages, model = "openai/gpt-3.5-turbo") => {
    return fetchWithAuth(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      body: JSON.stringify({ messages, model }),
    });
  },

  // Parse syllabus from file upload (no authentication required)
  parseSyllabus: async (file) => {
    const formData = new FormData();
    formData.append('syllabus', file);

    const token = localStorage.getItem('authToken');
    const headers = {};

    // Include auth token if user is logged in (for future course checking)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/ai/parse-syllabus`, {
      method: 'POST',
      headers: headers,
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to parse syllabus' }));
      throw new Error(error.error || error.details || 'Failed to parse syllabus');
    }

    return response.json();
  }
};

// Reminders API
export const remindersAPI = {
  getAll: async (upcoming, completed) => {
    const params = new URLSearchParams();
    if (upcoming !== undefined) params.append('upcoming', upcoming);
    if (completed !== undefined) params.append('completed', completed);
    const url = `${API_BASE_URL}/reminders${params.toString() ? '?' + params : ''}`;
    return fetchWithAuth(url);
  },

  create: async (reminderData) => {
    return fetchWithAuth(`${API_BASE_URL}/reminders`, {
      method: 'POST',
      body: JSON.stringify(reminderData),
    });
  },

  update: async (id, reminderData) => {
    return fetchWithAuth(`${API_BASE_URL}/reminders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(reminderData),
    });
  },

  delete: async (id) => {
    return fetchWithAuth(`${API_BASE_URL}/reminders/${id}`, {
      method: 'DELETE',
    });
  }
};

// Past Grades API
export const pastGradesAPI = {
  getAll: async () => {
    return fetchWithAuth(`${API_BASE_URL}/past-grades`);
  },

  getGPA: async () => {
    return fetchWithAuth(`${API_BASE_URL}/past-grades/gpa`);
  },

  create: async (gradeData) => {
    return fetchWithAuth(`${API_BASE_URL}/past-grades`, {
      method: 'POST',
      body: JSON.stringify(gradeData),
    });
  },

  update: async (id, gradeData) => {
    return fetchWithAuth(`${API_BASE_URL}/past-grades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(gradeData),
    });
  },

  delete: async (id) => {
    return fetchWithAuth(`${API_BASE_URL}/past-grades/${id}`, {
      method: 'DELETE',
    });
  }
};

// Admin API
export const adminAPI = {
  getUsers: async () => {
    return fetchWithAuth(`${API_BASE_URL}/admin/users`);
  },

  getUser: async (id) => {
    return fetchWithAuth(`${API_BASE_URL}/admin/users/${id}`);
  },

  resetPassword: async (userId, newPassword) => {
    return fetchWithAuth(`${API_BASE_URL}/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  deleteUser: async (userId) => {
    return fetchWithAuth(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  getStats: async () => {
    return fetchWithAuth(`${API_BASE_URL}/admin/stats`);
  }
};

// Analytics API
export const analyticsAPI = {
  getFinalsConflicts: async () => {
    return fetchWithAuth(`${API_BASE_URL}/analytics/finals-conflicts`);
  },

  getTestImportance: async () => {
    return fetchWithAuth(`${API_BASE_URL}/analytics/test-importance`);
  }
};

// Calendar API
export const calendarAPI = {
  getAll: async (startDate, endDate, courseId, eventType) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (courseId) params.append('courseId', courseId);
    if (eventType) params.append('eventType', eventType);
    const url = `${API_BASE_URL}/calendar${params.toString() ? '?' + params : ''}`;
    return fetchWithAuth(url);
  },

  getById: async (id) => {
    return fetchWithAuth(`${API_BASE_URL}/calendar/${id}`);
  },

  create: async (eventData) => {
    return fetchWithAuth(`${API_BASE_URL}/calendar`, {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  update: async (id, eventData) => {
    return fetchWithAuth(`${API_BASE_URL}/calendar/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  },

  delete: async (id) => {
    return fetchWithAuth(`${API_BASE_URL}/calendar/${id}`, {
      method: 'DELETE',
    });
  },

  bulkCreate: async (events, courseId) => {
    return fetchWithAuth(`${API_BASE_URL}/calendar/bulk-create`, {
      method: 'POST',
      body: JSON.stringify({ events, courseId }),
    });
  },

  getUpcoming: async (days = 7) => {
    return fetchWithAuth(`${API_BASE_URL}/calendar/upcoming/list?days=${days}`);
  }
};
