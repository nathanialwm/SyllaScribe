# Backend Server Setup

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=your-secret-key-here
PORT=5000
```

You can copy `.env.example` as a template.

3. For the frontend to connect to the backend, create `.env.local` in the root:
```
VITE_API_URL=http://localhost:5000/api
```

## Running the Application

### Development Mode

You'll need to run both the frontend and backend:

**Terminal 1 - Backend Server:**
```bash
npm run server:dev
```

**Terminal 2 - Frontend (Vite):**
```bash
npm run dev
```

### Production Mode

**Backend:**
```bash
npm run server
```

**Frontend:**
```bash
npm run build
npm run preview
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Courses (requires authentication)
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get course by ID
- `POST /api/courses` - Create new course
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

### Enrollments (requires authentication)
- `GET /api/enrollments` - Get user's enrollments
- `GET /api/enrollments/:id` - Get enrollment by ID
- `POST /api/enrollments` - Create enrollment
- `POST /api/enrollments/:id/grades` - Add grade to enrollment
- `DELETE /api/enrollments/:id` - Delete enrollment

## Project Structure

```
server/
├── models/          # Database schemas
│   ├── User.js
│   ├── Course.js
│   └── Enrollment.js
├── routes/          # API routes
│   ├── auth.js
│   ├── courses.js
│   └── enrollments.js
├── middleware/      # Express middleware
│   └── auth.js
└── server.js        # Main server file

src/
└── services/
    └── api.js       # Frontend API service layer
```

## Notes

- The backend uses JWT for authentication
- Passwords are hashed using bcrypt with 10 salt rounds
- The frontend stores the JWT token in localStorage
- All course and enrollment routes require authentication
- CORS is enabled for frontend-backend communication
