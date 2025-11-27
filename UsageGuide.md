
## How to Use

### Running the Application

**Terminal 1 - Backend:**
```bash
npm run server:dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### MongoDB Atlas Configuration
The server startup showed a MongoDB connection error. This is expected and needs to be fixed:

1. Go to your MongoDB Atlas dashboard
2. Navigate to Network Access
3. Add your current IP address to the whitelist
   - Or use `0.0.0.0/0` for all IPs (development only, not recommended for production)

### Using the API in Frontend

Example usage in React components:

```javascript
import { authAPI, coursesAPI, enrollmentsAPI } from './services/api';

// Register
const data = await authAPI.register(email, password, name);

// Login
const data = await authAPI.login(email, password);

// Get courses (requires authentication)
const courses = await coursesAPI.getAll();

// Create enrollment
const enrollment = await enrollmentsAPI.create({
  enrollmentID: 'ENROLL-001',
  courseId: 'course-id-here'
});
```

## Testing the Server

The server is working! You can test the health endpoint:

```bash
curl http://localhost:5000/api/health
```

Or test registration:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```
