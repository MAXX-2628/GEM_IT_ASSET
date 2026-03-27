import React, { useState, useEffect } from 'react'
import { X, ArrowRightLeft, User, ShieldCheck, Video, Building2, MapPin, Hash, Key, Activity, ChevronRight, ChevronLeft, Globe, FileText } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Modal, Button, Input, Field, Select, Textarea, Badge } from './ui'

export default function DeployModal({ asset, onClose, onDone, onOther }) {
    const [step, setStep] = useState(1) // 1: Select Type, 2: IT Info, 3: Surveillance Info
    const [form, setForm] = useState({ to_department: asset.department, to_location: asset.location || '', notes: '' })
    const [survForm, setSurvForm] = useState({
        location: asset.specs?.custom?.location || asset.location || '',
        ip_address: asset.specs?.custom?.ip_address || asset.ip_address || '',
        serial_number: asset.specs?.custom?.serial_number || asset.specs?.serial_number || '',
        nvr_connection: asset.specs?.custom?.nvr_connection || asset.specs?.model || '',
        linked_nvr_id: asset.specs?.custom?.linked_nvr_id || asset.asset_id,
        username: asset.specs?.custom?.username || asset.credentials?.username || 'admin',
        password: asset.specs?.custom?.password || asset.credentials?.password || '',
        status: 'Active',
        notes: asset.specs?.custom?.notes || asset.notes || ''
    })
    const [loading, setLoading] = useState(false)
    const [depts, setDepts] = useState([])
    const [nvrs, setNvrs] = useState([])

    useEffect(() => {
        api.get('/departments').then(r => setDepts(r.data.data.map(d => d.name)))

        if (asset.asset_type === 'Camera') {
            api.get('/assets?limit=1000').then(r => {
                const liveNvrs = r.data.data.filter(a =>
                    ['Active', 'In Stock', 'Under Maintenance'].includes(a.status) &&
                    (a.asset_type.match(/NVR|DVR|Server/i))
                )
                setNvrs(liveNvrs)
            }).catch(e => console.error("Failed to fetch NVRs", e))
        }
    }, [asset.asset_type])

    const handleDeployIT = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await api.post(`/assets/${asset.asset_id}/transfer`, {
                ...form,
                to_user: 'IT Internal',
                action_type: 'Deploy'
            })
            toast.success('Asset deployed to IT successfully!')
            onDone()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Deployment failed')
        } finally { setLoading(false) }
    }

    const handleDeploySurveillance = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await api.post('/surveillance/deploy', {
                ...survForm,
                asset_id: asset.asset_id
            })
            toast.success('Camera deployed to surveillance system!')
            onDone()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Deployment failed')
        } finally { setLoading(false) }
    }

    return (
        <Modal
            show={true}
            onClose={onClose}
            title="Asset Deployment Protocol"
            subtitle={`Initializing deployment sequence for ${asset.asset_id} (${asset.asset_type})`}
            size={step === 3 ? "lg" : "md"}
        >
            <div className="space-y-8">
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] px-1">Choose Deployment Logic</p>
                        <div className="grid grid-cols-1 gap-4">
                            {asset.asset_type === 'Camera' && (
                                <button 
                                    onClick={() => setStep(3)}
                                    className="flex items-center gap-5 p-5 rounded-[2rem] border border-border-main bg-bg-main/5 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group relative overflow-hidden"
                                >
                                    <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 group-hover:scale-110 transition-transform">
                                        <Video size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-black text-text-main uppercase tracking-tight">Surveillance Network</h4>
                                        <p className="text-[11px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Add to security map with connection protocols.</p>
                                    </div>
                                    <ChevronRight size={18} className="text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                </button>
                            )}

                            <button
                                disabled={asset.asset_type === 'Camera'}
                                onClick={() => setStep(2)}
                                className={`flex items-center gap-5 p-5 rounded-[2rem] border border-border-main bg-bg-main/5 transition-all text-left group relative overflow-hidden ${asset.asset_type === 'Camera' ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:border-primary/50 hover:bg-primary/5'}`}
                            >
                                <div className="h-14 w-14 rounded-2xl bg-bg-main/5 text-text-muted flex items-center justify-center shrink-0 border border-border-main group-hover:scale-110 group-hover:text-primary transition-transform">
                                    <ShieldCheck size={24} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-black text-text-main uppercase tracking-tight">Internal IT Node</h4>
                                    <p className="text-[11px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Standard deployment to internal personnel.</p>
                                </div>
                                <ChevronRight size={18} className="text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </button>

                            <button
                                disabled={asset.asset_type === 'Camera'}
                                onClick={onOther}
                                className={`flex items-center gap-5 p-5 rounded-[2rem] border border-border-main bg-bg-main/5 transition-all text-left group relative overflow-hidden ${asset.asset_type === 'Camera' ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:border-primary/50 hover:bg-primary/5'}`}
                            >
                                <div className="h-14 w-14 rounded-2xl bg-accent-green/10 text-accent-green flex items-center justify-center shrink-0 border border-accent-green/20 group-hover:scale-110 transition-transform">
                                    <User size={24} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-black text-text-main uppercase tracking-tight">Standard Personnel</h4>
                                    <p className="text-[11px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Requires signature & photographic verification.</p>
                                </div>
                                <ChevronRight size={18} className="text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </button>
                        </div>
                        {asset.asset_type === 'Camera' && (
                            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-3">
                                <Activity size={16} className="text-primary animate-pulse" />
                                Restriction: Cameras require surveillance mapping protocols.
                            </div>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <form onSubmit={handleDeployIT} className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="space-y-6">
                            <Field label="Target Department" required>
                                <Select 
                                    value={form.to_department} 
                                    onChange={e => setForm(p => ({ ...p, to_department: e.target.value }))}
                                    icon={Building2}
                                    className="bg-neutral-subtle"
                                >
                                    <option value="">Select Department</option>
                                    {depts.map(d => <option key={d}>{d}</option>)}
                                </Select>
                            </Field>
                            <Field label="Physical Location / Floor">
                                <Input 
                                    value={form.to_location} 
                                    onChange={e => setForm(p => ({ ...p, to_location: e.target.value }))} 
                                    placeholder="e.g. IT Command Center, Level 2"
                                    icon={MapPin}
                                    className="bg-neutral-subtle text-text-main font-bold uppercase"
                                />
                            </Field>
                            <Field label="Administrative Notes">
                                <Textarea 
                                    value={form.notes} 
                                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} 
                                    placeholder="Enter technical deployment details..." 
                                    rows={4}
                                    className="bg-neutral-subtle text-text-main font-medium"
                                />
                            </Field>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-border-main bg-bg-card p-6 -mx-6 -mb-6 backdrop-blur-xl">
                            <Button type="button" variant="ghost" onClick={() => setStep(1)} icon={ChevronLeft} className="text-text-muted hover:text-text-main font-black text-[10px] tracking-widest uppercase">
                                BACK_TO_SELECTION
                            </Button>
                            <Button type="submit" variant="primary" loading={loading} icon={ShieldCheck} className="w-full sm:w-auto px-10 h-12 shadow-primary font-black text-[10px] tracking-widest uppercase">
                                EXECUTE_IT_DEPLOYMENT
                            </Button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleDeploySurveillance} className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-1 md:col-span-2">
                                <Field label="Camera Installation Zone" required>
                                    <Input 
                                        required 
                                        value={survForm.location} 
                                        onChange={e => setSurvForm({ ...survForm, location: e.target.value })} 
                                        placeholder="e.g. Main Entrance North, Pharmacy Vault" 
                                        icon={MapPin}
                                        className="bg-neutral-subtle text-text-main font-bold uppercase"
                                    />
                                </Field>
                            </div>
                            <Field label="Network IP Address">
                                <Input 
                                    value={survForm.ip_address} 
                                    onChange={e => setSurvForm({ ...survForm, ip_address: e.target.value })} 
                                    placeholder="192.168.1.50" 
                                    icon={Globe}
                                    className="bg-bg-main/5 text-primary font-mono font-bold"
                                />
                            </Field>
                            <Field label="Hardware Serial">
                                <Input 
                                    value={survForm.serial_number} 
                                    onChange={e => setSurvForm({ ...survForm, serial_number: e.target.value })} 
                                    placeholder="SN_XXXXXXXX" 
                                    icon={Hash}
                                    className="bg-neutral-subtle text-text-main font-mono font-bold uppercase"
                                />
                            </Field>
                            <Field label="Master Controller / NVR">
                                <Select
                                    value={survForm.linked_nvr_id || ''}
                                    onChange={e => setSurvForm({ ...survForm, linked_nvr_id: e.target.value })}
                                    icon={Building2}
                                    className="bg-neutral-subtle font-black text-[10px] tracking-widest uppercase"
                                >
                                    <option value="">-- Standalone Node --</option>
                                    {nvrs.map(nvr => (
                                        <option key={nvr._id} value={nvr.asset_id}>
                                            {nvr.asset_id} ({nvr.asset_type})
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Controller Protocol / Channel">
                                <Input 
                                    value={survForm.nvr_connection} 
                                    onChange={e => setSurvForm({ ...survForm, nvr_connection: e.target.value })} 
                                    placeholder="e.g. Channel 4, Port 8080" 
                                    icon={Activity}
                                    className="bg-neutral-subtle text-text-main font-bold uppercase"
                                />
                            </Field>
                            <Field label="Gateway Username">
                                <Input 
                                    value={survForm.username} 
                                    onChange={e => setSurvForm({ ...survForm, username: e.target.value })} 
                                    icon={User}
                                    className="bg-neutral-subtle text-text-main font-bold"
                                />
                            </Field>
                            <Field label="Gateway Password">
                                <Input 
                                    type="password"
                                    value={survForm.password} 
                                    onChange={e => setSurvForm({ ...survForm, password: e.target.value })} 
                                    icon={Key}
                                    className="bg-neutral-subtle text-text-main font-bold"
                                />
                            </Field>
                        </div>
                        <Field label="Deployment Context">
                            <Textarea 
                                value={survForm.notes} 
                                onChange={e => setSurvForm({ ...survForm, notes: e.target.value })} 
                                placeholder="Security monitoring requirements..." 
                                rows={3}
                                className="bg-neutral-subtle text-text-main font-medium"
                            />
                        </Field>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-border-main bg-bg-card p-6 -mx-6 -mb-6 backdrop-blur-xl">
                            <Button type="button" variant="ghost" onClick={() => setStep(1)} icon={ChevronLeft} className="text-text-muted hover:text-text-main font-black text-[10px] tracking-widest uppercase">
                                BACK_TO_SELECTION
                            </Button>
                            <Button type="submit" variant="primary" loading={loading} icon={Video} className="w-full sm:w-auto px-10 h-12 shadow-primary font-black text-[10px] tracking-widest uppercase">
                                COMMIT_SURVEILLANCE_NODE
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    )
}
