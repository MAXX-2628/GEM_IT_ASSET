import { useState, useEffect, useCallback } from 'react'
import { X, Search, Link2, RefreshCw, Layers, History, AlertTriangle, Monitor, Cpu, ChevronRight } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Modal, Button, Input, Badge, EmptyState } from './ui'

export default function PeripheralLinkModal({ parentAsset, mode = 'link', currentPeripheral = null, onClose, onDone }) {
    const [search, setSearch] = useState('')
    const [assets, setAssets] = useState([])
    const [loading, setLoading] = useState(false)
    const [linking, setLinking] = useState(false)

    const fetchAvailable = useCallback(async () => {
        setLoading(true)
        try {
            const { data } = await api.get('/assets', {
                params: {
                    status: 'In Stock',
                    search: search
                }
            })
            setAssets(data.data)
        } catch {
            toast.error('Failed to load available assets')
        } finally {
            setLoading(false)
        }
    }, [search])

    useEffect(() => {
        const timer = setTimeout(fetchAvailable, 300)
        return () => clearTimeout(timer)
    }, [fetchAvailable])

    const handleAction = async (targetAsset) => {
        setLinking(true)
        try {
            if (mode === 'replace' && currentPeripheral) {
                await api.put(`/assets/${currentPeripheral.asset_id}`, {
                    status: 'Scrapped',
                    parent_asset_id: null
                })
            }

            await api.put(`/assets/${targetAsset.asset_id}`, {
                status: 'Active',
                department: parentAsset.department,
                location: parentAsset.location,
                assigned_user: parentAsset.assigned_user,
                parent_asset_id: parentAsset.asset_id
            })

            toast.success(mode === 'replace' ? 'Peripheral replacement protocol complete.' : 'Peripheral integration successful.')
            onDone()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Linkage protocol failed')
        } finally {
            setLinking(false)
        }
    }

    return (
        <Modal
            show={true}
            onClose={onClose}
            title={mode === 'replace' ? "Peripheral Replacement" : "Hardware Linkage"}
            subtitle={`Mapping sub-asset to primary node: ${parentAsset.asset_id}`}
            size="md"
        >
            <div className="space-y-8">
                {mode === 'replace' && (
                    <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                        <AlertTriangle size={20} className="text-primary mt-1 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Replacement Protocol Active</p>
                            <p className="text-[11px] text-text-muted leading-relaxed font-bold uppercase tracking-tight">
                                Actioning this will move <span className="text-primary underline font-black">{currentPeripheral?.asset_id}</span> to <span className="text-text-main font-black">SCRAPPED</span> status. This procedure is permanent.
                            </p>
                        </div>
                    </div>
                )}

                <div className="relative group">
                    <Input
                        placeholder="FILTER_INVENTORY: ID_TYPE_MODEL..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        icon={Search}
                        className="bg-neutral-subtle border-border-main text-text-main font-black text-[10px] tracking-widest uppercase h-12 group-focus-within:border-primary/50 transition-all"
                        autoFocus
                    />
                </div>

                <div className="min-h-[300px] max-h-[400px] overflow-y-auto custom-scrollbar border border-border-main rounded-[2rem] bg-bg-main/20 shadow-inner">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="relative">
                                <RefreshCw size={32} className="text-primary animate-spin" />
                                <div className="absolute inset-0 bg-primary blur-xl opacity-20 animate-pulse" />
                            </div>
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Scanning_Inventory_Layers...</p>
                        </div>
                    ) : assets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center px-10">
                            <div className="h-20 w-20 rounded-[2rem] bg-neutral-subtle border border-border-main flex items-center justify-center text-text-muted mb-6">
                                <Monitor size={40} />
                            </div>
                            <h3 className="text-sm font-black text-text-main uppercase tracking-tight">No Available Units</h3>
                            <p className="text-[10px] text-text-muted mt-2 max-w-[200px] font-black uppercase tracking-widest leading-relaxed">
                                Verify if assets are registered with <span className="text-primary">IN_STOCK</span> status codes.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border-main">
                            {assets.map(a => (
                                <button 
                                    key={a._id}
                                    onClick={() => !linking && handleAction(a)}
                                    disabled={linking}
                                    className="w-full flex items-center justify-between p-5 hover:bg-neutral-subtle/50 transition-all group text-left relative overflow-hidden active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-5 relative z-10">
                                        <div className="h-12 w-12 rounded-2xl bg-neutral-subtle border border-border-main flex items-center justify-center text-text-muted group-hover:scale-110 group-hover:text-primary group-hover:border-primary/30 transition-all duration-300">
                                            <Cpu size={22} />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-text-main tracking-tight uppercase group-hover:text-primary transition-colors">{a.asset_id}</span>
                                                <Badge variant="secondary" className="text-[8px] py-0 px-2 uppercase tracking-[0.1em] font-black h-4 border-border-main bg-neutral-subtle text-text-muted">{a.asset_type}</Badge>
                                            </div>
                                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{a.specs?.model || 'GENERIC_UNIT_MODEL'}</p>
                                        </div>
                                    </div>
                                    <div className="relative z-10">
                                        <div className={`opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300 flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] ${mode === 'replace' ? 'text-primary' : 'text-accent-green'}`}>
                                            {linking ? 'PROCESSING...' : (mode === 'replace' ? 'EXECUTE_SWAP' : 'ASSIGN_NODE')}
                                            <ChevronRight size={14} />
                                        </div>
                                    </div>
                                    
                                    {/* Hover Highlight */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-border-main bg-bg-main/20 p-6 -mx-6 -mb-6 backdrop-blur-xl">
                    <Button variant="ghost" onClick={onClose} disabled={linking} className="order-2 sm:order-1 text-text-muted hover:text-text-main font-black text-[10px] tracking-widest uppercase">
                        ABORT_PROTOCOL
                    </Button>
                    <div className="order-1 sm:order-2 text-[10px] font-black text-text-muted uppercase tracking-widest hidden md:block">
                        {assets.length} UNITS_DETECTED
                    </div>
                </div>
            </div>
        </Modal>
    )
}



