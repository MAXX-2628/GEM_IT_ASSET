import { useState, useEffect, useCallback } from 'react'
import { 
    User, Mail, Shield, ShieldCheck, ShieldAlert, 
    Plus, Edit, Trash2, Key, CheckCircle2, XCircle,
    Activity, Building2, Terminal, RefreshCw, Eye
} from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { 
    Card, CardBody, Button, Badge, Table, THead, TBody, TR, TH, 
    TD, Modal, Input, Select, PageHeader, Field, Counter 
} from '../components/ui'

import { ALL_PAGES } from '../config/pages'

const ROLES = [
    { id: 'super_admin', label: 'Super Admin', icon: ShieldCheck, color: 'text-accent-teal bg-accent-teal/10', desc: 'Full system access across all branches' },
    { id: 'branch_admin', label: 'Branch Admin', icon: Shield, color: 'text-primary bg-primary/10', desc: 'Full CRUD within assigned branches' },
    { id: 'viewer', label: 'Viewer', icon: Eye, color: 'text-text-muted bg-neutral-subtle', desc: 'Read-only access to assigned branches' },
]

const EMPTY_USER = {
    name: '', username: '', email: '', password: '', 
    role: 'viewer', assignedBranches: [], allowedPages: [], hasFullAccess: false, isActive: true
}

export default function UserManagement() {
    const [users, setUsers] = useState([])
    const [branches, setBranches] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [form, setForm] = useState(EMPTY_USER)
    const [editId, setEditId] = useState(null)
    const [saving, setSaving] = useState(false)
    const [newPassword, setNewPassword] = useState('')

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [userRes, branchRes] = await Promise.all([
                api.get('/users'),
                api.get('/branches')
            ])
            setUsers(userRes.data.data)
            setBranches(branchRes.data.data)
        } catch {
            toast.error('Failed to sync user records')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const openAdd = () => { setForm(EMPTY_USER); setEditId(null); setShowModal(true) }
    const openEdit = (u) => {
        setForm({
            name: u.name,
            username: u.username,
            email: u.email,
            role: u.role,
            assignedBranches: u.assignedBranches || [],
            allowedPages: u.allowedPages || [],
            hasFullAccess: u.hasFullAccess || false,
            isActive: u.isActive !== undefined ? u.isActive : true
        })
        setEditId(u._id)
        setShowModal(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            if (editId) {
                await api.put(`/users/${editId}`, form)
                toast.success('User profile updated')
            } else {
                await api.post('/users', form)
                toast.success('New user initialized')
            }
            setShowModal(false)
            fetchData()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save user')
        } finally {
            setSaving(false)
        }
    }

    const toggleBranch = (code) => {
        const current = form.assignedBranches || []
        if (current.includes(code)) {
            setForm({ ...form, assignedBranches: current.filter(c => c !== code) })
        } else {
            setForm({ ...form, assignedBranches: [...current, code] })
        }
    }

    const togglePage = (id) => {
        const current = form.allowedPages || []
        if (current.includes(id)) {
            setForm({ ...form, allowedPages: current.filter(p => p !== id) })
        } else {
            setForm({ ...form, allowedPages: [...current, id] })
        }
    }

    const toggleSection = (section, select) => {
        const sectionPages = ALL_PAGES.filter(p => p.section === section).map(p => p.id)
        const current = form.allowedPages || []
        if (select) {
            const next = Array.from(new Set([...current, ...sectionPages]))
            setForm({ ...form, allowedPages: next })
        } else {
            const next = current.filter(id => !sectionPages.includes(id))
            setForm({ ...form, allowedPages: next })
        }
    }

    const handleResetPassword = async (e) => {
        e.preventDefault()
        if (!newPassword || newPassword.length < 6) return toast.error('Min 6 characters required')
        setSaving(true)
        try {
            await api.post(`/users/${editId}/reset-password`, { newPassword })
            toast.success('Security credentials updated')
            setShowPasswordModal(false)
            setNewPassword('')
        } catch {
            toast.error('Failed to update credentials')
        } finally {
            setSaving(false)
        }
    }

    const getRoleData = (roleId) => ROLES.find(r => r.id === roleId) || ROLES[2]

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Identity & Access Management"
                subtitle={
                    <div className="flex items-center gap-2 text-text-muted font-black uppercase tracking-widest text-[10px]">
                        <Terminal size={12} className="text-primary" />
                        <span>Configure system users, roles, and branch-level permissions</span>
                    </div>
                }
                actions={
                    <Button variant="primary" onClick={openAdd} icon={Plus} className="h-11 shadow-primary font-black text-[10px] tracking-widest uppercase">
                        Create New User
                    </Button>
                }
            />

            {/* Logical Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Users', value: users.length, icon: User, color: 'text-text-main bg-neutral-subtle' },
                    { label: 'Super Admins', value: users.filter(u => u.role === 'super_admin').length, icon: ShieldCheck, color: 'text-accent-teal bg-accent-teal/10' },
                    { label: 'Branch Admins', value: users.filter(u => u.role === 'branch_admin').length, icon: Building2, color: 'text-primary bg-primary/10' },
                    { label: 'Active Sessions', value: users.filter(u => u.isActive).length, icon: Activity, color: 'text-accent-green bg-accent-green/10' },
                ].map(m => (
                    <Card key={m.label} className={`${m.color} border-border-main/20 overflow-hidden group`}>
                        <CardBody className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">{m.label}</p>
                                <span className="text-3xl font-black tabular-nums tracking-tighter"><Counter target={m.value} /></span>
                            </div>
                            <div className="p-3 rounded-xl bg-white/10 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                                <m.icon size={24} />
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            <Card className="glass border-border-main overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Table>
                    <THead>
                        <TR>
                            <TH className="pl-10 uppercase tracking-widest text-[9px]">User Identity</TH>
                            <TH className="uppercase tracking-widest text-[9px]">Role & Scope</TH>
                            <TH className="uppercase tracking-widest text-[9px]">Branch Access</TH>
                            <TH className="uppercase tracking-widest text-[9px]">Security Status</TH>
                            <TH className="uppercase tracking-widest text-[9px]">Last Pulse</TH>
                            <TH className="pr-10 text-right uppercase tracking-widest text-[9px]">Control</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <TR key={i} className="animate-pulse">
                                    <TD colSpan={6} className="py-8"><div className="h-4 bg-neutral-subtle rounded w-full" /></TD>
                                </TR>
                            ))
                        ) : users.map(u => {
                            const role = getRoleData(u.role)
                            return (
                                <TR key={u._id} className="group border-border-main hover:bg-bg-main/40 transition-colors">
                                    <TD className="pl-10 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-neutral-subtle border border-border-main flex items-center justify-center text-text-muted group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-text-main uppercase tracking-tight">{u.name}</p>
                                                <p className="text-[10px] text-text-muted font-bold tracking-widest">@{u.username}</p>
                                            </div>
                                        </div>
                                    </TD>
                                    <TD>
                                        <div className="flex items-center gap-3">
                                            <Badge variant={u.role === 'super_admin' ? 'teal' : u.role === 'branch_admin' ? 'blue' : 'gray'} className="px-3 py-1 font-black text-[9px] uppercase tracking-widest">
                                                {u.role.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </TD>
                                    <TD>
                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                            {u.role === 'super_admin' || u.hasFullAccess ? (
                                                <Badge variant="teal" className="text-[8px] px-2 py-0 border border-accent-teal/30">ALL_BRANCHES</Badge>
                                            ) : u.assignedBranches?.length > 0 ? (
                                                u.assignedBranches.map(b => (
                                                    <Badge key={b} variant="slate" className="text-[8px] px-2 py-0">{b}</Badge>
                                                ))
                                            ) : (
                                                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest italic opacity-40">NO_ACCESS</span>
                                            )}
                                        </div>
                                    </TD>
                                    <TD>
                                        <div className="flex items-center gap-2">
                                            {u.isActive ? (
                                                <div className="flex items-center gap-2 text-accent-green font-black text-[10px] uppercase tracking-widest">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-accent-green shadow-primary" />
                                                    ACTIVE
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-accent-red font-black text-[10px] uppercase tracking-widest">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-accent-red" />
                                                    SUSPENDED
                                                </div>
                                            )}
                                        </div>
                                    </TD>
                                    <TD>
                                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                                            {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'NEVER'}
                                        </span>
                                    </TD>
                                    <TD className="pr-10 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-text-muted hover:text-primary" onClick={() => { setEditId(u._id); setShowPasswordModal(true) }}>
                                                <Key size={16} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-text-muted hover:text-primary" onClick={() => openEdit(u)}>
                                                <Edit size={16} />
                                            </Button>
                                        </div>
                                    </TD>
                                </TR>
                            )
                        })}
                    </TBody>
                </Table>
            </Card>

            {/* Profile/User Modal */}
            {showModal && (
                <Modal onClose={() => setShowModal(false)} title={editId ? 'Modify Access Rights' : 'Authorize New Identity'} size="lg">
                    <form onSubmit={handleSave} className="space-y-8 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] pb-2 border-b border-border-main/50">Core Identity</h4>
                                <Field label="Full Display Name" required>
                                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Enter name..." icon={User} className="font-black text-xs uppercase" />
                                </Field>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="System ID (Username)" required>
                                        <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="username" className="font-black text-xs lowercase" />
                                    </Field>
                                    <Field label="Contact Email" required>
                                        <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@gem.com" icon={Mail} className="font-black text-xs lowercase" />
                                    </Field>
                                </div>
                                {!editId && (
                                    <Field label="Initial Auth Password" required>
                                        <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="******" icon={Key} />
                                    </Field>
                                )}
                                <div className="flex items-center justify-between p-4 bg-neutral-subtle rounded-xl border border-border-main">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-text-main uppercase tracking-widest">Global Status</span>
                                        <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Whether user can log in to system</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, isActive: !form.isActive })}
                                        className={`px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest border transition-all ${form.isActive ? 'bg-accent-green/10 border-accent-green/50 text-accent-green' : 'bg-accent-red/10 border-accent-red/50 text-accent-red'}`}
                                    >
                                        {form.isActive ? 'Active' : 'Suspended'}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] pb-2 border-b border-border-main/50">Access Level & Scope</h4>
                                
                                <div className="space-y-3">
                                    {ROLES.map(r => {
                                        const active = form.role === r.id
                                        const Icon = r.icon
                                        return (
                                            <button
                                                key={r.id}
                                                type="button"
                                                onClick={() => setForm({ ...form, role: r.id })}
                                                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${active ? 'bg-primary/10 border-primary shadow-primary' : 'bg-neutral-subtle border-border-main grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:bg-bg-main'}`}
                                            >
                                                <div className={`p-3 rounded-xl ${r.color}`}>
                                                    <Icon size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-text-main uppercase tracking-widest">{r.label}</p>
                                                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mt-0.5 opacity-60">{r.desc}</p>
                                                </div>
                                                {active && <CheckCircle2 size={16} className="ml-auto text-primary" />}
                                            </button>
                                        )
                                    })}
                                </div>

                                {form.role !== 'super_admin' && (
                                    <div className="space-y-4 pt-4 border-t border-border-main/50 animate-in fade-in duration-500">
                                        <div className="flex items-center justify-between">
                                            <h5 className="text-[10px] font-black text-text-muted uppercase tracking-widest">Branch Assignments</h5>
                                            <div className="flex items-center gap-2 text-primary">
                                                <input 
                                                    type="checkbox" 
                                                    id="fullAccess"
                                                    checked={form.hasFullAccess}
                                                    onChange={e => setForm({ ...form, hasFullAccess: e.target.checked })}
                                                    className="w-4 h-4 rounded border-border-main text-primary focus:ring-primary cursor-pointer"
                                                />
                                                <label htmlFor="fullAccess" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">Unrestricted Branches</label>
                                            </div>
                                        </div>
                                        {!form.hasFullAccess && (
                                            <div className="grid grid-cols-2 gap-2">
                                                {branches.map(b => (
                                                    <button
                                                        key={b._id}
                                                        type="button"
                                                        onClick={() => toggleBranch(b.code)}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${form.assignedBranches?.includes(b.code) ? 'bg-primary/20 border-primary/50 text-text-main shadow-inner' : 'bg-neutral-subtle border-border-main text-text-muted opacity-60 hover:opacity-100'}`}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ${form.assignedBranches?.includes(b.code) ? 'bg-primary shadow-primary' : 'bg-text-muted'}`} />
                                                        {b.name} ({b.code})
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <div className="pt-6 space-y-4">
                                            <h5 className="text-[10px] font-black text-text-muted uppercase tracking-widest">Page Permissions</h5>
                                            <div className="space-y-6">
                                                {['Management', 'Resources', 'Support', 'System'].map(section => {
                                                    const sectionPages = ALL_PAGES.filter(p => p.section === section)
                                                    const allSelected = sectionPages.every(p => form.allowedPages?.includes(p.id))
                                                    
                                                    return (
                                                        <div key={section} className="space-y-3">
                                                            <div className="flex items-center justify-between bg-neutral-subtle/50 px-3 py-1.5 rounded-lg border border-border-main/30">
                                                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">{section}</span>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => toggleSection(section, !allSelected)}
                                                                    className="text-[8px] font-black text-primary uppercase tracking-widest hover:underline"
                                                                >
                                                                    {allSelected ? 'Deselect All' : 'Select All'}
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {sectionPages.map(page => (
                                                                    <button
                                                                        key={page.id}
                                                                        type="button"
                                                                        onClick={() => togglePage(page.id)}
                                                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all ${form.allowedPages?.includes(page.id) ? 'bg-primary/10 border-primary/40 text-text-main' : 'bg-neutral-subtle/30 border-border-main/50 text-text-muted opacity-60 hover:opacity-100'}`}
                                                                    >
                                                                        <page.icon size={12} className={form.allowedPages?.includes(page.id) ? 'text-primary' : ''} />
                                                                        {page.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-border-main bg-bg-main/50 p-6 -mx-6 -mb-6 backdrop-blur-xl">
                            <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="order-2 sm:order-1 text-text-muted hover:text-text-main font-black text-[10px] tracking-widest uppercase">
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" loading={saving} icon={RefreshCw} className="order-1 sm:order-2 w-full sm:w-auto shadow-primary px-12 h-12 font-black text-[10px] tracking-widest uppercase">
                                {editId ? 'Verify & Sync Profile' : 'Initialize Identity'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Password Reset Modal */}
            {showPasswordModal && (
                <Modal onClose={() => setShowPasswordModal(false)} title="Force Password Reset" size="md">
                    <form onSubmit={handleResetPassword} className="p-6 space-y-6">
                        <div className="p-4 rounded-xl bg-accent-amber/10 border border-accent-amber/30 flex items-start gap-4 animate-pulse">
                            <ShieldAlert className="text-accent-amber shrink-0" size={24} />
                            <div>
                                <p className="text-[10px] font-black text-accent-amber uppercase tracking-widest">Security Warning</p>
                                <p className="text-[9px] font-bold text-accent-amber/80 uppercase tracking-widest leading-loose mt-1">This will immediately invalidate the user's old password. User must be notified of the new credentials manually.</p>
                            </div>
                        </div>
                        <Field label="New Secure Password" required>
                            <Input 
                                type="password" 
                                value={newPassword} 
                                onChange={e => setNewPassword(e.target.value)} 
                                placeholder="Min 6 characters..." 
                                icon={Key}
                                autoFocus
                            />
                        </Field>
                        <div className="flex gap-4 pt-4">
                            <Button type="button" variant="ghost" onClick={() => setShowPasswordModal(false)} className="flex-1 font-black text-[10px] tracking-widest uppercase">Abort</Button>
                            <Button type="submit" variant="primary" loading={saving} className="flex-1 shadow-primary font-black text-[10px] tracking-widest uppercase">Update Security</Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    )
}
