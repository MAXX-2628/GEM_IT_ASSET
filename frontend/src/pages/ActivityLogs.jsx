import { useState, useEffect, useCallback } from 'react'
import { History, Search, RefreshCw, FileText, User, Calendar as CalendarIcon, Tag, Terminal, ChevronLeft, ChevronRight, Hash, Activity, Filter, Clock, Database, Zap, Cpu, Shield, AlertTriangle } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import DateRangeFilter from '../components/DateRangeFilter'
import { PageHeader, Card, CardHeader, CardBody, Table, THead, TBody, TR, TH, TD, Badge, Button, SearchInput, Select, Counter } from '../components/ui'

export default function ActivityLogs() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [pages, setPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        module: ''
    })

    const fetchLogs = useCallback(async () => {
        setLoading(true)
        try {
            const params = { page, limit: 50, search, ...filters }
            const { data } = await api.get('/activities', { params })
            setLogs(data.data)
            setPages(data.pages)
            setTotal(data.total)
        } catch {
            toast.error('Failed to sync logs')
        } finally {
            setLoading(false)
        }
    }, [page, search, filters]) // Original: [page, search, filters] - Instruction: [page, limit, search, dateRange, statusFilter, actionFilter] - Sticking to original for now as other states are not defined.

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    const handleDateFilter = (range) => {
        setFilters(prev => ({ ...prev, ...range }))
        setPage(1)
    }

    const clearDateFilter = () => {
        setFilters(prev => ({ ...prev, startDate: '', endDate: '' }))
        setPage(1)
    }

    const getActionVariant = (action) => {
        const a = action?.toUpperCase()
        if (a === 'CREATE') return 'teal'
        if (a === 'UPDATE') return 'blue'
        if (a === 'DELETE' || a === 'SCRAP') return 'red'
        if (a === 'TRANSFER' || a === 'DEPLO') return 'orange'
        return 'slate'
    }

    const handleSearch = (value) => {
        setSearch(value);
        setPage(1);
    }

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="System Activity Logs"
                subtitle={
                    <div className="flex items-center gap-2 text-text-muted font-black uppercase tracking-widest text-[10px]">
                        <Terminal size={12} className="text-primary" />
                        <span>Real-time monitoring of system actions and changes</span>
                    </div>
                }
                actions={
                    <Button variant="ghost" size="md" onClick={fetchLogs} icon={RefreshCw} className="border border-border-main hover:text-text-main font-black text-[10px] tracking-widest uppercase">
                        Refresh Logs
                    </Button>
                }
            />

            {/* Tactical Filter Terminal */}
            <Card className="glass border-border-main relative z-20 overflow-visible animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardBody className="p-6">
                    <div className="flex flex-col xl:flex-row gap-6 items-center justify-between">
                        <div className="flex-1 w-full max-w-xl">
                            <SearchInput
                                placeholder="Search logs by keyword..."
                                value={search}
                                onChange={e => handleSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                            <div className="flex items-center gap-3 px-4 py-2 bg-neutral-subtle border border-border-main rounded-xl">
                                <Filter size={14} className="text-primary" />
                                <Select
                                    value={filters.module}
                                    onChange={e => { setFilters(prev => ({ ...prev, module: e.target.value })); setPage(1); }}
                                    className="bg-transparent border-none p-0 h-auto text-[10px] font-black uppercase tracking-widest min-w-[140px]"
                                >
                                    <option value="">All Modules</option>
                                    <option value="Assets">Assets</option>
                                    <option value="Tickets">Tickets</option>
                                    <option value="PM">PM</option>
                                    <option value="Licenses">Licenses</option>
                                    <option value="Handover">Handover</option>
                                </Select>
                            </div>
                            
                            <DateRangeFilter
                                onFilter={handleDateFilter}
                                onClear={clearDateFilter}
                            />

                            <div className="h-11 px-6 flex flex-col justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-primary">
                                <span className="text-[7px] font-black text-primary/50 uppercase tracking-widest leading-none mb-1">Total Logs</span>
                                <span className="text-xs font-black text-primary tracking-tighter leading-none"><Counter target={total} /></span>
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card className="glass border-border-main overflow-hidden">
                <CardBody className="p-0 min-h-[600px]">
                    <div className="overflow-x-auto">
                        <Table className="min-w-[1100px]">
                            <THead>
                                <TR>
                                    <TH className="uppercase tracking-widest text-[9px]">#</TH>
                                    <TH className="uppercase tracking-widest text-[9px]">Date & Time</TH>
                                    <TH className="uppercase tracking-widest text-[9px]">User</TH>
                                    <TH className="uppercase tracking-widest text-[9px]">Action</TH>
                                    <TH className="uppercase tracking-widest text-[9px]">Module</TH>
                                    <TH className="pr-10 uppercase tracking-widest text-[9px]">Details</TH>
                                </TR>
                            </THead>
                            <TBody>
                                {loading ? (
                                    <TR>
                                        <TD colSpan={6} className="py-40 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-4">
                                                <div className="relative">
                                                    <div className="w-12 h-12 border-2 border-border-main border-t-primary rounded-full animate-spin" />
                                                    <Database size={20} className="absolute inset-x-0 mx-auto top-1/2 -translate-y-1/2 text-primary/30" />
                                                </div>
                                                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] leading-loose animate-pulse">Syncing log stream...</p>
                                            </div>
                                        </TD>
                                    </TR>
                                ) : logs.length === 0 ? (
                                    <TR>
                                        <TD colSpan={6} className="py-40 text-center px-6">
                                            <div className="flex flex-col items-center justify-center py-40 text-center px-6 glass rounded-2xl border border-border-main">
                                                <div className="p-8 rounded-[2rem] bg-neutral-subtle text-text-muted mb-8 ring-1 ring-border-main shadow-inner">
                                                    <Activity size={60} />
                                                </div>
                                                <h3 className="text-lg font-black text-text-main uppercase tracking-widest mb-2">No Logs Found</h3>
                                                <p className="text-text-muted max-w-sm text-[10px] font-black uppercase tracking-widest leading-loose mb-8">
                                                    No system activity logs identified for the current filter criteria.
                                                </p>
                                            </div>
                                        </TD>
                                    </TR>
                                ) : logs.map((log, idx) => (
                                    <TR key={log._id} className="border-border-main group">
                                        <TD>
                                            <code className="text-[10px] font-black text-text-muted group-hover:text-primary transition-colors tracking-tighter tabular-nums">
                                                {((page - 1) * 50 + idx + 1).toString().padStart(4, '0')}
                                            </code>
                                        </TD>
                                        <TD>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2 text-[10px] font-black text-text-main uppercase tracking-widest">
                                                    <CalendarIcon size={12} className="text-primary/50" />
                                                    {new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className="flex items-center gap-2 text-[9px] font-black text-text-muted uppercase tracking-[0.2em] ml-5">
                                                    <Clock size={10} />
                                                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                                                </div>
                                            </div>
                                        </TD>
                                        <TD>
                                            <div className="flex items-center gap-4">
                                                <div className="h-9 w-9 rounded-xl bg-neutral-subtle border border-border-main flex items-center justify-center text-[10px] font-black text-text-main shadow-inner group-hover:border-primary/30 transition-all">
                                                    {log.user?.slice(0, 2).toUpperCase() || 'SY'}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[11px] font-black text-text-main uppercase tracking-tight group-hover:text-primary transition-colors leading-none">{log.user || 'SYSTEM_DAEMON'}</p>
                                                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest leading-none">NODE_ID: {log.user_id?.slice(-6).toUpperCase() || 'ROOT_AUTH'}</p>
                                                </div>
                                            </div>
                                        </TD>
                                        <TD>
                                            <Badge variant={getActionVariant(log.action)} className="px-3 py-1 text-[8px] font-black uppercase tracking-widest">
                                                {log.action?.toUpperCase()}
                                            </Badge>
                                        </TD>
                                        <TD>
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/30 group-hover:bg-primary transition-colors shadow-primary" />
                                                <code className="text-[10px] font-black text-primary tracking-wider font-mono">
                                                    {log.target_id || 'GLOBAL_SCOPE'}
                                                </code>
                                            </div>
                                        </TD>
                                        <TD className="pr-10">
                                            <p className="text-[10px] font-black text-text-muted uppercase tracking-tight group-hover:text-text-main transition-colors leading-relaxed line-clamp-2" title={log.details}>
                                                {log.details || 'NO_EVENT_ARTIFACTS'}
                                            </p>
                                        </TD>
                                    </TR>
                                ))}
                            </TBody>
                        </Table>
                    </div>
                </CardBody>

                {total > 0 && (
                    <div className="px-8 py-5 glass border-t border-border-main flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="text-[9px] font-black text-text-muted uppercase tracking-[0.3em]">
                            CHRONICLE_NODES: {((page - 1) * 50) + 1}—{Math.min(page * 50, total)} / {total}
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Page</span>
                                <div className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-xs font-mono font-black text-primary shadow-primary">
                                    {page} <span className="text-text-muted mx-1">/</span> {pages}
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
                                    disabled={page >= pages} 
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
        </div>
    )
}
