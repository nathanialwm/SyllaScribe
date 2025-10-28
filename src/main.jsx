import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.jsx'
import mongoose from 'mongoose'

const { loadEnvFile } = require('node:process');
loadEnvFile('.env');

mongoose.connect(process.env.MONGO_URI);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
