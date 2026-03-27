import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
    ArrowLeft, Edit, ArrowRightLeft, Printer, Trash2, Clock, Paperclip, 
    Info, Plus, Monitor, ClipboardCheck, Eye, EyeOff, Ticket as TicketIcon, 
    LayoutGrid, FileText, Share2, History, ShieldCheck, QrCode,
    Cpu, Database, User, MapPin, Activity, Shield, Hash, Server, Zap, Globe, HardDrive, Terminal
} from 'lucide-react'
import { 
    Card, CardHeader, CardTitle, CardBody, Button, Badge, 
    Table, THead, TBody, TR, TH, TD, PageHeader 
} from '../components/ui'
import api from '../api/client'
import toast from 'react-hot-toast'
import TransferModal from '../components/TransferModal'
import DeployModal from '../components/DeployModal'
import PeripheralLinkModal from '../components/PeripheralLinkModal'
import HandoverModal from '../components/HandoverModal'
import ScrapLinkedModal from '../components/ScrapLinkedModal'
import EmptyState from '../components/EmptyState'

const STATUS_VARIANTS = {
    Active: 'accent-green',
    'In Stock': 'accent-amber',
    Scrapped: 'accent-red',
    Offline: 'accent-amber',
    Inactive: 'text-muted',
    'Under Maintenance': 'accent-amber',
    Retired: 'text-muted'
}

const DetailField = ({ label, value, icon: Icon, mono, highlight, neon }) => (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral-subtle border border-border-main hover:bg-neutral-border transition-colors group">
        <div className="flex items-center gap-2 text-[9px] font-black text-text-muted uppercase tracking-[0.2em] group-hover:text-text-dim">
            {Icon && <Icon size={10} className={neon ? 'text-primary' : ''} />}
            <span>{label}</span>
        </div>
        <div className={`text-sm ${mono ? 'font-mono' : ''} ${highlight ? 'text-primary font-black' : 'text-text-main font-bold'} truncate`}>
            {value || <span className="text-text-muted italic font-medium">None</span>}
        </div>
    </div>
)

const CORE_FIELD_KEYS = [
    'asset_id', 'asset_type', 'sub_category', 'department', 'status', 'location', 
    'hostname', 'mac_address', 'ip_address', 'assigned_user', 'notes',
    'cpu', 'ram', 'storage', 'model', 'serial_number', 'serial_num', 'purchase_date', 
    'warranty_end', 'vendor', 'purchase_cost'
]


export default function AssetDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [asset, setAsset] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showTransfer, setShowTransfer] = useState(false)
    const [showLinkModal, setShowLinkModal] = useState(false)
    const [linkModalConfig, setLinkModalConfig] = useState({ mode: 'link', currentPeripheral: null })
    const [tab, setTab] = useState('info')
    const [codes, setCodes] = useState({ dept: '', type: '' })
    const [assetType, setAssetType] = useState(null)
    const [showHandover, setShowHandover] = useState(false)
    const [showScrapLinked, setShowScrapLinked] = useState(false)
    const [showPass, setShowPass] = useState(false)
    const [tickets, setTickets] = useState([])

    const fetchAsset = useCallback(async () => {
        try {
            const { data } = await api.get(`/assets/${id}`)
            setAsset(data.data)

            const ticketsRes = await api.get('/tickets', { params: { asset_ref: data.data.asset_id, limit: 100 } })
            setTickets(ticketsRes.data.data)

            const [deptRes, typeRes] = await Promise.all([
                api.get('/departments'),
                api.get('/types')
            ])
            const d = deptRes.data.data.find(x => x.name === data.data.department)
            const t = typeRes.data.data.find(x => x.name === data.data.asset_type)
            setCodes({ dept: d?.code || '??', type: t?.code || '??' })
            setAssetType(t || null)

        } catch {
            toast.error('Asset not found in inventory')
            navigate('/assets')
        } finally {
            setLoading(false)
        }
    }, [id, navigate])

    useEffect(() => { fetchAsset() }, [fetchAsset])

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6">
            <div className="relative">
                <div className="w-16 h-16 border-2 border-border-main border-t-primary rounded-full animate-spin" />
                <div className="absolute inset-2 border-2 border-border-main border-b-secondary rounded-full animate-reverse-spin" />
            </div>
            <p className="text-text-muted font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Loading Asset Data...</p>
        </div>
    )
    if (!asset) return null

    const baseFields = (assetType?.custom_fields || []).filter(f => !CORE_FIELD_KEYS.includes(f.key))
    const subCatFields = ((assetType?.sub_category_fields || []).find(f => f.sub_category_name === asset.sub_category)?.fields || []).filter(f => !CORE_FIELD_KEYS.includes(f.key))
    const customFields = [...baseFields, ...subCatFields.map(f => ({ ...f, isSubCat: true }))]

    const tabs = [
        { key: 'info', label: 'OVERVIEW', icon: LayoutGrid },
        { key: 'peripherals', label: `HARDWARE (${asset.peripherals?.length || 0})`, icon: Monitor },
        { key: 'tickets', label: `SERVICE (${tickets.length})`, icon: TicketIcon },
        { key: 'handover', label: 'HANDOVER', icon: ClipboardCheck },
        { key: 'history', label: `LOGS (${asset.movement_history?.length || 0})`, icon: History },
        { key: 'label', label: 'IDENTITY', icon: QrCode },
        { key: 'attachments', label: `FILES (${asset.attachments?.length || 0})`, icon: Paperclip },
    ]

    const handleAction = async (action, confirmMsg) => {
        if (confirmMsg && !confirm(confirmMsg)) return
        try {
            if (action === 'delete') {
                await api.delete(`/assets/${id}/remove`).catch(() => api.delete(`/assets/${id}`))
                toast.success('Asset removed from system')
                navigate('/assets')
            } else if (action === 'scrap') {
                if (asset.peripherals?.length > 0) {
                    setShowScrapLinked(true)
                } else {
                    await api.post(`/assets/${id}/scrap`, { peripheralActions: [] })
                    toast.success('Asset scrapped')
                    fetchAsset()
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed')
        }
    }

    const downloadLabel = async () => {
        try {
            const res = await api.get(`/reports/assets/${id}/label`, { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const link = document.createElement('a')
            link.href = url
            link.download = `label_${id}.pdf`
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch { toast.error('Label printing failed') }
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Premium Hero Panel */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-[2rem] blur-2xl opacity-50 transition-all duration-1000 group-hover:opacity-70 group-hover:scale-105" />
                <Card className="glass-elevated border-border-main relative overflow-hidden rounded-[2rem]">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                        <Terminal size={320} className="text-text-main" />
                    </div>
                    <CardBody className="p-8 md:p-10 relative z-10">
                        <div className="flex flex-col lg:flex-row gap-10 items-center lg:items-center">
                                {/* Asset Visual Signature */}
                                <div className="shrink-0 p-4 bg-neutral-subtle rounded-[2.5rem] border border-border-main shadow-2xl relative group/icon">
                                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                                    <Terminal size={48} className="text-primary relative z-10" />
                                </div>

                            <div className="flex-1 text-center lg:text-left space-y-4">
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-2">
                                        <div className="px-3 py-1 bg-neutral-subtle rounded-lg border border-border-main text-[10px] font-black text-text-muted uppercase tracking-widest shadow-inner">
                                            Asset ID: {asset.asset_id}
                                        </div>
                                        <Badge variant={STATUS_VARIANTS[asset.status] || 'text-muted'} className="px-3 py-1 text-[10px] font-black uppercase tracking-widest ring-1 ring-border-main">
                                            {asset.status?.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-black text-text-main uppercase tracking-tighter leading-none group-hover:text-primary transition-colors duration-500">
                                        {asset.hostname || 'Unnamed Asset'}
                                    </h1>
                                    <p className="text-text-muted font-bold uppercase tracking-widest text-xs">
                                        {asset.asset_type} <span className="text-text-muted mx-2">/</span> {asset.department} <span className="text-text-muted mx-2">/</span> {asset.location}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                                    <Button variant="ghost" size="sm" onClick={() => navigate('/assets')} icon={ArrowLeft} className="text-text-muted hover:text-text-main border border-border-main h-10 px-6">
                                        BACK
                                    </Button>
                                    <div className="h-6 w-px bg-border-main mx-2 hidden md:block" />
                                    {(asset.status === 'In Stock' || ['Active', 'Offline', 'Under Maintenance'].includes(asset.status)) && (
                                        <div className="flex items-center gap-3">
                                            {asset.status === 'In Stock' ? (
                                                <Button variant="primary" onClick={() => setShowTransfer('deploy')} icon={Activity} className="h-10 px-8 shadow-primary">Deploy Asset</Button>
                                            ) : (
                                                <Button variant="ghost" onClick={() => setShowTransfer(true)} icon={Share2} className="h-10 border border-border-main hover:border-primary/50 hover:text-primary">Move / Transfer</Button>
                                            )}
                                        </div>
                                    )}
                                    <Button variant="primary" onClick={() => navigate(`/assets/${id}/edit`)} icon={Edit} className="h-10 px-8 bg-secondary hover:bg-secondary-glow border-none shadow-secondary">
                                        Edit Asset
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-accent-red/50 hover:text-accent-red hover:bg-accent-red/10 transition-all ml-auto" onClick={() => handleAction('scrap', `Scrap Asset: Are you sure you want to scrap ${id}?`)}>
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Tab Console */}
            <div className="flex items-center gap-4 border-b border-border-main overscroll-x-auto no-scrollbar pt-4 relative">
                <div className="absolute bottom-0 left-0 right-0 h-px bg-border-main" />
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`
                            flex items-center gap-2.5 px-6 py-4 text-xs font-black transition-all relative group/tab
                            ${tab === t.key 
                                ? 'text-primary' 
                                : 'text-text-muted hover:text-text-main'
                            }
                        `}
                    >
                        <t.icon size={14} className={tab === t.key ? 'animate-pulse' : ''} />
                        <span className="tracking-[0.2em]">{t.label}</span>
                        {tab === t.key && (
                            <>
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-primary z-10" />
                                <div className="absolute inset-0 bg-primary/5 blur-md" />
                            </>
                        )}
                    </button>
                ))}
            </div>

            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                {tab === 'info' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Primary Node Specs */}
                        <div className="lg:col-span-2 space-y-8">
                            <Card className="glass border-border-main">
                                <CardHeader className="p-6 border-b border-border-main">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-primary">
                                                <Server size={18} />
                                            </div>
                                            <CardTitle className="text-text-main uppercase tracking-widest text-sm font-black">Asset Specifications</CardTitle>
                                        </div>
                                        {asset.last_seen && (
                                            <div className="flex items-center gap-3 bg-accent-green/5 px-4 py-1.5 rounded-full border border-accent-green/20 shadow-primary">
                                                <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse shadow-primary" />
                                                <span className="text-[10px] text-accent-green font-black uppercase tracking-widest">Last Seen: {new Date(asset.last_seen).toLocaleTimeString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardBody className="p-8 space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <DetailField label="Asset ID" value={asset.asset_id} icon={Hash} mono />
                                        <DetailField label="Category" value={asset.asset_type} icon={LayoutGrid} />
                                        <DetailField label="Sub-Category" value={asset.sub_category} icon={Info} />
                                        <DetailField label="Hostname" value={asset.hostname} icon={Globe} mono highlight neon />
                                        <DetailField label="IP Address" value={asset.ip_address} icon={Zap} mono highlight neon />
                                        <DetailField label="MAC Address" value={asset.mac_address} icon={Shield} mono highlight neon />
                                        <DetailField label="Location" value={asset.location} icon={MapPin} />
                                        <DetailField label="Department" value={asset.department} icon={Database} />
                                        <DetailField label="Custodian" value={asset.assigned_user} icon={User} />
                                    </div>

                                    <div className="pt-8 border-t border-border-main">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="w-1 h-6 bg-primary rounded-full shadow-primary" />
                                            <h3 className="text-xs font-black text-text-main uppercase tracking-widest flex items-center gap-2">
                                                <Cpu size={14} className="text-primary" />
                                                Hardware Configuration
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <DetailField label="Processor" value={asset.specs?.cpu} />
                                            <DetailField label="Memory (RAM)" value={asset.specs?.ram} />
                                            <DetailField label="Storage" value={asset.specs?.storage ? `${asset.specs.storage} ${asset.specs.storage_type || ''}` : null} icon={HardDrive} />
                                            <DetailField label="Operating System" value={asset.specs?.os} />
                                            <DetailField label="Model" value={asset.specs?.model} />
                                            <DetailField label="Serial Number" value={asset.specs?.serial_number} mono />
                                            {customFields.map(f => {
                                                const val = f.isSystem ? asset[f.key] : asset.specs?.custom?.[f.key]
                                                if (f.field_type === 'section') return (
                                                    <div key={f.key} className="col-span-1 md:col-span-3 pt-8 pb-2 border-b border-border-main mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1 h-4 bg-primary rounded-full" />
                                                            <h4 className="text-[10px] font-black text-text-dim uppercase tracking-widest">{f.label?.toUpperCase()}</h4>
                                                        </div>
                                                    </div>
                                                )
                                                return <DetailField key={f.key} label={f.label?.toUpperCase()} value={val} />
                                            })}
                                        </div>
                                    </div>

                                    {asset.credentials?.length > 0 && (
                                        <div className="pt-8 border-t border-border-main">
                                            <div className="flex items-center justify-between mb-8">
                                                <h3 className="text-xs font-black text-text-main uppercase tracking-widest flex items-center gap-2">
                                                    <Shield size={14} className="text-secondary" />
                                                    Access Credentials
                                                </h3>
                                                <button className="h-8 text-[9px] font-black tracking-widest border border-border-main hover:bg-neutral-subtle px-3 rounded-lg" onClick={() => setShowPass(!showPass)}>
                                                    {showPass ? 'Hide Passwords' : 'Show Passwords'}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {asset.credentials.map((cred, i) => (
                                                    <div key={i} className="p-4 bg-neutral-subtle rounded-2xl border border-border-main group relative hover:border-secondary/30 transition-all duration-500">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">{cred.label || 'Credential'}</div>
                                                            <button 
                                                                className="p-1.5 bg-neutral-border rounded-lg text-text-muted hover:text-secondary hover:bg-secondary/10 transition-all"
                                                                onClick={() => { navigator.clipboard.writeText(cred.password); toast.success('Password copied to clipboard') }}
                                                            >
                                                                <Paperclip size={12} />
                                                            </button>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center bg-bg-main px-4 py-2.5 rounded-xl border border-border-main">
                                                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Username</span>
                                                                <span className="text-xs font-mono font-black text-text-main">{cred.username}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center bg-bg-main px-4 py-2.5 rounded-xl border border-border-main">
                                                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Password</span>
                                                                <span className="text-xs font-mono font-black text-secondary">
                                                                    {showPass ? cred.password : '••••••••••••'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </div>

                        {/* Lifecycle & Analytics */}
                        <div className="space-y-8">
                            <Card className="bg-bg-card-elevated text-text-main border-none shadow-2xl ring-1 ring-border-main relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] -mr-10 -mt-10" />
                                <CardHeader className="border-border-main p-6">
                                    <div className="flex items-center gap-2">
                                        <Zap size={18} className="text-primary animate-pulse" />
                                        <CardTitle className="text-text-main font-black tracking-widest text-sm">Lifecycle Details</CardTitle>
                                    </div>
                                </CardHeader>
                                
                                <CardBody className="p-8 space-y-10 relative z-10">
                                    <div className="flex items-center gap-5 bg-neutral-subtle p-5 rounded-2xl border border-border-main group/item hover:border-primary/30 transition-all">
                                        <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shadow-primary">
                                            <ShieldCheck size={28} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1">Warranty Expiry</div>
                                            <div className="text-2xl font-black text-text-main font-mono">
                                                {asset.warranty_end ? new Date(asset.warranty_end).toLocaleDateString() : 'None'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-8 pt-4">
                                        <div className="space-y-2">
                                            <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Vendor</div>
                                            <div className="text-sm font-black text-text-main uppercase tracking-tight">{asset.vendor || 'None'}</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Purchase Date</div>
                                                <div className="text-sm font-black text-text-main font-mono">{asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : '??-??-????'}</div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Purchase Cost</div>
                                                <div className="text-sm font-mono font-black text-primary">{asset.purchase_cost_actual ? `₹${Number(asset.purchase_cost_actual).toLocaleString()}` : '0.00'}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {asset.amc?.vendor && (
                                        <div className="pt-8 border-t border-border-main space-y-4">
                                            <div className="px-3 py-1 bg-primary/10 rounded-lg text-[9px] font-black text-primary uppercase tracking-[0.3em] w-fit border border-primary/20">
                                                AMC Active
                                            </div>
                                            <div className="bg-neutral-subtle p-4 rounded-xl border border-border-main space-y-3">
                                                <div>
                                                    <div className="text-[9px] font-black text-text-muted uppercase tracking-tighter mb-1">AMC Vendor</div>
                                                    <div className="text-xs font-black text-text-dim uppercase">{asset.amc.vendor}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] font-black text-text-muted uppercase tracking-tighter mb-1">AMC Period</div>
                                                    <div className="text-[11px] font-mono font-black text-primary">
                                                        {new Date(asset.amc.start_date).toLocaleDateString()} to {new Date(asset.amc.end_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>

                            <Card className="glass border-border-main group">
                                <CardHeader className="p-6">
                                    <div className="flex items-center gap-3">
                                        <FileText size={18} className="text-text-muted group-hover:text-text-main transition-colors" />
                                        <CardTitle className="text-text-main uppercase tracking-widest text-sm font-black">Notes</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardBody className="p-6 pt-0">
                                    <p className="text-xs text-text-muted leading-relaxed font-bold bg-neutral-subtle p-5 rounded-2xl border-l-4 border-accent-amber/40">
                                        {asset.notes || 'No notes recorded for this asset.'}
                                    </p>
                                </CardBody>
                            </Card>
                        </div>
                    </div>
                )}

                {tab === 'peripherals' && (
                    <Card className="glass border-border-main overflow-hidden">
                        <CardHeader className="p-8 border-b border-border-main">
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-primary">
                                        <Monitor size={20} />
                                    </div>
                                    <CardTitle className="text-text-main uppercase tracking-widest font-black text-base">Linked Peripherals</CardTitle>
                                </div>
                                <Button variant="primary" size="md" icon={Plus} className="shadow-primary px-8" onClick={() => {
                                    setLinkModalConfig({ mode: 'link', currentPeripheral: null })
                                    setShowLinkModal(true)
                                }}>Link Peripheral</Button>
                            </div>
                        </CardHeader>
                        <CardBody className="p-0">
                            {!asset.peripherals?.length ? (
                                <div className="py-32">
                                    <EmptyState 
                                        title="No Peripherals Linked"
                                        message="No peripherals are currently linked to this asset."
                                    />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <THead>
                                            <TR>
                                                <TH className="pl-10 uppercase tracking-widest text-[10px]">Asset ID</TH>
                                                <TH className="uppercase tracking-widest text-[10px]">Category</TH>
                                                <TH className="uppercase tracking-widest text-[10px]">Status</TH>
                                                <TH className="text-right pr-10 uppercase tracking-widest text-[10px]">Actions</TH>
                                            </TR>
                                        </THead>
                                        <TBody>
                                            {asset.peripherals.map(p => (
                                                <TR key={p.asset_id} hover className="cursor-pointer group border-border-main" onClick={() => navigate(`/assets/${p.asset_id}`)}>
                                                    <TD className="pl-10 font-mono text-xs font-black text-text-main group-hover:text-primary transition-colors">
                                                        {p.asset_id}
                                                    </TD>
                                                    <TD className="text-xs font-black text-text-muted uppercase tracking-widest">{p.asset_type}</TD>
                                                    <TD>
                                                        <Badge variant={STATUS_VARIANTS[p.status] || 'text-muted'} className="px-3 py-0.5 text-[9px] font-black uppercase tracking-widest">
                                                            {p.status?.toUpperCase()}
                                                        </Badge>
                                                    </TD>
                                                    <TD className="text-right pr-10">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted group-hover:text-primary group-hover:bg-primary/10">
                                                            <ArrowRightLeft size={16} />
                                                        </Button>
                                                    </TD>
                                                </TR>
                                            ))}
                                        </TBody>
                                    </Table>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                )}

                {tab === 'tickets' && (
                    <Card className="glass border-border-main overflow-hidden">
                        <CardHeader className="p-8 border-b border-border-main">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-accent-red/10 text-accent-red shadow-primary">
                                    <TicketIcon size={20} />
                                </div>
                                <CardTitle className="text-text-main uppercase tracking-widest font-black text-base">Service History</CardTitle>
                            </div>
                        </CardHeader>
                        <CardBody className="p-0">
                            {tickets.length === 0 ? (
                                <div className="py-32">
                                    <EmptyState 
                                        title="No Service Incidents"
                                        message="No service tickets have been recorded for this asset."
                                    />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <THead>
                                            <TR>
                                                <TH className="pl-10 uppercase tracking-widest text-[10px]">Ticket #</TH>
                                                <TH className="uppercase tracking-widest text-[10px]">Summary</TH>
                                                <TH className="uppercase tracking-widest text-[10px]">Status</TH>
                                                <TH className="uppercase tracking-widest text-[10px]">Priority</TH>
                                                <TH className="text-right pr-10 uppercase tracking-widest text-[10px]">Date</TH>
                                            </TR>
                                        </THead>
                                        <TBody>
                                            {tickets.map(t => (
                                                <TR key={t._id} className="border-border-main group">
                                                    <TD className="pl-10 font-black text-text-main text-xs">#{t.ticket_number}</TD>
                                                    <TD className="text-xs font-black text-text-muted uppercase tracking-tight max-w-md truncate group-hover:text-text-main transition-colors">{t.title}</TD>
                                                    <TD><Badge variant="text-muted" className="font-black px-2 py-0.5 text-[9px]">{t.status?.toUpperCase()}</Badge></TD>
                                                    <TD><Badge variant={t.priority === 'Critical' ? 'accent-red' : 'accent-amber'} className="font-black px-2 py-0.5 text-[9px]">{t.priority?.toUpperCase()}</Badge></TD>
                                                    <TD className="text-right pr-10 text-[10px] text-text-muted font-mono font-black">{new Date(t.createdAt).toLocaleDateString()}</TD>
                                                </TR>
                                            ))}
                                        </TBody>
                                    </Table>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                )}

                {tab === 'handover' && (
                    <Card className="glass border-border-main shadow-2xl overflow-hidden rounded-[2rem]">
                         <CardHeader className="p-8 border-b border-border-main">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-primary">
                                    <ClipboardCheck size={20} />
                                </div>
                                <CardTitle className="text-text-main uppercase tracking-widest font-black text-base">Asset Handover</CardTitle>
                            </div>
                        </CardHeader>
                        <CardBody className="p-0">
                            <HandoverModal inline asset={asset} onClose={() => { }} onDone={fetchAsset} />
                        </CardBody>
                    </Card>
                )}

                {tab === 'history' && (
                    <Card className="glass border-border-main overflow-hidden">
                         <CardHeader className="p-8 border-b border-border-main">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-neutral-subtle text-text-main ring-1 ring-border-main">
                                    <History size={20} />
                                </div>
                                <CardTitle className="text-text-main uppercase tracking-widest font-black text-base">Asset Movement Logs</CardTitle>
                            </div>
                        </CardHeader>
                        <CardBody className="p-10">
                            {!asset.movement_history?.length ? (
                                <div className="py-24 flex flex-col items-center justify-center text-center">
                                    <div className="p-8 bg-neutral-subtle rounded-full mb-6 ring-1 ring-border-main shadow-inner">
                                        <History size={60} className="text-text-muted" />
                                    </div>
                                    <h3 className="text-text-main font-black uppercase tracking-widest mb-2">No Movement History</h3>
                                    <p className="text-text-muted text-[10px] font-black uppercase tracking-widest max-w-xs leading-loose">This asset has not been moved since it was added.</p>
                                </div>
                            ) : (
                                <div className="relative space-y-0">
                                    <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-border-main" />
                                    {[...asset.movement_history].reverse().map((m, i) => (
                                        <div key={i} className="relative pl-16 pb-12 group">
                                            <div className="absolute left-4.5 top-0 w-3 h-3 rounded-full bg-bg-main border-2 border-border-main group-hover:border-primary transition-all duration-500 z-10 shadow-2xl" />
                                            <div className="bg-neutral-subtle border border-border-main rounded-[1.5rem] p-6 group-hover:border-primary/20 group-hover:bg-neutral-border transition-all duration-500 shadow-xl">
                                                <div className="flex flex-wrap items-center justify-between gap-6 mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <Badge variant={m.action_type === 'Deploy' ? 'accent-green' : m.action_type === 'Scrap' ? 'accent-red' : 'accent-amber'} className="px-3 py-1 font-black text-[9px] uppercase tracking-widest">
                                                            {m.action_type?.toUpperCase() || 'Movement'}
                                                        </Badge>
                                                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest font-mono">
                                                            {new Date(m.moved_date).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 bg-bg-main px-4 py-1.5 rounded-full border border-border-main text-[9px] font-black text-text-muted uppercase tracking-widest">
                                                        <User size={10} className="text-primary/50" />
                                                        By: {m.moved_by}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-10 mb-6">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">From</span>
                                                        <span className="text-sm font-black text-text-muted uppercase tracking-tight">{m.from_department || 'Initial'}</span>
                                                    </div>
                                                    <div className="p-2 rounded-xl bg-primary/5 text-primary/30">
                                                        <ArrowRightLeft size={20} />
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">To</span>
                                                        <span className="text-sm font-black text-primary uppercase tracking-tight">{m.to_department}</span>
                                                    </div>
                                                </div>

                                                {m.to_user && (
                                                    <div className="flex items-center gap-3 text-[10px] font-black text-text-main bg-neutral-subtle px-4 py-2 rounded-xl border border-border-main w-fit mb-6">
                                                        <Zap size={10} className="text-primary" />
                                                        To User: <span className="text-primary">{m.to_user.toUpperCase()}</span>
                                                    </div>
                                                )}
                                                
                                                {m.notes && (
                                                    <div className="text-[10px] text-text-muted font-bold italic bg-bg-main p-4 rounded-xl border-l-2 border-primary/50 leading-relaxed">
                                                        "{m.notes}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardBody>
                    </Card>
                )}

                {tab === 'label' && (
                    <div className="max-w-2xl mx-auto py-10">
                        <Card className="glass border-border-main shadow-2xl overflow-hidden relative group rounded-[2.5rem]">
                            <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-primary to-secondary opacity-50 shadow-primary" />
                            <CardBody className="p-16 flex flex-col items-center">
                                <div className="bg-white p-10 rounded-[2rem] shadow-2xl border border-border-main mb-12 relative group-hover:scale-105 transition-transform duration-700">
                                    <QrCode size={220} className="text-black" />
                                    <div className="absolute inset-0 border-2 border-primary/20 rounded-[2rem] animate-pulse" />
                                </div>
                                
                                <div className="text-center space-y-6 mb-12">
                                    <div className="inline-block px-8 py-4 bg-primary/10 border border-primary/20 text-primary rounded-2xl text-2xl font-mono font-black tracking-[0.2em] shadow-inner">
                                        GEM/{codes.dept}/{codes.type}/{asset.asset_id.split('-').pop().padStart(4, '0')}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em]">Official Asset ID</p>
                                        <p className="text-[8px] font-black text-text-muted uppercase tracking-[0.6em]">Verified Asset</p>
                                    </div>
                                </div>

                                <div className="w-full space-y-6">
                                    <Button variant="primary" size="lg" className="w-full h-16 text-xs font-black tracking-[0.3em] uppercase shadow-primary" icon={Printer} onClick={downloadLabel}>
                                        Print Label
                                    </Button>
                                    <div className="p-6 bg-neutral-subtle rounded-3xl border border-border-main space-y-3">
                                        <h4 className="text-[9px] font-black text-text-main uppercase tracking-widest text-center">Printer Details</h4>
                                        <p className="text-[9px] text-center text-text-muted leading-relaxed font-bold uppercase tracking-widest">
                                            Industrial Thermal Matrix / High-Res UV Resistant / Auto-Calibrated Scale 1.0
                                        </p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                )}

                {tab === 'attachments' && (
                    <Card className="glass border-border-main overflow-hidden">
                        <CardHeader className="p-8 border-b border-border-main">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-primary">
                                    <Paperclip size={20} />
                                </div>
                                <CardTitle className="text-text-main uppercase tracking-widest font-black text-base">Attachments</CardTitle>
                            </div>
                        </CardHeader>
                        <CardBody className="p-0">
                            {!asset.attachments?.length ? (
                                <div className="py-32">
                                    <EmptyState 
                                        title="No Attachments"
                                        message="No documents have been uploaded for this asset."
                                    />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <THead>
                                            <TR>
                                                <TH className="pl-10 uppercase tracking-widest text-[10px]">Filename</TH>
                                                <TH className="uppercase tracking-widest text-[10px]">Type</TH>
                                                <TH className="uppercase tracking-widest text-[10px]">Upload Date</TH>
                                                <TH className="text-right pr-10 uppercase tracking-widest text-[10px]">Action</TH>
                                            </TR>
                                        </THead>
                                        <TBody>
                                            {asset.attachments.map((f, i) => (
                                                <TR key={i} className="border-border-main group">
                                                    <TD className="pl-10 text-xs font-black text-text-main uppercase tracking-tight group-hover:text-primary transition-colors">{f.name}</TD>
                                                    <TD><Badge variant="text-muted" className="font-black px-2.5 py-1 text-[9px]">{f.file_type?.toUpperCase()}</Badge></TD>
                                                    <TD className="text-[11px] text-text-muted font-black uppercase tracking-widest">{new Date(f.uploaded_at).toLocaleDateString()}</TD>
                                                    <TD className="text-right pr-10">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-9 px-6 font-black text-[9px] tracking-widest uppercase border border-border-main hover:border-primary/50 hover:text-primary hover:bg-primary/5"
                                                            as="a"
                                                            href={f.url.startsWith('http') ? f.url : (api.defaults.baseURL.replace('/api', '')) + f.url}
                                                            target="_blank"
                                                        >
                                                            Download
                                                        </Button>
                                                    </TD>
                                                </TR>
                                            ))}
                                        </TBody>
                                    </Table>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                )}
            </div>

            {/* Modals */}
            {showTransfer === true && <TransferModal asset={asset} onClose={() => setShowTransfer(false)} onDone={() => { setShowTransfer(false); fetchAsset() }} />}
            {showTransfer === 'deploy' && <DeployModal
                asset={asset}
                onClose={() => setShowTransfer(false)}
                onDone={() => { setShowTransfer(false); fetchAsset() }}
                onOther={() => { setShowTransfer(false); setShowHandover(true) }}
            />}
            {showLinkModal && <PeripheralLinkModal
                parentAsset={asset.parent_asset_id ? { asset_id: asset.parent_asset_id, department: asset.department, location: asset.location, assigned_user: asset.assigned_user } : asset}
                mode={linkModalConfig.mode}
                currentPeripheral={linkModalConfig.currentPeripheral}
                onClose={() => setShowLinkModal(false)}
                onDone={() => { setShowLinkModal(false); fetchAsset(); if (linkModalConfig.mode === 'replace') navigate(`/assets/${asset.parent_asset_id || asset.asset_id}`) }}
            />}
            {showHandover && <HandoverModal asset={asset} onClose={() => setShowHandover(false)} onDone={() => { setShowHandover(false); fetchAsset() }} />}
            {showScrapLinked && <ScrapLinkedModal asset={asset} onClose={() => setShowScrapLinked(false)} onDone={() => { setShowScrapLinked(false); fetchAsset() }} />}
        </div>
    )
}

