import { useState, useCallback } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { 
    PanelLeftClose, PanelLeft, Search, Bell, ChevronDown, 
    LogOut, Settings as SettingsIcon, User as UserIcon, ShieldCheck, 
    ChevronRight, LayoutGrid 
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import CommandPalette from './CommandPalette'
import { ALL_PAGES } from '../config/pages'

export default function Layout() {
    const { user, logout, activeBranchName, canAccessPage } = useAuth()
    const navigate = useNavigate()
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true')
    const [inventoryOpen, setInventoryOpen] = useState(false)

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const toggleSidebar = () => {
        const newState = !collapsed
        setCollapsed(newState)
        localStorage.setItem('sidebar_collapsed', newState)
    }

    return (
        <div className="flex h-screen bg-bg-main overflow-hidden font-sans selection:bg-primary/30">
            {/* Sidebar */}
            <aside 
                className={`
                    fixed inset-y-0 left-0 z-50 transition-all duration-500 transform 
                    bg-bg-main border-r border-border-main flex flex-col shrink-0
                    ${collapsed ? 'w-16' : 'w-64'}
                `}
            >
                <div className={`h-24 shrink-0 flex items-center transition-all duration-500 border-b border-border-main/50 ${collapsed ? 'justify-center px-0' : 'px-6'}`}>
                    <Link to="/" className="flex items-center gap-4 group w-full">
                        <div className="w-10 h-10 shrink-0 bg-bg-card-elevated border border-border-main rounded-xl flex items-center justify-center p-2 shadow-sm group-hover:border-primary/50 group-hover:shadow-[0_0_15px_var(--primary)] transition-all duration-500 overflow-hidden">
                            <img src="/logo.png" alt="GEM" className="w-full h-full object-contain filter group-hover:scale-110 transition-transform duration-500" />
                        </div>

                        {!collapsed && (
                            <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-700">
                                <span className="text-text-main font-black tracking-[0.2em] text-[15px] leading-none uppercase">
                                    GEM<span className="text-primary font-black opacity-80">_MODX</span>
                                </span>
                                <span className="text-text-muted font-bold text-[8px] tracking-[0.3em] uppercase whitespace-nowrap opacity-70 mt-1.5">
                                    ENTERPRISE SYSTEM
                                </span>
                            </div>
                        )}
                    </Link>
                </div>

                <nav className={`space-y-8 flex-1 overflow-y-auto custom-scrollbar transition-all duration-500 ${collapsed ? 'p-1' : 'p-3'}`}>
                    {['Management', 'Resources', 'Support', 'System'].map(section => {
                        const items = ALL_PAGES.filter(i => i.section === section);
                        
                        // Filter items by role and page access
                        const visibleItems = items.filter(item => {
                            if (item.role && user?.role !== item.role) return false;
                            return canAccessPage(item.id);
                        });

                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={section} className="space-y-1">
                                {!collapsed && (
                                    <div className="px-6 pt-2 pb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-text-muted">
                                        {section}
                                    </div>
                                )}
                                
                                {visibleItems.map(item => (
                                    <div key={item.id} className={collapsed ? 'px-0' : 'px-2'}>
                                        {item.children ? (
                                            <div className="space-y-1">
                                                <button 
                                                    onClick={() => !collapsed && setInventoryOpen(!inventoryOpen)}
                                                    className={`
                                                        flex items-center rounded-xl transition-all duration-300 text-xs font-bold uppercase tracking-wider group
                                                        ${collapsed ? 'justify-center w-12 h-12 mx-auto' : 'w-full gap-4 px-4 py-3'}
                                                        ${inventoryOpen ? 'bg-neutral-subtle text-primary border border-neutral-border' : 'text-text-muted hover:text-text-main hover:bg-neutral-subtle border border-transparent'}
                                                    `}
                                                >
                                                    <item.icon size={18} className={`shrink-0 transition-colors ${inventoryOpen ? 'text-primary' : 'group-hover:text-primary'}`} />
                                                    {!collapsed && (
                                                        <>
                                                            <span className="flex-1 text-left">{item.label}</span>
                                                            <ChevronDown size={14} className={`transition-transform duration-500 ${inventoryOpen ? 'rotate-180 text-primary' : ''}`} />
                                                        </>
                                                    )}
                                                </button>
                                                {!collapsed && inventoryOpen && (
                                                    <div className="ml-6 mt-1 space-y-1 border-l border-border-main">
                                                        {item.children.map(child => (
                                                            <NavLink 
                                                                  key={child.to} 
                                                                  to={child.to} 
                                                                  className={({ isActive }) => `
                                                                      flex items-center gap-3 py-2.5 pl-6 pr-4 text-[10px] font-bold uppercase tracking-widest transition-all
                                                                      ${isActive ? 'text-text-main border-l-2 border-primary -ml-[1px]' : 'text-text-muted hover:text-text-dim'}
                                                                  `}
                                                              >
                                                                  {child.label}
                                                              </NavLink>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <NavLink 
                                                to={item.to} 
                                                className={({ isActive }) => `
                                                    flex items-center rounded-xl transition-all duration-300 text-xs font-bold uppercase tracking-wider group relative overflow-hidden
                                                    ${collapsed ? 'justify-center w-12 h-12 mx-auto' : 'gap-4 px-4 py-3'}
                                                    ${isActive 
                                                        ? 'bg-primary/10 text-text-main border border-primary/20 shadow-primary' 
                                                        : 'text-text-muted hover:text-text-main hover:bg-neutral-subtle border border-transparent'}
                                                `}
                                            >
                                                {({ isActive }) => (
                                                    <>
                                                        {isActive && <div className={`absolute left-0 bg-primary shadow-primary ${collapsed ? 'inset-y-2 w-1 rounded-r-full' : 'inset-y-0 w-1'}`} />}
                                                        <item.icon size={18} className={`shrink-0 transition-colors ${isActive ? 'text-primary' : 'group-hover:text-primary'}`} />
                                                        {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                                                    </>
                                                )}
                                            </NavLink>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    })}
                </nav>

                <div className="mt-auto h-4 shrink-0 bg-transparent" />
            </aside>

            {/* Main Wrapper */}
            <div className={`flex-1 flex flex-col transition-all duration-500 ${collapsed ? 'pl-16' : 'pl-64'}`}>
                <header className="h-20 bg-bg-main/80 backdrop-blur-md border-b border-border-main flex items-center px-8 gap-6 shrink-0 fixed top-0 right-0 z-40 transition-all duration-500" 
                        style={{ left: collapsed ? '64px' : '256px' }}>
                    <div className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <button 
                                onClick={toggleSidebar} 
                                className="w-10 h-10 rounded-xl bg-neutral-subtle border border-neutral-border hover:border-primary/40 hover:text-primary transition-all text-text-muted flex items-center justify-center group"
                            >
                                {collapsed ? <PanelLeft size={20} className="group-hover:scale-110 transition-transform" /> : <PanelLeftClose size={20} className="group-hover:scale-110 transition-transform" />}
                            </button>
                            
                            <Link to="/select-branch" className="flex flex-col hover:bg-primary/10 px-3 py-1.5 rounded-xl cursor-pointer transition-all border border-transparent hover:border-primary/20 group/branch">
                                <div className="text-[9px] font-bold text-text-muted uppercase tracking-[0.3em] mb-0.5 group-hover/branch:text-primary/70 transition-colors">Location</div>
                                <div className="text-sm font-black text-text-main tracking-widest uppercase flex items-center gap-2">
                                     <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-primary animate-pulse" />
                                     {activeBranchName || 'Global View'}
                                </div>
                            </Link>

                            <div className="h-6 w-px bg-border-main" />

                            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-bg-card-elevated border border-border-main shadow-inner group/status">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent-green shadow-accent-green animate-pulse" />
                                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest group-hover/status:text-accent-green transition-colors">System Online</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                            <div 
                                onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
                                className="relative group hidden lg:block cursor-pointer"
                            >
                                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-hover:text-primary transition-colors" />
                                <div className="bg-bg-card border border-border-main rounded-xl pl-11 pr-4 py-2.5 w-64 group-hover:border-primary/30 transition-all flex items-center justify-between shadow-sm">
                                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Search Assets...</span>
                                    <span className="bg-bg-main border border-border-main px-1.5 py-0.5 rounded text-[8px] font-mono text-text-muted shadow-inner tracking-tight font-black">CTRL+K</span>
                                </div>
                            </div>

                            <button className="w-10 h-10 rounded-xl bg-bg-card border border-border-main text-text-muted hover:text-primary hover:border-primary/30 transition-all relative flex items-center justify-center group shadow-sm">
                                <Bell size={18} className="group-hover:animate-swing" />
                                <span className="absolute top-[9px] right-[9px] w-2 h-2 bg-primary rounded-full ring-2 ring-bg-card shadow-primary" />
                            </button>
                            
                            <div className="h-6 w-[2px] bg-border-main/50 rounded-full" />

                            <div className="flex items-center gap-4 relative group cursor-pointer pb-2 -mb-2">
                                <div className="flex flex-col items-end hidden sm:flex">
                                     <div className="text-[11px] font-black text-text-main tracking-[0.2em] uppercase">{user?.name?.split(' ')[0] || 'IT Admin'}</div>
                                     <div className="text-[9px] font-black text-primary uppercase tracking-[0.2em] leading-none mt-1">ONLINE</div>
                                </div>
                                <div className="w-11 h-11 rounded-[14px] border border-primary/80 bg-bg-card flex items-center justify-center text-text-main font-black text-[13px] shadow-sm group-hover:bg-primary/5 transition-colors tracking-tighter">
                                     {user?.name?.charAt(0) || 'I'}
                                </div>

                                {/* Hover Dropdown */}
                                <div className="absolute top-[110%] right-0 mt-1 w-48 bg-bg-card-elevated border border-border-main rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-50">
                                    <div className="p-2">
                                        <button 
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors text-[10px] font-black uppercase tracking-widest"
                                        >
                                            <LogOut size={14} /> System Logout
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 mt-20 bg-bg-main relative">
                    {/* Background Grid Pattern Overlay */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                         style={{ backgroundImage: 'radial-gradient(var(--border-main) 1px, transparent 0)', backgroundSize: '30px 30px' }} />
                    
                    <div className="max-w-[1600px] mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-1000">
                      <CommandPalette />
                      <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}



