import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FileKey2, Phone, Mail, X, Trash2, Edit, Globe, FileSpreadsheet, Search, ArrowUp, ArrowDown, ChevronRight, RefreshCw, ChevronLeft, LayoutGrid, Monitor, Hash, User, Terminal, Database, Shield, Zap, Activity, Box, Copy } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import ImportModal from '../components/ImportModal'
import { Card, CardHeader, CardTitle, CardBody, Button, Badge, Table, THead, TBody, TR, TH, TD, Modal, Input, Select, Textarea, PageHeader, SearchInput, Field } from '../components/ui'

const LIC_TYPES = ['OEM', 'Perpetual', 'Subscription', 'Open Source', 'Trial']
const ACCOUNT_TYPES = ['Individual', 'Shared', 'Departmental', 'System']
const STATUS_VARIANTS = { 
    Active: 'teal', 
    Expired: 'red', 
    'Expiring Soon': 'orange', 
    Suspended: 'amber', 
    Deactivated: 'gray' 
}

const EMPTY_LIC = { software_name: '', vendor: '', license_key: '', license_type: 'Perpetual', seats_purchased: 1, seats_used: 0, purchase_date: '', expiry_date: '', cost: '', department: '', assigned_user: '', notes: '', status: 'Active' }
const EMPTY_COMM = { asset_type: 'CUG', department: '', assigned_user: '', status: 'Active', notes: '', mobile_number: '', sim_number: '', provider: '', plan_name: '', monthly_cost: '', starnumber: '', landline_number: '', password: '', email_id: '', account_type: 'Individual', platform: 'Outlook/O365' }

export default function DigitalAssets() {
    const [tab, setTab] = useState('software')
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState({})
    const [editId, setEditId] = useState(null)
    const [saving, setSaving] = useState(false)
    const [liveAssets, setLiveAssets] = useState([])
    const [vendorList, setVendorList] = useState([])
    const [showImport, setShowImport] = useState(false)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [limit, setLimit] = useState(25)
    const [search, setSearch] = useState('')
    const [sortField, setSortField] = useState('createdAt')
    const [sortOrder, setSortOrder] = useState('desc')

    const totalPages = Math.max(1, Math.ceil(total / limit))

    const fetch = useCallback(async () => {
        setLoading(true)
        try {
            const typeParam = tab === 'cug' ? 'CUG' : tab === 'mail' ? 'Mail' : 'Landline'
            const params = {
                type: tab === 'software' ? undefined : typeParam,
                page,
                limit,
                search,
                sortField,
                sortOrder
            }
            const url = tab === 'software' ? '/licenses' : '/communications'
            const { data: res } = await api.get(url, { params })
            setData(res.data)
            setTotal(res.total || 0)

            const [assetRes, vendorRes] = await Promise.all([
                api.get('/assets?limit=1000'),
                api.get('/vendors')
            ])
            setLiveAssets(assetRes.data.data.filter(a => ['Active', 'In Stock', 'Under Maintenance', 'Offline'].includes(a.status)))
            setVendorList(vendorRes.data.data)
        } catch { toast.error('Failed to sync records') }
        finally { setLoading(false) }
    }, [tab, page, limit, search, sortField, sortOrder])

    useEffect(() => { fetch() }, [fetch])

    const handleSearch = (val) => { setSearch(val); setPage(1) }
    const handleSort = (field) => {
        if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortOrder('asc') }
    }

    const openAdd = () => {
        setForm(tab === 'software' ? { ...EMPTY_LIC } : { ...EMPTY_COMM, asset_type: tab === 'cug' ? 'CUG' : tab === 'mail' ? 'Mail' : 'Landline' })
        setEditId(null)
        setShowModal(true)
    }

    const openEdit = (item) => {
        const cleaned = { ...item }
        if (cleaned.purchase_date) cleaned.purchase_date = cleaned.purchase_date.slice(0, 10)
        if (cleaned.expiry_date) cleaned.expiry_date = cleaned.expiry_date.slice(0, 10)
        setForm(cleaned)
        setEditId(item._id)
        setShowModal(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const url = tab === 'software' ? '/licenses' : '/communications'
            if (editId) { await api.put(`${url}/${editId}`, form); toast.success('Record updated') }
            else { await api.post(url, form); toast.success('Entry created') }
            setShowModal(false); fetch()
        } catch (err) { toast.error(err.response?.data?.message || 'Operation failed') }
        finally { setSaving(false) }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return
        const url = tab === 'software' ? '/licenses' : '/communications'
        try {
            await api.delete(`${url}/${id}`)
            toast.success('Record deleted')
            fetch()
        } catch { toast.error('Delete failed') }
    }

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

    const TABS = [
        { id: 'software', label: 'Software', icon: FileKey2 },
        { id: 'cug', label: 'Mobile / SIM', icon: Phone },
        { id: 'mail', label: 'Email / Cloud', icon: Mail },
        { id: 'landline', label: 'Landline', icon: Globe },
    ]

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Digital Asset Inventory"
                subtitle={
                    <div className="flex items-center gap-2 text-text-muted font-black uppercase tracking-widest text-[10px]">
                        <Terminal size={12} className="text-primary" />
                        <span>Manage software licenses and communication accounts</span>
                    </div>
                }
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="md" onClick={() => setShowImport(true)} icon={FileSpreadsheet} className="text-text-muted hover:text-text-main border border-border-main">
                            Import Data
                        </Button>
                        <Button variant="primary" size="md" onClick={openAdd} icon={Plus} className="shadow-primary px-8">
                            {tab === 'software' ? 'New License' : 'New Account'}
                        </Button>
                    </div>
                }
            />

            {/* Tab Console */}
            <div className="flex items-center gap-4 border-b border-border-main overscroll-x-auto no-scrollbar pt-4 relative">
                <div className="absolute bottom-0 left-0 right-0 h-px bg-border-main" />
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => { setTab(t.id); setPage(1) }}
                        className={`
                            flex items-center gap-2.5 px-6 py-4 text-xs font-black transition-all relative group/tab
                            ${tab === t.id 
                                ? 'text-primary' 
                                : 'text-text-muted hover:text-text-main'
                            }
                        `}
                    >
                        <t.icon size={14} className={tab === t.id ? 'animate-pulse' : ''} />
                        <span className="tracking-[0.2em]">{t.label}</span>
                        {tab === t.id && (
                            <>
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-primary z-10" />
                                <div className="absolute inset-0 bg-primary/5 blur-md" />
                            </>
                        )}
                    </button>
                ))}
            </div>

            <Card className="glass border-border-main overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="p-6 border-b border-border-main flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="w-full sm:w-auto flex-1 max-w-xl">
                        <SearchInput
                            placeholder={`Search ${tab}...`}
                            value={search}
                            onChange={e => handleSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest leading-none mb-1">Total Records</span>
                            <span className="text-xs font-black text-text-main uppercase tracking-widest">{total} Items</span>
                        </div>
                        <div className="h-8 w-px bg-border-main" />
                        <Button variant="ghost" size="icon" onClick={fetch} className="text-text-muted hover:text-primary hover:bg-primary/10 transition-all">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </Button>
                    </div>
                </CardHeader>

                <CardBody className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 space-y-4">
                            <div className="relative">
                                <div className="w-12 h-12 border-2 border-border-main border-t-primary rounded-full animate-spin" />
                                <Activity size={20} className="absolute inset-x-0 mx-auto top-1/2 -translate-y-1/2 text-primary/30" />
                            </div>
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] leading-loose animate-pulse">Syncing Records...</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-40 text-center px-6">
                            <div className="p-8 rounded-[2rem] bg-neutral-subtle text-text-muted mb-8 ring-1 ring-border-main shadow-inner">
                                <Box size={60} />
                            </div>
                            <h3 className="text-lg font-black text-text-main uppercase tracking-widest mb-2">No Records</h3>
                            <p className="text-text-muted max-w-sm text-[10px] font-black uppercase tracking-widest leading-loose mb-8">
                                No digital records found for this category. Create a new record to begin tracking.
                            </p>
                            <Button variant="ghost" size="md" className="border border-border-main hover:text-text-main" onClick={() => { setSearch(''); fetch(); }}>Reset Filters</Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <THead>
                                    {tab === 'software' ? (
                                        <TR>
                                            <TH className="pl-10 uppercase tracking-widest text-[9px]" onClick={() => handleSort('software_name')}>Software Name</TH>
                                            <TH className="uppercase tracking-widest text-[9px]">Vendor</TH>
                                            <TH className="uppercase tracking-widest text-[9px]">Seats / Usage</TH>
                                            <TH className="uppercase tracking-widest text-[9px]" onClick={() => handleSort('expiry_date')}>Expiration</TH>
                                            <TH className="uppercase tracking-widest text-[9px]">Status</TH>
                                            <TH className="text-right pr-10 uppercase tracking-widest text-[9px]">Actions</TH>
                                        </TR>
                                    ) : (
                                        <TR>
                                            <TH className="pl-10 uppercase tracking-widest text-[9px]" onClick={() => handleSort(tab === 'mail' ? 'email_id' : 'mobile_number')}>
                                                {tab === 'mail' ? 'Email Address' : 'Identifier / ID'}
                                            </TH>
                                            {tab === 'mail' && <TH className="uppercase tracking-widest text-[9px]">Credentials</TH>}
                                            <TH className="uppercase tracking-widest text-[9px]">Assigned User</TH>
                                            {tab === 'cug' && <TH className="uppercase tracking-widest text-[9px]">Linked Asset</TH>}
                                            <TH className="uppercase tracking-widest text-[9px]">Status</TH>
                                            <TH className="text-right pr-10 uppercase tracking-widest text-[9px]">Actions</TH>
                                        </TR>
                                    )}
                                </THead>
                                <TBody>
                                    {data.map((l) => (
                                        <TR key={l._id} hover onClick={() => openEdit(l)} className="border-border-main group">
                                            {tab === 'software' ? (
                                                <>
                                                    <TD className="pl-10">
                                                        <div className="space-y-1.5">
                                                            <p className="text-xs font-black text-text-main group-hover:text-primary transition-colors uppercase tracking-tight">{l.software_name}</p>
                                                            <code className="text-[9px] bg-neutral-subtle text-primary border border-border-main px-2 py-0.5 rounded-lg font-mono font-black leading-none">
                                                                {l.license_key || 'No Key'}
                                                            </code>
                                                        </div>
                                                    </TD>
                                                    <TD>
                                                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{l.vendor || 'Other'}</span>
                                                    </TD>
                                                    <TD>
                                                        <div className="w-full max-w-[140px] space-y-2">
                                                            <div className="flex items-center justify-between text-[8px] font-black">
                                                                <span className="text-text-muted uppercase tracking-tighter">{l.seats_used} / {l.seats_purchased} Used</span>
                                                                <span className="text-primary font-mono shadow-primary">
                                                                    {Math.round((l.seats_used / (l.seats_purchased || 1)) * 100)}%
                                                                </span>
                                                            </div>
                                                            <div className="h-1 w-full bg-neutral-subtle rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor] ${
                                                                        (l.seats_used / (l.seats_purchased || 1)) > 0.9 ? 'text-accent-red bg-accent-red' : 'text-primary bg-primary'
                                                                    }`}
                                                                    style={{ width: `${Math.min(100, (l.seats_used / (l.seats_purchased || 1)) * 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </TD>
                                                    <TD>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-black text-text-main font-mono">
                                                                {l.expiry_date ? new Date(l.expiry_date).toLocaleDateString() : 'Perpetual'}
                                                            </p>
                                                            <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">Validity</p>
                                                        </div>
                                                    </TD>
                                                </>
                                            ) : (
                                                <>
                                                    <TD className="pl-10">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-xs font-black text-text-main group-hover:text-primary transition-colors">{l.email_id || l.mobile_number || l.starnumber}</p>
                                                                {(tab === 'mail' && l.email_id) && (
                                                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(l.email_id); toast.success('Email copied to clipboard') }} className="h-5 w-5 text-text-muted hover:text-primary">
                                                                        <Copy size={12} />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">{l.platform || l.provider || 'Analog'}</p>
                                                        </div>
                                                    </TD>
                                                    {tab === 'mail' && (
                                                        <TD>
                                                            {l.password ? (
                                                                <div className="flex items-center gap-2">
                                                                    <code className="text-[9px] bg-neutral-subtle text-accent-purple border border-border-main px-2 py-0.5 rounded-lg font-mono font-black leading-none">
                                                                        ••••••••
                                                                    </code>
                                                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(l.password); toast.success('Password copied to clipboard') }} className="h-5 w-5 text-text-muted hover:text-accent-purple">
                                                                        <Copy size={12} />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[8px] font-black text-text-dim uppercase tracking-[0.2em]">No Pass</span>
                                                            )}
                                                        </TD>
                                                    )}
                                                    <TD>
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-black text-text-main/80 uppercase">{l.assigned_user || 'Unassigned'}</p>
                                                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">{l.department || 'General'}</p>
                                                        </div>
                                                    </TD>
                                                    {tab === 'cug' && (
                                                        <TD>
                                                            {l.linked_asset_id ? (
                                                                <Link 
                                                                    to={`/assets/${l.linked_asset_id}`} 
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-subtle hover:bg-primary/10 text-text-muted hover:text-primary rounded-lg text-[9px] font-black border border-border-main hover:border-primary/30 transition-all shadow-sm"
                                                                >
                                                                    <Monitor size={10} /> {l.linked_asset_id}
                                                                </Link>
                                                            ) : (
                                                                <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">Standalone</span>
                                                            )}
                                                        </TD>
                                                    )}
                                                </>
                                            )}
                                            <TD>
                                                <Badge variant={STATUS_VARIANTS[l.status] || 'slate'} className="px-3 py-0.5 text-[9px] font-black uppercase tracking-widest">
                                                    {l.status?.toUpperCase()}
                                                </Badge>
                                            </TD>
                                            <TD className="text-right pr-10">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(l) }} className="h-8 w-8 text-text-muted hover:text-primary hover:bg-primary/10">
                                                        <Edit size={14} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(l._id) }} className="h-8 w-8 text-text-muted hover:text-accent-red hover:bg-accent-red/10">
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </TD>
                                        </TR>
                                    ))}
                                </TBody>
                            </Table>
                        </div>
                    )}
                </CardBody>

                <div className="px-8 py-6 border-t border-border-main flex flex-col sm:flex-row items-center justify-between gap-6 bg-bg-main/50 transition-colors">
                    <div className="flex items-center gap-3">
                        <select
                            value={limit}
                            onChange={e => { setLimit(+e.target.value); setPage(1) }}
                            className="bg-neutral-subtle border border-border-main text-[10px] font-black text-text-muted rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary uppercase tracking-widest"
                        >
                            <option value={10}>10 Records</option>
                            <option value={25}>25 Records</option>
                            <option value={50}>50 Records</option>
                        </select>
                        <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">per page</span>
                    </div>
                    
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Page</span>
                            <div className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-xs font-mono font-black text-primary shadow-primary">
                                {page} <span className="text-text-muted mx-1">/</span> {totalPages}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-10 w-10 border border-border-main hover:bg-neutral-subtle">
                                <ChevronLeft size={18} />
                            </Button>
                            <Button variant="ghost" size="icon" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="h-10 w-10 border border-border-main hover:bg-neutral-subtle">
                                <ChevronRight size={18} />
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {showModal && (
                <Modal
                    onClose={() => setShowModal(false)}
                    title={editId ? `Edit Digital Asset` : 'Add Digital Asset'}
                    size="lg"
                >
                    <form onSubmit={handleSave} className="space-y-8 p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            {tab === 'software' && (
                                <>
                                    <Field label="Software Name" required>
                                        <Input
                                            placeholder="Adobe Creative Cloud, Windows 11 Pro..."
                                            value={form.software_name || ''}
                                            onChange={e => set('software_name', e.target.value)}
                                            icon={FileKey2}
                                            className="uppercase font-black text-xs"
                                        />
                                    </Field>
                                   <Field label="Vendor">
                                        <Select
                                            value={form.vendor || ''}
                                            onChange={e => set('vendor', e.target.value)}
                                            className="font-black text-[10px] tracking-widest"
                                        >
                                            <option value="">Select Vendor</option>
                                           {vendorList.filter(v => v.vendor_type !== 'AMC').map(v => (
                                                <option key={v._id} value={v.name}>{v.name.toUpperCase()}</option>
                                            ))}
                                        </Select>
                                    </Field>
                                    <Field label="License Key">
                                        <Input
                                            placeholder="XXXX-XXXX-XXXX-XXXX"
                                            value={form.license_key || ''}
                                            onChange={e => set('license_key', e.target.value)}
                                            icon={Hash}
                                            className="font-mono text-xs text-primary"
                                        />
                                    </Field>
                                   <Field label="License Type">
                                        <Select
                                            value={form.license_type || 'Perpetual'}
                                            onChange={e => set('license_type', e.target.value)}
                                            className="font-black text-[10px] tracking-widest"
                                        >
                                            {LIC_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                                        </Select>
                                    </Field>
                                    <Field label="Total Seats">
                                        <Input
                                            type="number"
                                            value={form.seats_purchased}
                                            onChange={e => set('seats_purchased', +e.target.value)}
                                            className="font-mono text-xs"
                                        />
                                    </Field>
                                   <Field label="Expiry Date">
                                        <Input
                                            type="date"
                                            value={form.expiry_date || ''}
                                            onChange={e => set('expiry_date', e.target.value)}
                                            className="font-mono text-xs"
                                        />
                                    </Field>
                                    <Field label="Assigned User">
                                        <Input
                                            placeholder="Full Name"
                                            value={form.assigned_user || ''}
                                            onChange={e => set('assigned_user', e.target.value)}
                                            icon={User}
                                            className="uppercase font-bold text-xs"
                                        />
                                    </Field>
                                   <Field label="Department">
                                        <Input
                                            placeholder="e.g. IT, FINANCE"
                                            value={form.department || ''}
                                            onChange={e => set('department', e.target.value)}
                                            className="uppercase font-bold text-xs"
                                        />
                                    </Field>
                                </>
                            )}
                            {(tab === 'cug' || tab === 'mail' || tab === 'landline') && (
                                <>
                                    {tab === 'cug' && (
                                        <>
                                            <Field label="Mobile Number" required>
                                                <Input
                                                    placeholder="+91..."
                                                    value={form.mobile_number || ''}
                                                    onChange={e => set('mobile_number', e.target.value)}
                                                    icon={Phone}
                                                    className="font-mono text-xs"
                                                />
                                            </Field>
                                           <Field label="SIM Number">
                                                <Input
                                                    placeholder="8991..."
                                                    value={form.sim_number || ''}
                                                    onChange={e => set('sim_number', e.target.value)}
                                                    className="font-mono text-xs"
                                                />
                                            </Field>
                                            <Field label="Network Provider">
                                                <Input
                                                    placeholder="e.g. Airtel, Vodafone, Jio..."
                                                    value={form.provider || ''}
                                                    onChange={e => set('provider', e.target.value)}
                                                    icon={Globe}
                                                    className="uppercase font-black text-[10px]"
                                                />
                                            </Field>
                                       </>
                                    )}
                                    {tab === 'mail' && (
                                        <>
                                            <Field label="Email Address" required>
                                                <Input
                                                    placeholder="user@domain.com"
                                                    value={form.email_id || ''}
                                                    onChange={e => set('email_id', e.target.value)}
                                                    icon={Mail}
                                                    className="font-mono text-xs text-primary"
                                                />
                                            </Field>
                                           <Field label="Platform">
                                                <Input
                                                    placeholder="M365, G_SUITE"
                                                    value={form.platform || ''}
                                                    onChange={e => set('platform', e.target.value)}
                                                    className="uppercase font-black text-[10px]"
                                                />
                                            </Field>
                                            <Field label="Password">
                                                <Input
                                                    type="text"
                                                    value={form.password || ''}
                                                    onChange={e => set('password', e.target.value)}
                                                    className="font-mono text-xs text-accent-purple"
                                                />
                                            </Field>
                                       </>
                                    )}
                                    {tab === 'landline' && (
                                        <>
                                            <Field label="Ext. Number" required>
                                                <Input
                                                    placeholder="e.g. 101, 505..."
                                                    value={form.starnumber || ''}
                                                    onChange={e => set('starnumber', e.target.value)}
                                                    icon={Hash}
                                                    className="font-mono text-xs"
                                                />
                                            </Field>
                                           <Field label="Landline Number">
                                                <Input
                                                    placeholder="022-243..."
                                                    value={form.landline_number || ''}
                                                    onChange={e => set('landline_number', e.target.value)}
                                                    icon={Phone}
                                                    className="font-mono text-xs"
                                                />
                                            </Field>
                                        </>
                                    )}
                                    <Field label="Assigned User">
                                        <Input
                                            placeholder="Full Name"
                                            value={form.assigned_user || ''}
                                            onChange={e => set('assigned_user', e.target.value)}
                                            icon={User}
                                            className="uppercase font-bold text-xs"
                                        />
                                    </Field>
                                    {tab === 'cug' && (
                                        <Field label="Linked Asset">
                                            <Select
                                                value={form.linked_asset_id || ''}
                                                onChange={e => set('linked_asset_id', e.target.value)}
                                                className="font-black text-[10px] tracking-widest"
                                            >
                                                <option value="">UNLINKED</option>
                                                {liveAssets.map(a => (
                                                    <option key={a._id} value={a.asset_id}>
                                                        {a.asset_id} - {a.hostname || a.asset_type}
                                                    </option>
                                                ))}
                                            </Select>
                                        </Field>
                                    )}
                                </>
                            )}
                            <Field label="Status">
                               <Select
                                    value={form.status || 'Active'}
                                    onChange={e => set('status', e.target.value)}
                                    className="font-black text-[10px] tracking-widest"
                                >
                                    {Object.keys(STATUS_VARIANTS).map(s => (
                                        <option key={s} value={s}>{s.toUpperCase()}</option>
                                    ))}
                                </Select>
                            </Field>
                        </div>
                        <Field label="Notes">
                           <Textarea
                                placeholder="Enter details or remarks..."
                                value={form.notes || ''}
                                onChange={e => set('notes', e.target.value)}
                                rows={3}
                                className="font-bold text-xs uppercase"
                            />
                        </Field>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-border-main bg-bg-main/50 p-6 -mx-6 -mb-6 backdrop-blur-xl">
                            <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="order-2 sm:order-1 text-text-muted hover:text-text-main font-black text-[10px] tracking-widest">
                                Cancel
                            </Button>
                           <Button type="submit" variant="primary" loading={saving} icon={RefreshCw} className="order-1 sm:order-2 px-12 h-12 shadow-primary font-black text-[10px] tracking-widest">
                                Save Digital Asset
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {showImport && (
                <ImportModal
                    title={`Import Digital Assets`}
                    endpoint={tab === 'software' ? '/licenses/import' : '/communications/import'}
                    templateEndpoint={tab === 'software' ? '/licenses/import/template' : `/communications/import/template?type=${tab === 'cug' ? 'CUG' : tab === 'mail' ? 'Mail' : 'Landline'}`}
                    context={tab === 'software' ? '' : tab === 'cug' ? 'CUG' : tab === 'mail' ? 'Mail' : 'Landline'}
                    onClose={() => setShowImport(false)}
                    onDone={() => { setShowImport(false); fetch() }}
                />
            )}
        </div>
    )
}

