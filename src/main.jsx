import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './index.css'
import Choice from './Choice.jsx'

const local = localStorage.getItem('currentUser');
const sys = sessionStorage.getItem('currentUser');
const currentUser = local ? local : sys;
const parsedUser = currentUser ? JSON.parse(currentUser) : sys;
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Choice user ={parsedUser} />
  </StrictMode>,
)