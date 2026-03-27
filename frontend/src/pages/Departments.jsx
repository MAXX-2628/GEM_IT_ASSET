import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Building2, Trash2, LayoutGrid, List, Edit, ArrowRight, Database, MapPin, Hash, Layers, Shield, Activity, Search } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Card, CardHeader, CardTitle, CardBody, Button, Badge, Table, THead, TBody, TR, TH, TD, Modal, Input, Select, Textarea, PageHeader, Counter, Field } from '../components/ui'

const CODES = ['OP', 'ICU', 'LAB', 'REC', 'OT', 'PHAR', 'RAD', 'ADMIN', 'IT', 'EMRG', 'IPD', 'HDU', 'NICU', 'CSSD', 'OTHER']
const EMPTY = { name: '', code: 'OP', floor: '', description: '' }

export default function Departments() {
    const navigate = useNavigate()
    const [depts, setDepts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState(EMPTY)
    const [editId, setEditId] = useState(null)
    const [saving, setSaving] = useState(false)
    const [viewMode, setViewMode] = useState('grid')
    const [counts, setCounts] = useState({})

    const fetch = useCallback(async () => {
        try {
            const [deptRes, dashRes] = await Promise.all([
                api.get('/departments'),
                api.get('/dashboard')
            ])
            setDepts(deptRes.data.data)

            const countMap = {}
            if (dashRes.data.data.assetsByDept) {
                dashRes.data.data.assetsByDept.forEach(c => countMap[c._id] = c.count)
            }
            setCounts(countMap)
        }
        catch { toast.error('Failed to load department ledger') }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetch() }, [fetch])

    const openAdd = () => { setForm(EMPTY); setEditId(null); setShowModal(true) }
    const openEdit = (d) => { setForm({ name: d.name, code: d.code, floor: d.floor || '', description: d.description || '' }); setEditId(d._id); setShowModal(true) }

    const handleSave = async (e) => {
        e.preventDefault(); setSaving(true)
        try {
            if (editId) { await api.put(`/departments/${editId}`, form); toast.success('Registry updated') }
            else { await api.post('/departments', form); toast.success('Branch node initialized') }
            setShowModal(false); fetch()
        } catch (err) { toast.error(err.response?.data?.message || 'Transaction failed') }
        finally { setSaving(false) }
    }

    const handleDelete = async (id) => {
        if (!confirm('RELOCATION_COMMAND_REQUIRED: Relocate this node to the terminal buffer? This action will archive the department structure.')) return
        try {
            await api.delete(`/departments/${id}`)
            toast.success('Node relocated')
            fetch()
        } catch {
            toast.error('Relocation rejected: active dependencies detected')
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Infrastructure Nodes"
                subtitle="Regulating organizational departments and equipment deployment zones."
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
                            Register Node
                        </Button>
                    </div>
                }
            />

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {depts.map(d => (
                        <Card
                            key={d._id}
                            interactive
                            className="bg-bg-main border-border-main group overflow-hidden"
                            onClick={() => navigate(`/assets?department=${d.name}`)}
                        >
                            <div className="h-24 bg-neutral-subtle flex items-center justify-center border-b border-border-main relative overflow-hidden">
                                <Building2 size={80} className="text-text-muted/10 absolute -bottom-4 -right-4 transition-transform group-hover:scale-110" />
                                <div className="z-10 h-12 w-12 rounded-xl bg-bg-main shadow-sm flex items-center justify-center text-primary border border-border-main transition-all group-hover:shadow-md group-hover:scale-110">
                                    <Building2 size={24} />
                                </div>
                            </div>
                            <CardBody className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="space-y-1">
                                        <h3 className="text-base font-bold text-text-main/80 group-hover:text-primary transition-colors uppercase tracking-tight">{d.name}</h3>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none">
                                            <MapPin size={10} />
                                            {d.floor || 'Unmapped Zone'}
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] uppercase font-bold px-1.5">{d.code}</Badge>
                                </div>

                                <div className="pt-4 border-t border-border-main flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Asset Volume</p>
                                        <p className="text-xl font-bold text-text-main tracking-tighter">
                                            <Counter target={counts[d.name] || 0} />
                                            <span className="text-[10px] ml-1 text-text-muted">UNITS</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(d) }}>
                                            <Edit size={14} className="text-text-muted hover:text-primary" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/assets?department=${d.name}`) }}>
                                            <ArrowRight size={16} className="text-text-muted group-hover:text-primary" />
                                        </Button>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                    {depts.length === 0 && !loading && (
                        <div className="col-span-full py-24 flex flex-col items-center justify-center text-center px-6">
                            <div className="h-16 w-16 rounded-full bg-neutral-subtle text-text-muted flex items-center justify-center mb-4 border border-border-main">
                                <Database size={32} />
                            </div>
                            <div className="space-y-1 mb-6">
                                <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">Global Structure Empty</h3>
                                <p className="text-xs font-bold text-text-muted uppercase">Initialize organizational nodes to begin mapping your infrastructure.</p>
                            </div>
                            <Button variant="primary" onClick={openAdd} icon={Plus} size="md" className="shadow-primary">Initialize Node</Button>
                        </div>
                    )}
                </div>
            ) : (
                <Card className="border-border-main overflow-hidden shadow-sm bg-bg-main">
                    <CardBody className="p-0">
                        {loading ? (
                            <div className="py-24 flex flex-col items-center justify-center animate-pulse">
                                <Activity size={32} className="text-primary mb-4 animate-spin" />
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Syncing Department Ledger...</p>
                            </div>
                        ) : depts.length === 0 ? (
                            <div className="py-24 flex flex-col items-center justify-center text-center px-6">
                                <div className="h-16 w-16 rounded-full bg-neutral-subtle text-text-muted flex items-center justify-center mb-4 border border-border-main">
                                    <Building2 size={32} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">No nodes found</h3>
                                    <p className="text-xs font-bold text-text-muted uppercase">Add your first department to begin mapping your infrastructure.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <THead>
                                        <TR>
                                            <TH className="pl-6">DEPARTMENT DESIGNATION</TH>
                                            <TH>INFRA_CODE</TH>
                                            <TH>ZONE / LEVEL</TH>
                                            <TH>ASSET INDEX</TH>
                                            <TH>DESCRIPTION / CONTEXT</TH>
                                            <TH className="pr-6 text-right">COMMANDS</TH>
                                        </TR>
                                    </THead>
                                    <TBody>
                                        {depts.map(d => (
                                            <TR key={d._id} interactive onClick={() => navigate(`/assets?department=${d.name}`)}>
                                                <TD className="pl-6">
                                                    <span className="text-xs font-bold text-text-main/80 uppercase tracking-tight">{d.name}</span>
                                                </TD>
                                                <TD>
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 font-bold">{d.code}</Badge>
                                                </TD>
                                                <TD>
                                                    <div className="flex items-center gap-2 text-text-muted">
                                                        <MapPin size={12} />
                                                        <span className="text-[11px] font-bold uppercase tracking-tight">{d.floor || 'Unmapped'}</span>
                                                    </div>
                                                </TD>
                                                <TD>
                                                    <div className="flex items-center gap-2 text-text-main/70">
                                                        <Layers size={12} className="text-text-muted" />
                                                        <span className="text-[11px] font-bold font-mono">{counts[d.name] || 0}</span>
                                                    </div>
                                                </TD>
                                                <TD>
                                                    <p className="text-[10px] font-bold text-text-muted uppercase truncate max-w-[200px]">{d.description || '-'}</p>
                                                </TD>
                                                <TD className="pr-6 text-right" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                                                            <Edit size={14} className="text-text-muted hover:text-primary" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(d._id)}>
                                                            <Trash2 size={14} className="text-text-muted hover:text-accent-red" />
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
            )}

            <Modal
                show={showModal}
                onClose={() => setShowModal(false)}
                title={editId ? 'Synchronize Node Configuration' : 'Initialize Infrastructure Node'}
                size="md"
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <Field label="Department Designation" required>
                        <Input
                            value={form.name}
                            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="e.g. Information Technology"
                            icon={Building2}
                        />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Infrastructure Code" required>
                            <Select
                                value={form.code}
                                onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                                icon={Hash}
                            >
                                {CODES.map(c => <option key={c} value={c}>{c}</option>)}
                            </Select>
                        </Field>
                        <Field label="Floor / Level Mapping">
                            <Input
                                value={form.floor}
                                onChange={e => setForm(p => ({ ...p, floor: e.target.value }))}
                                placeholder="e.g. Level 2"
                                icon={MapPin}
                            />
                        </Field>
                    </div>
                    <Field label="Administrative Context">
                        <Textarea
                            value={form.description}
                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            placeholder="Briefly describe the node's function and technical scope..."
                            rows={4}
                            className="text-xs uppercase"
                        />
                    </Field>
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-main">
                        <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="uppercase tracking-widest text-[10px] font-bold text-text-muted hover:text-text-main">
                            Terminate
                        </Button>
                        <Button type="submit" variant="primary" loading={saving} icon={Shield} className="uppercase tracking-widest text-[10px] font-bold shadow-primary">
                            Execute Command
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}


