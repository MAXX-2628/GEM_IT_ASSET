import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    LayoutGrid, Building2, CheckCircle2, Plus, Edit, Trash2, X,
    Monitor, Search, RefreshCw, ChevronRight, Hash, Type, Info, Palette, PenTool, Globe, Server, Database, User, Terminal, Zap, Shield, Cpu, Activity, Box, Filter, MapPin
} from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Card, CardHeader, CardTitle, CardBody, Button, Badge, Table, THead, TBody, TR, TH, TD, Modal, Input, Select, Textarea, PageHeader, Counter, SearchInput, Field, Checkbox } from '../components/ui'
import FormDesigner from '../components/FormDesigner'

export default function MasterManagement() {
    const [searchParams, setSearchParams] = useSearchParams()
    const initialTab = searchParams.get('tab') || 'types'
    const [tab, setTab] = useState(initialTab)
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState(null)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({})
    const [showDesigner, setShowDesigner] = useState(false)
    const [modalTab, setModalTab] = useState('basic')
    const [designingSubCat, setDesigningSubCat] = useState(null)
    const [floorList, setFloorList] = useState([])


    const getEndpoint = (targetTab) => {
        switch (targetTab) {
            case 'types': return '/types';
            case 'depts': return '/departments';
            case 'statuses': return '/statuses';
            case 'vendors': return '/vendors';
            case 'floors': return '/floors';
            case 'storage': return '/storage-types';
            case 'stock_category': return '/stock-config?type=Category';
            case 'stock_unit': return '/stock-config?type=Unit';
            case 'stock_location': return '/stock-config?type=Location';
            case 'stock_purpose': return '/stock-config?type=Purpose';
            default: return '/types';
        }
    }

    const fetchData = useCallback(async (targetTab = tab) => {
        setLoading(true)
        try {
            const endpoint = getEndpoint(targetTab)
            const { data } = await api.get(endpoint)
            setData(data.data)

            if (targetTab === 'floors') {
                setFloorList(data.data.map(f => f.name))
            }
        } catch {
            toast.error(`Loading Error: Failed to load data`)
        } finally {
            setLoading(false)
        }
    }, [tab])

    useEffect(() => {
        const urlTab = searchParams.get('tab')
        if (urlTab && urlTab !== tab) {
            setTab(urlTab)
        }
    }, [searchParams])

    useEffect(() => {
        fetchData()
        api.get('/floors').then(r => setFloorList(r.data.data.map(f => f.name)))
    }, [fetchData])

    const handleTabChange = (newTab) => {
        setTab(newTab)
        setSearchParams({ tab: newTab })
    }

    const handleSave = async (e) => {
        e.preventDefault(); setSaving(true)
        try {
            let endpoint = getEndpoint(tab)
            if (endpoint.includes('?')) endpoint = endpoint.split('?')[0]

            let payload = form;
            if (tab.startsWith('stock_')) {
                const typeMap = {
                    'stock_category': 'Category',
                    'stock_unit': 'Unit',
                    'stock_location': 'Location',
                    'stock_purpose': 'Purpose'
                }
                payload = { ...form, type: typeMap[tab] }
            }

            if (editId) {
                await api.put(`${endpoint}/${editId}`, payload)
                toast.success('Entry Updated')
            } else {
                await api.post(endpoint, payload)
                toast.success('New Entry Created')
            }
            setShowModal(false); fetchData()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action Failed')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id, name) => {
        if (!confirm(`Permanently delete "${name}"? This action may affect related assets.`)) return
        try {
            let endpoint = getEndpoint(tab)
            if (endpoint.includes('?')) endpoint = endpoint.split('?')[0]

            await api.delete(`${endpoint}/${id}`)
            toast.success('Entry Deleted')
            fetchData()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete Failed')
        }
    }

    const openAdd = () => {
        setEditId(null)
        if (tab === 'types') setForm({ name: '', code: '', description: '', sub_categories: [], custom_fields: [], show_in_live: true, show_in_stock: true, show_in_scrap: true })
        else if (tab === 'depts') setForm({ name: '', code: '', floor: floorList[0] || '', description: '' })
        else if (tab === 'statuses') setForm({ name: '', color: '#3b82f6', text_color: '#ffffff', description: '' })
        else if (tab === 'vendors') setForm({ name: '', vendor_type: 'Normal', contact_person: '', phone: '', email: '', address: '', description: '' })
        else setForm({ name: '', description: '' })
        setShowModal(true)
    }

    const openEdit = (item) => {
        setEditId(item._id)
        setForm({ ...item })
        setShowModal(true)
    }

    const addSubCategory = () => {
        const sub = form.sub_categories || []
        setForm({ ...form, sub_categories: [...sub, { name: '', code: '' }] })
    }

    const updateSubCategory = (index, field, value) => {
        const sub = [...(form.sub_categories || [])]
        sub[index][field] = field === 'code' ? value.toUpperCase() : value
        setForm({ ...form, sub_categories: sub })
    }

    const removeSubCategory = (index) => {
        const sub = form.sub_categories.filter((_, i) => i !== index)
        setForm({ ...form, sub_categories: sub })
    }

    const ASSET_TABS = [
        { id: 'types', label: 'CATEGORIES', icon: LayoutGrid, desc: 'Asset classification levels' },
        { id: 'depts', label: 'DEPARTMENTS', icon: Building2, desc: 'Business departments' },
        { id: 'statuses', label: 'STATUSES', icon: Activity, desc: 'Asset lifecycle states' },
        { id: 'vendors', label: 'VENDORS', icon: Shield, desc: 'Hardware and service providers' },
        { id: 'floors', label: 'ZONES', icon: Hash, desc: 'Building floors or zones' },
        { id: 'storage', label: 'LOCATIONS', icon: Monitor, desc: 'Specific storage locations' },
    ]

    const STOCK_TABS = [
        { id: 'stock_category', label: 'STOCK CATEGORIES', icon: Box, desc: 'Stock classification' },
        { id: 'stock_unit', label: 'STOCK UNITS', icon: Hash, desc: 'Units of measurement' },
        { id: 'stock_location', label: 'STOCK LOCATIONS', icon: MapPin, desc: 'Storage locations' },
        { id: 'stock_purpose', label: 'STOCK PURPOSES', icon: Info, desc: 'Issue purposes' },
    ]
    
    const ALL_TABS = [...ASSET_TABS, ...STOCK_TABS]
    const itemIdentity = tab === 'types' ? 'CATEGORY' : (ALL_TABS.find(t => t.id === tab)?.label.slice(0, -1) || 'ITEM');

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Master Data Management"
                subtitle={
                    <div className="flex items-center gap-2 text-text-muted font-black uppercase tracking-widest text-[10px]">
                        <Terminal size={12} className="text-primary" />
                        <span>Configure asset categories, departments, and system settings</span>
                    </div>
                }
                actions={
                    <Button variant="primary" onClick={openAdd} icon={Plus} className="h-11 shadow-primary font-black text-[10px] tracking-widest ">
                        Add New {itemIdentity}
                    </Button>
                }
            />

            {/* Futuristic Tab Switcher */}
            <Card className="glass border-border-main overflow-hidden">
                <div className="flex flex-col gap-4 p-4 bg-bg-main/40">
                    <div>
                        <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mb-3 ml-2">Asset & System Setup</h4>
                        <div className="flex flex-wrap gap-2">
                            {ASSET_TABS.map(t => {
                                const Icon = t.icon;
                                const active = tab === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => handleTabChange(t.id)}
                                        className={`flex-1 min-w-[160px] flex flex-col items-start gap-1 px-5 py-4 rounded-xl transition-all duration-300 border ${
                                            active 
                                            ? 'bg-primary/10 border-primary/50 shadow-primary' 
                                            : 'bg-neutral-subtle border-border-main text-text-muted hover:bg-neutral-subtle hover:text-text-main'
                                        } group`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon size={14} className={active ? 'text-primary' : 'text-text-muted group-hover:text-text-dim'} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-text-main' : 'text-text-muted group-hover:text-text-dim'}`}>{t.label}</span>
                                        </div>
                                        <span className={`text-[8px] font-black uppercase tracking-[0.2em] ml-5 leading-none ${active ? 'text-primary/60' : 'text-text-muted'}`}>{t.desc}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mb-3 ml-2">Stock & Inventory Setup</h4>
                        <div className="flex flex-wrap gap-2">
                            {STOCK_TABS.map(t => {
                                const Icon = t.icon;
                                const active = tab === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => handleTabChange(t.id)}
                                        className={`flex-1 min-w-[160px] flex flex-col items-start gap-1 px-5 py-4 rounded-xl transition-all duration-300 border ${
                                            active 
                                            ? 'bg-primary/10 border-primary/50 shadow-primary' 
                                            : 'bg-neutral-subtle border-border-main text-text-muted hover:bg-neutral-subtle hover:text-text-main'
                                        } group`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon size={14} className={active ? 'text-primary' : 'text-text-muted group-hover:text-text-dim'} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-text-main' : 'text-text-muted group-hover:text-text-dim'}`}>{t.label}</span>
                                        </div>
                                        <span className={`text-[8px] font-black uppercase tracking-[0.2em] ml-5 leading-none ${active ? 'text-primary/60' : 'text-text-muted'}`}>{t.desc}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="glass border-border-main overflow-hidden">
                <CardBody className="p-0 min-h-[500px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40">
                            <div className="relative mb-6">
                                <div className="w-12 h-12 border-2 border-neutral-subtle border-t-primary rounded-full animate-spin" />
                                <RefreshCw size={20} className="absolute inset-x-0 mx-auto top-1/2 -translate-y-1/2 text-primary/30" />
                            </div>
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] leading-loose animate-pulse">Loading Master Data...</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-40 text-center px-6">
                            <div className="p-8 rounded-[2rem] bg-neutral-subtle text-text-muted mb-8 ring-1 ring-neutral-border shadow-inner">
                                <Database size={48} />
                            </div>
                            <h3 className="text-sm font-black text-text-main uppercase tracking-widest mb-2">No Entries Found</h3>
                            <p className="text-text-muted max-w-sm text-[10px] font-black uppercase tracking-widest leading-loose mx-auto mb-8">
                                No master data has been added yet. Add your first entry to get started.
                            </p>
                            <Button variant="ghost" size="md" onClick={openAdd} icon={Plus} className="border border-border-main hover:text-text-main font-black text-[10px] tracking-widest">Add First Entry</Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <THead>
                                    <TR>
                                        <TH className="pl-10 uppercase tracking-widest text-[9px]">Name</TH>
                                        {tab === 'types' && <TH className="uppercase tracking-widest text-[9px]">Code</TH>}
                                        {tab === 'types' && <TH className="uppercase tracking-widest text-[9px]">Visibility</TH>}
                                        {tab === 'types' && <TH className="uppercase tracking-widest text-[9px]">Sub-Categories</TH>}
                                        {tab === 'depts' && <TH className="uppercase tracking-widest text-[9px]">Code</TH>}
                                        {tab === 'depts' && <TH className="uppercase tracking-widest text-[9px]">Zone</TH>}
                                        {tab === 'statuses' && <TH className="uppercase tracking-widest text-[9px]">Color</TH>}
                                        {tab === 'vendors' && <TH className="uppercase tracking-widest text-[9px]">Type</TH>}
                                        {tab === 'vendors' && <TH className="uppercase tracking-widest text-[9px]">Contact</TH>}
                                        {tab === 'vendors' && <TH className="uppercase tracking-widest text-[9px]">Contact Info</TH>}
                                        <TH className="uppercase tracking-widest text-[9px]">Description</TH>
                                        <TH className="text-right pr-10 uppercase tracking-widest text-[9px]">Actions</TH>
                                    </TR>
                                </THead>
                                <TBody>
                                    {data.map(item => (
                                        <TR key={item._id} className="border-border-main group">
                                            <TD className="pl-10">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/30 group-hover:bg-primary transition-colors shadow-primary" />
                                                    <span className="text-[11px] font-black text-text-main uppercase tracking-tight group-hover:text-primary transition-colors">{item.name}</span>
                                                </div>
                                            </TD>
                                            
                                            {tab === 'types' && (
                                                <TD>
                                                    <code className="px-2 py-0.5 bg-neutral-subtle border border-neutral-border text-primary rounded-lg text-[10px] font-black tracking-widest">
                                                        {item.code || '-'}
                                                    </code>
                                                </TD>
                                            )}
                                            
                                            {tab === 'types' && (
                                                <TD>
                                                    <div className="flex gap-1.5">
                                                        <Badge variant={item.show_in_live !== false ? 'teal' : 'slate'} className="scale-90 px-2 text-[8px] font-black tracking-widest">LV</Badge>
                                                        <Badge variant={item.show_in_stock !== false ? 'blue' : 'slate'} className="scale-90 px-2 text-[8px] font-black tracking-widest">ST</Badge>
                                                        <Badge variant={item.show_in_scrap !== false ? 'red' : 'slate'} className="scale-90 px-2 text-[8px] font-black tracking-widest">SC</Badge>
                                                    </div>
                                                </TD>
                                            )}
                                            
                                            {tab === 'types' && (
                                                <TD>
                                                    <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                                        {item.sub_categories?.length > 0 ? item.sub_categories.map(s => (
                                                            <Badge key={s.name} variant="default" className="shadow-sm">
                                                                {s.name} <span className="opacity-40 ml-1 text-[7px] font-bold">[{s.code}]</span>
                                                            </Badge>
                                                        )) : <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">No Sub-Categories</span>}
                                                    </div>
                                                </TD>
                                            )}
                                            
                                            {tab === 'depts' && (
                                                <TD>
                                                    <code className="text-[10px] font-black text-primary bg-neutral-subtle border border-neutral-border px-2 py-0.5 rounded-lg tracking-widest">
                                                        {item.code}
                                                    </code>
                                                </TD>
                                            )}
                                            
                                            {tab === 'depts' && (
                                                <TD>
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest group-hover:text-text-main transition-colors">
                                                        <Globe size={12} className="text-primary/50 group-hover:text-primary" />
                                                        {item.floor || '-'}
                                                    </div>
                                                </TD>
                                            )}
                                            
                                            {tab === 'statuses' && (
                                                <TD>
                                                    <Badge 
                                                        color={item.color}
                                                        textColor={item.text_color}
                                                        variant={item.color && !item.color.startsWith('#') ? item.color : 'default'} 
                                                        className="shadow-sm"
                                                    >
                                                        {item.name || 'UNNAMED'}
                                                    </Badge>
                                                </TD>
                                            )}
                                            
                                            {tab === 'vendors' && (
                                                <TD>
                                                    <Badge variant="blue" className="shadow-sm">
                                                        {item.vendor_type}
                                                    </Badge>
                                                </TD>
                                            )}
                                            
                                            {tab === 'vendors' && (
                                                <TD className="text-[10px] font-black text-text-main uppercase tracking-tight group-hover:text-primary transition-colors">
                                                    {item.contact_person || '-'}
                                                </TD>
                                            )}
                                            
                                            {tab === 'vendors' && (
                                                <TD>
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-black text-accent-green tracking-wider tabular-nums">{item.phone || '-'}</div>
                                                        <div className="text-[8px] font-black text-text-muted uppercase tracking-widest line-clamp-1 group-hover:text-text-dim transition-colors">{item.email || '-'}</div>
                                                    </div>
                                                </TD>
                                            )}
                                            
                                            <TD className="max-w-[250px]">
                                                <p className="text-[10px] font-black text-text-muted group-hover:text-text-dim transition-colors uppercase tracking-tight leading-relaxed line-clamp-1 italic">
                                                    {item.description || 'No description'}
                                                </p>
                                            </TD>
                                            
                                             <TD className="text-right pr-10">
                                                <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="h-9 w-9 text-text-muted hover:text-primary border border-transparent hover:border-primary/30">
                                                        <Edit size={14} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(item._id, item.name); }} className="h-9 w-9 text-text-muted hover:text-accent-red border border-transparent hover:border-accent-red/30">
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
            </Card>

            {showModal && (
                <Modal
                    title={editId ? `Update ${itemIdentity}` : `Add New ${itemIdentity}`}
                    onClose={() => setShowModal(false)}
                    size={tab === 'types' ? 'lg' : 'md'}
                >
                    {tab === 'types' && (
                         <div className="flex p-1.5 bg-bg-main/40 rounded-2xl mb-8 border border-border-main w-full sm:w-fit">
                            <button
                                type="button"
                                onClick={() => setModalTab('basic')}
                                className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    modalTab === 'basic' ? 'bg-primary text-white shadow-primary' : 'text-text-muted hover:text-text-main'
                                }`}
                            >
                                Basic Info
                            </button>
                            <button
                                type="button"
                                onClick={() => setModalTab('layout')}
                                className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    modalTab === 'layout' ? 'bg-primary text-white shadow-primary' : 'text-text-muted hover:text-text-main'
                                }`}
                            >
                                Form Designer
                            </button>
                        </div>
                    )}
                    
                    <form onSubmit={handleSave} className="space-y-8">
                        {tab === 'types' ? (
                            modalTab === 'basic' ? (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 gap-6">
                                        <Field label="Name" required>
                                            <Input
                                                placeholder="e.g. Workstation, Server, Laptop..."
                                                value={form.name || ''}
                                                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                                icon={Building2}
                                                className="uppercase font-black text-xs"
                                            />
                                        </Field>
                                        <Field label="Code (Prefix)" required>
                                            <Input
                                                placeholder="e.g. LAP, SRV, NET..."
                                                value={form.code || ''}
                                                onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                                maxLength={10}
                                                icon={Zap}
                                                className="uppercase font-black text-xs tracking-[0.2em]"
                                            />
                                        </Field>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between border-b border-border-main pb-4">
                                            <div>
                                                <h4 className="text-[10px] font-black text-text-main uppercase tracking-widest">Sub-Categories</h4>
                                                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mt-1">Specify models or types for this category</p>
                                            </div>
                                            <Button type="button" variant="ghost" size="sm" onClick={addSubCategory} icon={Plus} className="border border-border-main text-[9px] font-black tracking-widest uppercase">Add Sub-Category</Button>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            {(form.sub_categories || []).map((sub, i) => (
                                                <div key={i} className="flex gap-4 items-center bg-neutral-subtle p-4 rounded-2xl border border-border-main group">
                                                    <div className="flex-1">
                                                        <Input
                                                            placeholder="Sub-Category Name..."
                                                            value={sub.name}
                                                            onChange={e => updateSubCategory(i, 'name', e.target.value)}
                                                            required
                                                            className="h-10 text-[10px] font-black uppercase bg-bg-main/20"
                                                            icon={Type}
                                                        />
                                                    </div>
                                                    <div className="w-32">
                                                        <Input
                                                            placeholder="CODE"
                                                            value={sub.code}
                                                            onChange={e => updateSubCategory(i, 'code', e.target.value)}
                                                            required
                                                            maxLength={5}
                                                            className="h-10 text-[10px] font-black uppercase bg-bg-main/20 tracking-widest text-primary"
                                                            icon={Hash}
                                                        />
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSubCategory(i)} className="text-text-muted hover:text-accent-red h-10 w-10 border border-transparent hover:border-accent-red/20">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            ))}
                                            {(!form.sub_categories || form.sub_categories.length === 0) && (
                                                <div className="py-12 bg-bg-main/20 rounded-2xl border border-dashed border-border-main flex flex-col items-center justify-center text-center">
                                                    <Box size={32} className="text-text-muted mb-4" />
                                                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">No sub-categories added</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <Field label="Inventory Visibility">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 bg-bg-main/40 rounded-[2rem] border border-border-main">
                                            {[
                                                { label: 'Active Assets', key: 'show_in_live' },
                                                { label: 'Stock Assets', key: 'show_in_stock' },
                                                { label: 'Scrapped Assets', key: 'show_in_scrap' }
                                            ].map(opt => (
                                                <Checkbox
                                                    key={opt.key}
                                                    label={opt.label}
                                                    checked={form[opt.key] !== false}
                                                    onChange={e => setForm(p => ({ ...p, [opt.key]: e.target.checked }))}
                                                />
                                            ))}
                                        </div>
                                    </Field>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="p-8 bg-primary/5 rounded-[2rem] border border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-8 group overflow-hidden relative">
                                        <div className="absolute -right-8 -top-8 text-primary/5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                                            <PenTool size={200} />
                                        </div>
                                        <div className="relative text-center sm:text-left">
                                            <h4 className="text-lg font-black text-text-main uppercase tracking-tight">Form Designer</h4>
                                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-2 max-w-[320px] leading-relaxed">
                                                Configure custom fields for this asset category.
                                            </p>
                                            <div className="mt-6 inline-flex items-center gap-3 text-[9px] font-black px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary uppercase tracking-widest">
                                                <Activity size={12} className="animate-pulse" />
                                                {(form.custom_fields || []).length > 0 ? `Custom Fields Active: [${form.custom_fields.length}]` : 'Standard Form'}
                                            </div>
                                        </div>
                                        <Button 
                                            type="button" 
                                            variant="primary" 
                                            size="md" 
                                            onClick={() => { setDesigningSubCat(null); setShowDesigner(true) }} 
                                            icon={PenTool}
                                            className="relative shadow-primary font-black text-[10px] tracking-widest uppercase h-12 px-8"
                                        >
                                            {(form.custom_fields || []).length > 0 ? 'Edit Fields' : 'Design Form'}
                                        </Button>
                                    </div>

                                    <div className="space-y-6 pt-4">
                                        <div className="flex items-center justify-between border-b border-border-main pb-4">
                                            <h4 className="text-[10px] font-black text-text-main uppercase tracking-widest">Sub-Category Fields</h4>
                                            <span className="text-[8px] font-black text-text-muted uppercase tracking-[0.3em]">Configure fields for specific sub-categories</span>
                                        </div>
                                        
                                        {(form.sub_categories || []).length === 0 ? (
                                            <div className="py-20 bg-bg-main/40 rounded-[2rem] border border-dashed border-border-main flex flex-col items-center justify-center text-center px-10">
                                                <div className="w-16 h-16 rounded-3xl bg-bg-main/5 flex items-center justify-center text-text-muted mb-6 border border-border-main">
                                                    <Info size={32} />
                                                </div>
                                                <p className="text-[10px] font-black text-text-main uppercase tracking-widest mb-2">Designer Locked</p>
                                                <p className="text-[9px] text-text-muted font-black uppercase tracking-widest leading-loose max-w-[280px]">Add sub-categories first to enable specific field configurations.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                {form.sub_categories.map(sc => {
                                                    const hasDesign = (form.sub_category_fields || []).some(f => f.sub_category_name === sc.name && f.fields?.length > 0);
                                                    return (
                                                        <div key={sc.name} className="p-6 rounded-[2rem] border border-border-main bg-bg-main/20 hover:border-primary/40 transition-all group relative overflow-hidden">
                                                            <div className="flex items-start justify-between mb-6">
                                                                <div className={`p-3 rounded-2xl border transition-all ${hasDesign ? 'bg-primary/10 border-primary/30 text-primary shadow-primary' : 'bg-bg-main/5 border-border-main text-text-muted'}`}>
                                                                    <PenTool size={18} />
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {hasDesign && (
                                                                        <Button type="button" variant="ghost" size="icon" onClick={() => {
                                                                            if (confirm(`Remove custom fields for [${sc.name.toUpperCase()}]?`)) {
                                                                                setForm(p => ({
                                                                                    ...p,
                                                                                    sub_category_fields: (p.sub_category_fields || []).filter(f => f.sub_category_name !== sc.name)
                                                                                }));
                                                                            }
                                                                        }} className="text-text-muted hover:text-accent-red h-9 w-9 border border-transparent hover:border-accent-red/20">
                                                                            <Trash2 size={16} />
                                                                        </Button>
                                                                    )}
                                                                    <Button type="button" variant="ghost" size="icon" onClick={() => { setDesigningSubCat(sc.name); setShowDesigner(true) }} className="text-primary h-9 w-9 border border-border-main hover:bg-primary/10">
                                                                        <ChevronRight size={20} />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            <div className="text-xs font-black text-text-main uppercase tracking-widest truncate pr-2">{sc.name}</div>
                                                             <div className={`text-[8px] font-black uppercase mt-2 tracking-[0.2em] ${hasDesign ? 'text-accent-green' : 'text-text-muted'}`}>
                                                                {hasDesign ? 'Custom fields configured' : 'Using category defaults'}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        ) : (
                             <div className="space-y-8">
                                <Field label="Name" required>
                                    <Input
                                        placeholder="Enter name..."
                                        value={form.name || ''}
                                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                        icon={Building2}
                                        className="uppercase font-black text-xs"
                                    />
                                </Field>

                                 {tab === 'depts' && (
                                    <div className="grid grid-cols-2 gap-6">
                                        <Field label="Code" required>
                                            <Input
                                                placeholder="e.g. IT01, HR02..."
                                                value={form.code || ''}
                                                onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                                maxLength={10}
                                                icon={Hash}
                                                className="uppercase font-black text-xs tracking-widest"
                                            />
                                        </Field>
                                        <Field label="Zone/Floor">
                                            <Select
                                                value={form.floor || ''}
                                                onChange={e => setForm(p => ({ ...p, floor: e.target.value }))}
                                                icon={Globe}
                                                className="uppercase font-black text-xs tracking-widest"
                                            >
                                                <option value="">Select Zone</option>
                                                {floorList.map(f => <option key={f} value={f}>{f}</option>)}
                                            </Select>
                                        </Field>
                                    </div>
                                )}

                                 {tab === 'statuses' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <Field label="Background Color">
                                                <div className="flex items-center gap-3 bg-neutral-subtle p-3 rounded-xl border border-border-main group-focus-within:border-primary/50 transition-all">
                                                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-border-main shadow-inner flex-shrink-0">
                                                        <input 
                                                            type="color" 
                                                            value={form.color?.startsWith('#') ? form.color : '#3b82f6'} 
                                                            onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                                                            className="absolute inset-0 w-[150%] h-[150%] -translate-x-[25%] -translate-y-[25%] cursor-pointer"
                                                        />
                                                    </div>
                                                    <Input 
                                                        value={form.color || ''} 
                                                        onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                                                        placeholder="#000000"
                                                        className="border-none bg-transparent h-auto p-0 text-[11px] font-mono font-black tracking-widest uppercase focus:ring-0"
                                                    />
                                                </div>
                                            </Field>
                                            <Field label="Text Color">
                                                <div className="flex items-center gap-3 bg-neutral-subtle p-3 rounded-xl border border-border-main group-focus-within:border-primary/50 transition-all">
                                                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-border-main shadow-inner flex-shrink-0">
                                                        <input 
                                                            type="color" 
                                                            value={form.text_color?.startsWith('#') ? form.text_color : '#ffffff'} 
                                                            onChange={e => setForm(p => ({ ...p, text_color: e.target.value }))}
                                                            className="absolute inset-0 w-[150%] h-[150%] -translate-x-[25%] -translate-y-[25%] cursor-pointer"
                                                        />
                                                    </div>
                                                    <Input 
                                                        value={form.text_color || ''} 
                                                        onChange={e => setForm(p => ({ ...p, text_color: e.target.value }))}
                                                        placeholder="#FFFFFF"
                                                        className="border-none bg-transparent h-auto p-0 text-[11px] font-mono font-black tracking-widest uppercase focus:ring-0"
                                                    />
                                                </div>
                                            </Field>
                                        </div>
                                        
                                        <div className="p-6 bg-bg-main/40 rounded-[2rem] border border-border-main flex flex-col items-center justify-center gap-4">
                                            <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.3em]">Live Preview</span>
                                            <Badge 
                                                color={form.color}
                                                textColor={form.text_color}
                                                variant={!form.color?.startsWith('#') ? form.color || 'default' : 'default'}
                                                className="shadow-xl scale-150 my-8 mx-auto"
                                                style={{ fontSize: '12px', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
                                            >
                                                {form.name || 'STATUS LABEL'}
                                            </Badge>
                                        </div>
                                    </div>
                                )}

                                 {tab === 'vendors' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <Field label="Vendor Type" required>
                                                <Select
                                                    value={form.vendor_type || 'Normal'}
                                                    onChange={e => setForm(p => ({ ...p, vendor_type: e.target.value }))}
                                                    icon={Cpu}
                                                    className="uppercase font-black text-xs tracking-widest"
                                                >
                                                    <option value="Normal">Hardware Vendor</option>
                                                    <option value="AMC">AMC Service Provider</option>
                                                    <option value="Both">Both</option>
                                                </Select>
                                            </Field>
                                            <Field label="Contact Person">
                                                <Input
                                                    placeholder="Contact name..."
                                                    value={form.contact_person || ''}
                                                    onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))}
                                                    icon={User}
                                                    className="uppercase font-black text-xs"
                                                />
                                            </Field>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <Field label="Phone">
                                                <Input
                                                    placeholder="Phone number..."
                                                    value={form.phone || ''}
                                                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                                    icon={Activity}
                                                    className="uppercase font-black text-xs tabular-nums"
                                                />
                                            </Field>
                                            <Field label="Email">
                                                <Input
                                                    placeholder="Email address..."
                                                    value={form.email || ''}
                                                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                                    icon={Globe}
                                                    className="uppercase font-black text-[10px]"
                                                />
                                            </Field>
                                        </div>
                                        <Field label="Address">
                                            <Input
                                                placeholder="Enter address..."
                                                value={form.address || ''}
                                                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                                                icon={MapPin}
                                                className="uppercase font-black text-[10px]"
                                            />
                                        </Field>
                                    </div>
                                )}
                            </div>
                        )}

                        <Field label="Description & Notes">
                            <Textarea
                                value={form.description || ''}
                                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                placeholder="Enter any additional details or notes..."
                                rows={4}
                                className="bg-bg-main/40 text-[10px] uppercase font-black tracking-tight font-mono"
                            />
                        </Field>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-border-main">
                            <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="order-2 sm:order-1 w-full sm:w-auto text-[10px] font-black uppercase tracking-[0.2em] text-text-muted hover:text-text-main border border-border-main h-12 px-10">
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" loading={saving} icon={CheckCircle2} className="order-1 sm:order-2 w-full sm:w-auto h-12 px-12 shadow-primary font-black text-[10px] tracking-widest uppercase">
                                {editId ? 'Save Changes' : 'Add Entry'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {showDesigner && (
                <FormDesigner
                    typeName={designingSubCat ? `${form.name} > ${designingSubCat}` : (form.name || 'ASSET_HIERARCHY_NODE')}
                    fields={designingSubCat
                        ? (form.sub_category_fields || []).find(f => f.sub_category_name === designingSubCat)?.fields || []
                        : (form.custom_fields || [])
                    }
                    onClose={() => setShowDesigner(false)}
                    onSave={async (updatedFields) => {
                        let updatedForm = { ...form };
                        if (designingSubCat) {
                            const scFields = [...(form.sub_category_fields || [])];
                            const idx = scFields.findIndex(f => f.sub_category_name === designingSubCat);
                            if (idx >= 0) scFields[idx] = { ...scFields[idx], fields: updatedFields };
                            else scFields.push({ sub_category_name: designingSubCat, fields: updatedFields });
                            updatedForm.sub_category_fields = scFields;
                        } else {
                            updatedForm.custom_fields = updatedFields;
                        }

                        setForm(updatedForm);

                        if (editId) {
                            try {
                                setLoading(true)
                                await api.put(`/types/${editId}`, updatedForm)
                                toast.success('Form design saved successfully')
                                fetchData()
                            } catch {
                                toast.error('Saved locally but sync failed')
                            } finally {
                                setLoading(false)
                            }
                        } else {
                            toast.success('Design saved. Remember to save the category to persist changes.')
                        }
                        setShowDesigner(false)
                    }}
                />
            )}
        </div>
    )
}



