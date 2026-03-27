import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token and Branch Context to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('gem_token')
    const branchCode = localStorage.getItem('gem_branch_code') || localStorage.getItem('gem_branch')

    if (token) config.headers.Authorization = `Bearer ${token}`

    // Don't send branch context for auth, settings or branch list requests
    const isPublicRoute = config.url.includes('/auth/') || config.url === '/branches' || config.url.endsWith('/branches') || config.url === '/settings' || config.url.endsWith('/settings')
    if (branchCode && !isPublicRoute) config.headers['x-branch'] = branchCode

    return config
})

// Handle 401 globally — redirect to login
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('gem_token')
            localStorage.removeItem('gem_user')
            localStorage.removeItem('gem_branch_code')
            localStorage.removeItem('gem_branch_name')
            localStorage.removeItem('gem_branch')
            window.location.href = '/login'
        }
        return Promise.reject(err)
    }
)

export default api
