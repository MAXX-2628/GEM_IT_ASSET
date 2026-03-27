import { useState, useEffect } from 'react'
import { FileBarChart2, FileText, Printer, ShieldCheck, RefreshCw, Layers, Download, Database, LayoutGrid, Trash2, ChevronRight, FileDown, ShieldAlert, Terminal, Activity, Globe, Zap, Search } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import DateRangeFilter from '../components/DateRangeFilter'
import { PageHeader, Card, CardBody, Button, Select, Field, Badge } from '../components/ui'

export default function Reports() {
    const [dept, setDept] = useState('')
    const [type, setType] = useState('')
    const [deptList, setDeptList] = useState([])
    const [typeList, setTypeList] = useState([])
    const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' })

    useEffect(() => {
        api.get('/departments').then(r => setDeptList(r.data.data.map(d => d.name)))
        api.get('/types').then(r => setTypeList(r.data.data.map(t => t.name)))
    }, [])

    const download = async (path, filename) => {
        try {
            const res = await api.get(path, { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', filename || 'report')
            document.body.appendChild(link)
            link.click()
            link.remove()
            toast.success('Download started')
        } catch {
            toast.error('Report generation failed')
        }
    }

    const buildQuery = (statusOverride) => {
        const p = new URLSearchParams()
        if (dept) p.set('department', dept)
        if (type) p.set('asset_type', type)
        if (statusOverride && statusOverride !== 'None') p.set('status', statusOverride)
        if (dateRange.startDate) p.set('startDate', dateRange.startDate)
        if (dateRange.endDate) p.set('endDate', dateRange.endDate)
        return p.toString() ? '?' + p.toString() : ''
    }

    const reports = [
        {
            title: 'Asset Inventory Report',
            desc: 'Full list of all assets across the organization.',
            icon: Database,
            color: 'text-accent-blue',
            bg: 'bg-accent-blue/10',
            actions: [
                { label: 'Export Excel', type: 'excel', icon: FileText, path: () => `/reports/assets/excel${buildQuery('None')}` },
                { label: 'Download PDF', type: 'pdf', icon: FileDown, path: () => `/reports/assets/pdf${buildQuery('None')}` },
            ]
        },
        {
            title: 'Active Assets Report',
            desc: 'Report of assets currently in use or active.',
            icon: Layers,
            color: 'text-accent-teal',
            bg: 'bg-accent-teal/10',
            actions: [
                { label: 'Export Excel', type: 'excel', icon: FileText, path: () => `/reports/assets/excel${buildQuery('Live')}` },
                { label: 'Download PDF', type: 'pdf', icon: FileDown, path: () => `/reports/assets/pdf${buildQuery('Live')}` },
            ]
        },
        {
            title: 'Stock Inventory Report',
            desc: 'List of assets currently in stock and available for deployment.',
            icon: LayoutGrid,
            color: 'text-primary',
            bg: 'bg-primary/10',
            actions: [
                { label: 'Export Excel', type: 'excel', icon: FileText, path: () => `/reports/assets/excel${buildQuery('In Stock')}` },
                { label: 'Download PDF', type: 'pdf', icon: FileDown, path: () => `/reports/assets/pdf${buildQuery('In Stock')}` },
            ]
        },
        {
            title: 'Disposal & Scrap Report',
            desc: 'Archives of decommissioned, retired, or scrapped assets.',
            icon: Trash2,
            color: 'text-accent-red',
            bg: 'bg-accent-red/10',
            actions: [
                { label: 'Export Excel', type: 'excel', icon: FileText, path: () => `/reports/assets/excel${buildQuery('Scrap')}` },
                { label: 'Download PDF', type: 'pdf', icon: FileDown, path: () => `/reports/assets/pdf${buildQuery('Scrap')}` },
            ]
        },
        {
            title: 'Maintenance History Report',
            desc: 'Complete logs of all maintenance tasks and health checks.',
            icon: ShieldCheck,
            color: 'text-secondary',
            bg: 'bg-secondary/10',
            actions: [
                { label: 'Download PDF', type: 'pdf', icon: FileDown, path: () => `/reports/pm/history${buildQuery()}` },
            ]
        },
        {
            title: 'Software License Report',
            desc: 'Detailed tracking of software licenses and expirations.',
            icon: FileBarChart2,
            color: 'text-accent-blue',
            bg: 'bg-accent-blue/10',
            actions: [
                { label: 'Download PDF', type: 'pdf', icon: FileDown, path: () => `/reports/licenses/excel` },
            ]
        }
    ]

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Reports & Analytics"
                subtitle={
                    <div className="flex items-center gap-2 text-text-muted font-black uppercase tracking-widest text-[10px]">
                        <Activity size={12} className="text-primary" />
                        <span>Generate detailed reports and audit logs for asset management.</span>
                    </div>
                }
                actions={
                    <Button variant="ghost" onClick={() => window.location.reload()} icon={RefreshCw} className="h-11 border-border-main font-black text-[10px] tracking-widest ">
                        Refresh Data
                    </Button>
                }
            />

            <Card className="glass border-border-main relative z-20 overflow-visible">
                <CardBody className="p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                            <Terminal size={20} />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-text-main uppercase tracking-widest leading-none">Report Parameters</h3>
                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mt-1">Filter and refine report data</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Field label="Department">
                            <Select value={dept} onChange={e => setDept(e.target.value)} icon={Globe} className="uppercase font-black text-xs">
                                <option value="">All Departments</option>
                                {deptList.map(d => <option key={d} value={d}>{d}</option>)}
                            </Select>
                        </Field>
                        <Field label="Asset Type">
                            <Select value={type} onChange={e => setType(e.target.value)} icon={LayoutGrid} className="uppercase font-black text-xs">
                                <option value="">All Asset Categories</option>
                                {typeList.map(t => <option key={t} value={t}>{t}</option>)}
                            </Select>
                        </Field>
                        <Field label="Date Range">
                            <DateRangeFilter
                                onFilter={(range) => setDateRange(range)}
                                onClear={() => setDateRange({ startDate: '', endDate: '' })}
                            />
                        </Field>
                    </div>
                </CardBody>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {reports.map(r => (
                    <Card key={r.title} className="glass border-border-main group hover:border-primary/30 transition-all duration-500 hover:shadow-primary">
                        <CardBody className="p-8 space-y-8">
                            <div className="flex items-start justify-between">
                                <div className={`h-14 w-14 rounded-[2rem] ${r.bg} ${r.color} flex items-center justify-center border border-border-main transition-all duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                                    <r.icon size={28} />
                                </div>
                                <div className="h-8 w-8 rounded-full bg-neutral-subtle flex items-center justify-center text-text-muted group-hover:text-primary transition-colors">
                                    <ChevronRight size={16} />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-xs font-black text-text-main uppercase tracking-widest group-hover:text-primary transition-colors">{r.title}</h3>
                                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest leading-relaxed line-clamp-2">{r.desc}</p>
                            </div>

                            <div className="flex flex-wrap gap-3 pt-2">
                                {r.actions.map(a => (
                                    <Button
                                        key={a.label}
                                        variant={a.type === 'pdf' ? 'primary' : 'secondary'}
                                        size="sm"
                                        onClick={() => download(a.path(), `${r.title.replace(/\s+/g, '_')}_${Date.now()}.${a.type === 'excel' ? 'xlsx' : 'pdf'}`)}
                                        icon={a.icon}
                                        className={`text-[9px] font-black uppercase tracking-widest h-9 px-4 ${
                                            a.type === 'pdf' 
                                            ? 'shadow-primary' 
                                            : 'border-border-main hover:bg-neutral-subtle'
                                        }`}
                                    >
                                        {a.label}
                                    </Button>
                                ))}
                            </div>
                        </CardBody>
                    </Card>
                ))}

                <Card className="md:col-span-2 xl:col-span-3 glass border-border-main border-dashed relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/[0.02] pointer-events-none" />
                    <CardBody className="p-10 flex flex-col xl:flex-row items-center justify-between gap-10">
                        <div className="flex items-center gap-8 relative">
                            <div className="h-20 w-20 rounded-3xl bg-neutral-subtle border border-border-main shadow-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                                <Printer size={36} />
                                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-lg font-black text-text-main uppercase tracking-tighter transition-colors group-hover:text-primary">Bulk Asset Labels</h3>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest max-w-2xl leading-relaxed">
                                    Generate multiple QR code labels for physical asset identification and tracking.
                                </p>
                                <div className="flex items-center gap-6 pt-2">
                                    <div className="flex items-center gap-2 text-[9px] font-black text-text-muted uppercase tracking-widest">
                                        <div className="h-2 w-2 rounded-full bg-primary shadow-primary" />
                                        Standard A4 Calibration
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] font-black text-text-muted uppercase tracking-widest">
                                        <div className="h-2 w-2 rounded-full bg-primary/30" />
                                        100% Vector Scale
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] font-black text-text-muted uppercase tracking-widest">
                                        <div className="h-2 w-2 rounded-full bg-primary/10" />
                                        Durable Printing
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={() => download(`/reports/assets/bulk-labels${buildQuery()}`, `Asset_Labels_${Date.now()}.pdf`)}
                            icon={Zap}
                            className="shadow-primary px-10 h-14 font-black text-[10px] tracking-[0.2em] relative z-10"
                        >
                            Generate Labels
                        </Button>
                    </CardBody>
                </Card>
            </div>

            <div className="glass border-border-main bg-primary/5 rounded-3xl p-10 flex items-center gap-10 group overflow-hidden relative">
                <div className="absolute -right-16 -top-16 text-primary/5 rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-all duration-1000">
                    <ShieldCheck size={240} />
                </div>
                <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/20 shadow-primary">
                    <ShieldCheck size={32} />
                </div>
                <div className="space-y-3 relative">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Report Verification & Compliance</h4>
                    <p className="text-xs font-black text-text-muted uppercase leading-relaxed tracking-widest max-w-4xl">
                        All reports generated are verified by the system and include audit metadata to ensure transparency and regulatory compliance.
                    </p>
                </div>
            </div>
        </div>
    )
}

