import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
    Plus, Search, RefreshCw, ArrowUp, ArrowDown, 
    FileSpreadsheet, ChevronLeft, ChevronRight, 
    LayoutGrid, List, Filter, Download, ArrowRightLeft,
    MoreVertical, Monitor, Cpu, HardDrive, Hash, User, MapPin, ExternalLink, Box, Trash2, Check, Activity, Settings
} from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import DateRangeFilter from '../components/DateRangeFilter'
import ImportModal from '../components/ImportModal'
import BulkHandoverModal from '../components/BulkHandoverModal'
import BulkStatusModal from '../components/BulkStatusModal'
import { 
    Card, CardHeader, CardTitle, CardBody, Button, Badge, 
    Table, THead, TBody, TR, TH, TD, PageHeader, Checkbox
} from '../components/ui'
import { SearchInput, Select } from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import Skeleton from '../components/ui/Skeleton'

const SortIcon = ({ field, sortField, sortOrder }) => {
    if (sortField !== field) return <ArrowUp size={12} className="opacity-0 group-hover:opacity-50" />
    return sortOrder === 'asc' ? <ArrowUp size={12} className="text-primary" /> : <ArrowDown size={12} className="text-primary" />
}


export default function Assets({ context }) {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const CONTEXT_MAP = { live: 'Live', stock: 'In Stock', scrap: 'Scrapped' }
    const fixedStatus = CONTEXT_MAP[context]
    const pageTitle = context ? `${CONTEXT_MAP[context]} Assets` : 'Asset Inventory'

    const [assets, setAssets] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [pages, setPages] = useState(1)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState(searchParams.get('search') || '')
    const [viewMode, setViewMode] = useState('table') // 'table' or 'grid'
    const [filters, setFilters] = useState({
        status: fixedStatus || searchParams.get('status') || '',
        asset_type: searchParams.get('asset_type') || '',
        department: searchParams.get('department') || '',
        startDate: '',
        endDate: ''
    })
    const [typeList, setTypeList] = useState([])
    const [statusList, setStatusList] = useState([])
    const [showImport, setShowImport] = useState(false)
    const [sortField, setSortField] = useState('asset_id')
    const [sortOrder, setSortOrder] = useState('asc')
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [showBulkHandover, setShowBulkHandover] = useState(false)
    const [showBulkStatus, setShowBulkStatus] = useState(false)

    const fetchAssets = useCallback(async () => {
        setLoading(true)
        try {
            const params = { page, limit: viewMode === 'table' ? 15 : 12, search, sortField, sortOrder, ...filters }
            const { data } = await api.get('/assets', { params })
            setAssets(data.data); setTotal(data.total); setPages(data.pages)
        } catch { toast.error('Failed to load assets') }
        finally { setLoading(false) }
    }, [page, search, filters, sortField, sortOrder, viewMode])

    useEffect(() => {
        setFilters(p => {
            const newStatus = fixedStatus || searchParams.get('status') || ''
            if (p.status !== newStatus) return { ...p, status: newStatus }
            return p
        })
        const urlSearch = searchParams.get('search')
        if (urlSearch !== null && urlSearch !== search) {
            setSearch(urlSearch)
        }
        setSelectedIds(new Set())
    }, [searchParams, fixedStatus])

    useEffect(() => { fetchAssets() }, [fetchAssets])

    useEffect(() => {
        Promise.all([api.get('/types'), api.get('/statuses')]).then(([tRes, sRes]) => {
            setTypeList(tRes.data.data.map(t => t.name))
            setStatusList(sRes.data.data) // Store full status objects
        })
    }, [])

    const handleSearch = (val) => { setSearch(val); setPage(1) }
    const handleSort = (field) => {
        if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortOrder('asc') }
    }

    const toggleSelect = (id) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === assets.length && assets.length > 0) setSelectedIds(new Set())
        else setSelectedIds(new Set(assets.map(a => a.asset_id)))
    }

    const getStatusVariant = (statusName) => {
        const name = statusName?.toLowerCase() || ''
        if (name === 'active') return 'teal'
        if (['in stock', 'standby'].includes(name)) return 'amber'
        if (['scrapped', 'faulty'].includes(name)) return 'red'
        if (['maintenance', 'under maintenance', 'repairing'].includes(name)) return 'orange'
        return 'slate'
    }

    return (
        <div className="space-y-8">
            <PageHeader
                title={pageTitle}
                subtitle={`Viewing ${total} assets in the system inventory.`}
                icon={Monitor}
                actions={
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="ghost" 
                            icon={Settings} 
                            onClick={() => navigate('/setup?tab=types')}
                            className="h-11 border border-border-main text-text-muted hover:text-primary hover:border-primary/30 font-black text-[10px] tracking-widest uppercase"
                        >
                            Settings
                        </Button>
                        <Button variant="ghost" icon={FileSpreadsheet} className="text-text-muted hover:text-text-main" onClick={() => setShowImport(true)}>
                            Import Data
                        </Button>
                        <Button variant="primary" icon={Plus} className="shadow-primary" onClick={() => {
                            const nav = context ? `/assets/${context}/new` : '/assets/new?context=stock'
                            navigate(nav)
                        }}>
                            Add New Asset
                        </Button>
                    </div>
                }
            />

            {/* Premium Filter Console */}
            <Card className="glass border-border-main relative z-30 overflow-visible">
                <CardBody className="p-4 flex flex-col xl:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-4 w-full xl:w-auto">
                        <div className="w-full xl:w-80">
                            <SearchInput 
                                value={search} 
                                onChange={e => handleSearch(e.target.value)} 
                                placeholder="Search (ID, Hostname, Custodian...)" 
                            />
                        </div>
                        <div className="flex bg-neutral-subtle border border-border-main rounded-xl p-1 shrink-0">
                            <button 
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-primary text-white shadow-primary' : 'text-text-muted hover:text-text-main'}`}
                            >
                                <List size={18} />
                            </button>
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-primary' : 'text-text-muted hover:text-text-main'}`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
                        <Select
                            value={filters.status}
                            onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                            className="min-w-[130px] !bg-bg-main !border-border-main"
                        >
                            <option value="">All Statuses</option>
                            {statusList.map(s => <option key={s._id} value={s.name}>{s.name.toUpperCase()}</option>)}
                        </Select>
                        <Select
                            value={filters.asset_type}
                            onChange={e => setFilters(p => ({ ...p, asset_type: e.target.value }))}
                            className="min-w-[130px] !bg-bg-main !border-border-main"
                        >
                            <option value="">All Categories</option>
                            {typeList.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                        </Select>
                        <DateRangeFilter 
                            onFilter={({ startDate, endDate }) => setFilters(p => ({ ...p, startDate, endDate }))}
                            onClear={() => setFilters(p => ({ ...p, startDate: '', endDate: '' }))}
                        />
                        <div className="h-6 w-px bg-border-main mx-1 hidden md:block" />
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-text-muted hover:text-primary hover:bg-primary/10" onClick={fetchAssets}>
                             <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </Button>
                    </div>
                </CardBody>
            </Card>

            <Card className="glass border-border-main relative z-10 overflow-hidden">
                <CardBody className="p-0 min-h-[500px]">
                    {loading ? (
                         <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[...Array(viewMode === 'table' ? 8 : 12)].map((_, i) => (
                                <Skeleton key={i} className={`bg-neutral-subtle rounded-2xl ${viewMode === 'table' ? 'h-12 w-full' : 'h-64 w-full'}`} />
                            ))}
                        </div>
                    ) : assets.length === 0 ? (
                        <div className="py-24">
                            <EmptyState 
                                title="No Assets Found"
                                message="Adjust your filters to find the assets you are looking for."
                                action={
                                    <Button variant="secondary" onClick={() => { setSearch(''); setFilters({ ...filters, asset_type: '', status: fixedStatus || '' }) }}>
                                        Reset Filters
                                    </Button>
                                }
                            />
                        </div>
                    ) : viewMode === 'table' ? (
                        <div className="overflow-x-auto">
                            <Table className="min-w-[1000px]">
                                <THead>
                                    <TR>
                                        <TH className="w-16 pl-8">
                                            <div onClick={e => e.stopPropagation()}>
                                                <Checkbox 
                                                    checked={selectedIds.size === assets.length && assets.length > 0} 
                                                    onChange={toggleSelectAll} 
                                                />
                                            </div>
                                        </TH>
                                        <TH className="w-32 cursor-pointer group" onClick={() => handleSort('asset_id')}>
                                            <div className="flex items-center gap-1 uppercase tracking-widest text-[10px]">
                                            Asset ID <SortIcon field="asset_id" sortField={sortField} sortOrder={sortOrder} />
                                            </div>
                                        </TH>
                                        <TH className="w-64 uppercase tracking-widest text-[10px]">Host & Specifications</TH>
                                        <TH className="uppercase tracking-widest text-[10px]">Location & Department</TH>
                                        <TH className="w-32 cursor-pointer group" onClick={() => handleSort('status')}>
                                            <div className="flex items-center gap-1 uppercase tracking-widest text-[10px]">
                                                Status <SortIcon field="status" sortField={sortField} sortOrder={sortOrder} />
                                            </div>
                                        </TH>
                                        <TH className="w-24 text-right pr-8 uppercase tracking-widest text-[10px]">Actions</TH>
                                    </TR>
                                </THead>
                                <TBody>
                                    {assets.map((a) => (
                                        <TR 
                                            key={a._id} 
                                            className={`cursor-pointer group border-border-main transition-all duration-300 ${selectedIds.has(a.asset_id) ? 'border-l-4 border-l-primary bg-primary/5' : 'hover:border-l-4 hover:border-l-primary/50'}`}
                                            onClick={() => navigate(`/assets/${a.asset_id}`)} 
                                        >
                                            <TD className="pl-8">
                                                <div onClick={e => e.stopPropagation()}>
                                                    <Checkbox 
                                                        checked={selectedIds.has(a.asset_id)} 
                                                        onChange={() => toggleSelect(a.asset_id)} 
                                                    />
                                                </div>
                                            </TD>
                                            <TD className="font-mono text-sm font-black text-text-main group-hover:text-primary transition-colors uppercase tracking-[0.05em]">
                                                {a.asset_id}
                                            </TD>
                                            <TD>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-text-main truncate max-w-[200px]">{a.hostname || 'Unnamed Asset'}</span>
                                                    <span className="text-[10px] text-text-muted font-black uppercase tracking-widest">
                                                        {a.asset_type} {a.sub_category ? ` / ${a.sub_category.toUpperCase()}` : ''}
                                                    </span>
                                                </div>
                                            </TD>
                                            <TD>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-text-muted font-bold uppercase tracking-tight">{a.department}</span>
                                                    <span className="text-[10px] text-text-dim font-black uppercase tracking-tighter">{a.location}</span>
                                                </div>
                                            </TD>
                                            <TD>
                                                <Badge 
                                                    color={statusList.find(s => s.name === a.status)?.color}
                                                    textColor={statusList.find(s => s.name === a.status)?.text_color}
                                                    variant={getStatusVariant(a.status)} 
                                                    className="shadow-sm"
                                                >
                                                    {a.status?.toUpperCase() || 'UNKNOWN'}
                                                </Badge>
                                            </TD>
                                            <TD className="text-right pr-8">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted opacity-60 group-hover:opacity-100 transition-all hover:text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); navigate(`/assets/${a.asset_id}`); }}>
                                                    <MoreVertical size={14} />
                                                </Button>
                                            </TD>
                                        </TR>
                                    ))}
                                </TBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {assets.map((a) => (
                                <Card 
                                    key={a._id} 
                                    interactive
                                    className="glass-elevated border-border-main hover:border-primary/30 group transition-all duration-500 overflow-hidden"
                                    onClick={() => navigate(`/assets/${a.asset_id}`)}
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Monitor size={80} className="text-text-main" />
                                    </div>
                                    <div className="p-5 space-y-4 relative z-10">
                                        <div className="flex justify-between items-start">
                                            <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:scale-110 transition-transform duration-500 shadow-primary">
                                                <Cpu size={20} />
                                            </div>
                                            <div onClick={e => e.stopPropagation()}>
                                                <Checkbox 
                                                    checked={selectedIds.has(a.asset_id)} 
                                                    onChange={() => toggleSelect(a.asset_id)} 
                                                />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1">{a.asset_id}</div>
                                            <h3 className="text-base font-black text-text-main truncate group-hover:text-primary transition-colors uppercase tracking-tight">{a.hostname || 'Unnamed Asset'}</h3>
                                            <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">
                                                {a.asset_type} • {a.sub_category || 'GENERAL'}
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-border-main space-y-2">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted">
                                                <MapPin size={10} className="text-primary/50" />
                                                {a.department} / {a.location}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted">
                                                <User size={10} className="text-primary/50" />
                                                {a.custodian || 'UNASSIGNED'}
                                            </div>
                                        </div>

                                        <div className="pt-2 flex items-center justify-between">
                                            <Badge 
                                                color={statusList.find(s => s.name === a.status)?.color}
                                                textColor={statusList.find(s => s.name === a.status)?.text_color}
                                                variant={getStatusVariant(a.status)} 
                                                className="shadow-sm"
                                            >
                                                {a.status?.toUpperCase() || 'UNKNOWN'}
                                            </Badge>
                                            <div className="text-text-muted group-hover:text-primary transition-colors">
                                                <ExternalLink size={14} />
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardBody>

                <div className="px-8 py-4 glass border-t border-border-main flex items-center justify-between">
                        Showing: {Math.max(0, (page - 1) * 15 + (total > 0 ? 1 : 0))}–{Math.min(page * 15, total)} of {total}
                    
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3 text-[10px] font-black text-text-muted uppercase tracking-widest">
                             <span>Page</span>
                             <div className="px-3 py-1.5 bg-neutral-subtle border border-border-main rounded-lg text-text-main font-black min-w-[60px] text-center shadow-inner">
                                {page} / {pages}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                className="h-9 w-9 flex items-center justify-center rounded-lg border border-border-main hover:border-primary/50 hover:text-primary transition-all disabled:opacity-30"
                                disabled={page <= 1} 
                                onClick={() => setPage(p => p - 1)} 
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button 
                                className="h-9 w-9 flex items-center justify-center rounded-lg border border-border-main hover:border-primary/50 hover:text-primary transition-all disabled:opacity-30"
                                disabled={page >= pages} 
                                onClick={() => setPage(p => p + 1)} 
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Bulk Actions Floating Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
                    <div className="bg-bg-card-elevated/80 backdrop-blur-xl rounded-2xl shadow-2xl px-8 py-4 flex items-center gap-8 border border-border-main ring-1 ring-primary/20">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center animate-pulse shadow-primary">
                                <Box size={20} />
                            </div>
                            <div className="flex flex-col">
                                 <span className="text-xs font-black text-text-main tracking-widest uppercase">{selectedIds.size} Assets Selected</span>
                                <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Choose an action...</span>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-border-main" />
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="sm" className="text-text-muted hover:text-text-main text-[10px] font-black tracking-widest px-4 h-10" onClick={() => setSelectedIds(new Set())}>Cancel</Button>
                            
                            <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-10 px-6 border border-border-main hover:border-primary/30 text-text-muted hover:text-text-main font-black text-[10px] tracking-widest uppercase"
                                onClick={() => setShowBulkStatus(true)} 
                                icon={Activity}
                            >
                                Change Status
                            </Button>

                            <Button 
                                variant="primary" 
                                size="sm"
                                className="h-10 px-6 shadow-primary font-black text-[10px] tracking-widest uppercase"
                                onClick={() => setShowBulkHandover(true)} 
                                icon={ArrowRightLeft}
                            >
                                Transfer / Handover
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showImport && (
                <ImportModal
                    title="Import Assets"
                    endpoint="/assets/import"
                    templateEndpoint="/assets/import-template"
                    context={filters.status}
                    onClose={() => setShowImport(false)}
                    onDone={() => { setShowImport(false); fetchAssets() }}
                />
            )}

            {showBulkHandover && (
                <BulkHandoverModal
                    assets={assets.filter(a => selectedIds.has(a.asset_id))}
                    onClose={() => setShowBulkHandover(false)}
                    onDone={() => {
                        setShowBulkHandover(false)
                        setSelectedIds(new Set())
                        fetchAssets()
                    }}
                />
            )}

            {showBulkStatus && (
                <BulkStatusModal
                    assets={assets.filter(a => selectedIds.has(a.asset_id))}
                    onClose={() => setShowBulkStatus(false)}
                    onDone={() => {
                        setShowBulkStatus(false)
                        setSelectedIds(new Set())
                        fetchAssets()
                    }}
                />
            )}
        </div>
    )
}

