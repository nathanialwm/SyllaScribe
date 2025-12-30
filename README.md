# SyllaScribe

A web application that helps students track their academic performance across multiple courses. SyllaScribe uses AI-powered syllabus parsing to automatically extract grade categories and weights, eliminating the tedious manual setup while providing intelligent grade tracking and real-time weighted grade calculations.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [License](#license)
- [Contact](#contact)

## Tech Stack

**Frontend:**
- **React**: Web framework for building the user interface
- **Vite**: Fast build tool and development server
- **JavaScript**: scripting language
- **Bootstrap**: CSS framework for responsive design
- **Axios**: HTTP client for API requests
- **React Router**: Client-side routing
- **PDF.js**: PDF rendering and processing

**Backend:**
- **Node.js**: JavaScript runtime environment
- **Express**: Web application framework
- **MongoDB**: NoSQL database for data persistence
- **Mongoose**: MongoDB object modeling
- **Google Gemini AI**: Intelligent syllabus parsing and analysis
- **bcrypt**: Secure password hashing
- **Multer**: File upload middleware
- **JWT**: Token-based authentication

## Features

### AI-Powered Syllabus Parsing
Upload your course syllabus as a PDF or image, and SyllaScribe automatically extracts:
- Course name and instructor information
- Grade breakdown categories (exams, homework, projects, etc.)
- Weight percentages for each category
- Individual assignments within each category

### Intelligent Grade Tracking
- Create and manage multiple courses simultaneously
- Add custom grade categories with weighted percentages
- Track individual assignments within each category
- Real-time weighted grade calculation
- Grade breakdown summary showing category contributions
- Support for participation and special grading categories

### User Management
- Secure authentication with password hashing
- Password reset functionality with verification codes
- Account settings: theme preferences, font size, email/password updates
- Dark mode and light mode themes
- Responsive design for mobile and desktop

### Course Management
The course management system is built around the Enrollment model which links users to courses:
```typescript
interface Enrollment {
    enrollmentID: string;
    userId: string;
    courseId: string;
    enrolledAt: Date;
    grades: Array<{
        assignmentId: string;
        name: string;              // Format: "CategoryName|AssignmentName"
        grade: number;             // 0-100
        weight: number;            // Category weight percentage
    }>;
}
```

## Installation

Clone Repository
```bash
cd desired-directory
```

```bash
git clone https://github.com/nathanialwm/SyllaScribe.git
```

Install dependencies
```bash
npm install
```

Set up environment variables. Create a `.env` file in the root directory:
```bash
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_google_gemini_api_key
JWT_SECRET=your_jwt_secret
PORT=3000
```

## Usage

NOTE: Usage would require setting up your own Mongoose Database with the same schemas, and your own API key

Start the development server (frontend):
```bash
npm run dev
```

Start the backend server:
```bash
npm run server
```

For development with auto-restart:
```bash
npm run server:dev
```

This will provide a webpage through localhost. The frontend typically runs on `http://localhost:5173` and the backend on `http://localhost:3000`.

## Project Structure

```
syllascribe/
├── src/                           # Frontend React application
│   ├── components/                # Reusable components
│   │   ├── AuthModal.jsx         # Login/signup/password reset
│   │   ├── GradeTracker.jsx      # Create new course form
│   │   ├── UserGradeTracker.jsx  # Edit existing course grades
│   │   ├── SettingsModal.jsx     # User account settings
│   │   └── ThemeContext.jsx      # Dark/light theme provider
│   ├── services/                  # API service layer
│   │   ├── api.js                # API endpoints wrapper
│   │   └── axiosConfig.js        # Axios configuration
│   ├── App.jsx                   # Main application component
│   └── Home.jsx                  # Dashboard and course management
├── server/                        # Backend Express application
│   ├── routes/                   # API route handlers
│   │   ├── auth.js              # Authentication endpoints
│   │   ├── courses.js           # Course CRUD operations
│   │   ├── enrollments.js       # Enrollment management
│   │   └── ai.js                # AI syllabus parsing
│   ├── models/                   # MongoDB schemas
│   │   ├── User.js              # User model with auth
│   │   ├── Course.js            # Course model
│   │   └── Enrollment.js        # User-course enrollment model
│   ├── middleware/               # Custom middleware
│   │   ├── auth.js              # JWT authentication
│   │   └── upload.js            # File upload handling
│   └── server.js                 # Express server setup
└── package.json                   # Project dependencies
```

## License

Unlicensed

## Contact

Nathanial Martin @ [LinkedIn](https://www.linkedin.com/in/nathanialm/)

