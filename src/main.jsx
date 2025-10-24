import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.jsx'
import mongoose from 'mongoose'

mongoose.connect('mongodb+srv://admin:418Yadmin@scribecluster.ts78qln.mongodb.net/?appName=ScribeCluster');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
