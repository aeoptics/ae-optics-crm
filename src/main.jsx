import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Workshop from './pages/Workshop'
import Inventory from './pages/Inventory'
import LensBrands from './pages/LensBrands'
import Customers from './pages/Customers'
import Revenue from './pages/Revenue'
import Settings from './pages/Settings'
import DeliveryTracker from './pages/DeliveryTracker'
import Expenses from './pages/Expenses'
import Employees from './pages/Employees'
import ShippingSettings from './pages/ShippingSettings'
import Integrations from './pages/Integrations'
import Returns from './pages/Returns'
import LostShipments from './pages/LostShipments'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import { AuthProvider, useAuth } from './hooks/useAuth'

function ProtectedLayout() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f4f3ee' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: '#13281D' }}>
          <span className="text-white font-black text-lg">ae</span>
        </div>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#13281D', borderTopColor: 'transparent' }}/>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace/>
  return <Layout/>
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter basename="/ae-optics-crm">
        <Routes>
          <Route path="/login" element={<Login/>}/>
          <Route path="/reset-password" element={<ResetPassword/>}/>
          <Route path="/" element={<ProtectedLayout/>}>
            <Route index                   element={<Dashboard/>}/>
            <Route path="orders"           element={<Orders/>}/>
            <Route path="tracker"          element={<DeliveryTracker/>}/>
            <Route path="workshop"         element={<Workshop/>}/>
            <Route path="inventory"        element={<Inventory/>}/>
            <Route path="lens-brands"      element={<LensBrands/>}/>
            <Route path="customers"        element={<Customers/>}/>
            <Route path="returns"          element={<Returns/>}/>
            <Route path="lost"             element={<LostShipments/>}/>
            <Route path="revenue"          element={<Revenue/>}/>
            <Route path="expenses"         element={<Expenses/>}/>
            <Route path="employees"        element={<Employees/>}/>
            <Route path="shipping"         element={<ShippingSettings/>}/>
            <Route path="integrations"     element={<Integrations/>}/>
            <Route path="settings"         element={<Settings/>}/>
          </Route>
          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
)
