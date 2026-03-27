import { X, User, Camera, PenTool, Calendar, MapPin, ExternalLink, ShieldCheck, Terminal, Shield, Box, Zap, Activity } from 'lucide-react'
import api from '../api/client'
import { Modal, Badge, Button } from './ui'

export default function HandoverDetailModal({ handover, onClose }) {
    if (!handover) return null

    const getFullUrl = (path) => {
        if (!path) return null
        if (path.startsWith('http')) return path
        const baseUrl = api.defaults.baseURL.includes('http')
            ? api.defaults.baseURL.replace('/api', '')
            : window.location.origin.replace(':3000', ':5000')
        return baseUrl + path
    }

    const photoUrl = getFullUrl(handover.photo_url)
    const signatureUrl = getFullUrl(handover.signature_url)

    return (
        <Modal
            show={!!handover}
            onClose={onClose}
            title={`AUDIT_VERIFICATION_PROOF: ${handover.asset_id}`}
            subtitle={
                <div className="flex items-center gap-2 text-text-muted font-black uppercase tracking-widest text-[9px]">
                    <Terminal size={10} className="text-primary" />
                    <span>IMMUTABLE_CUSTODY_RECORD_#${handover._id.slice(-6).toUpperCase()}</span>
                </div>
            }
            size="lg"
        >
            <div className="space-y-10">
                {/* Header Status Bar */}
                <div className="flex items-center justify-between pb-8 border-b border-border-main">
                    <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-primary relative overflow-hidden group">
                           <Zap size={24} className="animate-pulse relative z-10" />
                           <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] leading-none mb-2">HARDWARE_NODE_ID</p>
                            <p className="text-3xl font-black text-text-main tracking-tighter leading-none">{handover.asset_id}</p>
                        </div>
                    </div>
                    <Badge variant={handover.recipient_type === 'IT' ? 'blue' : 'gray'} className="h-12 px-8 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-inner bg-neutral-subtle border-border-main text-text-muted">
                        {handover.recipient_type === 'IT' ? <ShieldCheck size={18} className="mr-3 text-primary" /> : <User size={18} className="mr-3 text-primary" />}
                        {handover.recipient_type}_PERSONNEL
                    </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Details Column */}
                    <div className="space-y-8">
                        <div className="space-y-6">
                            <div className="group">
                                <label className="text-[9px] font-black text-text-dim uppercase tracking-widest flex items-center gap-2 mb-3 group-hover:text-primary transition-colors">
                                    <User size={12} /> RECIPIENT_DESIGNATION
                                </label>
                                <div className="bg-neutral-subtle border border-border-main rounded-2xl p-5 shadow-inner group-hover:border-primary/20 transition-all">
                                    <p className="text-sm font-black text-text-main uppercase tracking-tight">{handover.recipient_name}</p>
                                    {handover.recipient_details && (
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1.5">{handover.recipient_details}</p>
                                    )}
                                </div>
                            </div>

                            <div className="group">
                                <label className="text-[9px] font-black text-text-dim uppercase tracking-widest flex items-center gap-2 mb-3 group-hover:text-primary transition-colors">
                                    <Shield size={12} /> AUTHORIZING_NODE
                                </label>
                                <div className="bg-neutral-subtle border border-border-main rounded-2xl p-5 shadow-inner group-hover:border-primary/20 transition-all">
                                    <p className="text-sm font-black text-text-main uppercase tracking-tight">{handover.handed_over_by}</p>
                                    <p className="text-[9px] font-black text-text-dim uppercase tracking-widest mt-1.5">ROOT_LEVEL_ADMINISTRATOR</p>
                                </div>
                            </div>

                            <div className="group">
                                <label className="text-[9px] font-black text-text-dim uppercase tracking-widest flex items-center gap-2 mb-3 group-hover:text-primary transition-colors">
                                    <Calendar size={12} /> ARCHIVE_TIMESTAMP
                                </label>
                                <div className="bg-neutral-subtle border border-border-main rounded-2xl p-5 shadow-inner group-hover:border-primary/20 transition-all">
                                    <p className="text-sm font-black text-text-main tabular-nums tracking-[0.1em] uppercase">
                                        {new Date(handover.handover_date).toLocaleDateString()} 
                                        <span className="text-primary/30 mx-3">|</span>
                                        {new Date(handover.handover_date).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>

                            {handover.branch && (
                                <div className="group">
                                    <label className="text-[9px] font-black text-text-dim uppercase tracking-widest flex items-center gap-2 mb-3 group-hover:text-primary transition-colors">
                                        <MapPin size={12} /> FACILITY_NODE
                                    </label>
                                    <div className="bg-neutral-subtle border border-border-main rounded-2xl p-5 shadow-inner group-hover:border-primary/20 transition-all">
                                        <p className="text-sm font-black text-text-main uppercase tracking-widest">{handover.branch}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Evidence Column */}
                    <div className="space-y-10">
                        <div className="group/evidence">
                            <label className="text-[9px] font-black text-text-dim uppercase tracking-widest flex items-center gap-2 mb-4 group-hover/evidence:text-primary transition-colors">
                                <Camera size={14} /> BIOMETRIC_VERIFICATION_DATA
                            </label>
                            <div className="aspect-video bg-black rounded-[2.5rem] border border-border-main shadow-2xl overflow-hidden flex items-center justify-center relative group">
                                {handover.photo_url ? (
                                    <>
                                        <img src={photoUrl} alt="Handover Proof" className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                                        <div className="absolute inset-x-0 bottom-0 p-6 flex items-center justify-between pointer-events-none">
                                            <div className="flex items-center gap-3">
                                                <div className="h-2 w-2 rounded-full bg-accent-green animate-pulse shadow-accent-green" />
                                                <p className="text-[9px] font-black text-white uppercase tracking-[0.2em]">IDENT_DATA_AUTHENTICATED</p>
                                            </div>
                                            <div className="text-[8px] font-black text-white/40 uppercase tracking-widest">CAM_ENTRY_#0882</div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-4 text-text-muted p-8 grayscale opacity-20">
                                        <Camera size={48} />
                                        <p className="text-[9px] font-black uppercase tracking-[0.4em]">NO_IMAGE_DATA_CAPSULE</p>
                                    </div>
                                )}
                                
                                {/* Scanlines effect */}
                                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-10" />
                            </div>
                        </div>

                        <div className="group/sig">
                            <label className="text-[9px] font-black text-text-dim uppercase tracking-widest flex items-center gap-2 mb-4 group-hover/sig:text-primary transition-colors">
                                <PenTool size={14} /> ENCRYPTED_AUTH_SIGNATURE_LOCK
                            </label>
                            <div className="bg-neutral-subtle border border-border-main rounded-[2.5rem] p-8 h-44 flex items-center justify-center relative group overflow-hidden shadow-inner group-hover/sig:border-primary/20 transition-all">
                                {handover.signature_url ? (
                                    <>
                                        <img src={signatureUrl} alt="Recipient Signature" className="h-full w-full object-contain filter invert opacity-60 group-hover:opacity-90 group-hover:scale-110 transition-all duration-1000 relative z-10" />
                                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none transition-opacity group-hover:opacity-[0.05]" 
                                             style={{ backgroundImage: 'linear-gradient(var(--border-main) 1px, transparent 1px), linear-gradient(90deg, var(--border-main) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-4 text-text-muted grayscale opacity-20">
                                        <PenTool size={40} />
                                        <p className="text-[9px] font-black uppercase tracking-[0.4em]">UNSIGNED_PROTOCOL_ENTRY</p>
                                    </div>
                                )}
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity">
                                    <Shield size={60} className="text-primary" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-border-main bg-bg-main/50 p-6 -mx-6 -mb-6 backdrop-blur-xl mt-4">
                    <Button 
                        variant="ghost" 
                        size="md" 
                        onClick={() => window.open(`/assets/${handover.asset_id}`, '_blank')} 
                        icon={ExternalLink}
                        className="order-2 sm:order-1 text-text-muted hover:text-text-main font-black text-[10px] tracking-widest uppercase transition-colors"
                    >
                        LOCATE_PRIMARY_NODE
                    </Button>
                    <Button 
                        onClick={onClose}
                        variant="primary"
                        className="order-1 sm:order-2 px-14 h-14 shadow-primary font-black text-[10px] tracking-widest uppercase"
                    >
                        TERMINATE_AUDIT_SESSION
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

