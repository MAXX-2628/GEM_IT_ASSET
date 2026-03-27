import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Sun, Moon, Monitor, Palette, CheckCircle2, Lock, User, KeyRound, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import './Login.css'

export default function Login() {
    const { login } = useAuth()
    const { themeMode, setThemeMode, primaryColor, setPrimaryColor } = useTheme()
    const navigate = useNavigate()
    
    const [form, setForm] = useState({ username: '', password: '' })
    const [show, setShow] = useState(false)
    const [loading, setLoading] = useState(false)
    const [focused, setFocused] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        const res = await login(form.username, form.password)
        setLoading(false)
        if (res.success) {
            toast.success('Access Granted')
            navigate('/')
        } else {
            toast.error(res.message || 'Authentication Failed')
        }
    }

    return (
        <div className="login-wrapper">
            {/* Left Panel: Hero Section */}
            <div className="hero-panel">
                {/* Abstract grid decoration */}
                <div className="hero-grid" aria-hidden="true">
                    {Array.from({ length: 64 }).map((_, i) => (
                        <div key={i} className="grid-cell" />
                    ))}
                </div>

                <div className="hero-content">
                    <div className="brand-header">
                        <div className="logo-box">
                            <img src="/logo.png" alt="GEM IT" className="hero-logo" />
                        </div>
                        <div>
                            <h1 className="hero-title">GEM IT</h1>
                            <p className="hero-title-sub">Asset Management</p>
                        </div>
                    </div>
                    
                    <div className="hero-copy">
                        <div className="hero-badge">Enterprise Platform</div>
                        <h2 className="hero-headline">Next-Gen Asset<br />Management System</h2>
                        <p className="hero-tagline">Empowering enterprise IT infrastructure with intelligent tracking and seamless synchronization across all branches.</p>
                    </div>

                    <div className="hero-stats">
                        <div className="stat-item">
                            <span className="stat-value">99.9%</span>
                            <span className="stat-label">Uptime</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat-item">
                            <span className="stat-value">256-bit</span>
                            <span className="stat-label">Encrypted</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat-item">
                            <span className="stat-value">v5.2</span>
                            <span className="stat-label">Stable</span>
                        </div>
                    </div>
                </div>
                
                <div className="hero-footer">
                    <span className="copyright">© 2026 GEM Systems Inc.</span>
                </div>

                {/* Decorative blobs */}
                <div className="shape shape-1" aria-hidden="true" />
                <div className="shape shape-2" aria-hidden="true" />
                <div className="shape shape-3" aria-hidden="true" />
            </div>

            {/* Right Panel: Form Section */}
            <div className="form-panel">
                {/* Top-right theme controls */}
                <div className="theme-controls">
                    <div className="mode-toggle">
                        <button className={`theme-btn ${themeMode === 'light' ? 'active' : ''}`} onClick={() => setThemeMode('light')} title="Light Mode">
                            <Sun size={15} />
                        </button>
                        <button className={`theme-btn ${themeMode === 'dark' ? 'active' : ''}`} onClick={() => setThemeMode('dark')} title="Dark Mode">
                            <Moon size={15} />
                        </button>
                        <button className={`theme-btn ${themeMode === 'system' ? 'active' : ''}`} onClick={() => setThemeMode('system')} title="System">
                            <Monitor size={15} />
                        </button>
                    </div>
                    <div className="divider" />
                    <div className="color-picker-wrapper" title="Accent Color">
                        <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="color-input" />
                        <div className="color-swatch" style={{ background: primaryColor }} />
                        <Palette size={12} className="color-icon" />
                    </div>
                </div>

                <div className="form-container">
                    {/* Logo + heading */}
                    <div className="form-header">
                        <div className="form-logo-row">
                            <img src="/logo.png" alt="GEM IT" className="form-logo" />
                            <span className="form-brand-name">GEM IT</span>
                        </div>
                        <h3 className="welcome-text">Welcome back</h3>
                        <p className="login-subtitle">Sign in to continue to your workspace</p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form" noValidate>
                        {/* Username */}
                        <div className={`input-group ${focused === 'username' ? 'focused' : ''} ${form.username ? 'has-value' : ''}`}>
                            <label className="input-label">Username</label>
                            <div className="field-wrapper">
                                <span className="field-icon"><User size={17} /></span>
                                <input
                                    type="text"
                                    className="auth-input"
                                    placeholder="Your username"
                                    value={form.username}
                                    onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                                    onFocus={() => setFocused('username')}
                                    onBlur={() => setFocused(null)}
                                    required
                                    autoFocus
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className={`input-group ${focused === 'password' ? 'focused' : ''} ${form.password ? 'has-value' : ''}`}>
                            <label className="input-label">Password</label>
                            <div className="field-wrapper">
                                <span className="field-icon"><KeyRound size={17} /></span>
                                <input
                                    type={show ? 'text' : 'password'}
                                    className="auth-input"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                    onFocus={() => setFocused('password')}
                                    onBlur={() => setFocused(null)}
                                    required
                                    autoComplete="current-password"
                                />
                                <button type="button" onClick={() => setShow(s => !s)} className="visibility-toggle" tabIndex={-1}>
                                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>
                        </div>

                        {/* Options row */}
                        <div className="form-options">
                            <label className="remember-me">
                                <input type="checkbox" />
                                <span>Remember me</span>
                            </label>
                            <a href="#" className="forgot-link">Forgot password?</a>
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={loading} className={`submit-btn ${loading ? 'loading' : ''}`}>
                            {loading ? (
                                <span className="btn-loader" />
                            ) : (
                                <div className="btn-text">
                                    <Lock size={16} />
                                    <span>Sign In</span>
                                    <ArrowRight size={16} className="btn-arrow" />
                                </div>
                            )}
                        </button>
                    </form>

                    <div className="form-footer">
                        <CheckCircle2 size={13} className="secure-icon" />
                        <span>Secured with end-to-end encryption</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
