import './until/apiConfig.js';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthProvider from './context/authContext.jsx'
import { EmployeeLanguageProvider } from './components/employeedashboared/EmployeeLanguage.jsx'

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <EmployeeLanguageProvider>
      <App />
    </EmployeeLanguageProvider>
  </AuthProvider>,
)
