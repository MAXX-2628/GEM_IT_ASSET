import { useState, useEffect, useCallback } from 'react'
import { Plus, CheckCircle2, Search, ExternalLink, User, Calendar, HardDrive, Eye, ShieldCheck, History, Camera, PenTool, RefreshCw, ChevronLeft, ChevronRight, FileText, ClipboardCheck, ArrowUpRight, Fingerprint, Terminal, Shield, Activity, Zap } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import DateRangeFilter from '../components/DateRangeFilter'
import HandoverDetailModal from '../components/HandoverDetailModal'
import { PageHeader, Card, CardBody, Table, THead, TBody, TR, TH, TD, Badge, Button, SearchInput, Select, CardHeader } from '../components/ui'

export default function HandoverList() {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' })
    const [selectedHandover, setSelectedHandover] = useState(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const params = { search, page, limit: 50, ...dateRange }
            const { data: res } = await api.get('/handovers', { params })
            setData(res.data)
            setTotalPages(res.pages)
            setTotal(res.total || res.data.length)
        } catch {
            toast.error("Failed to load handover records")
        } finally { setLoading(false) }
    }, [search, page, dateRange])

    useEffect(() => {
        const timer = setTimeout(fetchData, 300)
        return () => clearTimeout(timer)
    }, [fetchData])

    const handleSearch = (value) => {
        setSearch(value);
        setPage(1);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this log entry?')) return
        try {
            await api.delete(`/handovers/${id}`)
            toast.success('Log entry deleted')
            fetchData()
        } catch { toast.error('Delete failed') }
    }

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Asset Handover Logs"
                subtitle={
                    <div className="flex items-center gap-2 text-text-muted font-black uppercase tracking-widest text-[10px]">
                        <Terminal size={12} className="text-primary" />
                        <span>Tracking asset transfers and custody changes</span>
                    </div>
                }
            />

            {/* Premium Filter Hub */}
            <Card className="glass border-border-main relative z-20 overflow-visible animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardBody className="p-6">
                    <div className="flex flex-col xl:flex-row gap-6 items-center justify-between">
                        <div className="flex flex-1 items-center gap-6 w-full">
                            <div className="flex-1 max-w-xl">
                                <SearchInput
                                    placeholder="Search by asset ID or user..."
                                    value={search}
                                    onChange={e => handleSearch(e.target.value)}
                                />
                            </div>
                            <div className="h-10 w-px bg-border-main hidden xl:block" />
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <span className="text-[7px] font-black text-text-muted uppercase tracking-widest mb-1">TOTAL_LOGS</span>
                                    <span className="text-xs font-black text-primary tracking-tighter shadow-sm">{total} RECORDS</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                            <DateRangeFilter
                                onFilter={(range) => setDateRange(range)}
                                onClear={() => setDateRange({ startDate: '', endDate: '' })}
                            />
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card className="glass border-border-main relative z-10 overflow-hidden">
                <CardBody className="p-0 min-h-[500px]">
                    {loading ? (
                        <div className="py-40 flex flex-col items-center justify-center space-y-4">
                            <div className="relative">
                                <div className="w-12 h-12 border-2 border-border-main border-t-primary rounded-full animate-spin" />
                                <Fingerprint size={20} className="absolute inset-x-0 mx-auto top-1/2 -translate-y-1/2 text-primary/30" />
                            </div>
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] leading-loose animate-pulse">Syncing log list...</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-40 text-center px-6 glass rounded-2xl border border-border-main">
                            <div className="p-8 rounded-[2rem] bg-neutral-subtle text-text-muted mb-8 ring-1 ring-border-main shadow-inner">
                                <History size={60} />
                            </div>
                            <h3 className="text-lg font-black text-text-main uppercase tracking-widest mb-2">Logs Empty</h3>
                            <p className="text-text-muted max-w-sm text-[10px] font-black uppercase tracking-widest leading-loose mb-8">
                                No asset handover records found.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-[1000px]">
                                <THead>
                                    <TR>
                                        <TH className="pl-10 uppercase tracking-widest text-[9px]">Asset Details</TH>
                                        <TH className="uppercase tracking-widest text-[9px]">Recipient</TH>
                                        <TH className="uppercase tracking-widest text-[9px]">VERIFICATION_STATUS</TH>
                                        <TH className="uppercase tracking-widest text-[9px]">Handed Over By</TH>
                                        <TH className="uppercase tracking-widest text-[9px]">Date</TH>
                                        <TH className="text-right pr-10 uppercase tracking-widest text-[9px]">Action</TH>
                                    </TR>
                                </THead>
                                <TBody>
                                    {data.map((item) => (
                                        <TR key={item._id} hover onClick={() => setSelectedHandover(item)} className="border-border-main group">
                                            <TD className="pl-10">
                                                <div 
                                                    className="flex items-center gap-2 group/link"
                                                    onClick={(e) => { e.stopPropagation(); window.open(`/assets/${item.asset_id}`, '_blank') }}
                                                >
                                                    <code className="text-[11px] font-black text-primary group-hover/link:text-primary-hover underline decoration-primary/30 underline-offset-4 decoration-dashed transition-all cursor-pointer">
                                                        {item.asset_id}
                                                    </code>
                                                    <ArrowUpRight size={10} className="text-primary/50 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                                                </div>
                                            </TD>
                                            <TD>
                                                <div className="space-y-1.5">
                                                    <p className="text-[11px] font-black text-text-main uppercase tracking-tight group-hover:text-primary transition-colors">
                                                        {item.recipient_name}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={item.recipient_type === 'IT' ? 'blue' : 'gray'} className="text-[8px] px-2 py-0 h-4 uppercase font-black tracking-widest">
                                                            {item.recipient_type}
                                                        </Badge>
                                                        <span className="text-[9px] font-black text-text-muted uppercase tracking-widest truncate max-w-[120px]">
                                                            {item.recipient_details || 'GENERAL_ACCESS'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TD>
                                            <TD>
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-lg border transition-all duration-300 ${item.signature_path ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-neutral-subtle border-border-main text-text-muted'}`} title="SIGNATURE_CAPTURED">
                                                        <PenTool size={14} />
                                                    </div>
                                                    <div className={`p-1.5 rounded-lg border transition-all duration-300 ${item.photo_path ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-neutral-subtle border-border-main text-text-muted'}`} title="BIOMETRIC_EVIDENCE_CAPTURED">
                                                        <Camera size={14} />
                                                    </div>
                                                </div>
                                            </TD>
                                            <TD>
                                                <div className="flex items-center gap-2.5 text-text-muted">
                                                    <div className="w-6 h-6 rounded-lg bg-neutral-subtle border border-border-main flex items-center justify-center text-[10px] font-black text-text-muted">
                                                        {item.handed_over_by?.charAt(0) || 'A'}
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-text-main transition-colors">{item.handed_over_by}</span>
                                                </div>
                                            </TD>
                                            <TD>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-text-main tabular-nums leading-none">
                                                        {new Date(item.handover_date).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-[8px] font-black text-text-muted uppercase tracking-[0.2em] leading-none">AUDIT_ARCHIVED</p>
                                                </div>
                                            </TD>
                                            <TD className="pr-10 text-right">
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-text-muted hover:text-primary transition-all opacity-0 group-hover:opacity-100">
                                                    <Eye size={16} />
                                                </Button>
                                            </TD>
                                        </TR>
                                    ))}
                                </TBody>
                            </Table>
                        </div>
                    )}
                </CardBody>

                {total > 0 && (
                    <div className="px-8 py-5 glass border-t border-border-main flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <Select
                                value={50} // Assuming 50 is the default limit
                                onChange={(e) => { /* setLimit(Number(e.target.value)); setPage(1); */ }}
                                className="w-[120px]"
                            >
                                <option value={20}>20 Rows</option>
                                <option value={50}>50 Rows</option>
                                <option value={100}>100 Rows</option>
                            </Select>
                            <div className="flex flex-col">
                                <span className="text-[7px] font-black text-text-muted uppercase tracking-widest mb-1">Total Entries</span>
                                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{total} Logs</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Page</span>
                                <div className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-xs font-mono font-black text-primary shadow-primary">
                                    {page} <span className="text-text-muted mx-1">/</span> {totalPages}
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
                                    disabled={page >= totalPages} 
                                    onClick={() => setPage(p => p + 1)} 
                                    className="h-10 w-10 border border-border-main hover:bg-neutral-subtle"
                                >
                                    <ChevronRight size={18} />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {selectedHandover && (
                <HandoverDetailModal
                    handover={selectedHandover}
                    onClose={() => setSelectedHandover(null)}
                />
            )}
        </div>
    )
}
