import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import AssetDetail from './pages/AssetDetail'
import AssetForm from './pages/AssetForm'
import MasterManagement from './pages/MasterManagement'
import DigitalAssets from './pages/DigitalAssets'
import HandoverList from './pages/HandoverList'
import ActivityLogs from './pages/ActivityLogs'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import PreventiveMaintenance from './pages/PreventiveMaintenance'
import Surveillance from './pages/Surveillance'
import SelectBranch from './pages/SelectBranch'
import Tickets from './pages/Tickets'
import BackupRestore from './pages/BackupRestore'
import StockManagement from './pages/StockManagement'
import UserManagement from './pages/UserManagement'
import PageGuard from './components/PageGuard'

import { ThemeProvider } from './context/ThemeContext'

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth()
  return !isAuthenticated ? children : <Navigate to="/" replace />
}

const BranchRoute = ({ children }) => {
  const { isAuthenticated, activeBranchCode } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!activeBranchCode) return <Navigate to="/select-branch" replace />
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/select-branch" element={<PrivateRoute><SelectBranch /></PrivateRoute>} />
        <Route path="/" element={<BranchRoute><Layout /></BranchRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="assets" element={<PageGuard pageId="inventory"><Assets /></PageGuard>} />
          <Route path="assets/live" element={<PageGuard pageId="inventory_live"><Assets context="live" /></PageGuard>} />
          <Route path="assets/stock" element={<PageGuard pageId="inventory_stock"><Assets context="stock" /></PageGuard>} />
          <Route path="assets/scrap" element={<PageGuard pageId="inventory_scrap"><Assets context="scrap" /></PageGuard>} />

          <Route path="assets/new" element={<PageGuard pageId="inventory"><AssetForm /></PageGuard>} />
          <Route path="assets/live/new" element={<PageGuard pageId="inventory_live"><AssetForm context="live" /></PageGuard>} />
          <Route path="assets/stock/new" element={<PageGuard pageId="inventory_stock"><AssetForm context="stock" /></PageGuard>} />
          <Route path="assets/scrap/new" element={<PageGuard pageId="inventory_scrap"><AssetForm context="scrap" /></PageGuard>} />

          <Route path="assets/:id" element={<PageGuard pageId="inventory"><AssetDetail /></PageGuard>} />
          <Route path="assets/:id/edit" element={<PageGuard pageId="inventory"><AssetForm /></PageGuard>} />
          <Route path="setup" element={<PageGuard pageId="setup"><MasterManagement /></PageGuard>} />
          <Route path="digital" element={<PageGuard pageId="digital"><DigitalAssets /></PageGuard>} />
          <Route path="tickets" element={<PageGuard pageId="tickets"><Tickets /></PageGuard>} />
          <Route path="handovers" element={<PageGuard pageId="handovers"><HandoverList /></PageGuard>} />
          <Route path="activities" element={<PageGuard pageId="activities"><ActivityLogs /></PageGuard>} />
          <Route path="reports" element={<PageGuard pageId="reports"><Reports /></PageGuard>} />
          <Route path="settings" element={<PageGuard pageId="settings"><Settings /></PageGuard>} />
          <Route path="pm" element={<PageGuard pageId="pm"><PreventiveMaintenance /></PageGuard>} />
          <Route path="surveillance" element={<PageGuard pageId="surveillance"><Surveillance /></PageGuard>} />
          <Route path="backup-restore" element={<PageGuard pageId="backup"><BackupRestore /></PageGuard>} />
          <Route path="stock" element={<PageGuard pageId="stock"><StockManagement /></PageGuard>} />
          <Route path="users" element={<UserManagement />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}
