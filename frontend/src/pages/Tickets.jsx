import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
    Plus, Ticket as TicketIcon, Search, Trash2, Edit, LayoutGrid, List, Activity, 
    ChevronRight, ChevronLeft, AlertCircle, CheckCircle2, XCircle, Zap, Database, 
    User, Wrench, Terminal, Shield, MessageSquare, History, RefreshCw, Box, ClipboardList,
    Layout, Hash, MapPin, Settings
} from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import DateRangeFilter from '../components/DateRangeFilter'
import { 
    Card, CardHeader, CardTitle, CardBody, Button, Badge, Table, THead, TBody, TR, TH, 
    TD, Modal, Input, Select, Textarea, PageHeader, Counter, SearchInput, Field
} from '../components/ui'

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed']
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

const getStatusVariant = (status) => {
    const s = status?.toLowerCase()
    if (s === 'open') return 'red'
    if (s === 'in progress') return 'orange'
    if (s === 'resolved') return 'teal'
    return 'gray'
}

const FAILURE_TYPES = ['Hardware', 'Software', 'Network', 'User Error', 'Power', 'Physical Damage', 'Other']
const ACTIONS = ['Repaired', 'Replaced', 'Sent to Vendor', 'Parts Pending', 'Software Fix', 'Other']
const EMPTY = {
    subject: '', description: '', operator: '', department: '', asset_id: '', priority: 'Medium', status: 'Open',
    failure_type: 'Hardware', action_taken: 'Repaired', spares_used: '', resolution_notes: ''
}

export default function Tickets() {
    const navigate = useNavigate()
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState(EMPTY)
    const [editId, setEditId] = useState(null)
    const [statusFilter, setStatusFilter] = useState('All')
    const [priorityFilter, setPriorityFilter] = useState('All')
    const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' })
    const [saving, setSaving] = useState(false)
    const [assets, setAssets] = useState([])
    const [showAssets, setShowAssets] = useState(false)
    const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, resolved_today: 0 })
    const [nextId, setNextId] = useState('')

    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(20)
    const [total, setTotal] = useState(0)
    const [search, setSearch] = useState('')
    const [sortField] = useState('createdAt')
    const [sortOrder] = useState('desc')
    const [view, setView] = useState('kanban')

    const totalPages = Math.ceil(total / limit)

    const fetch = useCallback(async () => {
        setLoading(true)
        try {
            const params = {
                status: statusFilter === 'All' ? '' : statusFilter,
                priority: priorityFilter === 'All' ? '' : priorityFilter,
                ...dateRange,
                page,
                limit,
                search,
                sortField,
                sortOrder
            }
            const { data } = await api.get('/tickets', { params })
            setTickets(data.data)
            setTotal(data.total || 0)
            
            if (data.stats) {
                setStats(data.stats)
            } else {
                // Calculation fallback if stats not in response
                setStats({
                    total: data.total || 0,
                    open: data.open_count || (data.data || []).filter(t => t.status === 'Open').length,
                    in_progress: data.in_progress_count || (data.data || []).filter(t => t.status === 'In Progress').length,
                    resolved_today: data.resolved_today || 0
                })
            }
        } catch { toast.error('Failed to sync ticket registry') }
        finally { setLoading(false) }
    }, [statusFilter, priorityFilter, dateRange, page, limit, search, sortField, sortOrder])

    useEffect(() => { fetch() }, [fetch])

    const handleSearch = (val) => { setSearch(val); setPage(1) }

    const openAdd = async () => { 
        setForm(EMPTY); setEditId(null); setAssets([]); 
        try {
            const res = await api.get('/assets/next-id?asset_type=Ticket')
            if (res.data.success) setNextId(res.data.data)
        } catch { setNextId(`TKT-${Date.now().toString().slice(-6)}`) }
        setShowModal(true) 
    }
    const openEdit = (t) => {
        setForm({
            ...t,
            subject: t.title || '',
            operator: t.raised_by || '',
            asset_id: t.asset_ref || '',
            description: t.description || '',
            department: t.department || '',
            asset_ref: t.asset_ref || '', // Keep asset_ref too
            spares_used: t.spares_used || '',
            resolution_notes: t.resolution_notes || ''
        })
        setEditId(t._id)
        setShowModal(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = {
                ...form,
                title: form.subject, // Map subject back to title for API
                raised_by: form.operator, // Map operator back to raised_by
                asset_ref: form.asset_id, // Map asset_id back to asset_ref
            }
            if (editId) { await api.put(`/tickets/${editId}`, payload); toast.success('Ticket updated') }
            else { await api.post('/tickets', payload); toast.success('Ticket initialized') }
            setShowModal(false); fetch()
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to save ticket') }
        finally { setSaving(false) }
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this ticket?')) return
        try {
            await api.delete(`/tickets/${id}`)
            toast.success('Ticket deleted successfully')
            fetch()
        } catch { toast.error('Failed to delete ticket') }
    }

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

    const handleAssetSelect = (a) => {
        setForm(p => ({ ...p, asset_ref: a.asset_id, department: a.department || p.department }))
        setShowAssets(false)
        setAssets([])
    }

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Service Desk"
                subtitle={
                    <div className="flex items-center gap-2 text-text-muted font-black uppercase tracking-widest text-[10px]">
                        <Terminal size={12} className="text-primary" />
                        <span>Management of system tickets and support requests</span>
                    </div>
                }
                actions={
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="ghost" 
                            icon={Settings} 
                            onClick={() => navigate('/setup?tab=statuses')}
                            className="h-11 border border-border-main text-text-muted hover:text-primary hover:border-primary/30 font-black text-[10px] tracking-widest uppercase"
                        >
                            Settings
                        </Button>
                        <Button variant="primary" size="md" onClick={openAdd} icon={Plus} className="shadow-primary px-8 font-black text-[10px] tracking-widest uppercase">
                            Create Ticket
                        </Button>
                    </div>
                }
            />

            {/* Tactical Dashboard Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Tickets', value: stats?.total || 0, icon: Layout, color: 'text-text-main bg-neutral-subtle border-border-main' },
                    { label: 'Open Tickets', value: stats?.open || 0, icon: AlertCircle, color: 'text-accent-red bg-accent-red/10 border-accent-red/20' },
                    { label: 'In Progress', value: stats?.in_progress || 0, icon: RefreshCw, color: 'text-primary bg-primary/10 border-primary/20' },
                    { label: 'Resolved Today', value: stats?.resolved_today || 0, icon: CheckCircle2, color: 'text-accent-teal bg-accent-teal/10 border-accent-teal/20' },
                ].map(m => (
                    <Card key={m.label} className={`${m.color} backdrop-blur-xl border transition-all duration-500 group relative overflow-hidden h-28`}>
                        <CardBody className="flex items-center justify-between h-full px-8">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-3 opacity-60">{m.label}</p>
                                <span className="text-3xl font-black tabular-nums tracking-tighter"><Counter target={m.value} /></span>
                            </div>
                            <div className="p-4 rounded-2xl bg-neutral-subtle border border-border-main group-hover:scale-110 transition-transform duration-500">
                                <m.icon size={28} />
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            {/* Filter Hub */}
            <Card className="glass border-border-main relative z-20 overflow-visible animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardBody className="p-6">
                    <div className="flex flex-col xl:flex-row gap-6 items-center justify-between">
                        <div className="flex flex-1 items-center gap-6 w-full">
                            <div className="flex-1 max-w-xl">
                                <SearchInput
                                    placeholder="Search tickets by ID, subject, or asset..."
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1) }}
                                />
                            </div>
                            <div className="flex items-center bg-neutral-subtle p-1 rounded-xl border border-border-main">
                                <button 
                                    onClick={() => setView('kanban')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'kanban' ? 'bg-primary text-text-on-primary shadow-primary' : 'text-text-muted hover:text-text-main'}`}
                                >
                                    <LayoutGrid size={14} />
                                    <span className="hidden sm:inline">KANBAN_GRID</span>
                                </button>
                                <button 
                                    onClick={() => setView('list')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'list' ? 'bg-primary text-text-on-primary shadow-primary' : 'text-text-muted hover:text-text-main'}`}
                                >
                                    <List size={14} />
                                    <span className="hidden sm:inline">LIST_VIEW</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                            <DateRangeFilter 
                                onFilter={({ startDate, endDate }) => setDateRange({ startDate, endDate })}
                                onClear={() => setDateRange({ startDate: '', endDate: '' })}
                            />
                            <div className="w-48">
                                <Select
                                    value={statusFilter}
                                    onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                                    className="h-11 text-[10px] font-black uppercase tracking-widest"
                                >
                                    <option value="All">All Statuses</option>
                                    {STATUSES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                </Select>
                            </div>
                            <div className="w-48">
                                <Select
                                    value={priorityFilter}
                                    onChange={e => { setPriorityFilter(e.target.value); setPage(1) }}
                                    className="h-11 text-[10px] font-black uppercase tracking-widest"
                                >
                                    <option value="All">All Priorities</option>
                                    {PRIORITIES.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

            <div className="min-h-[500px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40 space-y-4">
                        <div className="relative">
                            <div className="w-12 h-12 border-2 border-border-main border-t-primary rounded-full animate-spin" />
                            <Activity size={20} className="absolute inset-x-0 mx-auto top-1/2 -translate-y-1/2 opacity-30 text-primary" />
                        </div>
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] leading-loose animate-pulse">Syncing ticket records...</p>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40 text-center px-6 glass rounded-2xl border border-border-main">
                        <div className="p-8 rounded-[2rem] bg-neutral-subtle text-text-muted mb-8 ring-1 ring-border-main shadow-inner">
                            <TicketIcon size={60} />
                        </div>
                        <h3 className="text-lg font-black text-text-main uppercase tracking-widest mb-2">No Tickets Found</h3>
                        <p className="text-text-muted max-w-sm text-[10px] font-black uppercase tracking-widest leading-loose mb-8">
                            No active tickets match your search parameters. Initialize a new ticket to begin.
                        </p>
                        <Button variant="ghost" size="md" className="border border-border-main hover:text-text-main" onClick={openAdd}>Create First Ticket</Button>
                    </div>
                ) : view === 'kanban' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                            {STATUSES.map(s => {
                                const filtered = tickets.filter(t => t.status === s);
                                const statusColor = s === 'Open' ? 'text-accent-red' : s === 'In Progress' ? 'text-primary' : s === 'Resolved' ? 'text-accent-teal' : 'text-text-muted';
                                 const statusBg = s === 'Open' ? 'bg-accent-red' : s === 'In Progress' ? 'bg-primary' : s === 'Resolved' ? 'bg-accent-teal' : 'bg-text-muted';
                            
                            return (
                                <div key={s} className="space-y-6">
                                    <div className="flex items-center justify-between px-3 border-b border-border-main pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full ${statusBg} shadow-primary`} />
                                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${statusColor}`}>{s}</span>
                                        </div>
                                        <div className="px-2.5 py-0.5 bg-neutral-subtle border border-border-main rounded-full text-[10px] font-black text-text-main">
                                            {filtered.length}
                                        </div>
                                    </div>
                                    <div className="space-y-4 max-h-[calc(100vh-420px)] overflow-y-auto pr-2 custom-scrollbar no-scrollbar scroll-smooth">
                                        {filtered.map(t => (
                                                <Card 
                                                    key={t._id} 
                                                    hover 
                                                    onClick={() => openEdit(t)}
                                                    className="glass border-border-main group hover:border-primary/40 hover:shadow-primary transition-all duration-300"
                                                >
                                                <CardBody className="p-5 space-y-4">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-neutral-subtle border border-border-main flex items-center justify-center text-text-muted group-hover:text-primary transition-colors">
                                                                    <Hash size={16} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] font-black text-text-main uppercase tracking-tight group-hover:text-primary transition-colors">{t.title}</p>
                                                                    <div className="flex items-center gap-2 text-[8px] font-black text-text-muted uppercase tracking-widest mt-0.5">
                                                                        <Terminal size={10} />
                                                                        ID: {t.ticket_id || t._id.slice(-6).toUpperCase()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <Badge 
                                                                variant={t.priority === 'Critical' ? 'red' : t.priority === 'High' ? 'orange' : t.priority === 'Medium' ? 'blue' : 'gray'}
                                                                className="shrink-0 scale-90 origin-right px-2 py-0 h-5"
                                                            >
                                                                {t.priority[0].toUpperCase()}
                                                            </Badge>
                                                        </div>
                                                    
                                                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                                                            <div className="flex items-center gap-2 text-[9px] font-black text-text-muted uppercase tracking-widest">
                                                                <User size={10} className="opacity-50 text-primary" />
                                                                {t.raised_by.split(' ')[0]}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[9px] font-black text-text-muted uppercase tracking-widest">
                                                                <Zap size={10} className="opacity-50 text-primary" />
                                                                {t.asset_ref || 'STANDALONE'}
                                                            </div>
                                                        </div>
                                                    
                                                        <div className="pt-4 border-t border-border-main flex items-center justify-between">
                                                            <span className="text-[9px] font-mono font-black text-text-muted">
                                                                ID:{t.ticket_number || t._id.slice(-6).toUpperCase()}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <History size={10} className="text-text-muted" />
                                                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                                                                    {t.department || 'GLOBAL'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                </CardBody>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <Card className="glass border-border-main overflow-hidden">
                        <Table>
                            <THead>
                                <TR>
                                    <TH className="pl-10 uppercase tracking-widest text-[9px]">Ticket Details</TH>
                                    <TH className="uppercase tracking-widest text-[9px]">Target Asset</TH>
                                    <TH className="uppercase tracking-widest text-[9px]">User / Staff</TH>
                                    <TH className="uppercase tracking-widest text-[9px]">Priority</TH>
                                    <TH className="uppercase tracking-widest text-[9px]">Status</TH>
                                    <TH className="pr-10 text-right uppercase tracking-widest text-[9px]">Action</TH>
                                </TR>
                            </THead>
                            <TBody>
                                {tickets.map((t) => (
                                    <TR key={t._id} hover onClick={() => openEdit(t)} className="border-border-main group">
                                        <TD className="pl-10 max-w-sm">
                                            <div className="space-y-1.5">
                                                <p className="text-xs font-black text-text-main group-hover:text-primary transition-colors uppercase tracking-tight">{t.title}</p>
                                                <p className="text-[9px] text-text-muted line-clamp-1 font-black uppercase tracking-widest italic">
                                                    {t.description || 'TECHNICAL_SPECIFICATIONS_NOT_PROVIDED'}
                                                </p>
                                            </div>
                                        </TD>
                                        <TD>
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2 text-[9px] font-black text-text-muted uppercase tracking-widest">
                                                    <Zap size={10} className="opacity-50 text-primary" />
                                                    {t.asset_ref || 'NULL_REFERENCE'}
                                                </div>
                                            </div>
                                        </TD>
                                        <TD>
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2 text-[10px] font-black text-text-main uppercase tracking-widest">
                                                    <User size={12} className="text-primary" />
                                                    {t.raised_by}
                                                </div>
                                            </div>
                                        </TD>
                                        <TD>
                                            <Badge variant={t.priority === 'Critical' ? 'red' : t.priority === 'High' ? 'orange' : t.priority === 'Medium' ? 'blue' : 'gray'} className="px-3 py-0.5 text-[9px] font-black uppercase tracking-widest shadow-primary">
                                                {t.priority}
                                            </Badge>
                                        </TD>
                                        <TD>
                                            <Badge variant={getStatusVariant(t.status)} className="px-3 py-0.5 text-[9px] font-black uppercase tracking-widest border border-border-main">
                                                {t.status}
                                            </Badge>
                                        </TD>
                                        <TD className="text-right pr-10">
                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-text-muted hover:text-primary transition-all opacity-0 group-hover:opacity-100">
                                                <ChevronRight size={18} />
                                            </Button>
                                        </TD>
                                    </TR>
                                ))}
                            </TBody>
                        </Table>
                    </Card>
                )}
            </div>

            {/* Pagination Console */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-border-main">
                <div className="flex items-center gap-4">
                    <Select
                        value={limit}
                        onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
                        className="w-36 h-10 text-[9px] font-black uppercase tracking-[0.2em] bg-neutral-subtle border-border-main"
                    >
                        <option value={20}>20 Rows</option>
                        <option value={50}>50 Rows</option>
                        <option value={100}>100 Rows</option>
                    </Select>
                    <div className="flex flex-col">
                        <span className="text-[7px] font-black text-text-muted uppercase tracking-widest mb-1">Total Tickets</span>
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{total} Entries</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Page</span>
                        <div className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-xs font-mono font-black text-primary shadow-primary">
                            {page} <span className="text-text-muted mx-1">/</span> {totalPages || 1}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            disabled={page <= 1} 
                            onClick={() => setPage(p => p - 1)}
                            className="h-10 w-10 border border-border-main hover:bg-neutral-subtle"
                        >
                            <ChevronLeft size={18} />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            disabled={page >= (totalPages || 1)} 
                            onClick={() => setPage(p => p + 1)}
                            className="h-10 w-10 border border-border-main hover:bg-neutral-subtle"
                        >
                            <ChevronRight size={18} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Modal Console */}
            {showModal && (
                <Modal
                    onClose={() => setShowModal(false)}
                    title={editId ? `Update Ticket ${form.ticket_id}` : 'Create New Ticket'}
                    size="lg"
                >
                    <form onSubmit={handleSave} className="space-y-8 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <Field label="Ticket ID">
                                        <Input value={nextId} disabled className="bg-neutral-subtle border-border-main text-primary font-mono font-black text-xs h-12" />
                                    </Field>
                                    <Field label="Staff Member" required>
                                        <Input value={form.operator} onChange={e => set('operator', e.target.value)} placeholder="Full Name..." icon={User} className="font-black text-xs uppercase" />
                                    </Field>
                                </div>

                                <Field label="Subject" required>
                                    <Input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="What is the issue?" className="font-black text-xs uppercase" />
                                </Field>

                                <div className="grid grid-cols-2 gap-6">
                                    <Field label="Status">
                                        <Select value={form.status} onChange={e => set('status', e.target.value)} className="font-black text-[10px] tracking-widest uppercase">
                                            <option value="Open">Open</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Resolved">Resolved</option>
                                            <option value="Closed">Closed</option>
                                        </Select>
                                    </Field>
                                    <Field label="Priority">
                                        <Select value={form.priority} onChange={e => set('priority', e.target.value)} className="font-black text-[10px] tracking-widest uppercase">
                                            <option value="High">High</option>
                                            <option value="Medium">Medium</option>
                                            <option value="Low">Low</option>
                                        </Select>
                                    </Field>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <Field label="Target Asset (ID/Name)">
                                    <Input value={form.asset_id} onChange={e => set('asset_id', e.target.value)} placeholder="Asset ID or Name..." icon={Zap} className="font-black text-xs uppercase" />
                                </Field>

                                <Field label="Ticket Details">
                                    <Textarea 
                                        rows={6} 
                                        value={form.description} 
                                        onChange={e => set('description', e.target.value)} 
                                        placeholder="Describe the problem in detail..." 
                                        className="uppercase font-bold text-xs leading-relaxed"
                                    />
                                </Field>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-border-main bg-bg-main/50 p-6 -mx-6 -mb-6 backdrop-blur-xl">
                            <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="order-2 sm:order-1 text-text-muted hover:text-text-main font-black text-[10px] tracking-widest">
                                Cancel
                            </Button>
                            <div className="flex items-center gap-4 order-1 sm:order-2 w-full sm:w-auto">
                                {editId && (
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        onClick={() => handleDelete(editId)}
                                        icon={Trash2}
                                        className="text-accent-red/50 hover:text-accent-red hover:bg-accent-red/10 border border-border-main flex-1 sm:flex-none font-black text-[10px] tracking-widest"
                                    >
                                        Delete
                                    </Button>
                                )}
                                <Button type="submit" variant="primary" loading={saving} icon={RefreshCw} className="flex-1 sm:flex-none shadow-primary px-12 h-12 font-black text-[10px] tracking-widest">
                                    Save Ticket
                                </Button>
                            </div>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    )
}


