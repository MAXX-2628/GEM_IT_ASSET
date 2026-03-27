import { useState, useEffect } from 'react'
import { CheckCircle2, RefreshCw, X, Box, Terminal, Activity, AlertCircle, Shield } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Modal, Button, Field, Select, Badge } from './ui'

export default function BulkStatusModal({ assets, onClose, onDone }) {
    const [loading, setLoading] = useState(false)
    const [statusList, setStatusList] = useState([])
    const [newStatus, setNewStatus] = useState('')
    const [remarks, setRemarks] = useState('')

    useEffect(() => {
        api.get('/statuses').then(res => {
            const list = res.data.data.map(s => s.name)
            setStatusList(list)
            if (list.length > 0) setNewStatus(list[0])
        }).catch(() => toast.error('Failed to load status registry'))
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!newStatus) return toast.error("SELECT_TARGET_STATUS")

        setLoading(true)
        try {
            const asset_ids = assets.map(a => a.asset_id)
            await api.post('/assets/bulk-status', { asset_ids, status: newStatus, remarks })
            toast.success(`STATUS_RECONCILIATION_COMPLETE: ${assets.length} nodes updated to ${newStatus}`)
            onDone()
        } catch (err) {
            toast.error(err.response?.data?.message || 'TRANSACTION_PROTOCOL_FAILURE')
        } finally { setLoading(false) }
    }

    return (
        <Modal
            show={true}
            onClose={onClose}
            title="BATCH_STATUS_RECONCILIATION"
            subtitle={
                <div className="flex items-center gap-2 text-text-muted font-black uppercase tracking-widest text-[9px]">
                    <Terminal size={10} className="text-accent-amber" />
                    <span>SYSTEM_STATE_SYNCHRONIZATION_v1.2</span>
                </div>
            }
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-8 p-2">
                {/* Selection Summary Panel */}
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 flex flex-col gap-5 shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] rotate-12">
                        <Box size={100} />
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="h-12 w-12 rounded-2xl bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center text-accent-amber shrink-0">
                            <Activity size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">SELECTED_NODES</p>
                            <p className="text-2xl font-black text-accent-amber tracking-tighter leading-none">{assets.length}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 relative z-10 max-h-24 overflow-y-auto pr-2 custom-scrollbar no-scrollbar">
                        {assets.map(a => (
                            <code key={a.asset_id} className="text-[9px] font-black text-text-muted py-1 px-3 bg-neutral-subtle border border-border-main rounded-xl">
                                {a.asset_id}
                            </code>
                        ))}
                    </div>
                </div>

                {/* Status Selection Logic */}
                <div className="space-y-6">
                    <Field label="TARGET_SYSTEM_STATE" required>
                        <Select
                            value={newStatus}
                            onChange={e => setNewStatus(e.target.value)}
                            className="font-black text-xs tracking-widest uppercase h-14 bg-black/20"
                        >
                            {statusList.map(s => (
                                <option key={s} value={s}>{s.toUpperCase()}</option>
                            ))}
                        </Select>
                    </Field>

                    <div className="p-6 rounded-[2rem] bg-accent-amber/5 border border-accent-amber/10 flex items-start gap-4">
                        <div className="p-2 rounded-xl bg-accent-amber/10">
                            <AlertCircle size={20} className="text-accent-amber" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-accent-amber uppercase tracking-widest">STATE_TRANSITION_WARNING</p>
                            <p className="text-[11px] text-text-dim leading-relaxed font-bold uppercase tracking-tight">
                                Updating nodes will modify lifecycle flags. This action is irreversible and will be logged in the primary activity matrix.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-10 border-t border-white/5 bg-black/20 p-6 -mx-6 -mb-6 backdrop-blur-xl">
                    <Button type="button" variant="ghost" onClick={onClose} icon={X} className="text-text-muted hover:text-text-main font-black text-[10px] tracking-widest">
                        ABORT_PROTOCOL
                    </Button>

                    <Button 
                        type="submit" 
                        variant="primary" 
                        loading={loading} 
                        icon={RefreshCw} 
                        className="px-12 h-12 shadow-[0_0_25px_rgba(255,106,0,0.3)] font-black text-[10px] tracking-widest uppercase"
                    >
                        SYNC_STATE_MATRIX
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
