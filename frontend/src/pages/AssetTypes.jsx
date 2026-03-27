import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Monitor, Server, Camera, Speaker, Mic, Tablet, Laptop, Printer, Network, Cpu,
    HardDrive, Smartphone, HelpCircle, Plus, Edit, Trash2, LayoutGrid, List, ArrowRight, Database, Box, Package,
    Phone, MousePointer2, MemoryStick, Wifi, Shield
} from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Card, CardHeader, CardTitle, CardBody, Button, Badge, Table, THead, TBody, TR, TH, TD, Modal, Input, Textarea, PageHeader, Counter, Field } from '../components/ui'

const ICON_MAP = {
    'Laptop': Monitor,
    'Desktop': Monitor,
    'Monitor': Monitor,
    'Server': HardDrive,
    'Mobile': Phone,
    'Tablet': Tablet,
    'Printer': Printer,
    'Scanner': Printer,
    'Mouse': MousePointer2,
    'Keyboard': MemoryStick,
    'Networking': Wifi,
    'UPS': Shield,
    'Storage': Database,
    'Component': Cpu,
    'Peripheral': MousePointer2
}

const EMPTY = { name: '', description: '' }

export default function AssetTypes() {
    const navigate = useNavigate()
    const [types, setTypes] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState(EMPTY)
    const [editId, setEditId] = useState(null)
    const [saving, setSaving] = useState(false)
    const [viewMode, setViewMode] = useState('grid')
    const [counts, setCounts] = useState({})

    const fetch = useCallback(async () => {
        try {
            const [typeRes, dashRes] = await Promise.all([
                api.get('/asset-types'),
                api.get('/dashboard')
            ])
            setTypes(typeRes.data.data)

            const countMap = {}
            if (dashRes.data.data.assetsByType) {
                dashRes.data.data.assetsByType.forEach(c => countMap[c._id] = c.count)
            }
            setCounts(countMap)
        }
        catch { toast.error('Failed to load asset classifications') }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetch() }, [fetch])

    const openAdd = () => { setForm(EMPTY); setEditId(null); setShowModal(true) }
    const openEdit = (t) => { setForm({ name: t.name, description: t.description || '' }); setEditId(t._id); setShowModal(true) }

    const handleSave = async (e) => {
        e.preventDefault(); setSaving(true)
        try {
            if (editId) { await api.put(`/asset-types/${editId}`, form); toast.success('Classification updated') }
            else { await api.post('/asset-types', form); toast.success('Model class initialized') }
            setShowModal(false); fetch()
        } catch (err) { toast.error(err.response?.data?.message || 'Transaction failed') }
        finally { setSaving(false) }
    }

    const handleDelete = async (id) => {
        if (!confirm('ARCHIVE_COMMAND_REQUIRED: Permanently decouple this classification from the global index? This action cannot be reversed.')) return
        try {
            await api.delete(`/asset-types/${id}`)
            toast.success('Classification decoupled')
            fetch()
        } catch {
            toast.error('Command rejected: active asset instances detected')
        }
    }

    const getIcon = (name) => {
        const key = Object.keys(ICON_MAP).find(k => name.toLowerCase().includes(k.toLowerCase()))
        return ICON_MAP[key] || Package
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Model Classifications"
                subtitle="Defining asset archetypes and technical hardware specifications."
                actions={
                    <div className="flex items-center gap-3">
                        <div className="p-1 bg-neutral-subtle rounded-lg flex items-center gap-1 border border-border-main">
                            <Button
                                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('grid')}
                                icon={LayoutGrid}
                                className={viewMode === 'grid' ? 'shadow-sm' : 'text-text-muted'}
                            />
                            <Button
                                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('list')}
                                icon={List}
                                className={viewMode === 'list' ? 'shadow-sm' : 'text-text-muted'}
                            />
                        </div>
                        <Button
                            variant="primary"
                            onClick={openAdd}
                            icon={Plus}
                            size="md"
                            className="shadow-primary"
                        >
                            Define Class
                        </Button>
                    </div>
                }
            />

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {types.map(t => {
                        const Icon = getIcon(t.name)
                        return (
                            <Card
                                key={t._id}
                                interactive
                                className="bg-bg-card border-border-main group overflow-hidden"
                                onClick={() => navigate(`/assets?type=${t.name}`)}
                            >
                                <div className="h-24 bg-neutral-subtle flex items-center justify-center border-b border-border-main relative overflow-hidden">
                                    <Icon size={80} className="text-text-muted/30 absolute -bottom-4 -right-4 transition-transform group-hover:scale-110" />
                                    <div className="z-10 h-12 w-12 rounded-xl bg-bg-card shadow-sm flex items-center justify-center text-primary border border-border-main transition-all group-hover:shadow-md group-hover:scale-110">
                                        <Icon size={24} />
                                    </div>
                                </div>
                                <CardBody className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="space-y-1">
                                            <h3 className="text-base font-bold text-text-main group-hover:text-primary transition-colors uppercase tracking-tight">{t.name}</h3>
                                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none">Global Index Item</p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-border-main flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Inventory Index</p>
                                            <p className="text-xl font-bold text-text-main tracking-tighter">
                                                <Counter target={counts[t.name] || 0} />
                                                <span className="text-[10px] ml-1 text-text-muted">INSTANCES</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(t) }}>
                                                <Edit size={14} className="text-text-muted hover:text-primary" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/assets?type=${t.name}`) }}>
                                                <ArrowRight size={16} className="text-text-muted group-hover:text-primary" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        )
                    })}
                    {types.length === 0 && !loading && (
                        <div className="col-span-full py-24 flex flex-col items-center justify-center text-center">
                            <div className="h-16 w-16 rounded-full bg-neutral-subtle text-text-muted flex items-center justify-center mb-4">
                                <Box size={32} />
                            </div>
                            <div className="space-y-1 mb-6">
                                <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">Classification Ledger Empty</h3>
                                <p className="text-xs font-bold text-text-muted uppercase">Define asset types to begin organizing your hardware inventory.</p>
                            </div>
                            <Button variant="primary" onClick={openAdd} icon={Plus} size="md">Define Class</Button>
                        </div>
                    )}
                </div>
            ) : (
                <Card className="border-border-main overflow-hidden shadow-sm bg-bg-card">
                    <CardBody className="p-0">
                        {loading ? (
                            <div className="py-24 flex flex-col items-center justify-center animate-pulse">
                                <Activity size={32} className="text-primary mb-4 animate-spin" />
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Syncing Master Classification...</p>
                            </div>
                        ) : types.length === 0 ? (
                            <div className="py-24 flex flex-col items-center justify-center text-center">
                                <div className="h-16 w-16 rounded-full bg-neutral-subtle text-text-muted flex items-center justify-center mb-4">
                                    <Box size={32} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">No classes found</h3>
                                    <p className="text-xs font-bold text-text-muted uppercase">Initialize your first model classification to proceed.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <THead>
                                        <TR>
                                            <TH className="pl-6 text-center w-20">SIGNAL</TH>
                                            <TH>CLASS DESIGNATION</TH>
                                            <TH>INSTANCE VOLUME</TH>
                                            <TH>TECHNICAL SPECIFICATIONS</TH>
                                            <TH className="pr-6 text-right">COMMANDS</TH>
                                        </TR>
                                    </THead>
                                    <TBody>
                                        {types.map(t => {
                                            const Icon = getIcon(t.name)
                                            return (
                                                <TR key={t._id} interactive onClick={() => navigate(`/assets?type=${t.name}`)} className="border-border-main hover:bg-neutral-subtle">
                                                    <TD className="pl-6 text-center">
                                                        <div className="inline-flex h-8 w-8 rounded-lg bg-neutral-subtle text-text-muted items-center justify-center border border-border-main">
                                                            <Icon size={16} />
                                                        </div>
                                                    </TD>
                                                    <TD>
                                                        <span className="text-xs font-bold text-text-main uppercase tracking-tight">{t.name}</span>
                                                    </TD>
                                                    <TD>
                                                        <div className="flex items-center gap-2 text-text-main">
                                                            <Layers size={12} className="text-text-muted" />
                                                            <span className="text-[11px] font-bold font-mono">{counts[t.name] || 0}</span>
                                                        </div>
                                                    </TD>
                                                    <TD>
                                                        <p className="text-[10px] font-bold text-text-muted uppercase truncate max-w-[300px]">{t.description || 'No technical context provided'}</p>
                                                    </TD>
                                                    <TD className="pr-6 text-right" onClick={e => e.stopPropagation()}>
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                                                                <Edit size={14} className="text-text-muted hover:text-primary" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(t._id)}>
                                                                <Trash2 size={14} className="text-text-muted hover:text-accent-red" />
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
                </Card>
            )}

            <Modal
                show={showModal}
                onClose={() => setShowModal(false)}
                title={editId ? 'Synchronize Classification' : 'Initialize Model Class'}
                size="md"
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <Field label="Model Class Designation" required>
                        <Input
                            value={form.name}
                            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="e.g. Enterprise Server, Mobile Workstation..."
                            icon={Box}
                        />
                    </Field>
                    <Field label="Technical Specification Context">
                        <Textarea
                            value={form.description}
                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            placeholder="Briefly outline the hardware scope for this classification..."
                            rows={5}
                            className="text-xs uppercase"
                        />
                    </Field>
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-main">
                        <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="uppercase tracking-widest text-[10px] font-bold border-border-main">
                            Terminate
                        </Button>
                        <Button type="submit" variant="primary" loading={saving} icon={Shield} className="uppercase tracking-widest text-[10px] font-bold shadow-primary">
                            Commit Classification
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

