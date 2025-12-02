import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './index.css'
import Choice from './Choice.jsx'

const currentUser = localStorage.getItem('currentUser');
const parsedUser = currentUser ? JSON.parse(currentUser) : null;
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Choice user ={parsedUser} />
  </StrictMode>,
)