import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, Upload, Trash2, Plus, Info, AlertTriangle, Cpu, CreditCard, ShieldCheck, FileText, Database, Shield, Zap, Hash, Terminal, Box, Activity } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Card, CardHeader, CardTitle, CardBody, Button, Badge, Input, Select, Textarea, PageHeader, Field } from '../components/ui'

const CONTEXT_STATUS = {
    stock: 'In Stock',
    live: 'Active',
    scrap: 'Scrapped'
}

const EMPTY = {
    asset_id: '', asset_type: 'PC', hostname: '', mac_address: '', ip_address: '',
    department: '', location: '', assigned_user: '', sub_category: '', status: 'In Stock', notes: '',
    specs: { cpu: '', ram: '', storage: '', storage_type: '', os: '', model: '', serial_number: '', custom: {} },
    amc: { vendor: '', start_date: '', end_date: '', contact: '', contract_number: '' },
    warranty_end: '', purchase_date: '', vendor: '', purchase_cost: '',
    credentials: [{ label: 'Primary', username: '', password: '' }]
}

const CORE_FIELD_KEYS = [
    'asset_id', 'asset_type', 'sub_category', 'department', 'status', 'location', 
    'hostname', 'mac_address', 'ip_address', 'assigned_user', 'notes',
    'cpu', 'ram', 'storage', 'model', 'serial_number', 'serial_num', 'purchase_date', 
    'warranty_end', 'vendor', 'purchase_cost'
]

export default function AssetForm({ context }) {
    const { id } = useParams()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const isEdit = Boolean(id)

    const activeContext = context || searchParams.get('context')
    const contextStatus = !isEdit ? (CONTEXT_STATUS[activeContext] || 'In Stock') : null

    const [form, setForm] = useState(() => ({ ...EMPTY, status: contextStatus || EMPTY.status }))
    const [file, setFile] = useState(null)
    const [showCredentials, setShowCredentials] = useState(false)
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [typeList, setTypeList] = useState([])
    const [deptList, setDeptList] = useState([])
    const [floorList, setFloorList] = useState([])

    const [statusList, setStatusList] = useState([])
    const [vendorList, setVendorList] = useState([])
    const [dynamicOptions, setDynamicOptions] = useState({})
    const [nextIdPreview, setNextIdPreview] = useState('')

    const fetchMasterData = useCallback(async () => {
        try {
            const [tRes, dRes, sRes, vRes, fRes] = await Promise.all([
                api.get('/types'),
                api.get('/departments'),
                api.get('/statuses'),
                api.get('/vendors'),
                api.get('/floors')
            ])
            setTypeList(tRes.data.data)
            setDeptList(dRes.data.data.map(d => d.name))
            setStatusList(sRes.data.data.map(s => s.name))
            setVendorList(vRes.data.data)
            setFloorList(fRes.data.data.map(f => f.name))

            if (isEdit) {
                const { data } = await api.get(`/assets/${id}`)
                const a = data.data
                setForm({
                    ...a,
                    specs: {
                        ...(a.specs || {}),
                        custom: a.specs?.custom || {}
                    },
                    warranty_end: a.warranty_end ? a.warranty_end.slice(0, 10) : '',
                    purchase_date: a.purchase_date ? a.purchase_date.slice(0, 10) : '',
                    amc: { ...a.amc, start_date: a.amc?.start_date?.slice(0, 10) || '', end_date: a.amc?.end_date?.slice(0, 10) || '' },
                    credentials: (a.credentials && a.credentials.length > 0) ? a.credentials : [{ label: 'Primary', username: '', password: '' }]
                })
                if (a.credentials?.length > 0) setShowCredentials(true)
            } else if (contextStatus) {
                setForm(prev => ({ ...prev, status: contextStatus }))
            }
        } catch {
            toast.error('Failed to load master data')
        } finally {
            setFetching(false)
        }
    }, [id, isEdit, contextStatus])

    useEffect(() => { fetchMasterData() }, [fetchMasterData])

    useEffect(() => {
        const fetchDynamic = async () => {
            const selectedType = typeList.find(t => t.name === form.asset_type)
            const customFields = selectedType?.custom_fields || []
            const assetsToFetch = customFields.filter(f => f.data_source === 'assets' && f.data_source_config?.asset_type_id)

            if (!isEdit && form.asset_type) {
                try {
                    const idRes = await api.get(`/assets/next-id?asset_type=${encodeURIComponent(form.asset_type)}`);
                    if (idRes.data.success) {
                        setNextIdPreview(idRes.data.data);
                        setForm(prev => ({ ...prev, asset_id: idRes.data.data }));
                    }
                } catch {
                    console.error('ID_GEN_FAILURE');
                }
            }

            if (assetsToFetch.length === 0) return

            const newOptions = {}
            await Promise.all(assetsToFetch.map(async (f) => {
                try {
                    const res = await api.get(`/assets?asset_type=${f.data_source_config.asset_type_id}&limit=1000`)
                    newOptions[f.key] = res.data.data.map(a => `${a.asset_id} - ${a.hostname || a.department || 'Unnamed'}`)
                } catch {
                    console.error(`DYNAMIC_SOURCE_FETCH_ERROR: ${f.key}`)
                }
            }))
            setDynamicOptions(prev => ({ ...prev, ...newOptions }))
        }
        fetchDynamic()
    }, [form.asset_type, typeList, isEdit])

    const set = (path, val) => {
        setForm(prev => {
            const parts = path.split('.')
            const newForm = { ...prev }
            let curr = newForm

            for (let i = 0; i < parts.length - 1; i++) {
                let p = parts[i]
                let isArr = p.startsWith('[') && p.endsWith(']')
                let key = isArr ? parseInt(p.slice(1, -1)) : p

                if (Array.isArray(curr[key])) {
                    curr[key] = [...curr[key]]
                } else {
                    curr[key] = { ...curr[key] }
                }
                curr = curr[key]
            }

            let lastPart = parts[parts.length - 1]
            let isLastArr = lastPart.startsWith('[') && lastPart.endsWith(']')
            let lastKey = isLastArr ? parseInt(lastPart.slice(1, -1)) : lastPart
            curr[lastKey] = val

            return newForm
        })
    }

    const getValue = (path) => {
        const parts = path.split('.')
        let curr = form
        for (const p of parts) {
            if (curr === undefined || curr === null) return ''
            if (p.startsWith('[') && p.endsWith(']')) {
                const idx = parseInt(p.slice(1, -1))
                curr = curr[idx]
            } else {
                curr = curr[p]
            }
        }
        return curr !== undefined ? curr : ''
    }

    const addCredential = () => {
        setForm(prev => ({
            ...prev,
            credentials: [...prev.credentials, { label: '', username: '', password: '' }]
        }))
    }

    const removeCredential = (index) => {
        if (form.credentials.length <= 1) {
            setForm(prev => ({
                ...prev,
                credentials: [{ label: 'Primary', username: '', password: '' }]
            }))
            return
        }
        setForm(prev => ({
            ...prev,
            credentials: prev.credentials.filter((_, i) => i !== index)
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const selectedType = typeList.find(t => t.name === form.asset_type)
        const customFields = selectedType?.custom_fields || []
        const hasField = (k) => customFields.some(f => f.key === k)

        setLoading(true)
        const formData = new FormData()
        let finalForm = { ...form }
        if (!isEdit) {
            if (contextStatus) finalForm.status = contextStatus
            if (!hasField('department') && !finalForm.department) {
                finalForm.department = activeContext === 'live' ? 'UNASSIGNED' : 'IT STOCK'
            }
            if (!hasField('assigned_user') && !finalForm.assigned_user) {
                finalForm.assigned_user = activeContext === 'live' ? 'UNASSIGNED' : ''
            }
            if (!hasField('location') && !finalForm.location && activeContext === 'stock') {
                finalForm.location = 'STORE'
            }
        }

        formData.append('data', JSON.stringify(finalForm))
        if (file) formData.append('attachment', file)

        try {
            let res
            if (isEdit) {
                res = await api.put(`/assets/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
                toast.success('Asset updated successfully')
            } else {
                res = await api.post('/assets', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
                toast.success('Asset registered successfully')
            }
            const backNav = activeContext ? `/assets/${activeContext}` : `/assets/${res.data.data.asset_id}`
            navigate(backNav)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Data save failure')
        } finally { setLoading(false) }
    }

    if (fetching) return (
        <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6">
            <div className="relative">
                <div className="w-16 h-16 border-2 border-neutral-subtle border-t-primary rounded-full animate-spin" />
                <div className="absolute inset-2 border-2 border-neutral-subtle border-b-secondary rounded-full animate-reverse-spin" />
            </div>
            <p className="text-text-muted font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Initializing Form...</p>
        </div>
    )

    const pageTitle = activeContext ? `${isEdit ? 'UPDATE' : 'ADD NEW'} ${(activeContext || '').toUpperCase()}` : (isEdit ? `EDIT ASSET: ${id}` : 'ADD NEW ASSET')

    const selectedType = typeList.find(t => t.name === form.asset_type)
    const baseFields = (selectedType?.custom_fields || []).filter(f => !CORE_FIELD_KEYS.includes(f.key))
    const subCatFields = ((selectedType?.sub_category_fields || []).find(f => f.sub_category_name === form.sub_category)?.fields || []).filter(f => !CORE_FIELD_KEYS.includes(f.key))
    let customFields = [...baseFields, ...subCatFields.map(f => ({ ...f, isSubCat: true }))]

    return (
        <div className="max-w-7xl mx-auto pb-20">
            <PageHeader
                title={pageTitle}
                subtitle={
                    <div className="flex items-center gap-2 text-text-muted font-black uppercase tracking-widest text-[10px]">
                        <Terminal size={12} className="text-primary" />
                        <span>{isEdit ? 'Edit asset details and specifications' : 'Register a new asset in the system'}</span>
                    </div>
                }
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="md" onClick={() => navigate(-1)} icon={ArrowLeft} className="text-text-muted hover:text-text-main border border-border-main">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="asset-form"
                            variant="primary"
                            size="md"
                            loading={loading}
                            icon={Save}
                            className="shadow-primary px-8"
                        >
                            {isEdit ? 'Save Changes' : 'Save Asset'}
                        </Button>
                    </div>
                }
            />

            <form id="asset-form" onSubmit={handleSubmit} className="space-y-8 mt-10">
                {form.asset_type === 'Camera' && (
                    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 flex items-start gap-4 animate-pulse">
                        <div className="p-3 bg-primary/20 rounded-xl text-primary shrink-0">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-text-main uppercase tracking-widest mb-1 leading-none">SURVEILLANCE CONFIGURATION</h4>
                            <p className="text-xs text-text-muted font-bold leading-relaxed uppercase tracking-tight">
                                Camera assets require precise network and location settings. Please ensure the IP address and location are accurately mapped for system synchronization.
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Primary Information */}
                        <Card className="glass border-border-main relative z-50 overflow-visible">
                            <CardHeader className="p-6 border-b border-border-main">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-primary">
                                        <Database size={18} />
                                    </div>
                                    <CardTitle className="text-text-main uppercase tracking-widest text-sm font-black">Primary Information</CardTitle>
                                </div>
                            </CardHeader>
                            <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8">
                                <Field label="Asset ID" helpText={!isEdit ? "System assigned if left blank" : ""}>
                                    <Input
                                        placeholder="GEM-ASSET-XXXX"
                                        value={form.asset_id}
                                        onChange={e => set('asset_id', e.target.value)}
                                        className="font-mono text-xs"
                                        readOnly={isEdit}
                                    />
                                </Field>
                                <Field label="Category">
                                    <Select
                                        value={form.asset_type}
                                        onChange={e => set('asset_type', e.target.value)}
                                        disabled={isEdit}
                                        className="font-black text-[10px] tracking-widest"
                                    >
                                        {typeList.map(t => <option key={t._id} value={t.name}>{t.name.toUpperCase()}</option>)}
                                    </Select>
                                </Field>
                                {(selectedType?.sub_categories?.length > 0) && (
                                    <Field label="Sub-Category">
                                        <Select
                                            value={form.sub_category}
                                            onChange={e => set('sub_category', e.target.value)}
                                            className="font-black text-[10px] tracking-widest"
                                        >
                                            <option value="">None</option>
                                            {selectedType.sub_categories.map(sc => <option key={sc.name} value={sc.name}>{sc.name.toUpperCase()}</option>)}
                                        </Select>
                                    </Field>
                                )}
                                <Field label="Department">
                                    <Select
                                        value={form.department}
                                        onChange={e => set('department', e.target.value)}
                                        className="font-black text-[10px] tracking-widest"
                                    >
                                        <option value="">Select Department</option>
                                        {deptList.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                                    </Select>
                                </Field>
                                <Field label="Status">
                                    <Select
                                        value={form.status}
                                        onChange={e => set('status', e.target.value)}
                                        disabled={!!activeContext}
                                        className="font-black text-[10px] tracking-widest"
                                    >
                                        {statusList.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                    </Select>
                                </Field>
                                <Field label="Location">
                                    <Select
                                        value={form.location}
                                        onChange={e => set('location', e.target.value)}
                                        className="font-black text-[10px] tracking-widest"
                                    >
                                        <option value="">Select Location</option>
                                        {floorList.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                                    </Select>
                                </Field>
                            </CardBody>
                        </Card>

                        {/* Technical Profile */}
                        <Card className="glass border-border-main relative z-40 overflow-visible">
                            <CardHeader className="p-6 border-b border-border-main">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-secondary/10 text-secondary shadow-secondary">
                                        <Cpu size={18} />
                                    </div>
                                    <CardTitle className="text-text-main uppercase tracking-widest text-sm font-black">Hardware Specifications</CardTitle>
                                </div>
                            </CardHeader>
                            <CardBody className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                                    <Field label="Hostname">
                                        <Input value={form.hostname} onChange={e => set('hostname', e.target.value)} placeholder="GEM-WK-14" className="font-mono text-xs uppercase" />
                                    </Field>
                                    <Field label="MAC Address">
                                        <Input value={form.mac_address} onChange={e => set('mac_address', e.target.value)} placeholder="00:00:00:00:00:00" className="font-mono text-xs" />
                                    </Field>
                                    <Field label="IP Address">
                                        <Input value={form.ip_address} onChange={e => set('ip_address', e.target.value)} placeholder="192.168.1.1" className="font-mono text-xs" />
                                    </Field>
                                    <Field label="Custodian">
                                        <Input value={form.assigned_user} onChange={e => set('assigned_user', e.target.value)} placeholder="User Name" className="uppercase font-bold text-xs" />
                                    </Field>
                                </div>

                                <div className="space-y-8 pt-10 border-t border-border-main">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-1 h-5 bg-secondary rounded-full shadow-secondary" />
                                        <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Hardware Details</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Field label="Processor">
                                            <Input value={form.specs.cpu} onChange={e => set('specs.cpu', e.target.value)} className="uppercase text-xs" />
                                        </Field>
                                        <Field label="Memory">
                                            <Input value={form.specs.ram} onChange={e => set('specs.ram', e.target.value)} className="uppercase text-xs" />
                                        </Field>
                                        <Field label="Storage">
                                            <Input value={form.specs.storage} onChange={e => set('specs.storage', e.target.value)} className="uppercase text-xs" />
                                        </Field>
                                        <Field label="Model">
                                            <Input value={form.specs.model} onChange={e => set('specs.model', e.target.value)} className="uppercase text-xs" />
                                        </Field>
                                        <Field label="Serial Number">
                                            <Input value={form.specs.serial_number} onChange={e => set('specs.serial_number', e.target.value)} className="font-mono text-xs uppercase" />
                                        </Field>
                                        {customFields.map(f => {
                                            const path = f.isSystem ? f.key : `specs.custom.${f.key}`
                                            if (f.field_type === 'section') return (
                                                <div key={f.key} className="col-span-1 md:col-span-2 pt-8 pb-4 border-b border-border-main mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1 h-4 bg-secondary rounded-full" />
                                                        <h4 className="text-[10px] font-black text-text-dim uppercase tracking-widest">{f.label?.toUpperCase()}</h4>
                                                    </div>
                                                </div>
                                            )
                                            return (
                                                <Field key={f.key} label={f.label?.toUpperCase()} required={f.required} helpText={f.help_text?.toUpperCase()}>
                                                    {f.field_type === 'select' ? (
                                                        <Select value={getValue(path)} onChange={e => set(path, e.target.value)} className="font-black text-[10px] tracking-widest">
                                                            <option value="">SELECT_{(f.label || '').replace(' ', '_').toUpperCase()}</option>
                                                            {(f.data_source === 'assets' ? (dynamicOptions[f.key] || []) : f.options || []).map(o => <option key={o} value={o}>{(o || '').toString().toUpperCase()}</option>)}
                                                        </Select>
                                                    ) : f.field_type === 'textarea' ? (
                                                        <Textarea value={getValue(path)} onChange={e => set(path, e.target.value)} className="font-bold text-xs uppercase" />
                                                    ) : (
                                                        <Input type={f.field_type} value={getValue(path)} onChange={e => set(path, e.target.value)} className="font-bold text-xs uppercase" />
                                                    )}
                                                </Field>
                                            )
                                        })}
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>

                    <div className="space-y-8">
                        {/* Financials & LifeCycle */}
                        <Card className="glass border-border-main relative z-30 overflow-visible">
                            <CardHeader className="p-6 border-b border-border-main">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                        <CreditCard size={18} />
                                    </div>
                                    <CardTitle className="text-text-main uppercase tracking-widest text-sm font-black">Purchase Information</CardTitle>
                                </div>
                            </CardHeader>
                            <CardBody className="space-y-6 p-8">
                                <Field label="Purchase Date">
                                    <Input type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} className="font-mono text-xs appearance-none" />
                                </Field>
                                <Field label="Warranty Expiry">
                                    <Input type="date" value={form.warranty_end} onChange={e => set('warranty_end', e.target.value)} className="font-mono text-xs" />
                                </Field>
                                <Field label="Vendor">
                                    <Select value={form.vendor} onChange={e => set('vendor', e.target.value)} className="font-black text-[10px] tracking-widest">
                                        <option value="">Select Vendor</option>
                                        {vendorList.map(v => <option key={v._id} value={v.name}>{v.name.toUpperCase()}</option>)}
                                    </Select>
                                </Field>
                                <Field label="Purchase Cost (₹)">
                                    <Input type="number" value={form.purchase_cost} onChange={e => set('purchase_cost', e.target.value)} placeholder="0.00" className="font-mono text-primary font-black" />
                                </Field>
                            </CardBody>
                        </Card>

                        {/* Security Access */}
                        <Card className="glass border-border-main relative z-20 overflow-hidden group">
                           <div className={`absolute inset-0 bg-secondary/5 transition-opacity duration-1000 ${showCredentials ? 'opacity-100' : 'opacity-0'}`} />
                            <CardHeader className="flex flex-row items-center justify-between p-6 border-b border-border-main relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl transition-all duration-500 ${showCredentials ? 'bg-secondary text-white shadow-secondary' : 'bg-neutral-subtle text-text-muted'}`}>
                                        <Shield size={18} />
                                    </div>
                                    <CardTitle className="text-text-main uppercase tracking-widest text-sm font-black">Access Credentials</CardTitle>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowCredentials(!showCredentials)}
                                    className={`text-[9px] font-black tracking-[0.2em] px-3 py-1.5 rounded-lg border transition-all ${showCredentials ? 'border-secondary text-secondary shadow-secondary' : 'border-border-main text-text-muted hover:text-text-main hover:border-text-muted'}`}
                                >
                                    {showCredentials ? 'Hide Credentials' : 'Add Credentials'}
                                </button>
                            </CardHeader>
                            <CardBody className="p-6 relative z-10">
                                {showCredentials ? (
                                    <div className="space-y-6">
                                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                                            {form.credentials.map((cred, idx) => (
                                                <div key={idx} className="p-5 rounded-2xl border border-border-main bg-neutral-subtle/5 relative group/cred hover:border-secondary/30 transition-all duration-500">
                                                    <div className="space-y-4 pr-8">
                                                        <Field label="Label">
                                                            <Input value={cred.label} onChange={e => set(`credentials.[${idx}].label`, e.target.value)} placeholder="e.g. BIOS Primary" className="text-[10px] uppercase font-black" />
                                                        </Field>
                                                        <Field label="Username">
                                                            <Input value={cred.username} onChange={e => set(`credentials.[${idx}].username`, e.target.value)} className="font-mono text-xs" />
                                                        </Field>
                                                        <Field label="Password">
                                                            <Input type="password" value={cred.password} onChange={e => set(`credentials.[${idx}].password`, e.target.value)} className="font-mono text-xs text-secondary" />
                                                        </Field>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeCredential(idx)}
                                                        className="absolute top-4 right-4 p-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div >
                                        <Button variant="ghost" size="sm" type="button" onClick={addCredential} icon={Plus} className="w-full border-dashed border-border-main text-text-muted py-6 h-auto hover:text-secondary hover:border-secondary/30 font-black text-[9px] tracking-[0.3em]">
                                            Add Another Credential
                                        </Button>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => setShowCredentials(true)}
                                        className="py-16 flex flex-col items-center justify-center border-2 border-dashed border-border-main rounded-[2rem] cursor-pointer hover:bg-neutral-subtle transition-all duration-500 group/empty"
                                    >
                                        <div className="p-5 rounded-2xl bg-neutral-subtle text-text-muted mb-4 group-hover/empty:scale-110 group-hover/empty:text-secondary transition-all duration-500 shadow-inner">
                                            <Shield size={32} />
                                        </div>
                                        <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest">Credentials Restricted</h4>
                                        <p className="text-[8px] text-text-muted mt-2 font-black uppercase tracking-tighter">Click to add secure access credentials</p>
                                    </div>
                                )}
                            </CardBody>
                        </Card>

                         {/* Documentation */}
                         <Card className="glass border-border-main relative z-10 overflow-visible">
                            <CardHeader className="p-6 border-b border-border-main">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                        <FileText size={18} />
                                    </div>
                                    <CardTitle className="text-text-main uppercase tracking-widest text-sm font-black">Attachments</CardTitle>
                                </div>
                            </CardHeader>
                            <CardBody className="p-8">
                                <div
                                    onClick={() => document.getElementById('file-upload').click()}
                                    className="border-2 border-dashed border-border-main rounded-[2rem] p-10 text-center cursor-pointer hover:bg-neutral-subtle transition-all duration-500 group/upload relative overflow-hidden"
                                >
                                    <div className="mx-auto w-14 h-14 bg-neutral-subtle rounded-2xl flex items-center justify-center text-text-muted mb-4 group-hover/upload:scale-110 group-hover/upload:text-primary transition-all duration-500 shadow-inner">
                                        <Upload size={24} />
                                    </div>
                                    <h4 className="text-[10px] font-black text-text-main mb-2 uppercase tracking-widest">
                                        {file ? file.name : 'Upload Document'}
                                    </h4>
                                    <p className="text-[8px] text-text-muted leading-relaxed font-black uppercase tracking-widest">
                                        PDF / Images / Manuals
                                    </p>
                                    <input id="file-upload" type="file" hidden onChange={e => setFile(e.target.files[0])} />
                                    {file && <div className="absolute top-2 right-2 p-1.5 bg-primary text-white rounded-lg shadow-lg"><Activity size={10} className="animate-pulse" /></div>}
                                </div>
                            </CardBody>
                        </Card>

                        {/* Notes */}
                        <Card className="glass border-border-main relative z-[5] overflow-visible">
                            <CardHeader className="p-6 border-b border-border-main">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-neutral-subtle text-text-muted">
                                        <Zap size={18} />
                                    </div>
                                    <CardTitle className="text-text-main uppercase tracking-widest text-sm font-black">Notes</CardTitle>
                                </div>
                            </CardHeader>
                            <CardBody className="p-8">
                                <Textarea
                                    placeholder="Enter notes here..."
                                    value={form.notes}
                                    onChange={e => set('notes', e.target.value)}
                                    rows={4}
                                    className="font-bold text-xs uppercase"
                                />
                            </CardBody>
                        </Card>
                    </div>
                </div>

                {/* Sticky Footer Actions */}
                <div className="fixed bottom-0 left-0 right-0 p-6 z-50 pointer-events-none">
                    <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto bg-bg-main/80 backdrop-blur-xl border border-border-main rounded-[2rem] p-4 shadow-2xl ring-1 ring-primary/10">
                        <Button variant="ghost" size="lg" type="button" onClick={() => navigate(-1)} className="text-text-muted hover:text-text-main px-8 font-black text-[10px] tracking-widest">
                            Cancel
                        </Button>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end mr-4 hidden md:flex">
                                <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Form Status</span>
                                <span className="text-[10px] font-black text-accent-green uppercase tracking-widest">Ready to Save</span>
                            </div>
                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                loading={loading}
                                icon={Save}
                                className="px-12 h-14 shadow-primary font-black text-xs tracking-[0.2em]"
                            >
                                {isEdit ? 'Update Asset' : 'Save Asset'}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}

