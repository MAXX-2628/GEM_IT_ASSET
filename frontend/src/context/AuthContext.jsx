import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('gem_user')) } catch { return null }
    })
    const [activeBranchCode, setActiveBranchCode] = useState(() => {
        return localStorage.getItem('gem_branch_code') || null
    })
    const [activeBranchName, setActiveBranchName] = useState(() => {
        return localStorage.getItem('gem_branch_name') || null
    })
    const [loading, setLoading] = useState(false)

    // Sync active branch to local storage when changed
    useEffect(() => {
        if (activeBranchCode) {
            localStorage.setItem('gem_branch_code', activeBranchCode)
            localStorage.setItem('gem_branch_name', activeBranchName)
        } else {
            localStorage.removeItem('gem_branch_code')
            localStorage.removeItem('gem_branch_name')
            localStorage.removeItem('gem_branch') // Clean up old key
        }
    }, [activeBranchCode, activeBranchName])

    const login = async (username, password) => {
        setLoading(true)
        try {
            const { data } = await api.post('/auth/login', { username, password })
            localStorage.setItem('gem_token', data.token)
            localStorage.setItem('gem_user', JSON.stringify(data.user))
            // Do not clear branch immediately on login in case user logs back in right away
            // But SelectBranch route will handle overriding it if needed.
            setUser(data.user)
            return { success: true }
        } catch (err) {
            return { success: false, message: err.response?.data?.message || 'Login failed' }
        } finally {
            setLoading(false)
        }
    }

    const logout = async () => {
        try { await api.post('/auth/logout') } catch { /* ignore error on logout */ }
        localStorage.removeItem('gem_token')
        localStorage.removeItem('gem_user')
        localStorage.removeItem('gem_branch_code')
        localStorage.removeItem('gem_branch_name')
        localStorage.removeItem('gem_branch')
        setUser(null)
        setActiveBranchCode(null)
        setActiveBranchName(null)
    }

    const setBranch = (branch) => {
        if (!branch) {
            setActiveBranchCode(null)
            setActiveBranchName(null)
        } else {
            setActiveBranchCode(branch.code)
            setActiveBranchName(branch.name)
        }
    }

    const isSuperAdmin = () => user?.role?.toLowerCase() === 'super_admin'
    const isBranchAdmin = () => user?.role?.toLowerCase() === 'branch_admin'
    const isViewer = () => user?.role?.toLowerCase() === 'viewer'

    const canAccessBranch = (branchCode) => {
        if (!user) return false
        if (user.role === 'super_admin' || user.hasFullAccess) return true
        return user.assignedBranches?.includes(branchCode)
    }

    const canAccessPage = (pageId) => {
        if (!user) return false
        if (user.role?.toLowerCase() === 'super_admin') return true
        // Dashboard is usually allowed for all
        if (pageId === 'dashboard') return true
        return user.allowedPages?.includes(pageId)
    }

    const canEdit = () => {
        if (!user) return false
        return ['super_admin', 'branch_admin'].includes(user.role)
    }

    return (
        <AuthContext.Provider value={{
            user, loading, login, logout, isAuthenticated: !!user,
            activeBranchCode, activeBranchName, setBranch,
            isSuperAdmin, isBranchAdmin, isViewer, canAccessBranch, canEdit, canAccessPage
        }}>
            {children}
        </AuthContext.Provider>
    )
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
