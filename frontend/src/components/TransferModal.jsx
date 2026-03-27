import { useState, useEffect } from 'react'
import { X, ArrowRightLeft, Building2, MapPin, FileText, CheckCircle2, ShieldCheck, ChevronRight } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import HandoverModal from './HandoverModal'
import { Modal, Button, Input, Field, Select, Textarea, Badge } from './ui'

export default function TransferModal({ asset, onClose, onDone }) {
    const [form, setForm] = useState({ to_department: asset.department, to_location: asset.location || '', notes: '' })
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const [depts, setDepts] = useState([])

    useEffect(() => {
        api.get('/departments').then(r => setDepts(r.data.data.map(d => d.name)))
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await api.post(`/assets/${asset.asset_id}/transfer`, { ...form, action_type: 'Transfer' })
            toast.success('Asset relocation sequence initiated.')
            setDone(true)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Relocation protocol failed')
        } finally { setLoading(false) }
    }

    if (done === 'handover') {
        return <HandoverModal asset={asset} onClose={onDone} onDone={onDone} />
    }

    return (
        <Modal
            show={true}
            onClose={onClose}
            title="Asset Relocation Protocol"
            subtitle={`Initiating transfer sequence for ${asset.asset_id}`}
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="p-6 rounded-2xl bg-neutral-subtle border border-border-main flex items-center justify-between shadow-inner">
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none">Active Station</p>
                        <p className="text-sm font-black text-text-main uppercase tracking-tight">{asset.department || 'N/A'}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-primary">
                        <ArrowRightLeft size={18} />
                    </div>
                    <div className="space-y-1.5 text-right">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none">Target Node</p>
                        <p className="text-sm font-black text-primary uppercase tracking-tight">{form.to_department || 'Selecting...'}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <Field label="Target Department" required>
                        <Select 
                            value={form.to_department} 
                            onChange={e => setForm(p => ({ ...p, to_department: e.target.value }))}
                            icon={Building2}
                            className="bg-neutral-subtle"
                        >
                            <option value="">Select Department</option>
                            {depts.map(d => <option key={d} value={d}>{d}</option>)}
                        </Select>
                    </Field>

                    <Field label="Physical Relocation Node (Floor/Room)">
                        <Input 
                            placeholder="e.g. Diagnostic Wing, Floor 3" 
                            value={form.to_location} 
                            onChange={e => setForm(p => ({ ...p, to_location: e.target.value }))} 
                            icon={MapPin}
                            className="bg-neutral-subtle text-text-main font-bold uppercase"
                        />
                    </Field>

                    <Field label="Protocol Notes / Reason">
                        <Textarea 
                            placeholder="State the reason for hardware relocation..." 
                            value={form.notes} 
                            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} 
                            rows={3}
                            className="bg-neutral-subtle text-text-main font-medium"
                        />
                    </Field>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-border-main bg-neutral-subtle/20 p-6 -mx-6 -mb-6 backdrop-blur-xl">
                    <Button type="button" variant="ghost" onClick={onClose} className="order-2 sm:order-1 text-text-muted hover:text-text-main font-black text-[10px] tracking-widest">
                        ABORT_SEQUENCE
                    </Button>

                    <div className="flex items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
                        {done ? (
                            <>
                                <Button type="button" variant="ghost" onClick={onDone} icon={CheckCircle2} className="flex-1 sm:flex-none border border-border-main text-accent-green font-black text-[10px] tracking-widest uppercase">
                                    ACKNOWLEDGE
                                </Button>
                                <Button type="button" variant="primary" onClick={() => setDone('handover')} icon={ShieldCheck} className="flex-1 sm:flex-none px-8 font-black text-[10px] tracking-widest uppercase shadow-primary">
                                    CAPTURE_PROOF
                                </Button>
                            </>
                        ) : (
                            <Button 
                                type="submit" 
                                variant="primary" 
                                loading={loading} 
                                icon={ArrowRightLeft}
                                disabled={!form.to_department}
                                className="w-full sm:w-auto px-10 font-black text-[10px] tracking-widest uppercase shadow-primary"
                            >
                                EXECUTE_TRANSFER
                            </Button>
                        )}
                    </div>
                </div>
            </form>
        </Modal>
    )
}
