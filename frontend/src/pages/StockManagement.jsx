import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Package, Plus, ArrowDownToLine, ArrowUpFromLine, BookOpen,
    RefreshCw, Search, AlertTriangle, CheckCircle, ChevronLeft,
    ChevronRight, Trash2, Edit, Download, Filter, LayoutGrid,
    TrendingUp, TrendingDown, Activity, X, Save, Boxes, Settings
} from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import {
    Card, CardBody, Button, Badge, Table, THead, TBody, TR, TH, TD,
    Modal, Input, Select, Textarea, PageHeader, Field, Counter
} from '../components/ui'
import { SearchInput } from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import Skeleton from '../components/ui/Skeleton'

const TABS = [
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'inward',    label: 'Receive Stock', icon: ArrowDownToLine },
    { id: 'outward',   label: 'Issue Stock', icon: ArrowUpFromLine },
    { id: 'ledger',    label: 'Ledger', icon: BookOpen },
]

const EMPTY_ITEM = {
    name: '', category: '', unit: 'Pcs', min_stock_level: 5,
    vendor: '', description: '', location: '', notes: ''
}

const EMPTY_INWARD = {
    stock_item_id: '', quantity: '', vendor: '', invoice_number: '',
    date: new Date().toISOString().split('T')[0], notes: '', performed_by: ''
}

const EMPTY_OUTWARD = {
    stock_item_id: '', quantity: '', issued_to_dept: '',
    purpose: 'Replacement', date: new Date().toISOString().split('T')[0],
    notes: '', performed_by: ''
}

function getStockStatus(item) {
    if (item.total_quantity === 0) return { label: 'Critical', variant: 'red', color: '#ef4444' }
    if (item.total_quantity <= item.min_stock_level) return { label: 'Low', variant: 'amber', color: '#f59e0b' }
    return { label: 'In Stock', variant: 'teal', color: '#22c55e' }
}

export default function StockManagement() {
    const navigate = useNavigate()
    const [tab, setTab] = useState('inventory')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Inventory state
    const [items, setItems] = useState([])
    const [stats, setStats] = useState({ total_items: 0, in_stock: 0, low_stock: 0, critical: 0, monthly_consumption: 0 })
    const [categories, setCategories] = useState([])
    const [search, setSearch] = useState('')
    const [catFilter, setCatFilter] = useState('')
    const [lowOnly, setLowOnly] = useState(false)
    const [page, setPage] = useState(1)
    const [pages, setPages] = useState(1)
    const [total, setTotal] = useState(0)

    // Configs from Master Setup
    const [configs, setConfigs] = useState({ categories: [], units: [], locations: [], purposes: [], departments: [] })

    // Modals
    const [showItemModal, setShowItemModal] = useState(false)
    const [editItemId, setEditItemId] = useState(null)
    const [itemForm, setItemForm] = useState(EMPTY_ITEM)

    // Transactions
    const [inwardForm, setInwardForm] = useState(EMPTY_INWARD)
    const [outwardForm, setOutwardForm] = useState(EMPTY_OUTWARD)
    const [ledger, setLedger] = useState([])
    const [ledgerLoading, setLedgerLoading] = useState(false)
    const [ledgerPage, setLedgerPage] = useState(1)
    const [ledgerPages, setLedgerPages] = useState(1)
    const [ledgerTotal, setLedgerTotal] = useState(0)
    const [txTypeFilter, setTxTypeFilter] = useState('')

    // Delete confirmation
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [itemToDelete, setItemToDelete] = useState(null)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')

    const fetchItems = useCallback(async () => {
        setLoading(true)
        try {
            const params = { page, limit: 20, search, category: catFilter, low_stock: lowOnly || undefined }
            const { data } = await api.get('/stock/items', { params })
            setItems(data.data)
            setTotal(data.total)
            setPages(data.pages)
            setCategories(data.categories || [])
            if (data.stats) setStats(s => ({ ...s, ...data.stats }))
        } catch { toast.error('Failed to load stock items') }
        finally { setLoading(false) }
    }, [page, search, catFilter, lowOnly])

    const fetchDashboard = useCallback(async () => {
        try {
            const { data } = await api.get('/stock/dashboard')
            if (data.stats) setStats(data.stats)
        } catch {}
    }, [])

    const fetchLedger = useCallback(async () => {
        setLedgerLoading(true)
        try {
            const params = { page: ledgerPage, limit: 30, type: txTypeFilter }
            const { data } = await api.get('/stock/transactions', { params })
            setLedger(data.data)
            setLedgerTotal(data.total)
            setLedgerPages(data.pages)
        } catch { toast.error('Failed to load ledger') }
        finally { setLedgerLoading(false) }
    }, [ledgerPage, txTypeFilter])

    const fetchConfigs = useCallback(async () => {
        try {
            const [catRes, unitRes, locRes, purpRes, deptRes] = await Promise.all([
                api.get('/stock-config?type=Category'),
                api.get('/stock-config?type=Unit'),
                api.get('/stock-config?type=Location'),
                api.get('/stock-config?type=Purpose'),
                api.get('/departments')
            ])
            setConfigs({
                categories: catRes.data.data,
                units: unitRes.data.data,
                locations: locRes.data.data,
                purposes: purpRes.data.data,
                departments: deptRes.data.data || []
            })
        } catch (err) {
            console.error('Failed to load stock configs', err)
        }
    }, [])

    useEffect(() => { fetchItems(); fetchConfigs() }, [fetchItems, fetchConfigs])
    useEffect(() => { fetchDashboard() }, [fetchDashboard])
    useEffect(() => { if (tab === 'ledger') fetchLedger() }, [tab, fetchLedger])

    const setI = (k, v) => setItemForm(p => ({ ...p, [k]: v }))
    const setIn = (k, v) => setInwardForm(p => ({ ...p, [k]: v }))
    const setOut = (k, v) => setOutwardForm(p => ({ ...p, [k]: v }))

    const openAddItem = () => { setItemForm(EMPTY_ITEM); setEditItemId(null); setShowItemModal(true) }
    const openEditItem = (item) => {
        setItemForm({ name: item.name, category: item.category, unit: item.unit, min_stock_level: item.min_stock_level, vendor: item.vendor || '', description: item.description || '', location: item.location || '', notes: item.notes || '' })
        setEditItemId(item._id)
        setShowItemModal(true)
    }

    const handleSaveItem = async (e) => {
        e.preventDefault(); setSaving(true)
        try {
            if (editItemId) { await api.put(`/stock/items/${editItemId}`, itemForm); toast.success('Item updated') }
            else { await api.post('/stock/items', itemForm); toast.success('Item added') }
            setShowItemModal(false); fetchItems(); fetchDashboard()
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to save item') }
        finally { setSaving(false) }
    }

    const handleDeleteItem = (item) => {
        setItemToDelete(item)
        setDeleteConfirmText('')
        setShowDeleteModal(true)
    }

    const confirmDeleteItem = async () => {
        if (deleteConfirmText !== 'DELETE') return
        setSaving(true)
        try {
            await api.delete(`/stock/items/${itemToDelete._id}`)
            toast.success('Stock item deleted. Ledger records were preserved.')
            setShowDeleteModal(false)
            fetchItems()
            fetchDashboard()
        } catch {
            toast.error('Failed to delete item')
        } finally {
            setSaving(false)
        }
    }

    const handleInward = async (e) => {
        e.preventDefault(); setSaving(true)
        try {
            const { data } = await api.post('/stock/transactions/inward', inwardForm)
            toast.success(data.message)
            setInwardForm(EMPTY_INWARD); fetchItems(); fetchDashboard()
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to record inward') }
        finally { setSaving(false) }
    }

    const handleOutward = async (e) => {
        e.preventDefault(); setSaving(true)
        try {
            const { data } = await api.post('/stock/transactions/outward', outwardForm)
            toast.success(data.message)
            setOutwardForm(EMPTY_OUTWARD); fetchItems(); fetchDashboard()
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to record outward') }
        finally { setSaving(false) }
    }

    const handleExportItems = async () => {
        try {
            const res = await api.get('/stock/items/export', { responseType: 'blob' })
            const url = window.URL.createObjectURL(res.data)
            const a = document.createElement('a'); a.href = url; a.download = 'stock_inventory.xlsx'; a.click()
            toast.success('Export downloaded')
        } catch { toast.error('Export failed') }
    }

    const handleExportLedger = async () => {
        try {
            const res = await api.get('/stock/transactions/export', { responseType: 'blob', params: { type: txTypeFilter } })
            const url = window.URL.createObjectURL(res.data)
            const a = document.createElement('a'); a.href = url; a.download = 'stock_ledger.xlsx'; a.click()
            toast.success('Ledger exported')
        } catch { toast.error('Export failed') }
    }

    return (
        <div className="space-y-8">
            <PageHeader
                title="Stock & Consumables"
                subtitle="Transaction-tracked inventory for spare parts and consumable items"
                icon={Package}
                actions={
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="ghost" 
                            icon={Settings} 
                            onClick={() => navigate('/setup?tab=stock_category')}
                            className="h-11 border border-border-main text-text-muted hover:text-primary hover:border-primary/30 font-black text-[10px] tracking-widest uppercase"
                        >
                            Settings
                        </Button>
                        <Button variant="primary" icon={Plus} className="shadow-primary" onClick={openAddItem}>
                            Add Item
                        </Button>
                    </div>
                }
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Total Items', value: stats.total_items, icon: Boxes, color: 'text-text-main bg-neutral-subtle border-border-main' },
                    { label: 'In Stock', value: stats.in_stock, icon: CheckCircle, color: 'text-accent-green bg-accent-green/10 border-accent-green/20' },
                    { label: 'Low Stock', value: stats.low_stock, icon: AlertTriangle, color: 'text-accent-amber bg-accent-amber/10 border-accent-amber/20' },
                    { label: 'Critical', value: stats.critical, icon: Activity, color: 'text-accent-red bg-accent-red/10 border-accent-red/20' },
                    { label: 'Monthly Used', value: stats.monthly_consumption, icon: TrendingDown, color: 'text-primary bg-primary/10 border-primary/20' },
                ].map(m => (
                    <Card key={m.label} className="glass border-border-main group">
                        <CardBody className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-[8px] font-black text-text-muted uppercase tracking-widest leading-none">{m.label}</p>
                                <h3 className="text-2xl font-black text-text-main tracking-tighter leading-tight mt-1">
                                    <Counter value={m.value} />
                                </h3>
                            </div>
                            <div className={`p-3 rounded-2xl border ${m.color}`}>
                                <m.icon size={20} />
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-neutral-subtle border border-border-main rounded-2xl w-fit">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${tab === t.id ? 'bg-primary text-white shadow-primary' : 'text-text-muted hover:text-text-main'}`}
                    >
                        <t.icon size={14} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ─── INVENTORY TAB ─────────────────────────────────────────────── */}
            {tab === 'inventory' && (
                <Card className="glass border-border-main overflow-hidden">
                    {/* Filter Bar */}
                    <div className="p-6 border-b border-border-main flex flex-col xl:flex-row gap-4 items-center justify-between">
                        <div className="flex items-center gap-4 w-full xl:w-auto">
                            <div className="w-full xl:w-80">
                                <SearchInput value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search items, categories, vendors..." />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
                            <Select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1) }} className="min-w-[150px]">
                                <option value="">All Categories</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </Select>
                            <button
                                onClick={() => { setLowOnly(!lowOnly); setPage(1) }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${lowOnly ? 'bg-accent-amber/10 text-accent-amber border-accent-amber/30' : 'border-border-main text-text-muted hover:text-text-main'}`}
                            >
                                <AlertTriangle size={12} /> Low Stock
                            </button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 border border-border-main" onClick={() => { fetchItems(); fetchDashboard() }}>
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            </Button>
                            <Button variant="ghost" icon={Download} size="sm" className="border border-border-main text-[10px] font-black tracking-widest" onClick={handleExportItems}>
                                Export
                            </Button>
                        </div>
                    </div>
                    <CardBody className="p-0 min-h-[400px]">
                        {loading ? (
                            <div className="p-8 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl bg-neutral-subtle" />)}</div>
                        ) : items.length === 0 ? (
                            <div className="py-20">
                                <EmptyState title="No Stock Items Found" message="Add your first item or adjust the filters." action={<Button variant="secondary" onClick={openAddItem} icon={Plus}>Add Item</Button>} />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="min-w-[800px]">
                                    <THead>
                                        <TR>
                                            <TH className="pl-8 uppercase tracking-widest text-[9px]">Item Name</TH>
                                            <TH className="uppercase tracking-widest text-[9px]">Category</TH>
                                            <TH className="uppercase tracking-widest text-[9px]">Available Qty</TH>
                                            <TH className="uppercase tracking-widest text-[9px]">Min Level</TH>
                                            <TH className="uppercase tracking-widest text-[9px]">Status</TH>
                                            <TH className="uppercase tracking-widest text-[9px]">Vendor</TH>
                                            <TH className="text-right pr-8 uppercase tracking-widest text-[9px]">Actions</TH>
                                        </TR>
                                    </THead>
                                    <TBody>
                                        {items.map(item => {
                                            const status = getStockStatus(item)
                                            return (
                                                <TR key={item._id} className="group border-border-main hover:border-l-4 hover:border-l-primary/50 transition-all">
                                                    <TD className="pl-8">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-text-main group-hover:text-primary transition-colors">{item.name}</span>
                                                            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">{item.unit} · {item.location || 'No location'}</span>
                                                        </div>
                                                    </TD>
                                                    <TD><span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{item.category}</span></TD>
                                                    <TD>
                                                        <span className={`text-lg font-black tabular-nums ${item.total_quantity === 0 ? 'text-accent-red' : item.total_quantity <= item.min_stock_level ? 'text-accent-amber' : 'text-text-main'}`}>
                                                            {item.total_quantity}
                                                        </span>
                                                        <span className="text-[9px] text-text-muted ml-1">{item.unit}</span>
                                                    </TD>
                                                    <TD><span className="text-sm font-bold text-text-muted">{item.min_stock_level}</span></TD>
                                                    <TD>
                                                        <Badge color={status.color} className="shadow-sm">{status.label}</Badge>
                                                    </TD>
                                                    <TD><span className="text-[10px] font-black text-text-muted uppercase">{item.vendor || '—'}</span></TD>
                                                    <TD className="pr-8 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-primary" onClick={() => openEditItem(item)}>
                                                                <Edit size={14} />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-accent-red" onClick={() => handleDeleteItem(item)}>
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        </div>
                                                    </TD>
                                                </TR>
                                            )
                                        })}
                                    </TBody>
                                </Table>
                            </div>
                        )}
                    </CardBody>
                    <div className="px-8 py-4 glass border-t border-border-main flex items-center justify-between">
                        <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">{total} Items</span>
                        <div className="flex items-center gap-2">
                            <button className="h-9 w-9 flex items-center justify-center rounded-lg border border-border-main hover:border-primary/50 hover:text-primary transition-all disabled:opacity-30" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
                            <span className="text-[10px] font-black text-text-muted px-3">{page}/{pages}</span>
                            <button className="h-9 w-9 flex items-center justify-center rounded-lg border border-border-main hover:border-primary/50 hover:text-primary transition-all disabled:opacity-30" disabled={page >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
                        </div>
                    </div>
                </Card>
            )}

            {/* ─── INWARD TAB ─────────────────────────────────────────────────── */}
            {tab === 'inward' && (
                <Card className="glass border-border-main">
                    <div className="p-6 border-b border-border-main">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-accent-green/10 border border-accent-green/20 rounded-xl text-accent-green">
                                <ArrowDownToLine size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-text-main uppercase tracking-widest">Receive Stock</h3>
                                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Log a purchase or stock addition</p>
                            </div>
                        </div>
                    </div>
                    <CardBody className="p-8">
                        <form onSubmit={handleInward} className="space-y-6 max-w-2xl">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <Field label="Item" required>
                                    <Select value={inwardForm.stock_item_id} onChange={e => setIn('stock_item_id', e.target.value)} required>
                                        <option value="">Select Item...</option>
                                        {items.map(i => <option key={i._id} value={i._id}>{i.name} ({i.category}) — {i.total_quantity} {i.unit}</option>)}
                                    </Select>
                                </Field>
                                <Field label="Quantity Added" required>
                                    <Input type="number" min={1} value={inwardForm.quantity} onChange={e => setIn('quantity', e.target.value)} placeholder="e.g. 10" required />
                                </Field>
                                <Field label="Vendor">
                                    <Input value={inwardForm.vendor} onChange={e => setIn('vendor', e.target.value)} placeholder="Supplier name..." />
                                </Field>
                                <Field label="Invoice Number">
                                    <Input value={inwardForm.invoice_number} onChange={e => setIn('invoice_number', e.target.value)} placeholder="INV-XXXXX" />
                                </Field>
                                <Field label="Date">
                                    <Input type="date" value={inwardForm.date} onChange={e => setIn('date', e.target.value)} />
                                </Field>
                                <Field label="Performed By">
                                    <Input value={inwardForm.performed_by} onChange={e => setIn('performed_by', e.target.value)} placeholder="Your name..." />
                                </Field>
                            </div>
                            <Field label="Notes">
                                <Textarea value={inwardForm.notes} onChange={e => setIn('notes', e.target.value)} rows={3} placeholder="Optional remarks..." />
                            </Field>
                            <div className="pt-4 flex items-center gap-4">
                                <Button type="submit" variant="primary" icon={ArrowDownToLine} loading={saving} className="px-10 h-12 shadow-primary font-black tracking-widest uppercase text-[10px]">
                                    Record Inward
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => setInwardForm(EMPTY_INWARD)}>Clear</Button>
                            </div>
                        </form>
                    </CardBody>
                </Card>
            )}

            {/* ─── OUTWARD TAB ─────────────────────────────────────────────────── */}
            {tab === 'outward' && (
                <Card className="glass border-border-main">
                    <div className="p-6 border-b border-border-main">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-accent-red/10 border border-accent-red/20 rounded-xl text-accent-red">
                                <ArrowUpFromLine size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-text-main uppercase tracking-widest">Issue Stock</h3>
                                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Record items issued to a department</p>
                            </div>
                        </div>
                    </div>
                    <CardBody className="p-8">
                        <form onSubmit={handleOutward} className="space-y-6 max-w-2xl">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <Field label="Item" required>
                                    <Select value={outwardForm.stock_item_id} onChange={e => setOut('stock_item_id', e.target.value)} required>
                                        <option value="">Select Item...</option>
                                        {items.map(i => {
                                            const s = getStockStatus(i)
                                            return <option key={i._id} value={i._id} disabled={i.total_quantity === 0}>{i.name} — {i.total_quantity} {i.unit} [{s.label}]</option>
                                        })}
                                    </Select>
                                </Field>
                                <Field label="Quantity Issued" required>
                                    <Input type="number" min={1} value={outwardForm.quantity} onChange={e => setOut('quantity', e.target.value)} placeholder="e.g. 2" required />
                                </Field>
                                <Field label="Issued To (Department)" required>
                                    <Select value={outwardForm.issued_to_dept} onChange={e => setOut('issued_to_dept', e.target.value)} required>
                                        <option value="">Select Department...</option>
                                        {configs.departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
                                    </Select>
                                </Field>
                                <Field label="Purpose">
                                    <Select value={outwardForm.purpose} onChange={e => setOut('purpose', e.target.value)}>
                                        <option value="">Select Purpose...</option>
                                        {configs.purposes.map(p => <option key={p._id} value={p.name}>{p.name}</option>)}
                                    </Select>
                                </Field>
                                <Field label="Date">
                                    <Input type="date" value={outwardForm.date} onChange={e => setOut('date', e.target.value)} />
                                </Field>
                                <Field label="Performed By">
                                    <Input value={outwardForm.performed_by} onChange={e => setOut('performed_by', e.target.value)} placeholder="Your name..." />
                                </Field>
                            </div>
                            <Field label="Notes">
                                <Textarea value={outwardForm.notes} onChange={e => setOut('notes', e.target.value)} rows={3} placeholder="Optional remarks..." />
                            </Field>
                            <div className="pt-4 flex items-center gap-4">
                                <Button type="submit" variant="primary" icon={ArrowUpFromLine} loading={saving} className="px-10 h-12 bg-accent-red hover:bg-accent-red/80 shadow-accent-red font-black tracking-widest uppercase text-[10px]">
                                    Record Outward
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => setOutwardForm(EMPTY_OUTWARD)}>Clear</Button>
                            </div>
                        </form>
                    </CardBody>
                </Card>
            )}

            {/* ─── LEDGER TAB ─────────────────────────────────────────────────── */}
            {tab === 'ledger' && (
                <Card className="glass border-border-main overflow-hidden">
                    <div className="p-6 border-b border-border-main flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Select value={txTypeFilter} onChange={e => { setTxTypeFilter(e.target.value); setLedgerPage(1) }} className="w-40 text-[10px] font-black uppercase tracking-widest">
                                <option value="">All Types</option>
                                <option value="inward">Inward</option>
                                <option value="outward">Outward</option>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-10 w-10 border border-border-main" onClick={fetchLedger}>
                                <RefreshCw size={16} className={ledgerLoading ? 'animate-spin' : ''} />
                            </Button>
                        </div>
                        <Button variant="ghost" icon={Download} size="sm" className="border border-border-main text-[10px] font-black tracking-widest" onClick={handleExportLedger}>
                            Export Ledger
                        </Button>
                    </div>
                    <CardBody className="p-0 min-h-[400px]">
                        {ledgerLoading ? (
                            <div className="p-8 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl bg-neutral-subtle" />)}</div>
                        ) : ledger.length === 0 ? (
                            <div className="py-20"><EmptyState title="No Transactions Yet" message="Record inward or outward to see entries here." /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="min-w-[900px]">
                                    <THead>
                                        <TR>
                                            <TH className="pl-8 uppercase tracking-widest text-[9px]">Date</TH>
                                            <TH className="uppercase tracking-widest text-[9px]">Type</TH>
                                            <TH className="uppercase tracking-widest text-[9px]">Item</TH>
                                            <TH className="uppercase tracking-widest text-[9px]">Qty</TH>
                                            <TH className="uppercase tracking-widest text-[9px]">Vendor / Dept</TH>
                                            <TH className="uppercase tracking-widest text-[9px]">Invoice / Purpose</TH>
                                            <TH className="pr-8 uppercase tracking-widest text-[9px]">By</TH>
                                        </TR>
                                    </THead>
                                    <TBody>
                                        {ledger.map(tx => (
                                            <TR key={tx._id} className="group border-border-main">
                                                <TD className="pl-8 font-mono text-[10px] text-text-muted">{new Date(tx.date).toLocaleDateString()}</TD>
                                                <TD>
                                                    <Badge color={tx.transaction_type === 'inward' ? '#22c55e' : '#ef4444'} className="shadow-sm">
                                                        {tx.transaction_type === 'inward' ? '↓ In' : '↑ Out'}
                                                    </Badge>
                                                </TD>
                                                <TD>
                                                    <span className="text-sm font-bold text-text-main">{tx.stock_item?.name || tx.item_name}</span>
                                                </TD>
                                                <TD>
                                                    <span className={`text-base font-black tabular-nums ${tx.transaction_type === 'inward' ? 'text-accent-green' : 'text-accent-red'}`}>
                                                        {tx.transaction_type === 'inward' ? '+' : '−'}{tx.quantity}
                                                    </span>
                                                    <span className="text-[9px] text-text-muted ml-1">{tx.stock_item?.unit}</span>
                                                </TD>
                                                <TD><span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{tx.vendor || tx.issued_to_dept || '—'}</span></TD>
                                                <TD><span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{tx.invoice_number || tx.purpose || '—'}</span></TD>
                                                <TD className="pr-8"><span className="text-[10px] font-black text-text-muted uppercase">{tx.performed_by || '—'}</span></TD>
                                            </TR>
                                        ))}
                                    </TBody>
                                </Table>
                            </div>
                        )}
                    </CardBody>
                    <div className="px-8 py-4 glass border-t border-border-main flex items-center justify-between">
                        <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">{ledgerTotal} Transactions</span>
                        <div className="flex items-center gap-2">
                            <button className="h-9 w-9 flex items-center justify-center rounded-lg border border-border-main hover:border-primary/50 hover:text-primary transition-all disabled:opacity-30" disabled={ledgerPage <= 1} onClick={() => setLedgerPage(p => p - 1)}><ChevronLeft size={16} /></button>
                            <span className="text-[10px] font-black text-text-muted px-3">{ledgerPage}/{ledgerPages}</span>
                            <button className="h-9 w-9 flex items-center justify-center rounded-lg border border-border-main hover:border-primary/50 hover:text-primary transition-all disabled:opacity-30" disabled={ledgerPage >= ledgerPages} onClick={() => setLedgerPage(p => p + 1)}><ChevronRight size={16} /></button>
                        </div>
                    </div>
                </Card>
            )}

            {/* ─── Item Modal ─────────────────────────────────────────────────── */}
            {showItemModal && (
                <Modal show={showItemModal} onClose={() => setShowItemModal(false)} title={editItemId ? 'Edit Stock Item' : 'Add New Stock Item'} size="md">
                    <form onSubmit={handleSaveItem} className="space-y-6 p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <Field label="Item Name" required>
                                <Input value={itemForm.name} onChange={e => setI('name', e.target.value)} placeholder="e.g. HP 307A Toner Cartridge" required />
                            </Field>
                            <Field label="Category" required>
                                <Select value={itemForm.category} onChange={e => setI('category', e.target.value)} required>
                                    <option value="">Select Category...</option>
                                    {configs.categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                                </Select>
                            </Field>
                            <Field label="Unit">
                                <Select value={itemForm.unit} onChange={e => setI('unit', e.target.value)}>
                                    <option value="">Select Unit...</option>
                                    {configs.units.map(u => <option key={u._id} value={u.name}>{u.name}</option>)}
                                </Select>
                            </Field>
                            <Field label="Min Stock Level" helpText="Alert threshold">
                                <Input type="number" min={0} value={itemForm.min_stock_level} onChange={e => setI('min_stock_level', parseInt(e.target.value))} required />
                            </Field>
                            <Field label="Vendor">
                                <Input value={itemForm.vendor} onChange={e => setI('vendor', e.target.value)} placeholder="Default supplier..." />
                            </Field>
                            <Field label="Storage Location">
                                <Select value={itemForm.location} onChange={e => setI('location', e.target.value)}>
                                    <option value="">Select Location...</option>
                                    {configs.locations.map(l => <option key={l._id} value={l.name}>{l.name}</option>)}
                                </Select>
                            </Field>
                        </div>
                        <Field label="Description / Notes">
                            <Textarea value={itemForm.notes} onChange={e => setI('notes', e.target.value)} rows={3} />
                        </Field>
                        <div className="flex items-center justify-between pt-6 border-t border-border-main">
                            <Button type="button" variant="ghost" onClick={() => setShowItemModal(false)}>Cancel</Button>
                            <Button type="submit" variant="primary" icon={Save} loading={saving} className="px-10 shadow-primary font-black tracking-widest uppercase text-[10px]">
                                {editItemId ? 'Update Item' : 'Create Item'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ─── Delete Confirmation Modal ──────────────────────────────────── */}
            {showDeleteModal && (
                <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirm Deletion" size="sm">
                    <div className="space-y-6 p-4">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-accent-red/10 border border-accent-red/20 flex items-center justify-center text-accent-red animate-pulse">
                                <AlertTriangle size={32} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-text-main uppercase tracking-widest">Dangerous Action</h3>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1">
                                    You are about to delete <span className="text-accent-red">"{itemToDelete?.name}"</span>. 
                                    This cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div className="bg-neutral-subtle border border-border-main p-4 rounded-xl text-[10px] font-bold text-text-muted leading-relaxed uppercase tracking-wider">
                            <CheckCircle size={14} className="inline mr-2 text-accent-green" />
                            Inventory records will be removed, but transaction history (ledger) will be <span className="text-text-main">preserved</span> for audit purposes.
                        </div>

                        <Field label='Type "DELETE" to confirm'>
                            <Input 
                                value={deleteConfirmText} 
                                onChange={e => setDeleteConfirmText(e.target.value)} 
                                placeholder="Type DELETE here..."
                                className="text-center font-black tracking-widest uppercase border-accent-red/30 focus:border-accent-red shadow-inner shadow-accent-red/5"
                            />
                        </Field>

                        <div className="flex items-center gap-4 pt-4 border-t border-border-main">
                            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                            <Button 
                                type="button" 
                                variant="primary" 
                                className="flex-1 bg-accent-red hover:bg-accent-red/80 shadow-accent-red disabled:opacity-30"
                                disabled={deleteConfirmText !== 'DELETE' || saving}
                                loading={saving}
                                onClick={confirmDeleteItem}
                            >
                                Delete Item
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}
