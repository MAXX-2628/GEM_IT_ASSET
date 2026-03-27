import React, { useState, useEffect, useCallback } from 'react'
import {
    Settings as SettingsIcon, KeyRound, Building2, Plus,
    Star, ArrowUp, ArrowDown, Trash2, RotateCcw, Shield, Server, Database, Activity, RefreshCw, User, CheckCircle2, LayoutGrid, Globe, Terminal, Zap, ShieldCheck, MapPin, Fingerprint, Lock, Cpu, Palette, Sun, Moon, Monitor, Check
} from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'
import { Card, CardHeader, CardTitle, CardBody, Button, Badge, Table, THead, TBody, TR, TH, TD, Input, PageHeader, Field, Counter } from '../components/ui'

const PRESET_COLORS = [
  { name: 'Bronze (Default)', value: '#FF6A00' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Ocean', value: '#0EA5E9' },
  { name: 'Royal', value: '#6366F1' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Amber', value: '#F59E0B' },
];

export default function Settings() {
    const { user } = useAuth()
    const { themeMode, setThemeMode, primaryColor, setPrimaryColor } = useTheme()

    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
    const [saving, setSaving] = useState(false)

    const [branches, setBranches] = useState([])
    const [deletedBranches, setDeletedBranches] = useState([])
    const [showRecycleBin, setShowRecycleBin] = useState(false)
    const [newBranch, setNewBranch] = useState({ name: '', code: '' })
    const [addingBranch, setAddingBranch] = useState(false)

    const fetchBranches = useCallback(async () => {
        try {
            const { data } = await api.get(`/branches?includeDeleted=${showRecycleBin}`)
            if (showRecycleBin) {
                setDeletedBranches(data.data)
            } else {
                setBranches(data.data)
            }
        } catch {
            toast.error('Connection Error: Failed to load branches')
        }
    }, [showRecycleBin])

    useEffect(() => {
        fetchBranches()
    }, [fetchBranches])

    const handleAddBranch = async (e) => {
        e.preventDefault()
        if (!newBranch.name || !newBranch.code) return
        setAddingBranch(true)
        try {
            await api.post('/branches', newBranch)
            toast.success('Branch registered successfully')
            setNewBranch({ name: '', code: '' })
            fetchBranches()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed')
        } finally {
            setAddingBranch(false)
        }
    }

    const handleSetPrimary = async (id) => {
        try {
            await api.post(`/branches/${id}/primary`)
            toast.success('Primary branch set')
            fetchBranches()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed')
        }
    }

    const handleReorder = async (direction, index) => {
        const newBranches = [...branches]
        if (direction === 'up' && index > 0) {
            [newBranches[index], newBranches[index - 1]] = [newBranches[index - 1], newBranches[index]]
        } else if (direction === 'down' && index < newBranches.length - 1) {
            [newBranches[index], newBranches[index + 1]] = [newBranches[index + 1], newBranches[index]]
        } else return

        try {
            const orders = newBranches.map((b, i) => ({ id: b._id, order: i }))
            await api.patch('/branches/reorder', { orders })
            setBranches(newBranches)
        } catch {
            toast.error('Reordering failed')
        }
    }

    const handleDeleteBranch = async (b) => {
        if (!confirm(`Move branch "${b.name}" to the Recycle Bin? This will deactivate regional nodes.`)) return
        try {
            await api.delete(`/branches/${b._id}`)
            toast.success('Branch moved to recycle bin')
            fetchBranches()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed')
        }
    }

    const handleRestoreBranch = async (b) => {
        try {
            await api.post(`/branches/${b._id}/restore`)
            toast.success('Branch restored successfully')
            fetchBranches()
        } catch (err) {
            toast.error(err.response?.data?.message || 'RESTORATION_FAILED')
        }
    }

    const handlePwChange = async (e) => {
        e.preventDefault()
        if (form.newPassword !== form.confirmPassword) { toast.error('Passwords do not match'); return }
        if (form.newPassword.length < 6) { toast.error('Password too short (min 6 chars)'); return }
        setSaving(true)
        try {
            await api.put('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword })
            toast.success('Password updated successfully')
            setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        } catch (err) { toast.error(err.response?.data?.message || 'Password update failed') }
        finally { setSaving(false) }
    }

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Settings & Configuration"
                subtitle={
                    <div className="flex items-center gap-2 text-text-muted font-black uppercase tracking-widest text-[10px]">
                        <Terminal size={12} className="text-primary" />
                        <span>Manage branches, appearance, and administrative settings</span>
                    </div>
                }
                actions={
                    <Button variant="ghost" size="md" onClick={() => window.location.reload()} icon={RefreshCw} className="border border-border-main hover:text-text-main font-black text-[10px] tracking-widest uppercase">
                        Refresh Registry
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column (Span 2) */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Appearance & Branding */}
                    <Card className="glass border-border-main overflow-hidden">
                        <CardHeader className="p-8 border-b border-border-main bg-neutral-subtle/50">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary shadow-secondary">
                                    <Palette size={24} />
                                </div>
                                <div>
                                    <CardTitle>Appearance & Branding</CardTitle>
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1">Customize your workspace environment</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardBody className="p-8 flex flex-col xl:flex-row gap-12">
                            <div className="flex-1 space-y-4">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Theme Mode</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { id: 'light', label: 'Light', icon: Sun },
                                        { id: 'dark', label: 'Dark', icon: Moon },
                                        { id: 'system', label: 'System', icon: Monitor },
                                    ].map((mode) => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setThemeMode(mode.id)}
                                            className={`
                                            flex flex-col items-center justify-center gap-3 p-4 py-6 rounded-2xl border transition-all duration-300 group
                                            ${themeMode === mode.id 
                                                ? 'bg-primary/10 border-primary text-primary shadow-primary' 
                                                : 'bg-neutral-subtle border-border-main text-text-muted hover:border-text-muted hover:text-text-main'}
                                            `}
                                        >
                                            <mode.icon size={20} className={themeMode === mode.id ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{mode.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 space-y-4">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Accent Color</label>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                    {PRESET_COLORS.map((color) => (
                                    <button
                                        key={color.value}
                                        onClick={() => setPrimaryColor(color.value)}
                                        className={`
                                        aspect-square rounded-xl border-2 transition-all duration-300 flex items-center justify-center relative group shadow-sm
                                        ${primaryColor === color.value ? 'border-text-main scale-110 shadow-primary' : 'border-transparent hover:scale-105 border-border-main'}
                                        `}
                                        style={{ backgroundColor: color.value }}
                                        title={color.name}
                                    >
                                        {primaryColor === color.value && <Check size={16} className="text-white drop-shadow-md" />}
                                    </button>
                                    ))}
                                </div>
                                <div className="pt-4 space-y-2">
                                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">Custom Hex Color</label>
                                    <div className="flex items-center gap-4">
                                        <div 
                                            className="w-10 h-10 rounded-xl shadow-inner shrink-0"
                                            style={{ backgroundColor: primaryColor }}
                                        />
                                        <input
                                            type="text"
                                            value={primaryColor}
                                            onChange={(e) => setPrimaryColor(e.target.value)}
                                            className="flex-1 bg-neutral-subtle border border-border-main rounded-xl px-4 py-2.5 text-xs font-mono font-black uppercase tracking-widest text-text-main focus:border-primary/50 outline-none transition-all"
                                            placeholder="#FFFFFF"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Branch Management */}
                    <Card className="glass border-border-main overflow-hidden">
                        <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 p-8 border-b border-border-main">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-primary">
                                    <Globe size={24} />
                                </div>
                                <div>
                                    <CardTitle>Branches & Locations</CardTitle>
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1">Manage physical locations</p>
                                </div>
                            </div>
                            <div className="flex bg-neutral-subtle p-1.5 rounded-2xl border border-border-main w-full sm:w-auto">
                                <button
                                    onClick={() => setShowRecycleBin(false)}
                                    className={`flex-1 sm:px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${!showRecycleBin ? 'bg-primary text-text-on-primary shadow-lg' : 'text-text-muted hover:text-text-main'}`}
                                >
                                    Active Branches
                                </button>
                                <button
                                    onClick={() => setShowRecycleBin(true)}
                                    className={`flex-1 sm:px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${showRecycleBin ? 'bg-primary text-text-on-primary shadow-lg' : 'text-text-muted hover:text-text-main'}`}
                                >
                                    Recycle Bin
                                </button>
                            </div>
                        </CardHeader>
                        <CardBody className="p-0">
                            <Table>
                                <THead>
                                    <TR>
                                        <TH className="pl-10 uppercase tracking-widest text-[9px]">Branch Name</TH>
                                        <TH className="uppercase tracking-widest text-[9px]">Code</TH>
                                        <TH className="text-right pr-10 uppercase tracking-widest text-[9px]">Actions</TH>
                                    </TR>
                                </THead>
                                <TBody>
                                    {(showRecycleBin ? deletedBranches : branches).map((b, i) => (
                                        <TR key={b._id} className="border-border-main group">
                                            <TD className="pl-10">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-2 h-2 rounded-full transition-all duration-500 ${b.isPrimary ? 'bg-primary shadow-primary' : 'bg-text-dim'}`} />
                                                    <div>
                                                        <p className="text-[11px] font-black text-text-main uppercase tracking-tight group-hover:text-primary transition-colors">{b.name}</p>
                                                        {b.isPrimary && (
                                                            <div className="flex items-center gap-1.5 text-[8px] font-black text-primary uppercase tracking-widest mt-1 animate-pulse">
                                                                <Star size={10} fill="currentColor" />
                                                                <span>Official Primary Location</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TD>
                                            <TD>
                                                <code className="px-2 py-0.5 rounded-lg bg-neutral-subtle border border-border-main text-primary text-[10px] font-black tracking-widest group-hover:bg-primary/10 transition-colors">
                                                    {b.code}
                                                </code>
                                            </TD>
                                            <TD className="text-right pr-10">
                                                <div className="flex items-center justify-end gap-2">
                                                    {!showRecycleBin ? (
                                                        <>
                                                            {!b.isPrimary && (
                                                                <Button variant="ghost" size="icon" onClick={() => handleSetPrimary(b._id)} title="Set as Primary" className="h-9 w-9 text-text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-all">
                                                                    <Star size={14} />
                                                                </Button>
                                                            )}
                                                            <Button variant="ghost" size="icon" disabled={i === 0 || b.isPrimary} onClick={() => handleReorder('up', i)} className="h-9 w-9 text-text-muted hover:text-text-main opacity-0 group-hover:opacity-100 transition-all">
                                                                <ArrowUp size={14} />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" disabled={i === branches.length - 1} onClick={() => handleReorder('down', i)} className="h-9 w-9 text-text-muted hover:text-text-main opacity-0 group-hover:opacity-100 transition-all">
                                                                <ArrowDown size={14} />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteBranch(b)} className="h-9 w-9 text-text-muted hover:text-accent-red opacity-0 group-hover:opacity-100 transition-all">
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button variant="secondary" size="sm" onClick={() => handleRestoreBranch(b)} icon={RotateCcw} className="h-8 py-0 bg-neutral-subtle border-border-main text-[9px] font-black tracking-widest">
                                                            Restore Branch
                                                        </Button>
                                                    )}
                                                </div>
                                            </TD>
                                        </TR>
                                    ))}
                                    {(showRecycleBin ? deletedBranches : branches).length === 0 && (
                                        <TR>
                                            <TD colSpan={3} className="py-24 text-center">
                                                <div className="flex flex-col items-center justify-center text-text-muted">
                                                    <Database size={40} className="mb-4 opacity-20" />
                                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">No branches found in database</p>
                                                </div>
                                            </TD>
                                        </TR>
                                    )}
                                </TBody>
                            </Table>
                        </CardBody>
                    </Card>

                    {!showRecycleBin && (
                        <Card className="glass border-border-main">
                            <CardHeader className="p-8 border-b border-border-main">
                                <div className="flex items-center gap-4 text-primary">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                        <Plus size={20} />
                                    </div>
                                    <div>
                                        <CardTitle className="text-text-main">Add New Branch</CardTitle>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1">Register a new physical location</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardBody className="p-8">
                                <form onSubmit={handleAddBranch} className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                                    <Field label="Branch Name" className="md:col-span-1">
                                        <Input
                                            placeholder="e.g. Head Office..."
                                            required
                                            value={newBranch.name}
                                            onChange={e => setNewBranch(p => ({ ...p, name: e.target.value }))}
                                            icon={Building2}
                                            className="font-black text-xs uppercase"
                                        />
                                    </Field>
                                    <Field label="Branch Code" className="md:col-span-1">
                                        <Input
                                            placeholder="e.g. HQ..."
                                            required
                                            value={newBranch.code}
                                            onChange={e => setNewBranch(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                            maxLength={10}
                                            icon={Fingerprint}
                                            className="font-black text-xs uppercase tracking-widest"
                                        />
                                    </Field>
                                    <div className="md:col-span-1">
                                        <Button type="submit" variant="primary" loading={addingBranch} className="w-full h-12 shadow-lg shadow-primary font-black text-[10px] tracking-widest uppercase">
                                            Add Branch
                                        </Button>
                                    </div>
                                </form>
                            </CardBody>
                        </Card>
                    )}
                </div>

                {/* Right Column (Span 1) */}
                <div className="space-y-8">
                    {/* Operator Profile Info */}
                    <Card className="glass border-border-main">
                        <CardHeader className="pb-4 p-8 border-none">
                             <div className="flex items-center gap-4 text-primary">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <User size={20} />
                                </div>
                                <div>
                                    <CardTitle className="text-text-main">User Profile</CardTitle>
                                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mt-1">Account authentication details</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardBody className="space-y-8 pt-0 p-8">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-[2rem] bg-bg-main border border-border-main flex items-center justify-center text-text-main text-3xl font-black relative shadow-inner group">
                                    {user?.name?.charAt(0)?.toUpperCase()}
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-primary border-4 border-bg-card flex items-center justify-center text-white shadow-primary group-hover:scale-110 transition-transform">
                                        <ShieldCheck size={14} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-text-main tracking-tighter uppercase leading-none">{user?.name}</h3>
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-2">{user?.email}</p>
                                    <div className="mt-3 flex gap-2">
                                        <Badge variant="blue" className="text-[8px] px-2 h-5 font-black uppercase tracking-widest bg-accent-blue/10 text-accent-blue border-transparent">Administrator</Badge>
                                        <Badge variant="slate" className="text-[8px] px-2 h-5 font-black uppercase tracking-widest">Super User</Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-border-main space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Username</span>
                                    <span className="text-xs font-black text-primary tracking-wider">@{user?.username?.toUpperCase()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Access Level</span>
                                    <span className="flex items-center gap-2 text-[10px] font-black text-accent-green uppercase tracking-widest">
                                        <Zap size={10} className="animate-pulse" />
                                        Full Admin Access
                                    </span>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Change Password */}
                    <Card className="glass border-border-main">
                        <CardHeader className="p-8 border-none">
                            <div className="flex items-center gap-4 text-primary">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <KeyRound size={20} />
                                </div>
                                <div>
                                    <CardTitle className="text-text-main">Change Password</CardTitle>
                                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mt-1">Update your login credentials</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardBody className="p-8 pt-0">
                            <form onSubmit={handlePwChange} className="space-y-6">
                                <Field label="Current Password">
                                    <Input
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        value={form.currentPassword}
                                        onChange={e => setForm(p => ({ ...p, currentPassword: e.target.value }))}
                                        icon={Lock}
                                        className="bg-neutral-subtle"
                                    />
                                </Field>
                                <Field label="New Password">
                                    <Input
                                        type="password"
                                        required
                                        placeholder="Min 6 characters..."
                                        value={form.newPassword}
                                        onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
                                        icon={Zap}
                                        className="bg-neutral-subtle"
                                    />
                                </Field>
                                <Field label="Confirm New Password">
                                    <Input
                                        type="password"
                                        required
                                        placeholder="Re-enter password..."
                                        value={form.confirmPassword}
                                        onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                                        icon={ShieldCheck}
                                        className="bg-neutral-subtle"
                                    />
                                </Field>
                                <Button type="submit" variant="primary" loading={saving} className="w-full h-12 mt-4 shadow-lg shadow-primary font-black text-[10px] tracking-widest uppercase" icon={RefreshCw}>
                                    Change Password
                                </Button>
                            </form>
                        </CardBody>
                    </Card>

                    {/* System Diagnostics */}
                    <Card className="glass border-border-main bg-bg-card-elevated">
                        <CardHeader className="p-8 border-none">
                            <div className="flex items-center gap-4 text-text-muted">
                                <div className="h-10 w-10 rounded-xl bg-neutral-subtle flex items-center justify-center border border-border-main">
                                    <Cpu size={20} />
                                </div>
                                <div>
                                    <CardTitle className="text-text-main">System Information</CardTitle>
                                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mt-1">Build and security details</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardBody className="p-0 border-t border-border-main">
                            <div className="divide-y divide-border-main">
                                {[
                                    { label: 'System Version', value: '7.8.0', icon: LayoutGrid, color: 'text-primary' },
                                    { label: 'Security Layer', value: 'RBAC Active', icon: Shield, color: 'text-accent-green' },
                                    { label: 'Cloud Sync', value: 'Connected', icon: Database, color: 'text-accent-blue' },
                                    { label: 'Primary Server', value: 'GEM-PRD-01', icon: MapPin, color: 'text-secondary' },
                                ].map((s, i) => (
                                    <div key={i} className="px-8 py-5 flex items-center justify-between group hover:bg-neutral-subtle transition-colors">
                                        <div className="flex items-center gap-3">
                                            <s.icon size={14} className="text-text-muted group-hover:text-text-main transition-colors" />
                                            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest leading-none mb-0.5">{s.label}</span>
                                        </div>
                                        <div className={`text-[10px] font-black tracking-widest ${s.color}`}>
                                            {s.value}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    )
}
