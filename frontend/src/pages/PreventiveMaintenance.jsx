import React, { useEffect, useState, useCallback, useRef, Fragment } from 'react'
import {
    Plus, CheckCircle2, AlertCircle, Clock, FileText, Settings, X, Search, Calendar, Filter,
    ChevronRight, CheckCircle, Activity, RefreshCw, TrendingUp, ShieldCheck, Box, User, ClipboardCheck, ChevronLeft,
    Zap, Database, Binary, ShieldAlert, Cpu, Wrench, ChevronUp, ChevronDown, FileCheck, Trash2, ArrowLeft, ArrowRight, ClipboardList, Camera, BookOpen, History, Terminal
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Card, CardBody, Button, Badge, Table, THead, TBody, TR, TH, TD, Modal, Input, Select, Textarea, PageHeader, Counter, SearchInput, Field } from '../components/ui'

const FREQUENCIES = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly']

export default function PreventiveMaintenance() {
    const [tab, setTab] = useState('dashboard')
    const [templates, setTemplates] = useState([])
    const [schedules, setSchedules] = useState([])
    const [policies, setPolicies] = useState([])
    const [assetTypes, setAssetTypes] = useState([])
    const [loading, setLoading] = useState(true)
    const [schTab, setSchTab] = useState('tasks')
    const [typeFilter, setTypeFilter] = useState('')
    const [taskSearch, setTaskSearch] = useState('')
    const [historyData, setHistoryData] = useState([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [expandedHistory, setExpandedHistory] = useState(null)
    const [showTplModal, setShowTplModal] = useState(false)
    const [showSchModal, setShowSchModal] = useState(false)
    const [showDoneModal, setShowDoneModal] = useState(false)
    const [pmStep, setPmStep] = useState(1)
    const [tplForm, setTplForm] = useState({ name: '', checklist: [{ task: '' }] })
    const [schForm, setSchForm] = useState({ asset_type: '', template_id: '', frequency: 'Quarterly', start_date: new Date().toISOString().split('T')[0] })
    const [doneForm, setDoneForm] = useState({ schedule_id: '', asset_id: '', engineer_name: '', checklist_results: [], remarks: '' })
    const [proofs, setProofs] = useState([])
    const [editingSch, setEditingSch] = useState(null)
    const [saving, setSaving] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [tRes, sRes, typesRes] = await Promise.all([
                api.get('/pm/templates'),
                api.get('/pm/schedules'),
                api.get('/types')
            ])
            setTemplates(tRes.data.data); setSchedules(sRes.data.data.tasks || []); setPolicies(sRes.data.data.policies || []);
            setAssetTypes(typesRes.data.data.map(t => t.name))
        } catch { toast.error('PROTOCOL_SYNC_FAILED') }
        finally { setLoading(false) }
    }, [])

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true)
        try {
            const { data: res } = await api.get('/pm/history')
            setHistoryData(res.data)
        } catch { toast.error('HISTORY_SYNC_FAILED') }
        finally { setHistoryLoading(false) }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])
    useEffect(() => { if (tab === 'history' || tab === 'dashboard') fetchHistory() }, [fetchHistory, tab])

    const getStatus = (dueDate) => {
        if (!dueDate) return { label: 'EXPECTED', color: 'info', icon: Calendar }
        const diff = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24))
        if (diff < 0) return { label: 'OVERDUE', color: 'danger', icon: ShieldAlert }
        if (diff <= 7) return { label: 'CRITICAL_WINDOW', color: 'warning', icon: Clock }
        return { label: 'STABLE', color: 'info', icon: ShieldCheck }
    }

    const handleComplete = async (e) => {
        e.preventDefault(); if (proofs.length === 0) return toast.error('VALIDATION_ARTIFACT_REQUIRED')
        setSaving(true); const formData = new FormData()
        formData.append('data', JSON.stringify(doneForm))
        proofs.forEach(file => formData.append('attachments', file))
        try {
            await api.post('/pm/complete', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            toast.success('PM_PROTOCOL_SUCCESSFULLY_COMMITTED')
            setShowDoneModal(false); setPmStep(1); setProofs([]); fetchData(); fetchHistory()
        } catch { toast.error('TRANSACTION_SYNC_FAILED') }
        finally { setSaving(false) }
    }

    const stats = {
        overdue: schedules.filter(s => getStatus(s.next_due_date).label === 'OVERDUE').length,
        due: schedules.filter(s => getStatus(s.next_due_date).label === 'CRITICAL_WINDOW').length,
        total: schedules.length
    }

    const getWorkload = () => {
        const months = {}; const now = new Date()
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
            months[d.toLocaleString('default', { month: 'short' })] = 0
        }
        schedules.forEach(s => {
            if (!s.next_due_date) return
            const label = new Date(s.next_due_date).toLocaleString('default', { month: 'short' })
            if (months[label] !== undefined) months[label]++
        })
        return Object.entries(months).map(([name, count]) => ({ name, count }))
    }

    // Dummy data for the new layout
    const protocols = templates.map(t => ({
        id: t._id,
        name: t.name,
        category: 'General', // Assuming a default category
        items_count: t.checklist.length
    }));

    const logs = historyData.slice(0, 6).map(h => ({
        id: h._id,
        asset_name: h.asset_id,
        asset_id: h.asset_id, // Assuming asset_id is also the name for now
        protocol_name: h.template_id?.name || 'N/A',
        date: new Date(h.completed_date).toLocaleDateString(),
        status: 'Completed' // Assuming all history entries are completed
    }));

    const pendingJobs = schedules.map(s => {
        const status = getStatus(s.next_due_date);
        const dueDate = new Date(s.next_due_date);
        const today = new Date();
        const diffTime = Math.abs(dueDate.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            id: s._id,
            asset_name: s.asset_id,
            asset_id: s.asset_id,
            protocol_name: s.template_id?.name || 'GENERIC_PROTOCOL',
            due_date: dueDate.toLocaleDateString(),
            days_left: status.label === 'OVERDUE' ? -diffDays : diffDays,
            priority: status.label === 'OVERDUE' || status.label === 'CRITICAL_WINDOW' ? 'High' : 'Normal'
        };
    });


    const fetch = fetchData; // Alias for the new layout
    const openAdd = () => setShowSchModal(true); // Alias for the new layout

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Preventive Maintenance"
                subtitle={
                    <div className="flex items-center gap-2 text-text-muted font-black uppercase tracking-widest text-[10px]">
                        <Terminal size={12} className="text-primary" />
                        <span>Management of recurring equipment health checks and protocols</span>
                    </div>
                }
                actions={
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="md" onClick={fetch} icon={RefreshCw} className="border border-border-main hover:text-text-main font-black text-[10px] tracking-widest uppercase">
                            Refresh Data
                        </Button>
                        <Button variant="primary" size="md" onClick={openAdd} icon={Plus} className="shadow-primary px-8 font-black text-[10px] tracking-widest uppercase">
                            Schedule PM
                        </Button>
                    </div>
                }
            />

                <div className="flex p-2 gap-2 bg-neutral-subtle rounded-2xl border border-border-main">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: Activity, desc: 'Live Status' },
                        { id: 'schedules', label: 'Schedules', icon: Clock, desc: 'Maintenance Plans' },
                        { id: 'templates', label: 'Templates', icon: Settings, desc: 'Checklist Templates' },
                        { id: 'history', label: 'History', icon: FileText, desc: 'Activity Logs' },
                    ].map(t => {
                        const Icon = t.icon; const active = tab === t.id;
                        return (
                            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 min-w-[140px] flex flex-col items-start gap-1 px-5 py-4 rounded-xl transition-all duration-300 border ${active ? 'bg-primary/10 border-primary/50 shadow-primary' : 'bg-neutral-subtle border-transparent text-text-muted hover:bg-bg-card-elevated hover:text-text-main'}`}>
                                <div className="flex items-center gap-2">
                                    <Icon size={14} className={active ? 'text-primary' : 'text-text-muted'} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-text-main' : 'text-text-muted'}`}>{t.label}</span>
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-[0.2em] ml-5 leading-none ${active ? 'text-primary' : 'text-text-muted'}`}>{t.desc}</span>
                            </button>
                        )
                    })}
                </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40">
                    <div className="w-12 h-12 border-2 border-border-main border-t-primary rounded-full animate-spin mb-6" />
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] animate-pulse">Synchronizing Lifecycle Data...</p>
                </div>
            ) : (
                <>
                    {tab === 'dashboard' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { label: 'Overdue Tasks', value: stats.overdue, icon: ShieldAlert, color: 'text-accent-red', bg: 'bg-accent-red/10', sub: 'Immediate attention required' },
                                    { label: 'Due Soon', value: stats.due, icon: Clock, color: 'text-primary', bg: 'bg-primary/10', sub: 'Next 7 day window' },
                                    { label: 'Active Schedules', value: stats.total, icon: FileCheck, color: 'text-secondary', bg: 'bg-secondary/10', sub: 'Recurring plans active' },
                                ].map(s => (
                                    <Card key={s.label} className="glass border-border-main group hover:border-primary/30 transition-all">
                                        <CardBody className="p-8">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{s.label}</p>
                                                    <div className="text-4xl font-black text-text-main tracking-tighter"><Counter value={s.value} /></div>
                                                    <p className={`text-[8px] font-black uppercase tracking-widest ${s.color}`}>{s.sub}</p>
                                                </div>
                                                <div className={`h-16 w-16 rounded-[2rem] ${s.bg} ${s.color} flex items-center justify-center border border-border-main group-hover:scale-110 transition-transform`}>
                                                    <s.icon size={32} />
                                                </div>
                                            </div>
                                        </CardBody>
                                    </Card>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <Card className="glass border-border-main">
                                    <div className="px-8 py-6 border-b border-border-main flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20"><TrendingUp size={20} /></div>
                                            <div>
                                                <h3 className="text-xs font-black text-text-main uppercase tracking-widest">Maintenance Workload</h3>
                                                <p className="text-[9px] font-black text-text-muted uppercase mt-1">6-month forecast</p>
                                            </div>
                                        </div>
                                    </div>
                                    <CardBody className="p-8 h-[350px]">
                                        <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={350}>
                                            <AreaChart data={getWorkload()}>
                                                <defs><linearGradient id="col" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/><stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient></defs>
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: 'var(--text-muted)' }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: 'var(--text-muted)' }} />
                                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '1rem', color: 'var(--text-main)' }} />
                                                <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#col)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </CardBody>
                                </Card>

                                <Card className="glass border-border-main">
                                    <div className="px-8 py-6 border-b border-border-main flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-neutral-subtle text-text-muted rounded-2xl border border-border-main"><History size={20} /></div>
                                            <div>
                                                <h3 className="text-xs font-black text-text-main uppercase tracking-widest">Recent Activity</h3>
                                                <p className="text-[9px] font-black text-text-muted uppercase mt-1">Latest completed tasks</p>
                                            </div>
                                        </div>
                                    </div>
                                    <CardBody className="p-0 overflow-y-auto max-h-[350px]">
                                        <Table>
                                            <TBody>
                                                {historyData.slice(0, 6).map(h => (
                                                    <TR key={h._id} className="border-border-main group">
                                                        <TD className="pl-8">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-primary group-hover:shadow-primary transition-all" />
                                                                <span className="text-[10px] font-black text-text-main uppercase tracking-tight group-hover:text-primary">{h.asset_id}</span>
                                                            </div>
                                                        </TD>
                                                        <TD>
                                                            <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">{new Date(h.completed_date).toLocaleDateString()}</div>
                                                        </TD>
                                                        <TD className="pr-8 text-right">
                                                            <div className="flex items-center justify-end gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest">
                                                                <User size={12} className="text-primary/50" /> {h.engineer_name}
                                                            </div>
                                                        </TD>
                                                    </TR>
                                                ))}
                                            </TBody>
                                        </Table>
                                    </CardBody>
                                </Card>
                            </div>
                        </div>
                    )}

                    {tab === 'schedules' && (
                        <div className="space-y-8">
                            <div className="flex p-1.5 bg-neutral-subtle rounded-2xl border border-border-main w-fit">
                                {[{ id: 'tasks', label: 'Upcoming Tasks', icon: Clock }, { id: 'policies', label: 'Active Schedules', icon: ShieldCheck }].map(t => (
                                    <button key={t.id} onClick={() => setSchTab(t.id)} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${schTab === t.id ? 'bg-primary text-text-on-primary shadow-primary' : 'text-text-muted hover:text-text-main'}`}>{t.label}</button>
                                ))}
                            </div>

                            {schTab === 'tasks' ? (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    {(schedules || []).map(s => {
                                        const st = getStatus(s.next_due_date)
                                        return (
                                            <Card key={s._id} className="glass border-border-main group hover:border-primary/30 transition-all">
                                                <CardBody className="p-6 flex items-center justify-between gap-6">
                                                    <div className="flex items-center gap-5">
                                                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ring-1 border bg-neutral-subtle group-hover:scale-110 transition-transform ${st.color === 'danger' ? 'border-accent-red/30 text-accent-red ring-accent-red/10' : st.color === 'warning' ? 'border-primary/30 text-primary ring-primary/10' : 'border-accent-blue/30 text-accent-blue ring-accent-blue/10'}`}>
                                                            <st.icon size={28} />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-sm font-black text-text-main uppercase tracking-tight group-hover:text-primary">{s.asset_id}</span>
                                                                <Badge variant={st.color} className="text-[8px] font-black lowercase tracking-widest">{st.label}</Badge>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[9px] font-black text-text-muted uppercase tracking-widest">
                                                                <Settings size={12} /> {s.template_id?.name || 'GENERIC_PROTOCOL'} <span className="opacity-20 mx-1">/</span> <RefreshCw size={12} /> {s.frequency}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-3">
                                                        <div className="text-right">
                                                            <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">Target Date</p>
                                                            <div className="text-[10px] font-black text-text-main tracking-widest">{new Date(s.next_due_date).toLocaleDateString()}</div>
                                                        </div>
                                                        <Button variant="primary" size="sm" onClick={() => { setDoneForm({ schedule_id: s.policy_id || s._id, asset_id: s.asset_id, engineer_name: s.engineer_default || '', checklist_results: templates.find(t => t._id === (s.template_id?._id || s.template_id))?.checklist.map(c => ({ task: c.task, status: false })) || [], remarks: '' }); setProofs([]); setPmStep(1); setShowDoneModal(true) }} icon={ClipboardCheck} className="h-9 px-4 font-black text-[9px] uppercase tracking-widest shadow-primary">Start Task</Button>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        )
                                    })}
                                </div>
                            ) : (
                                <Card className="glass border-border-main overflow-hidden">
                                    <Table>
                                        <THead><TR><TH className="pl-8">Asset Type</TH><TH>Template</TH><TH>Frequency</TH><TH>Status</TH><TH className="pr-8 text-right">Actions</TH></TR></THead>
                                        <TBody>
                                            {policies.map(p => (
                                                <TR key={p._id} className="border-border-main group">
                                                    <TD className="pl-8"><span className="text-[10px] font-black text-text-main uppercase group-hover:text-primary">{p.asset_type}</span></TD>
                                                    <TD><span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{p.template_id?.name || '-'}</span></TD>
                                                    <TD><Badge variant="outline" className="text-[8px] font-black">{p.frequency}</Badge></TD>
                                                    <TD><div className={`w-2 h-2 rounded-full ${p.status === 'Active' ? 'bg-accent-teal shadow-primary' : 'bg-neutral-border'}`} /></TD>
                                                    <TD className="pr-8 text-right"><Button variant="ghost" size="icon" onClick={() => { setEditingSch(p); setSchForm({ asset_type: p.asset_type, template_id: p.template_id?._id || p.template_id, frequency: p.frequency, start_date: p.start_date?.split('T')[0] || '' }); setShowSchModal(true) }} icon={Settings} className="h-8 w-8 text-text-muted hover:text-primary" /></TD>
                                                </TR>
                                            ))}
                                        </TBody>
                                    </Table>
                                </Card>
                            )}
                        </div>
                    )}

                    {tab === 'templates' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {templates.map(tpl => (
                                <Card key={tpl._id} className="glass border-border-main group relative overflow-hidden">
                                    <div className="px-6 py-5 border-b border-border-main bg-neutral-subtle flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center"><Binary size={20} /></div>
                                            <h4 className="text-[10px] font-black text-text-main uppercase tracking-widest">{tpl.name}</h4>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => { setTplForm({ _id: tpl._id, name: tpl.name, checklist: tpl.checklist.map(c => ({ task: c.task })) }); setShowTplModal(true) }} icon={Settings} className="h-8 w-8 text-text-muted hover:text-primary" />
                                    </div>
                                    <CardBody className="p-6 space-y-4">
                                        {tpl.checklist.slice(0, 4).map((c, i) => (
                                            <div key={i} className="flex items-start gap-4">
                                                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/30" />
                                                <span className="text-[10px] font-black text-text-muted uppercase tracking-tight leading-relaxed">{c.task}</span>
                                            </div>
                                        ))}
                                        {tpl.checklist.length > 4 && <div className="text-[8px] font-black text-primary uppercase tracking-widest pl-5">+{tpl.checklist.length - 4} More Tasks</div>}
                                    </CardBody>
                                </Card>
                            ))}
                        </div>
                    )}

                    {tab === 'history' && (
                        <Card className="glass border-border-main overflow-hidden">
                            <Table>
                                <THead><TR><TH className="pl-8">Asset ID</TH><TH>Completion Date</TH><TH>Frequency</TH><TH>Technician</TH><TH className="pr-8 text-right">Details</TH></TR></THead>
                                <TBody>
                                    {historyData.map(h => (
                                        <Fragment key={h._id}>
                                            <TR className="border-border-main group">
                                                <TD className="pl-8"><span className="text-[10px] font-black text-text-main uppercase group-hover:text-primary">{h.asset_id}</span></TD>
                                                <TD><span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{new Date(h.completed_date).toLocaleDateString()}</span></TD>
                                                <TD><Badge variant="outline" className="text-[8px] font-black">{h.frequency?.toUpperCase()}</Badge></TD>
                                                <TD><div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase"><User size={12} /> {h.engineer_name}</div></TD>
                                                <TD className="pr-8 text-right"><Button variant="ghost" size="icon" onClick={() => setExpandedHistory(expandedHistory === h._id ? null : h._id)} icon={expandedHistory === h._id ? ChevronUp : ChevronDown} className="h-8 w-8 text-text-muted" /></TD>
                                            </TR>
                                            {expandedHistory === h._id && (
                                                <TR noHover className="bg-bg-card-elevated/30">
                                                    <TD colSpan={5} className="p-8">
                                                        <div className="grid grid-cols-2 gap-8 animate-in slide-in-from-top-4 duration-300">
                                                            <div className="space-y-4">
                                                                <h4 className="text-[9px] font-black text-text-main uppercase tracking-widest flex items-center gap-2"><ClipboardList size={14} className="text-primary" /> Task Checklist</h4>
                                                                <div className="space-y-2">
                                                                    {h.checklist_results?.map((c, i) => (
                                                                        <div key={i} className="flex items-center gap-3 p-3 bg-neutral-subtle rounded-xl border border-border-main">
                                                                            <CheckCircle size={14} className={c.status ? 'text-accent-teal' : 'text-text-muted'} />
                                                                            <span className="text-[10px] font-black text-text-muted uppercase tracking-tight">{c.task}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-6">
                                                                <div className="space-y-4">
                                                                    <h4 className="text-[9px] font-black text-text-main uppercase tracking-widest flex items-center gap-2"><Zap size={14} className="text-primary" /> Maintenance Remarks</h4>
                                                                    <div className="p-4 bg-neutral-subtle border border-border-main rounded-2xl italic text-[10px] text-text-muted uppercase font-black tracking-tight leading-relaxed">{h.remarks || 'No remarks provided'}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TD>
                                                </TR>
                                            )}
                                        </Fragment>
                                    ))}
                                </TBody>
                            </Table>
                        </Card>
                    )}
                </>
            )}

            {showDoneModal && (
                <Modal title="Complete Maintenance Task" onClose={() => setShowDoneModal(false)} size="lg">
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Progress</span>
                            <span className="text-[10px] font-black text-primary">Step {pmStep}/3</span>
                        </div>
                        <div className="h-1 bg-neutral-subtle rounded-full overflow-hidden flex gap-0.5">{[1, 2, 3].map(s => (<div key={s} className={`flex-1 transition-all duration-500 ${pmStep >= s ? 'bg-primary shadow-primary' : 'bg-neutral-border'}`} />))}</div>

                        <form onSubmit={handleComplete} className="space-y-8 min-h-[400px]">
                             {pmStep === 1 && (
                                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                    <Field label="Technician Name" required><Input placeholder="Enter your name..." value={doneForm.engineer_name} onChange={e => setDoneForm({ ...doneForm, engineer_name: e.target.value })} icon={User} className="uppercase font-black" /></Field>
                                    <div className="p-8 rounded-[2rem] bg-primary/10 border border-primary/20 text-text-main flex items-center gap-8 group">
                                        <div className="h-20 w-20 rounded-3xl bg-primary flex items-center justify-center shadow-primary group-hover:scale-110 transition-transform"><Cpu size={40} className="text-text-on-primary" /></div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Asset ID</span>
                                            <h4 className="text-3xl font-black tracking-tighter uppercase">{doneForm.asset_id}</h4>
                                        </div>
                                    </div>
                                </div>
                            )}

                             {pmStep === 2 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center justify-between"><h4 className="text-[10px] font-black text-text-main uppercase tracking-widest">Checklist Items</h4><Badge variant="primary" className="text-[8px]">{doneForm.checklist_results.filter(c => c.status).length}/{doneForm.checklist_results.length} Completed</Badge></div>
                                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                                        {doneForm.checklist_results.map((c, i) => (
                                            <div key={i} onClick={() => { const news = [...doneForm.checklist_results]; news[i].status = !news[i].status; setDoneForm({ ...doneForm, checklist_results: news }) }} className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${c.status ? 'bg-primary/10 border-primary/40 text-text-main' : 'bg-neutral-subtle border-border-main text-text-muted hover:border-text-muted'}`}>
                                                <div className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all ${c.status ? 'bg-primary shadow-primary scale-110' : 'bg-neutral-border'}`}>{c.status && <CheckCircle2 size={16} className="text-text-on-primary" />}</div>
                                                <span className="text-[10px] font-black uppercase tracking-tight">{c.task}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                             {pmStep === 3 && (
                                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                    <Field label="Maintenance Remarks"><Textarea rows={4} value={doneForm.remarks} onChange={e => setDoneForm({ ...doneForm, remarks: e.target.value })} placeholder="Describe any issues or work done..." className="bg-neutral-subtle text-[10px] font-black uppercase" /></Field>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between"><span className="text-[10px] font-black text-text-main uppercase tracking-widest">Supporting Photos/Files</span><span className="text-[9px] font-black text-text-muted uppercase">{proofs.length} Files Attached</span></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {proofs.map((p, i) => (
                                                <div key={i} className="flex items-center justify-between p-4 bg-neutral-subtle border border-border-main rounded-2xl group"><div className="flex items-center gap-3 overflow-hidden text-[9px] font-black text-text-muted uppercase"><FileText size={14} /> <span className="truncate">{p.name}</span></div><Button variant="ghost" size="icon" onClick={() => setProofs(proofs.filter((_, idx) => idx !== i))} icon={X} className="h-7 w-7 text-text-muted hover:text-accent-red" /></div>
                                            ))}
                                            <button type="button" onClick={() => document.getElementById('pm-up').click()} className="flex flex-col items-center justify-center gap-3 p-8 rounded-[2rem] border-2 border-dashed border-border-main hover:border-primary/40 hover:bg-primary/5 transition-all group">
                                                <div className="h-12 w-12 rounded-2xl bg-neutral-subtle flex items-center justify-center text-text-muted group-hover:text-primary group-hover:bg-primary/10 transition-all"><Plus size={24} /></div>
                                                <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] group-hover:text-primary">Upload File</span>
                                            </button>
                                            <input id="pm-up" type="file" hidden multiple onChange={e => setProofs([...proofs, ...Array.from(e.target.files)])} />
                                        </div>
                                    </div>
                                </div>
                            )}

                             <div className="pt-8 border-t border-border-main flex items-center justify-between">
                                 {pmStep > 1 ? <Button variant="ghost" onClick={() => setPmStep(s => s - 1)} icon={ArrowLeft} className="border-border-main font-black text-[10px]">Back</Button> : <div />}
                                 <div className="flex gap-4">
                                     <Button variant="ghost" onClick={() => setShowDoneModal(false)} className="border-border-main font-black text-[10px]">Cancel</Button>
                                     {pmStep < 3 ? <Button variant="primary" onClick={() => setPmStep(s => s + 1)} icon={ArrowRight} iconPosition="right" className="font-black text-[10px] shadow-primary">Next Step</Button> : <Button variant="primary" type="submit" loading={saving} icon={Zap} className="shadow-primary font-black text-[10px]">Finish & Save</Button>}
                                 </div>
                             </div>
                        </form>
                    </div>
                </Modal>
            )}

             {showTplModal && (
                <Modal title="New Checklist Template" onClose={() => setShowTplModal(false)} size="lg">
                    <form onSubmit={async (e) => { e.preventDefault(); if (tplForm._id) await api.put(`/pm/templates/${tplForm._id}`, tplForm); else await api.post('/pm/templates', tplForm); setShowTplModal(false); fetchData() }} className="space-y-8">
                        <Field label="Template Name" required><Input value={tplForm.name} onChange={e => setTplForm({ ...tplForm, name: e.target.value })} placeholder="E.g., Server Semi-Annual Maintenance..." className="uppercase font-black text-xs" /></Field>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-border-main pb-4"><h3 className="text-[10px] font-black text-text-main uppercase tracking-widest">Tasks / Steps</h3><Button variant="ghost" size="sm" onClick={() => setTplForm({ ...tplForm, checklist: [...tplForm.checklist, { task: '' }] })} icon={Plus} className="border-border-main text-[9px]">Add Task</Button></div>
                            <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
                                 {tplForm.checklist.map((c, i) => (
                                    <div key={i} className="flex gap-4 items-center animate-in slide-in-from-left-4 duration-300">
                                        <div className="w-10 h-10 rounded-xl bg-primary text-text-on-primary flex items-center justify-center font-black text-xs shadow-primary">{String(i + 1).padStart(2, '0')}</div>
                                        <Input value={c.task} onChange={e => { const nc = [...tplForm.checklist]; nc[i].task = e.target.value; setTplForm({ ...tplForm, checklist: nc }) }} placeholder="Enter task description..." className="flex-1 uppercase font-black text-[10px]" />
                                        <Button variant="ghost" size="icon" onClick={() => setTplForm({ ...tplForm, checklist: tplForm.checklist.filter((_, idx) => idx !== i) })} icon={X} className="text-text-muted hover:text-accent-red" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="pt-8 border-t border-border-main flex gap-4 justify-end"><Button variant="ghost" onClick={() => setShowTplModal(false)} className="border-border-main font-black text-[10px]">Cancel</Button><Button variant="primary" type="submit" className="font-black text-[10px] shadow-primary">Save Template</Button></div>
                    </form>
                </Modal>
            )}

             {showSchModal && (
                <Modal title="Create New Schedule" onClose={() => setShowSchModal(false)} size="md">
                    <form onSubmit={async (e) => { e.preventDefault(); if (editingSch) await api.put(`/pm/schedules/${editingSch._id}`, schForm); else await api.post('/pm/schedules', schForm); setShowSchModal(false); fetchData() }} className="space-y-8">
                        <Field label="Target Asset Type" required><Select value={schForm.asset_type} onChange={e => setSchForm({ ...schForm, asset_type: e.target.value })} icon={Box} className="uppercase font-black text-xs tracking-widest"><option value="">Select Category</option>{assetTypes.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}</Select></Field>
                        <Field label="Maintenance Template" required><Select value={schForm.template_id} onChange={e => setSchForm({ ...schForm, template_id: e.target.value })} icon={Binary} className="uppercase font-black text-xs tracking-widest"><option value="">Select Template</option>{templates.map(t => <option key={t._id} value={t._id}>{t.name.toUpperCase()}</option>)}</Select></Field>
                         <div className="grid grid-cols-2 gap-6">
                            <Field label="Frequency" required><Select value={schForm.frequency} onChange={e => setSchForm({ ...schForm, frequency: e.target.value })} icon={RefreshCw} className="uppercase font-black text-xs tracking-widest">{FREQUENCIES.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}</Select></Field>
                            <Field label="Start Date" required><Input type="date" value={schForm.start_date} onChange={e => setSchForm({ ...schForm, start_date: e.target.value })} icon={Calendar} className="uppercase font-black text-xs" /></Field>
                        </div>
                        <div className="pt-8 border-t border-border-main flex gap-4 justify-end"><Button variant="ghost" onClick={() => setShowSchModal(false)} className="border-border-main font-black text-[10px]">Cancel</Button><Button variant="primary" type="submit" className="font-black text-[10px] shadow-primary">Save Schedule</Button></div>
                    </form>
                </Modal>
            )}
        </div>
    )
}




