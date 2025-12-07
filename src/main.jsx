import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './index.css'
import { ThemeProvider } from './components/ThemeContext.jsx';
import Choice from './Choice.jsx'

// Get user from storage - check both localStorage and sessionStorage
const local = localStorage.getItem('currentUser');
const sys = sessionStorage.getItem('currentUser');
const currentUser = local ? local : sys;
// Parse user data if it exists, otherwise null
const parsedUser = currentUser ? JSON.parse(currentUser) : null;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <Choice user={parsedUser} />
    </ThemeProvider>
  </StrictMode>,
)