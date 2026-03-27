import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts'
import api from '../api/client'
import toast from 'react-hot-toast'
import * as Icons from 'lucide-react'
import StatCard from '../components/StatCard'
import { Card, CardHeader, CardTitle, CardBody, Button, Badge, Table, THead, TBody, TR, TH, TD, PageHeader, Counter } from '../components/ui'
import Skeleton from '../components/ui/Skeleton'

const COLORS = ['var(--primary)', 'var(--secondary)', 'var(--accent-green)', 'var(--accent-amber)', 'var(--accent-red)', 'var(--accent-blue)', 'var(--secondary-glow)', 'var(--primary-glow)']

export default function Dashboard() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'

    useEffect(() => {
        api.get('/dashboard')
            .then(r => setStats(r.data.data))
            .catch(() => toast.error('Failed to load dashboard data'))
            .finally(() => setLoading(false))
    }, [])

    const statusData = useMemo(() => {
        if (!stats) return []
        return stats.assetsByStatus.map(s => ({
            name: s._id?.toUpperCase() || 'UNKNOWN',
            value: s.count
        }))
    }, [stats])

    const healthScore = useMemo(() => {
        if (!stats) return 100
        const offlinePenalty = (stats.offlineDevices / Math.max(stats.totalAssets, 1)) * 50
        const ticketPenalty = (stats.openTickets / Math.max(stats.totalAssets, 1)) * 30
        const warrantyOverdue = stats.warrantyExpiringSoon?.length || 0
        const warrantyPenalty = (warrantyOverdue / Math.max(stats.totalAssets, 1)) * 20
        return Math.max(0, Math.floor(100 - offlinePenalty - ticketPenalty - warrantyPenalty))
    }, [stats])

    const deptData = useMemo(() => {
        if (!stats || !stats.assetsByDept) return []
        return stats.assetsByDept.slice(0, 8).map(d => ({
            dept: d._id?.toUpperCase() || 'UNKNOWN',
            count: d.count
        }))
    }, [stats])

    const userName = localStorage.getItem('userName') || 'Operator'
    const branchName = stats?.branch || 'GLOBAL_HUB'

    if (loading) return (
        <div className="space-y-8">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-3">
                    <Skeleton className="h-10 w-80 bg-neutral-subtle" />
                    <Skeleton className="h-5 w-56 bg-neutral-subtle" />
                </div>
                <Skeleton className="h-12 w-40 bg-neutral-subtle rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 bg-neutral-subtle rounded-2xl" />)}
            </div>
            <Skeleton className="h-64 w-full bg-neutral-subtle rounded-2xl" />
        </div>
    )

    if (!stats) return null

    return (
        <div className="space-y-10 pb-16">
            <div className="relative pb-6 border-b border-border-main/50">
                <PageHeader
                    title={
                        <span className="font-black tracking-tighter text-4xl sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-text-main via-text-main to-text-muted">
                            {greeting.toUpperCase()}, {userName.toUpperCase()}
                        </span>
                    }
                    subtitle={
                        <div className="flex flex-wrap items-center gap-6 mt-4">
                            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-neutral-subtle/50 border border-border-main group hover:border-primary/50 transition-colors">
                                <Icons.Calendar size={14} className="text-primary group-hover:scale-110 transition-transform" />
                                <span className="text-text-muted font-black uppercase tracking-[0.2em] text-[10px]">
                                    {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-neutral-subtle/50 border border-border-main group hover:border-secondary/50 transition-colors">
                                <Icons.MapPin size={14} className="text-secondary group-hover:scale-110 transition-transform" />
                                <span className="text-text-muted font-black uppercase tracking-[0.2em] text-[10px]">
                                    {branchName.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-green/10 border border-accent-green/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse shadow-[0_0_8px_var(--accent-green)]" />
                                <span className="text-accent-green font-black uppercase tracking-[0.2em] text-[9px]">System Live</span>
                            </div>
                        </div>
                    }
                    actions={
                        <Button 
                            variant="primary" 
                            onClick={() => navigate('/assets/new')} 
                            icon={Icons.Plus} 
                            className="shadow-primary hover:shadow-primary-glow hover:scale-105 transition-all px-8 h-12 font-black tracking-widest uppercase text-xs"
                        >
                            Deploy New Asset
                        </Button>
                    }
                />
                {/* Animated Header Underglow */}
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary via-secondary to-transparent opacity-30 shadow-[0_0_15px_var(--primary)]" />
            </div>

            {/* Top KPI Command Nodes - Ultra Clean UI */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                 <div 
                    onClick={() => navigate('/assets/live?status=Active')}
                    className="bg-bg-card-elevated border-y border-r border-l-4 border-l-accent-blue border-border-main hover:bg-neutral-subtle group transition-colors rounded-xl shadow-sm p-5 flex items-center gap-5 cursor-pointer relative overflow-visible"
                 >
                     <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110 border bg-accent-blue/10 text-accent-blue border-accent-blue/20">
                         <Icons.Activity size={24} />
                     </div>
                     <div className="flex-1 min-w-0">
                         <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1 truncate">Online Operational</div>
                         <div className="text-3xl font-black text-text-main leading-none tracking-tight">
                            <Counter value={stats.assetsByStatus?.find(s => s._id?.toLowerCase() === 'active')?.count || 0} />
                         </div>
                     </div>
                 </div>

                 <div 
                    onClick={() => navigate('/assets/stock')}
                    className="bg-bg-card-elevated border-y border-r border-l-4 border-l-accent-amber border-border-main hover:bg-neutral-subtle group transition-colors rounded-xl shadow-sm p-5 flex items-center gap-5 cursor-pointer relative overflow-visible"
                 >
                     <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110 border bg-accent-amber/10 text-accent-amber border-accent-amber/20">
                         <Icons.PackageCheck size={24} />
                     </div>
                     <div className="flex-1 min-w-0">
                         <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1 truncate">Reserve Inventory</div>
                         <div className="text-3xl font-black text-text-main leading-none tracking-tight">
                            <Counter value={stats.inStockCount} />
                         </div>
                     </div>
                 </div>

                 <div 
                    onClick={() => navigate('/assets/live?status=offline')}
                    className="bg-bg-card-elevated border-y border-r border-l-4 border-l-accent-red border-border-main hover:bg-neutral-subtle group transition-colors rounded-xl shadow-sm p-5 flex items-center gap-5 cursor-pointer relative overflow-visible"
                 >
                     <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110 border bg-accent-red/10 text-accent-red border-accent-red/20">
                         <Icons.AlertOctagon size={24} />
                     </div>
                     <div className="flex-1 min-w-0">
                         <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1 truncate">Critical Offline</div>
                         <div className="text-3xl font-black text-text-main leading-none tracking-tight">
                            <Counter value={stats.offlineDevices} />
                         </div>
                     </div>
                 </div>

                 <div 
                    onClick={() => navigate('/assets/live')}
                    className="bg-bg-card-elevated border-y border-r border-l-4 border-l-primary border-border-main hover:bg-neutral-subtle group transition-colors rounded-xl shadow-sm p-5 flex items-center gap-5 cursor-pointer relative overflow-visible"
                 >
                     <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110 border bg-primary/10 text-primary border-primary/20">
                         <Icons.Layers size={24} />
                     </div>
                     <div className="flex-1 min-w-0">
                         <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1 truncate">Global Fleet Size</div>
                         <div className="text-3xl font-black text-text-main leading-none tracking-tight">
                            <Counter value={stats.totalAssets} />
                         </div>
                     </div>
                 </div>
            </div>

            {/* Advanced Dashboard Core - Landscape */}
            <Card className="glass-elevated border-border-main relative overflow-hidden group/health min-h-[160px] flex flex-col justify-center">
                {/* Background Tech Pattern */}
                <div className="absolute inset-x-0 bottom-0 h-[100px] opacity-[0.03] pointer-events-none bg-[radial-gradient(ellipse_at_top,var(--primary)_0%,transparent_70%)]" />
                
                <div className="p-8 relative z-10 flex flex-col lg:flex-row items-center gap-10 h-full">
                    {/* Status Left */}
                    <div className="flex flex-col gap-2 shrink-0 lg:w-48 text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-3">
                            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                                <Icons.Activity size={14} className="text-primary animate-pulse" />
                            </div>
                            <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Reactor Core Status</div>
                        </div>
                        <div className="flex items-end justify-center lg:justify-start gap-2 mt-4 text-text-main">
                            <span className="text-6xl font-black leading-none tracking-tighter">{healthScore}</span>
                            <span className="text-xl font-black text-text-muted mb-1">%</span>
                        </div>
                        <div className="flex items-center justify-center lg:justify-start gap-2 mt-2">
                            <div className={`w-2 h-2 rounded-full ${healthScore > 90 ? 'bg-accent-green shadow-[0_0_10px_var(--accent-green)]' : 'bg-primary shadow-primary'} animate-pulse`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                                {healthScore > 90 ? 'System Stable' : 'Degraded State'}
                            </span>
                        </div>
                    </div>

                    {/* Energy Bar Center */}
                    <div className="flex-1 w-full flex flex-col justify-center relative px-2">
                        <div className="relative h-12 bg-neutral-subtle rounded-2xl border border-border-main overflow-hidden shadow-inner group-hover/health:border-primary/20 transition-colors">
                            {/* Grid overlay on bar */}
                            <div className="absolute inset-0 z-10 opacity-20 pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 100%' }} />
                            
                            {/* Liquid Fill Level */}
                            <div 
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/80 via-primary to-secondary/80 transition-all duration-1000 ease-in-out shadow-[0_0_20px_var(--primary)]"
                                style={{ width: `${healthScore}%` }}
                            >
                                <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20" />
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-3 px-2">
                            <span className="text-[8px] font-mono text-text-muted opacity-50">CRITICAL_0%</span>
                            <span className="text-[8px] font-mono text-text-muted opacity-50 tracking-[0.2em] uppercase font-black">Stability Index Monitoring</span>
                            <span className="text-[8px] font-mono text-text-muted opacity-50">NOMINAL_100%</span>
                        </div>
                    </div>

                    {/* Fleet Integrity Right */}
                    <div className="flex flex-col shrink-0 lg:w-64 lg:border-l border-border-main/50 lg:pl-10 space-y-4 w-full">
                         <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                             <span className="flex items-center gap-2">
                                 <Icons.Shield size={12} className="text-secondary" />
                                 Fleet Integrity
                             </span>
                             <span className="text-text-main font-mono text-xl tracking-tighter">{Math.round((1 - (stats.offlineDevices / Math.max(stats.totalAssets, 1))) * 100)}%</span>
                         </div>
                         <div className="h-2 bg-neutral-subtle rounded-full overflow-hidden border border-border-main/20">
                             <div 
                                 className="h-full bg-gradient-to-r from-primary to-secondary shadow-[0_0_10px_var(--primary)] transition-all duration-1000" 
                                 style={{ width: `${(1 - (stats.offlineDevices / Math.max(stats.totalAssets, 1))) * 100}%` }} 
                             />
                         </div>
                         <p className="text-[8px] text-text-muted tracking-[0.1em] uppercase font-bold lg:text-right pt-2 border-t border-border-main/20">Online vs Offline nodes mapped automatically.</p>
                    </div>
                </div>
            </Card>

                {/* Asset Classification Matrix - List Based UI */}
                <Card className="glass-elevated border-border-main relative overflow-hidden bg-bg-card mb-6">
                     <CardHeader className="p-6 border-b border-border-main/50 relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl shadow-inner">
                                    <Icons.List size={18} className="text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-text-main">Classification Index</CardTitle>
                                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] mt-1">Hardware Density Mappings</div>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" className="hidden sm:flex text-[9px] font-black uppercase tracking-[0.2em] border border-border-main hover:border-primary/50 hover:bg-primary/5 h-8 px-4 transition-all" onClick={() => navigate('/assets/live')}>
                                Full Catalog
                            </Button>
                        </div>
                    </CardHeader>

                    <CardBody className="p-6 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {stats.assetTypes?.sort((a, b) => {
                                const countA = stats.assetsByType?.find(t => t._id === a.name)?.count || 0;
                                const countB = stats.assetsByType?.find(t => t._id === b.name)?.count || 0;
                                return countB - countA;
                            }).map((typeObj, i) => {
                                const countInfo = stats.assetsByType?.find(t => t._id === typeObj.name)
                                const count = countInfo ? countInfo.count : 0
                                const iconName = typeObj.icon || 'Box'
                                const IconComponent = Icons[iconName] || Icons.Box
                                const percent = ((count / Math.max(stats.totalAssets, 1)) * 100).toFixed(1)
                                
                                return (
                                    <div 
                                        key={typeObj.name} 
                                        className="flex items-center justify-between p-4 rounded-xl bg-neutral-subtle border border-border-main hover:border-primary/50 hover:bg-bg-card-elevated hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group shadow-sm"
                                        onClick={() => navigate(`/assets/live?type=${encodeURIComponent(typeObj.name)}`)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 rounded-lg bg-bg-main border border-border-main/50 text-text-muted group-hover:text-primary group-hover:border-primary/30 group-hover:bg-primary/5 transition-colors">
                                                <IconComponent size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black text-text-main uppercase tracking-widest leading-none mb-1.5">{typeObj.name}</span>
                                                <span className="text-[8px] font-mono text-text-muted uppercase tracking-[0.2em] leading-none">{percent}% Density</span>
                                            </div>
                                        </div>
                                        <div className="text-xl font-black font-mono text-text-main group-hover:text-primary transition-colors tracking-tighter shrink-0 ml-4">
                                            {count}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardBody>
                </Card>

            {/* Operational Lifecycle Pipeline - Clean HUD UI */}
            <Card className="bg-bg-card-elevated border-none shadow-sm overflow-hidden relative group/pipeline">
                <div className="p-8 md:p-12 relative z-10">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-16">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-primary/20 to-secondary/20 text-primary rounded-2xl border border-primary/20 shadow-primary group-hover/pipeline:scale-105 transition-transform">
                                <Icons.Network size={22} className="drop-shadow-md" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-text-main uppercase tracking-[0.3em] drop-shadow-md">Operational Lifecycle</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Global Hardware Pipeline Stream</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative max-w-5xl mx-auto">
                        {/* High-Tech Connecting Line */}
                        <div className="hidden md:block absolute top-[40%] left-12 right-12 h-px bg-border-main/20 -translate-y-1/2 overflow-hidden">
                            {/* Animated Flow Particles */}
                            <div className="absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80 animate-[slide_3s_linear_infinite]" />
                            <div className="absolute top-0 bottom-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-secondary to-transparent opacity-80 animate-[slide_4s_linear_infinite_1.5s]" />
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
                            {[
                                { label: 'In Stock Reserve', value: stats.inStockCount, icon: Icons.PackageOpen, color: 'text-text-muted', iconBg: 'bg-neutral-subtle/80', border: 'border-border-main/50' },
                                { label: 'Live Deployed', value: stats.totalAssets - stats.inStockCount, icon: Icons.Activity, color: 'text-primary', iconBg: 'bg-primary/20', border: 'border-primary/40' },
                                { label: 'Active Connected', value: stats.assetsByStatus?.find(s => s._id?.toLowerCase() === 'active')?.count || 0, icon: Icons.Wifi, color: 'text-accent-green', iconBg: 'bg-accent-green/20', border: 'border-accent-green/40' },
                                { label: 'Decommissioned', value: stats.assetsByStatus?.find(s => s._id?.toLowerCase() === 'scrap')?.count || 0, icon: Icons.Trash2, color: 'text-accent-red', iconBg: 'bg-accent-red/20', border: 'border-accent-red/40' },
                            ].map((step, i) => (
                                <div key={step.label} className="flex flex-col items-center group cursor-default">
                                    <div className={`w-24 h-24 rounded-[2rem] bg-bg-card border-2 ${step.border} flex items-center justify-center mb-6 transition-all duration-500 group-hover:-translate-y-2 relative ${step.color} shadow-lg backdrop-blur-sm group-hover:shadow-[0_0_30px_-5px_currentColor]`}>
                                        <div className={`absolute inset-0 ${step.iconBg} rounded-[1.8rem] opacity-50 group-hover:opacity-100 transition-opacity`} />
                                        <step.icon size={32} className="relative z-10 group-hover:scale-110 transition-transform drop-shadow-md" />
                                        
                                        {/* Connector Flow Arrow */}
                                        {i < 3 && (
                                            <div className="hidden md:flex absolute -right-[4.2rem] top-1/2 -translate-y-1/2 text-border-main group-hover:text-primary transition-colors items-center justify-center">
                                                <Icons.ChevronsRight size={24} className="animate-[pulse_1.5s_infinite]" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-4xl font-black text-text-main font-mono tracking-tighter mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-text-main group-hover:to-text-muted transition-all drop-shadow-sm">{step.value}</div>
                                    <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-center px-4 bg-bg-main/50 rounded-lg py-1 border border-border-main/50 backdrop-blur-sm">{step.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Graphical Analytics - Minimal Clean Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-bg-card-elevated border-none shadow-sm">
                    <CardHeader className="px-8 pt-8 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Icons.PieChart size={16} className="text-secondary" />
                                <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-text-main drop-shadow-md">Department Allocation</CardTitle>
                            </div>
                            <Badge variant="magenta" className="text-[9px] font-black tracking-widest shadow-lg">TOP 8</Badge>
                        </div>
                    </CardHeader>
                    <CardBody className="px-4 pb-8 overflow-hidden relative">
                        {/* Background Grid for HUD look */}
                        <div className="absolute inset-x-8 inset-y-4 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(var(--border-main) 1px, transparent 1px), linear-gradient(90deg, var(--border-main) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                        
                        <div className="h-[340px] w-full min-w-0 relative z-10">
                            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1} debounce={50}>
                                <AreaChart data={deptData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.6}/>
                                            <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} opacity={0.5} />
                                    <XAxis 
                                        dataKey="dept" 
                                        tick={{ fill: 'var(--text-muted)', fontSize: 9, fontWeight: 900, letterSpacing: '0.1em' }} 
                                        axisLine={{ stroke: 'var(--border-main)', strokeWidth: 2 }}
                                        tickLine={false}
                                        dy={10}
                                    />
                                    <YAxis 
                                        tick={{ fill: 'var(--text-muted)', fontSize: 9, fontWeight: 900, fontFamily: 'monospace' }}
                                        axisLine={{ stroke: 'var(--border-main)' }}
                                        tickLine={false}
                                        dx={-5}
                                    />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'var(--bg-card-elevated)', border: '1px solid var(--border-main)', borderRadius: '16px', fontSize: '10px', color: 'var(--text-main)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)' }}
                                        itemStyle={{ color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '14px', textShadow: '0 0 10px var(--primary)' }}
                                        labelStyle={{ color: 'var(--text-muted)', marginBottom: '8px' }}
                                        cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="count" 
                                        stroke="var(--primary)" 
                                        strokeWidth={4}
                                        fillOpacity={1} 
                                        fill="url(#colorCount)" 
                                        animationDuration={1500}
                                        style={{ filter: 'drop-shadow(0 0 8px var(--primary))' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardBody>
                </Card>

                <Card className="bg-bg-card-elevated border-none shadow-sm">
                    <CardHeader className="px-8 pt-8 pb-4">
                        <div className="flex items-center gap-3">
                            <Icons.Activity size={16} className="text-secondary" />
                            <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-text-main drop-shadow-md">Status Distribution</CardTitle>
                        </div>
                    </CardHeader>
                    <CardBody className="px-8 pb-8 flex items-center justify-center overflow-hidden">
                        <div className="h-[340px] w-full relative">
                            {/* Center Label inside Pie */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8 z-0">
                                <span className="text-[9px] font-black text-secondary uppercase tracking-[0.4em] mb-1">Global Set</span>
                                <span className="text-5xl font-black text-text-main font-mono drop-shadow-[0_0_15px_var(--primary)]">{stats.totalAssets}</span>
                            </div>

                            <div className="relative z-10 w-full h-full min-w-0">
                                <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1} debounce={50}>
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={85}
                                            outerRadius={115}
                                            paddingAngle={8}
                                            dataKey="value"
                                            stroke="none"
                                            cornerRadius={6}
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:scale-105 hover:opacity-100 transition-all duration-300 cursor-pointer outline-none drop-shadow-[0_0_8px_currentColor] opacity-90" />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: 'var(--bg-card-elevated)', border: '1px solid var(--border-main)', borderRadius: '16px', fontSize: '10px', color: 'var(--text-main)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)' }}
                                            itemStyle={{ color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '14px' }}
                                        />
                                        <Legend 
                                            verticalAlign="bottom" 
                                            height={40} 
                                            iconType="circle"
                                            iconSize={10}
                                            formatter={(value) => <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] pl-3 hover:text-text-main transition-colors">{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Bottom Insight Tables - Minimal Design */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-bg-card-elevated border-none shadow-sm overflow-hidden group">
                    <CardHeader className="px-8 py-6 border-b border-border-main/50 z-10 relative">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-accent-amber/10 text-accent-amber rounded-xl border border-accent-amber/20 shadow-[0_0_10px_var(--accent-amber)]">
                                    <Icons.AlertTriangle size={18} className="animate-pulse" />
                                </div>
                                <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-text-main">Warranty Alerts</CardTitle>
                            </div>
                            <Badge variant="amber" className="text-[9px] px-4 py-1.5 tracking-[0.2em] font-black shadow-lg animate-pulse">{stats.warrantyExpiringSoon?.length || 0} Critical</Badge>
                        </div>
                    </CardHeader>
                    <CardBody className="p-0 relative">
                        
                        <Table className="relative z-10">
                            <THead>
                                <TR className="bg-bg-card border-b border-border-main">
                                    <TH className="pl-8 text-[9px] text-text-muted font-black tracking-[0.2em]">ASSET ID</TH>
                                    <TH className="text-[9px] text-text-muted font-black tracking-[0.2em]">EXPIRY DATE</TH>
                                    <TH className="text-right pr-8 text-[9px] text-text-muted font-black tracking-[0.2em]">ACTION</TH>
                                </TR>
                            </THead>
                            <TBody>
                                {stats.warrantyExpiringSoon?.slice(0, 5).map(a => (
                                    <TR key={a.asset_id} className="hover:bg-neutral-subtle border-border-main transition-all group/row hover:shadow-[inset_4px_0_0_var(--accent-amber)] hover:pl-2">
                                        <TD className="pl-8 font-mono text-[11px] font-black text-text-main group-hover/row:text-primary transition-colors">{a.asset_id}</TD>
                                        <TD className="text-accent-amber font-bold text-[10px] uppercase tracking-wider font-mono drop-shadow-[0_0_5px_var(--accent-amber)]">
                                            {new Date(a.warranty_end).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
                                        </TD>
                                        <TD className="text-right pr-8">
                                            <Button variant="ghost" size="icon" className="text-text-muted group-hover/row:text-text-main group-hover/row:bg-bg-main" onClick={() => navigate(`/assets/${a.asset_id}`)}>
                                                <Icons.ArrowRight size={14} className="group-hover/row:-rotate-45 transition-transform" />
                                            </Button>
                                        </TD>
                                    </TR>
                                ))}
                                {(!stats.warrantyExpiringSoon || stats.warrantyExpiringSoon.length === 0) && (
                                    <TR><TD colSpan={3} className="text-center py-20 text-text-muted font-black uppercase tracking-[0.4em] text-[10px]">System Optimal. No Alerts.</TD></TR>
                                )}
                            </TBody>
                        </Table>
                    </CardBody>
                </Card>

                <Card className="bg-bg-card-elevated border-none shadow-sm overflow-hidden group">
                    <CardHeader className="px-8 py-6 border-b border-border-main/50 z-10 relative">
                         <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-secondary/10 text-secondary rounded-xl border border-secondary/20 shadow-[0_0_10px_var(--secondary)]">
                                    <Icons.Terminal size={18} />
                                </div>
                                <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-text-main">System Event Log</CardTitle>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase tracking-[0.2em] text-text-muted hover:text-text-main border border-border-main hover:bg-bg-main" onClick={() => navigate('/activities')}>Full Stream</Button>
                        </div>
                    </CardHeader>
                    <CardBody className="p-0 relative">
                        
                        <Table className="relative z-10">
                            <THead>
                                <TR className="bg-bg-card border-b border-border-main">
                                    <TH className="pl-8 text-[9px] text-text-muted font-black tracking-[0.2em]">ASSET ID</TH>
                                    <TH className="text-[9px] text-text-muted font-black tracking-[0.2em]">CATEGORY</TH>
                                    <TH className="text-right pr-8 text-[9px] text-text-muted font-black tracking-[0.2em]">STATUS</TH>
                                </TR>
                            </THead>
                            <TBody>
                                {stats.recentAssets?.slice(0, 5).map(a => (
                                    <TR key={a.asset_id} className="hover:bg-neutral-subtle border-border-main transition-all cursor-pointer group/row hover:shadow-[inset_4px_0_0_var(--secondary)] hover:pl-2" onClick={() => navigate(`/assets/${a.asset_id}`)}>
                                        <TD className="pl-8 font-mono text-[11px] font-black text-text-main group-hover/row:text-secondary transition-colors leading-none">{a.asset_id}</TD>
                                        <TD className="text-text-muted font-bold text-[10px] uppercase tracking-wider">{a.asset_type?.toUpperCase()}</TD>
                                        <TD className="text-right pr-8">
                                            <Badge variant={a.status === 'Active' ? 'teal' : a.status === 'In Stock' ? 'primary' : 'gray'} className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 drop-shadow-sm">
                                                {a.status?.toUpperCase() || 'UNKNOWN'}
                                            </Badge>
                                        </TD>
                                    </TR>
                                ))}
                                {(!stats.recentAssets || stats.recentAssets.length === 0) && (
                                    <TR><TD colSpan={3} className="text-center py-20 text-text-muted font-black uppercase tracking-[0.4em] text-[10px]">Data Stream Empty.</TD></TR>
                                )}
                            </TBody>
                        </Table>
                    </CardBody>
                </Card>
            </div>
        </div>
    )
}

