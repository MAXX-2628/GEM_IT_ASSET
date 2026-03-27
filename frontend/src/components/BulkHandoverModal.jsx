import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Camera, PenTool, User, CheckCircle2, RefreshCw, Upload, ShieldCheck, ChevronRight, ChevronLeft, Fingerprint, MousePointer2, Layers, Box, Terminal, Activity, Zap, Shield } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Modal, Button, Input, Field, Select, Badge } from './ui'

export default function BulkHandoverModal({ assets, onClose, onDone }) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        asset_ids: assets.map(a => a.asset_id),
        recipient_type: 'Other',
        recipient_name: '',
        recipient_details: '',
    })

    const [photo, setPhoto] = useState(null)
    const [signature, setSignature] = useState(null)
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const sigCanvasRef = useRef(null)
    const [stream, setStream] = useState(null)
    const [cameraAvailable, setCameraAvailable] = useState(true)
    const fileInputRef = useRef(null)

    const [isDrawing, setIsDrawing] = useState(false)

    async function startCamera() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setCameraAvailable(false)
                return
            }
            const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
            setStream(s)
            setCameraAvailable(true)
        } catch (err) {
            console.error("Camera Error:", err)
            setCameraAvailable(false)
        }
    }

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0]
        if (file) setPhoto(file)
    }

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
        }
    }, [stream])

    useEffect(() => {
        if (step === 2) startCamera()
        else stopCamera()
        return () => stopCamera()
    }, [step, stopCamera])

    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    const capturePhoto = () => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (video && canvas) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            canvas.getContext('2d').drawImage(video, 0, 0)
            canvas.toBlob(blob => setPhoto(blob), 'image/jpeg')
        }
    }

    const startDrawing = (e) => {
        const canvas = sigCanvasRef.current
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const ctx = canvas.getContext('2d')
        ctx.beginPath()
        ctx.moveTo(x, y)
        setIsDrawing(true)
    }

    const draw = (e) => {
        if (!isDrawing) return
        const canvas = sigCanvasRef.current
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const ctx = canvas.getContext('2d')
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.strokeStyle = '#FF6A00' // Using neon orange for signature
        ctx.lineTo(x, y)
        ctx.stroke()
    }

    const stopDrawing = () => {
        if (!isDrawing) return
        setIsDrawing(false)
        const canvas = sigCanvasRef.current
        canvas.toBlob(blob => setSignature(blob), 'image/png')
    }

    const clearSignature = () => {
        const canvas = sigCanvasRef.current
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setSignature(null)
    }

    const handleSubmit = async () => {
        if (!form.recipient_name) return toast.error("RECIPIENT_NAME_REQUIRED")

        setLoading(true)
        const formData = new FormData()
        formData.append('data', JSON.stringify(form))
        if (photo) formData.append('photo', photo, 'photo.jpg')
        if (signature) formData.append('signature', signature, 'signature.png')

        try {
            await api.post('/handovers/bulk', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            toast.success(`BULK_HANDOVER_PROTOCOL_COMPLETE: ${assets.length} items processed.`)
            onDone()
        } catch (err) {
            toast.error(err.response?.data?.message || 'VERIFICATION_PROTOCOL_FAILED')
        } finally { setLoading(false) }
    }

    return (
        <Modal
            show={true}
            onClose={onClose}
            title="BULK_CUSTODY_TRANSFER_PROTOCOL"
            subtitle={
                <div className="flex items-center gap-2 text-text-muted font-black uppercase tracking-widest text-[9px]">
                    <Terminal size={10} className="text-primary" />
                    <span>BATCH_IDENTITY_VERIFICATION_v2.0</span>
                </div>
            }
            size="lg"
        >
            <div className="space-y-8 p-2">
                {/* Batch Context Panel */}
                <div className="bg-neutral-subtle border border-border-main rounded-[2rem] p-5 flex items-center gap-5 shadow-inner">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-primary">
                        <Layers size={20} className="animate-pulse" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">BATCH_NODES_IDENTIFIED</p>
                            <span className="text-[10px] font-black text-text-main px-2 py-0.5 bg-neutral-subtle rounded-full border border-border-main">{assets.length} UNITS</span>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-16 overflow-y-auto pr-2 custom-scrollbar no-scrollbar">
                            {assets.map(a => (
                                <code key={a.asset_id} className="text-[9px] font-black text-primary/70 py-0.5 px-2 bg-primary/5 border border-primary/10 rounded-lg">
                                    {a.asset_id}
                                </code>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Protocol Progress Visualization */}
                <div className="flex items-center justify-between relative px-8">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-border-main -translate-y-1/2 z-0" />
                    {[
                        { step: 1, label: 'IDENTITY', icon: User },
                        { step: 2, label: 'EVIDENCE', icon: Camera },
                        { step: 3, label: 'AUTHORIZATION', icon: PenTool }
                    ].map((s) => (
                        <div key={s.step} className="relative z-10 flex flex-col items-center gap-3">
                            <div className={`
                                h-12 w-12 rounded-2xl flex items-center justify-center border transition-all duration-500
                                ${step >= s.step 
                                    ? 'bg-primary border-primary text-white shadow-primary ring-4 ring-primary/10' 
                                    : 'bg-bg-main border-border-main text-text-muted'
                                }
                            `}>
                                <s.icon size={20} className={step === s.step ? 'animate-bounce' : ''} />
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${step >= s.step ? 'text-primary' : 'text-text-muted'}`}>{s.label}</span>
                        </div>
                    ))}
                </div>

                <div className="min-h-[400px]">
                    {step === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="md:col-span-2">
                                    <Field label="RECIPIENT_LEAD_DESIGNATION" required>
                                        <Input
                                            placeholder="AUTHORIZED_PERSONNEL_NAME..."
                                            value={form.recipient_name}
                                            onChange={e => setForm(p => ({ ...p, recipient_name: e.target.value }))}
                                            icon={User}
                                            className="font-black text-xs uppercase"
                                        />
                                    </Field>
                                </div>
                                <Field label="OPERATIONAL_ROLE_CONTEXT">
                                    <Input
                                        placeholder="e.g. SENIOR_OFFICER..."
                                        value={form.recipient_details}
                                        onChange={e => setForm(p => ({ ...p, recipient_details: e.target.value }))}
                                        icon={ShieldCheck}
                                        className="font-bold text-xs uppercase"
                                    />
                                </Field>
                                <Field label="IDENTITY_HIERARCHY">
                                    <Select
                                        value={form.recipient_type}
                                        onChange={e => setForm(p => ({ ...p, recipient_type: e.target.value }))}
                                        className="font-black text-[10px] tracking-widest uppercase"
                                    >
                                        <option value="IT">IT_INTERNAL_DEPT</option>
                                        <option value="Other">EXTERNAL_STAFF_RESOURCE</option>
                                    </Select>
                                </Field>
                            </div>
                            <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10 flex items-start gap-4">
                                <div className="p-2 rounded-xl bg-primary/10">
                                    <Fingerprint size={20} className="text-primary" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">VERIFICATION_PROTOCOL_ALERT</p>
                                    <p className="text-[11px] text-text-muted leading-relaxed font-bold uppercase tracking-tight">
                                        Batch transfers require a unified verification sequence. Ensure all unit identifiers listed above are physically present and verified by the recipient.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="relative group">
                                <div className="aspect-video bg-black/40 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-inner flex items-center justify-center relative">
                                    {cameraAvailable ? (
                                        <>
                                            {!photo ? (
                                                <>
                                                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1] grayscale-[0.2]" />
                                                    <div className="absolute inset-0 border-[30px] border-black/20 pointer-events-none" />
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                                        <Shield size={120} className="text-primary" />
                                                    </div>
                                                </>
                                            ) : (
                                                <img src={URL.createObjectURL(photo)} alt="Evidence" className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-500" />
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-6 p-12 text-center text-text-muted">
                                            {photo ? (
                                                <img src={URL.createObjectURL(photo)} alt="Uploaded Evidence" className="absolute inset-0 w-full h-full object-cover" />
                                            ) : (
                                                <>
                                                    <div className="h-20 w-20 rounded-[2rem] bg-neutral-subtle border border-border-main flex items-center justify-center text-text-muted shadow-inner">
                                                        <Upload size={32} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">MANUAL_UPLINK_REQUIRED</p>
                                                        <p className="text-[9px] text-text-muted/60 font-black uppercase tracking-widest">Native camera interface not identified</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Camera Overlay Graphics */}
                                    {!photo && cameraAvailable && (
                                        <div className="absolute inset-0 pointer-events-none">
                                            <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-accent-amber/50" />
                                            <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-accent-amber/50" />
                                            <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-accent-amber/50" />
                                            <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-accent-amber/50" />
                                        </div>
                                    )}
                                </div>

                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
                                    {cameraAvailable && !photo ? (
                                        <button 
                                            onClick={capturePhoto}
                                            className="h-16 w-16 rounded-full bg-accent-amber text-text-on-primary flex items-center justify-center shadow-[0_0_30px_rgba(255,106,0,0.5)] ring-4 ring-bg-main border-2 border-border-main active:scale-90 transition-all group"
                                        >
                                            <Camera size={28} className="group-hover:scale-110 transition-transform" />
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <Button variant="ghost" size="md" onClick={() => { setPhoto(null); cameraAvailable ? startCamera() : fileInputRef.current?.click() }} icon={RefreshCw} className="bg-black/40 backdrop-blur-md border border-white/10 text-white font-black text-[9px] tracking-widest uppercase px-6">
                                                RECAPTURE_SESSION
                                            </Button>
                                            {!cameraAvailable && !photo && (
                                                <Button variant="primary" size="md" onClick={() => fileInputRef.current?.click()} icon={Upload} className="px-6 font-black text-[9px] tracking-widest uppercase">
                                                    UPLINK_CORE_MEDIA
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                            <canvas ref={canvasRef} className="hidden" />
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">
                                        BATCH_AUTHORIZATION_LOCK
                                    </label>
                                    <button onClick={clearSignature} className="text-[9px] font-black text-primary hover:text-text-main uppercase tracking-widest transition-colors flex items-center gap-1">
                                        <RefreshCw size={10} /> RESET_CANVAS
                                    </button>
                                </div>
                                <div className="bg-black/40 border-2 border-dashed border-white/5 rounded-[2.5rem] p-4 h-[280px] relative overflow-hidden group">
                                    {!signature && !isDrawing && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted pointer-events-none transition-all group-hover:text-text-main">
                                            <PenTool size={48} className="mb-4 animate-pulse" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">DIGITAL_SIGNATURE_REQUIRED</p>
                                        </div>
                                    )}
                                    <canvas
                                        ref={sigCanvasRef}
                                        width={800}
                                        height={400}
                                        className="w-full h-full cursor-crosshair touch-none relative z-10"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                    />
                                    {/* Signature Grid Effect */}
                                    <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
                                         style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                                </div>
                            </div>
                             <div className="p-6 rounded-[2rem] bg-accent-green/5 border border-accent-green/10 flex items-center gap-4">
                                <ShieldCheck size={20} className="text-accent-green" />
                                <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.1em] leading-relaxed">
                                    This unique encrypted signature serves as a binding verification for the simultaneous custody transfer of <span className="text-text-main">{assets.length}</span> individual hardware nodes.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between pt-10 border-t border-border-main bg-neutral-subtle/20 p-6 -mx-6 -mb-6 backdrop-blur-xl">
                    <Button variant="ghost" size="md" onClick={step === 1 ? onClose : () => setStep(step - 1)} icon={step === 1 ? X : ChevronLeft} className="text-text-muted hover:text-text-main font-black text-[10px] tracking-widest uppercase">
                        {step === 1 ? 'TERMINATE' : 'PREVIOUS_PHASE'}
                    </Button>

                    <div className="flex items-center gap-4">
                        {step < 3 ? (
                            <Button 
                                variant="primary" 
                                size="md" 
                                disabled={step === 1 && !form.recipient_name} 
                                onClick={() => setStep(step + 1)}
                                icon={ChevronRight}
                                className="px-10 h-12 shadow-primary font-black text-[10px] tracking-widest uppercase"
                            >
                                {step === 2 && !photo ? 'BYPASS_MEDIA' : 'NEXT_PROTOCOL'}
                            </Button>
                        ) : (
                            <Button variant="primary" size="md" onClick={handleSubmit} loading={loading} disabled={!signature} icon={ShieldCheck} className="px-12 h-12 shadow-primary font-black text-[10px] tracking-widest uppercase">
                                COMMIT_BATCH_STREAM
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    )
}


