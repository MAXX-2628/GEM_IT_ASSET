import { useEffect, useState, useCallback } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { 
    Plus, Video, Trash2, Edit, ShieldCheck, Eye, EyeOff, FileSpreadsheet, ExternalLink, 
    Camera, Monitor, AlertCircle, History, RefreshCw, ChevronLeft, ChevronRight, 
    Activity, Server, Shield, Globe, Lock, Key, Hash, User, Terminal, Zap, Search, Radar, MapPin
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { 
    Card, CardHeader, CardTitle, CardBody, Button, Badge, Table, THead, TBody, TR, TH, 
    TD, Modal, Input, Select, Textarea, SearchInput, PageHeader, Counter, Field 
} from '../components/ui'
import ImportModal from '../components/ImportModal'

const formatNVR = (val) => {
    if (!val) return '';
    const str = val.toString().trim();
    return /^\d{4,}$/.test(str) ? `NVR-${str}` : str;
};

const STATUS_VARIANTS = { 
    Active: 'teal', 
    Faulty: 'red', 
    Maintenance: 'orange', 
    Deactivated: 'gray', 
    Scrapped: 'gray' 
}

const EMPTY_CAMERA = {
    asset_type: 'Camera',
    location: '',
    ip_address: '',
    serial_number: '',
    nvr_connection: '',
    linked_nvr_id: '',
    username: '',
    password: '',
    status: 'Active',
    notes: ''
}

export default function Surveillance() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [nvrFilter, setNvrFilter] = useState('All')
    const [showImport, setShowImport] = useState(false)
    const [form, setForm] = useState(EMPTY_CAMERA)
    const [editId, setEditId] = useState(null)
    const [saving, setSaving] = useState(false)
    const [viewMode, setViewMode] = useState(false)

    const [liveAssets, setLiveAssets] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [sortField, setSortField] = useState('location')
    const [sortOrder, setSortOrder] = useState('asc')
    const [nextId, setNextId] = useState('')

    const [page, setPage] = useState(1)
    const [limit] = useState(20)
    const [total, setTotal] = useState(0)
    const [stats, setStats] = useState({ total: 0, active: 0, faulty: 0, maintenance: 0, scrapped: 0 })
    const [nvrList, setNvrList] = useState([])
    const [masterStatuses, setMasterStatuses] = useState([])

    const fetch = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page,
                limit,
                sortField,
                sortOrder,
                status: statusFilter,
                nvr: nvrFilter,
                search: search.trim()
            })

            const [survRes, assetRes, statusRes] = await Promise.all([
                api.get(`/surveillance?${params}`),
                api.get('/assets?limit=1000'),
                api.get('/statuses')
            ])
            
            setMasterStatuses(statusRes.data.data)
            setItems(survRes.data.data)
            setTotal(survRes.data.total)

            if (survRes.data.stats) {
                setStats(survRes.data.stats)
            } else if (survRes.data.data) {
                const s = { total: survRes.data.total || 0, active: 0, faulty: 0, maintenance: 0, scrapped: 0 }
                survRes.data.data.forEach(item => {
                    const status = item.status?.toLowerCase()
                    if (status === 'active') s.active++
                    else if (status === 'faulty') s.faulty++
                    else if (status === 'maintenance') s.maintenance++
                    else if (status === 'scrapped') s.scrapped++
                })
                setStats(s)
            }
            setNvrList(survRes.data.nvrs || [])

            setLiveAssets(assetRes.data.data.filter(a =>
                ['Active', 'In Stock', 'Under Maintenance'].includes(a.status) &&
                (a.asset_type.match(/NVR|DVR|Server/i))
            ))
        } catch { toast.error('Failed to sync surveillance logs') }
        finally { setLoading(false) }
    }, [page, limit, sortField, sortOrder, statusFilter, nvrFilter, search])

    useEffect(() => { fetch() }, [fetch])

    useEffect(() => {
        setPage(1)
    }, [search, statusFilter, nvrFilter])

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortOrder('asc')
        }
    }

    const openAdd = async () => {
        setForm({ ...EMPTY_CAMERA })
        setEditId(null)
        setViewMode(false)
        try {
            const res = await api.get('/surveillance/next-id')
            if (res.data.success) {
                setNextId(res.data.data)
                setForm(p => ({ ...p, asset_id: res.data.data }))
            }
        } catch (err) {
            console.warn('SEQUENCE_ID_FETCH_FAILED', err)
        }
        setShowModal(true)
    }

    const openEdit = (item) => {
        setForm({ ...item })
        setEditId(item._id)
        setNextId(item.asset_id || '')
        setViewMode(false)
        setShowModal(true)
    }

    const openView = (item) => {
        setForm({ ...item })
        setEditId(item._id)
        setNextId(item.asset_id || '')
        setViewMode(true)
        setShowModal(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            if (editId) {
                await api.put(`/surveillance/${editId}`, form)
                toast.success('Configuration updated successfully')
            } else {
                await api.post('/surveillance', form)
                toast.success('Camera added successfully')
            }
            setShowModal(false)
            fetch()
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to save camera') }
        finally { setSaving(false) }
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this camera? This action cannot be undone.')) return
        try {
            await api.delete(`/surveillance/${id}`)
            toast.success('Camera deleted successfully')
            fetch()
        } catch { toast.error('Failed to delete camera') }
    }

    const handleCopy = (text, label) => {
        if (!text) return;
        
        const performCopy = (txt) => {
            const textArea = document.createElement("textarea");
            textArea.value = txt;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                toast.success(`${label} copied to clipboard`, { duration: 1500 });
            } catch (err) {
                toast.error(`COPY_FAILED: ${label.toUpperCase()}`);
            }
            document.body.removeChild(textArea);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => toast.success(`${label} copied to clipboard`, { duration: 1500 }))
                .catch(() => performCopy(text));
        } else {
            performCopy(text);
        }
    }

    const getStatusStyles = (statusName) => {
        const s = masterStatuses.find(item => item.name?.toLowerCase() === statusName?.toLowerCase())
        if (s && s.color?.startsWith('#')) {
            return { backgroundColor: s.color, color: s.text_color || '#ffffff', borderColor: 'rgba(255,255,255,0.1)' }
        }
        return {}
    }

    const getStatusVariant = (statusName) => {
        const s = masterStatuses.find(item => item.name?.toLowerCase() === statusName?.toLowerCase())
        if (s && s.color && !s.color.startsWith('#')) return s.color
        return STATUS_VARIANTS[statusName] || 'gray'
    }

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Surveillance Management"
                subtitle={
                    <div className="flex items-center gap-2 text-text-muted font-black uppercase tracking-widest text-[10px]">
                        <Terminal size={12} className="text-primary" />
                        <span>Management and monitoring of network cameras</span>
                    </div>
                }
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="md" onClick={() => setShowImport(true)} icon={FileSpreadsheet} className="border border-border-main hover:text-text-main font-black text-[10px] tracking-widest uppercase">
                            Import Data
                        </Button>
                        <Button variant="primary" size="md" onClick={openAdd} icon={Plus} className="shadow-primary px-8 font-black text-[10px] tracking-widest uppercase">
                            Add Camera
                        </Button>
                    </div>
                }
            />

            {/* Tactical Status Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Cameras', value: stats?.total || 0, icon: Radar, color: 'text-text-main bg-neutral-subtle border-border-main shadow-primary', filter: 'All' },
                    { label: 'Active Cameras', value: stats?.active || 0, icon: ShieldCheck, color: 'text-accent-teal bg-accent-teal/10 border-accent-teal/20 shadow-primary', filter: 'Active' },
                    { label: 'Faulty Cameras', value: stats?.faulty || 0, icon: AlertCircle, color: 'text-accent-red bg-accent-red/10 border-accent-red/20 shadow-primary', filter: 'Faulty' },
                    { label: 'Under Maintenance', value: stats?.maintenance || 0, icon: History, color: 'text-primary bg-primary/10 border-primary/20 shadow-primary', filter: 'Maintenance' },
                ].map(m => (
                    <Card
                        key={m.label}
                        className={`group cursor-pointer transition-all duration-500 hover:border-primary/30 glass border-border-main ${statusFilter === m.filter ? 'ring-2 ring-primary/50 border-primary/20' : ''}`}
                        onClick={() => setStatusFilter(m.filter)}
                    >
                        <CardBody className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-text-muted uppercase tracking-widest leading-none">{m.label}</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-2xl font-black text-text-main tracking-tighter leading-none">
                                        <Counter value={m.value} />
                                    </h3>
                                    <span className="text-[7px] font-black text-text-muted uppercase tracking-widest">UNITS</span>
                                </div>
                            </div>
                            <div className={`p-3 rounded-2xl border transition-all duration-500 group-hover:scale-110 ${m.color}`}>
                                <m.icon size={20} className={m.filter === 'Active' ? 'animate-pulse' : ''} />
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            {/* Filter Terminal */}
            <Card className="glass border-border-main relative z-20 overflow-visible animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardBody className="p-6">
                    <div className="flex flex-col xl:flex-row gap-6 items-center justify-between">
                        <div className="flex-1 w-full max-w-xl">
                            <SearchInput
                                placeholder="Search by ID, IP, or Location..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-48 text-[10px] font-black uppercase tracking-widest h-11">
                                <option value="All">All Statuses</option>
                                <option value="Active">Active</option>
                                <option value="Faulty">Faulty</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Scrapped">Scrapped</option>
                            </Select>
                            <Select value={nvrFilter} onChange={e => setNvrFilter(e.target.value)} className="w-56 text-[10px] font-black uppercase tracking-widest h-11">
                                <option value="All">All Recorders</option>
                                {(nvrList || []).map(nvr => (
                                    <option key={nvr} value={nvr}>{formatNVR(nvr) || 'Standalone'}</option>
                                ))}
                            </Select>
                            <Button variant="ghost" size="icon" onClick={fetch} className="h-11 w-11 border border-border-main hover:text-text-main">
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            </Button>
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card className="glass border-border-main overflow-hidden">
                <CardBody className="p-0 min-h-[500px]">
                    {loading ? (
                        <div className="py-40 flex flex-col items-center justify-center space-y-4">
                            <div className="relative">
                                <div className="w-12 h-12 border-2 border-border-main border-t-primary rounded-full animate-spin" />
                                <Activity size={20} className="absolute inset-x-0 mx-auto top-1/2 -translate-y-1/2 opacity-30 text-primary" />
                            </div>
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] leading-loose animate-pulse">Syncing camera registry...</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-40 text-center px-6 glass rounded-2xl border border-border-main">
                            <div className="p-8 rounded-[2rem] bg-neutral-subtle text-text-muted mb-8 ring-1 ring-border-main shadow-inner">
                                <Monitor size={60} />
                            </div>
                            <h3 className="text-lg font-black text-text-main uppercase tracking-widest mb-2">No Cameras Identified</h3>
                            <p className="text-text-muted max-w-sm text-[10px] font-black uppercase tracking-widest leading-loose mb-8">
                                No camera nodes found in this region. Add a new camera to begin surveillance tracking.
                            </p>
                            <Button variant="ghost" size="md" className="border border-border-main hover:text-text-main" onClick={openAdd}>Add First Camera</Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-[1000px]">
                                <THead>
                                    <TR>
                                        <TH className="pl-10 uppercase tracking-widest text-[9px]">Camera Details</TH>
                                        <TH className="uppercase tracking-widest text-[9px]">Network Status</TH>
                                        <TH className="uppercase tracking-widest text-[9px]">Storage Link</TH>
                                        <TH className="uppercase tracking-widest text-[9px]">Status</TH>
                                        <TH className="text-right pr-10 uppercase tracking-widest text-[9px]">Action</TH>
                                    </TR>
                                </THead>
                                <TBody>
                                    {items.map((item, idx) => (
                                        <TR key={item._id} hover onClick={() => openView(item)} className="border-border-main group">
                                            <TD className="pl-10">
                                                <div className="space-y-1.5">
                                                    <p className="text-[11px] font-black text-text-main uppercase tracking-tight group-hover:text-primary transition-colors">{item.location}</p>
                                                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest leading-none font-mono">{item.asset_id}</p>
                                                </div>
                                            </TD>
                                            <TD>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 rounded-lg bg-primary/5 border border-primary/10 opacity-50 text-primary">
                                                        <Globe size={12} />
                                                    </div>
                                                    <code className="text-[11px] font-black text-primary tracking-wider">
                                                        {item.ip_address}
                                                    </code>
                                                    <a
                                                        href={`http://${item.ip_address}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="h-7 w-7 rounded-lg bg-neutral-subtle border border-border-main text-text-muted hover:text-text-main hover:border-primary/50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ExternalLink size={12} />
                                                    </a>
                                                </div>
                                            </TD>
                                            <TD>
                                                <div className="flex flex-col gap-2 p-1.5 min-w-[180px]">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 shrink-0 rounded-lg bg-neutral-subtle border border-border-main flex items-center justify-center text-text-muted shadow-inner group-hover:text-primary transition-colors">
                                                            <Monitor size={14} />
                                                        </div>
                                                        <div className="flex flex-col min-w-0 text-left">
                                                            <span className="text-[10px] font-black text-text-main uppercase tracking-wider truncate">
                                                                {item.linked_nvr_id ? formatNVR(item.linked_nvr_id) : 'Standalone'}
                                                            </span>
                                                            <code className="text-[9px] font-bold text-text-muted tracking-wider">
                                                                {item.nvr_connection || 'N/A'}
                                                            </code>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                                        <div 
                                                            onClick={(e) => { e.stopPropagation(); handleCopy(item.username, 'Username'); }}
                                                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-subtle border border-border-main hover:bg-primary/10 hover:border-primary/20 cursor-pointer transition-all"
                                                        >
                                                            <User size={10} className="text-text-muted" />
                                                            <span className="text-[8px] font-black text-text-muted tracking-widest truncate max-w-[60px] uppercase">{item.username || '---'}</span>
                                                        </div>
                                                        <div 
                                                            onClick={(e) => { e.stopPropagation(); handleCopy(item.password, 'Password'); }}
                                                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-subtle border border-border-main hover:bg-primary/10 hover:border-primary/20 cursor-pointer transition-all"
                                                        >
                                                            <Key size={10} className="text-text-muted" />
                                                            <span className="text-[8px] font-black text-text-muted tracking-widest uppercase">********</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TD>
                                            <TD>
                                                <Badge 
                                                    color={masterStatuses.find(s => s.name === item.status)?.color}
                                                    textColor={masterStatuses.find(s => s.name === item.status)?.text_color}
                                                    variant={getStatusVariant(item.status)} 
                                                    className="shadow-sm"
                                                >
                                                    {item.status?.toUpperCase()}
                                                </Badge>
                                            </TD>
                                            <TD className="pr-10 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-text-muted hover:text-primary transition-all opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); openEdit(item) }}>
                                                        <Edit size={16} />
                                                    </Button>
                                                    {item.status !== 'Scrapped' && (
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-text-muted hover:text-accent-red transition-all opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDelete(item._id) }}>
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TD>
                                        </TR>
                                    ))}
                                </TBody>
                            </Table>
                        </div>
                    )}
                </CardBody>

                <div className="px-8 py-5 glass border-t border-border-main flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="text-[9px] font-black text-text-muted uppercase tracking-[0.3em]">
                        POLLING_UNITS: {((page - 1) * limit) + 1}—{Math.min(page * limit, total)} / {total}
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">INDEX_PAGE</span>
                            <div className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-xs font-mono font-black text-primary shadow-primary">
                                {page} <span className="text-text-muted mx-1">/</span> {Math.ceil(total / limit) || 1}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" disabled={page === 1} onClick={() => setPage(page - 1)} className="h-10 w-10 border border-border-main hover:bg-neutral-subtle">
                                <ChevronLeft size={18} />
                            </Button>
                            <Button variant="ghost" size="icon" disabled={page * limit >= total} onClick={() => setPage(page + 1)} className="h-10 w-10 border border-border-main hover:bg-neutral-subtle">
                                <ChevronRight size={18} />
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {showModal && (
                <Modal
                    show={showModal}
                    onClose={() => setShowModal(false)}
                    title={viewMode ? `View Camera ${nextId}` : (editId ? `Update Camera ${nextId}` : 'Add New Camera')}
                    size="lg"
                >
                    <form onSubmit={handleSave} className="space-y-8 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <Field label="Camera ID" helpText={!editId && !viewMode ? "Leave blank to auto-generate" : ""}>
                                        <div className="relative">
                                            <Input 
                                                value={form.asset_id || ''} 
                                                onChange={e => set('asset_id', e.target.value)}
                                                placeholder="CAM-XXXX"
                                                disabled={viewMode || !!editId} 
                                                className="bg-neutral-subtle border-border-main text-primary font-mono font-black text-xs h-12 uppercase" 
                                            />
                                            {(viewMode || !!editId) && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/30">
                                                    <Lock size={14} />
                                                </div>
                                            )}
                                        </div>
                                    </Field>
                                    <Field label="ID Integrity">
                                        <div className="h-12 bg-accent-teal/5 border border-accent-teal/10 rounded-xl flex items-center justify-center gap-2 group cursor-help">
                                            <ShieldCheck size={14} className="text-accent-teal animate-pulse" />
                                            <span className="text-[9px] font-black text-accent-teal/70 uppercase tracking-widest">Verified</span>
                                        </div>
                                    </Field>
                                </div>
                                <Field label="Deployment Location">
                                    <Input disabled={viewMode} value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Main Entrance Alpha..." icon={MapPin} className="font-black text-xs uppercase" />
                                </Field>
                                <div className="grid grid-cols-2 gap-6">
                                    <Field label="IP Address">
                                        <Input disabled={viewMode} value={form.ip_address} onChange={e => set('ip_address', e.target.value)} placeholder="0.0.0.0" icon={Globe} className="font-mono text-xs text-primary" />
                                    </Field>
                                    <Field label="Serial Number">
                                        <Input disabled={viewMode} value={form.serial_number} onChange={e => set('serial_number', e.target.value)} icon={Hash} className="font-mono text-xs uppercase" />
                                    </Field>
                                </div>
                                <Field label="Recorder Link">
                                    <Input disabled value={formatNVR(form.nvr_connection)} onChange={e => set('nvr_connection', e.target.value)} placeholder="Auto-filled from Linked NVR..." icon={Monitor} className="font-black text-xs uppercase opacity-50 cursor-not-allowed" />
                                </Field>
                            </div>

                            <div className="space-y-6">
                                <Field label="Linked NVR Reference">
                                    <Select disabled={viewMode} value={form.linked_nvr_id || ''} onChange={e => {
                                        const newlyLinked = e.target.value;
                                        let nvrConn = form.nvr_connection;
                                        if (newlyLinked) {
                                            const nvrAssAsset = liveAssets.find(a => a.asset_id === newlyLinked);
                                            if (nvrAssAsset) nvrConn = nvrAssAsset.ip_address || nvrAssAsset.hostname || formatNVR(newlyLinked);
                                        }
                                        setForm(p => ({ ...p, linked_nvr_id: newlyLinked, nvr_connection: nvrConn }));
                                    }} className="font-black text-[10px] tracking-widest uppercase">
                                        <option value="">No Active Uplink</option>
                                        {liveAssets.map(a => (
                                            <option key={a._id} value={a.asset_id}>{formatNVR(a.asset_id)} — {a.hostname || a.department}</option>
                                        ))}
                                    </Select>
                                </Field>
                                <div className="grid grid-cols-2 gap-6">
                                    <Field label="Username">
                                        <Input disabled={viewMode} value={form.username} onChange={e => set('username', e.target.value)} icon={User} className="font-bold text-xs" />
                                    </Field>
                                    <Field label="Password">
                                        <Input disabled={viewMode} type="password" value={form.password} onChange={e => set('password', e.target.value)} icon={Key} className="font-bold text-xs" />
                                    </Field>
                                </div>
                                <Field label="Status">
                                    <Select disabled={viewMode} value={form.status} onChange={e => set('status', e.target.value)} className="font-black text-[10px] tracking-widest uppercase">
                                        <option value="Active">Active</option>
                                        <option value="Faulty">Faulty</option>
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="Deactivated">Deactivated</option>
                                        <option value="Scrapped">Scrapped</option>
                                    </Select>
                                </Field>
                                <Field label="Notes">
                                    <Textarea disabled={viewMode} value={form.notes} onChange={e => set('notes', e.target.value)} rows={4} className="text-xs font-bold uppercase leading-relaxed h-[116px]" placeholder="Log technical specifications for this node..." />
                                </Field>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-border-main bg-bg-main/50 p-6 -mx-6 -mb-6 backdrop-blur-xl">
                            <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="order-2 sm:order-1 text-text-muted hover:text-text-main font-black text-[10px] tracking-widest">
                                {viewMode ? 'Close' : 'Cancel'}
                            </Button>
                            {!viewMode && (
                                <Button type="submit" variant="primary" loading={saving} icon={ShieldCheck} className="order-1 sm:order-2 w-full sm:w-auto px-12 h-12 shadow-primary font-black text-[10px] tracking-widest uppercase">
                                    Save Camera
                                </Button>
                            )}
                            {viewMode && (
                                <Button type="button" onClick={() => setViewMode(false)} variant="primary" icon={Edit} className="order-1 sm:order-2 w-full sm:w-auto px-12 h-12 shadow-primary font-black text-[10px] tracking-widest uppercase">
                                    Edit Camera
                                </Button>
                            )}
                        </div>
                    </form>
                </Modal>
            )}

            {showImport && (
                <ImportModal
                    title="BULK_INFRASTRUCTURE_INGESTION"
                    endpoint="/surveillance/import"
                    templateEndpoint="/surveillance/import-template"
                    onClose={() => setShowImport(false)}
                    onDone={() => { setShowImport(false); fetch() }}
                />
            )}
        </div>
    )
}

