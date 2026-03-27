import { useState } from 'react'
import { Trash2, ShieldAlert, Cpu, PackageCheck } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Modal, Button, Badge } from './ui'

export default function ScrapLinkedModal({ asset, onClose, onDone }) {
    // Initialize actions: default all peripherals to 'scrap'
    const [actions, setActions] = useState(
        (asset.peripherals || []).map(p => ({
            asset_id: p.asset_id,
            asset_type: p.asset_type,
            action: 'scrap'
        }))
    )
    const [loading, setLoading] = useState(false)

    const toggleAction = (idx, action) => {
        setActions(prev => prev.map((a, i) => i === idx
            ? { ...a, action: action }
            : a
        ))
    }

    const handleConfirm = async () => {
        setLoading(true)
        try {
            await api.post(`/assets/${asset.asset_id}/scrap`, {
                peripheralActions: actions.map(a => ({ asset_id: a.asset_id, action: a.action }))
            })
            toast.success('Asset and associated peripherals decommissioned.')
            onDone()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Decommissioning protocol failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            show={true}
            onClose={onClose}
            title="Asset Decommissioning Protocol"
            subtitle={`Initiating scrap sequence for ${asset.asset_id}`}
            size="md"
        >
            <div className="space-y-8">
                <div className="p-5 rounded-2xl bg-accent-red/5 border border-accent-red/10 flex items-start gap-5 animate-in fade-in slide-in-from-top-2">
                    <ShieldAlert size={20} className="text-accent-red mt-1 shrink-0" />
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-accent-red uppercase tracking-widest leading-none">Security Warning: PERMANENT_SCRAP</p>
                        <p className="text-[11px] text-text-muted leading-relaxed font-bold uppercase tracking-tight">
                            The primary node <span className="text-text-main underline font-black">{asset.asset_id}</span> will be marked as <span className="text-accent-red font-black">SCRAPPED</span>. This asset has <span className="text-text-main font-black">{asset.peripherals?.length} linked peripherals</span> that require individual resolution.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                        <Cpu size={12} className="text-primary" /> Peripheral Resolutions Required
                    </p>
                    <div className="max-h-[320px] overflow-y-auto custom-scrollbar border border-border-main rounded-[2rem] bg-bg-main/20 shadow-inner divide-y divide-border-main">
                        {actions.map((item, i) => (
                            <div key={item.asset_id} className="p-5 flex items-center justify-between group hover:bg-neutral-subtle/50 transition-all relative overflow-hidden">
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="h-10 w-10 rounded-xl bg-neutral-subtle border border-border-main flex items-center justify-center text-text-muted group-hover:scale-110 group-hover:text-primary group-hover:border-primary/30 transition-all">
                                        <Cpu size={20} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-black text-text-main uppercase tracking-tight">{item.asset_id}</span>
                                            <Badge variant="secondary" className="text-[8px] py-0 px-2 uppercase tracking-[0.1em] font-black h-4 border-border-main bg-neutral-subtle text-text-muted">{item.asset_type}</Badge>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center p-1 bg-bg-main/40 rounded-xl border border-border-main relative z-10">
                                    <button
                                        type="button"
                                        onClick={() => toggleAction(i, 'scrap')}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${item.action === 'scrap' ? 'bg-accent-red text-white shadow-primary' : 'text-text-muted hover:text-text-main'}`}
                                    >
                                        <Trash2 size={12} />
                                        SCRAP
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleAction(i, 'stock')}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${item.action === 'stock' ? 'bg-accent-green text-white shadow-primary' : 'text-text-muted hover:text-text-main'}`}
                                    >
                                        <PackageCheck size={12} />
                                        STOCK
                                    </button>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-border-main bg-bg-main/20 p-6 -mx-6 -mb-6 backdrop-blur-xl mt-4">
                    <Button variant="ghost" onClick={onClose} disabled={loading} className="order-2 sm:order-1 text-text-muted hover:text-text-main font-black text-[10px] tracking-widest uppercase">
                        ABORT_PROTOCOL
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleConfirm} 
                        loading={loading} 
                        className="order-1 sm:order-2 px-10 h-14 bg-accent-red hover:bg-accent-red/80 shadow-primary border-none text-white font-black text-[11px] tracking-[0.2em] uppercase" 
                        icon={Trash2}
                    >
                        CONFIRM_DECOMMISSION
                    </Button>
                </div>
            </div>
        </Modal>
    )
}


