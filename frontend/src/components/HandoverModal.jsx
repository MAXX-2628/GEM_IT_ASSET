import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Camera, PenTool, User, CheckCircle2, RefreshCw, Upload, ShieldCheck, ChevronRight, ChevronLeft, Fingerprint, MousePointer2 } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Modal, Button, Input, Field, Badge } from './ui'

export default function HandoverModal({ asset, onClose, onDone, inline = false }) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        asset_id: asset.asset_id,
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

    // Handlers for Signature
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
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        const isDark = document.documentElement.classList.contains('dark')
        ctx.strokeStyle = isDark ? '#ffffff' : '#000000'
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
        if (!form.recipient_name) return toast.error("Recipient name is required")

        setLoading(true)
        const formData = new FormData()
        formData.append('data', JSON.stringify(form))
        if (photo) formData.append('photo', photo, 'photo.jpg')
        if (signature) formData.append('signature', signature, 'signature.png')

        try {
            await api.post('/handovers', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            toast.success('Handover record successfully archived.')
            onDone()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Verification protocol failed')
        } finally { setLoading(false) }
    }

    const content = (
        <div className="space-y-10">
            {/* Protocol Progress */}
                <div className="flex items-center justify-between relative px-2 mb-4">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-border-main -translate-y-1/2 z-0" />
                    {[
                        { step: 1, label: 'IDENTIFY', icon: User },
                        { step: 2, label: 'CAPTURE', icon: Camera },
                        { step: 3, label: 'AUTHORIZE', icon: PenTool }
                    ].map((s) => (
                        <div key={s.step} className="relative z-10 flex flex-col items-center gap-3">
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${step >= s.step ? 'bg-primary border-primary text-white shadow-primary' : 'bg-bg-main border-border-main text-text-muted'}`}>
                                <s.icon size={20} className={step === s.step ? 'animate-pulse' : ''} />
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${step >= s.step ? 'text-primary' : 'text-text-muted'}`}>{s.label}</span>
                        </div>
                    ))}
                </div>

                <div className="min-h-[380px] flex flex-col justify-center">
                    {step === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <Field label="RECIPIENT DESIGNATION" required>
                                    <Input
                                        placeholder="ENTER AUTHORIZED RECIPIENT NAME..."
                                        value={form.recipient_name}
                                        onChange={e => setForm(p => ({ ...p, recipient_name: e.target.value }))}
                                        icon={User}
                                        className="bg-neutral-subtle text-text-main font-black text-xs uppercase h-12"
                                    />
                                </Field>
                                <Field label="DEPARTMENT / ROLE CONTEXT">
                                    <Input
                                        placeholder="e.g. CORE_LEAD / STATION_ALPHA"
                                        value={form.recipient_details}
                                        onChange={e => setForm(p => ({ ...p, recipient_details: e.target.value }))}
                                        icon={ShieldCheck}
                                        className="bg-neutral-subtle text-text-main font-black text-xs uppercase h-12"
                                    />
                                </Field>
                            </div>
                            
                            <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10 flex items-start gap-5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Fingerprint size={80} className="text-primary" />
                                </div>
                                <div className="p-3 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                                    <Fingerprint size={20} />
                                </div>
                                <div className="space-y-1.5 relative z-10">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Verification Protocol Active</p>
                                    <p className="text-[11px] text-text-muted leading-relaxed font-bold uppercase tracking-tight max-w-md">Please ensure the recipient identity matches the system records. The next steps will require photographic evidence and a digital signature for terminal authentication.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="relative group mx-auto max-w-2xl w-full">
                                <div className="aspect-video bg-black rounded-[2.5rem] overflow-hidden border-4 border-border-main shadow-2xl flex items-center justify-center relative">
                                    {cameraAvailable ? (
                                        <>
                                            {!photo ? (
                                                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale-[0.2]" />
                                            ) : (
                                                <img src={URL.createObjectURL(photo)} alt="Evidence" className="w-full h-full object-cover" />
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-5 p-12 text-center">
                                            {photo ? (
                                                <img src={URL.createObjectURL(photo)} alt="Uploaded Evidence" className="absolute inset-0 w-full h-full object-cover" />
                                            ) : (
                                                <>
                                                    <div className="h-20 w-20 rounded-[2rem] bg-neutral-subtle border border-border-main flex items-center justify-center text-text-muted">
                                                        <Upload size={40} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-black text-text-muted uppercase tracking-widest">EXTERNAL_INPUT_REQUIRED</p>
                                                        <p className="text-[10px] text-text-dim font-black uppercase tracking-[0.2em]">CAM_LINK_FAILURE: UPLOAD_IDENT_DATA_MANUALLY</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Overlay Scanlines */}
                                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] opacity-20" />
                                </div>

                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
                                    {cameraAvailable && !photo ? (
                                        <Button variant="primary" className="rounded-full h-16 w-16 shadow-primary border-4 border-bg-main" onClick={capturePhoto}>
                                            <Camera size={28} />
                                        </Button>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <Button variant="ghost" className="bg-bg-main/60 backdrop-blur-md border border-border-main text-text-main font-black text-[10px] tracking-widest px-6 h-10 hover:bg-neutral-subtle" onClick={() => { setPhoto(null); cameraAvailable ? startCamera() : fileInputRef.current?.click() }} icon={RefreshCw}>
                                                RETAKE_DATA
                                            </Button>
                                            {!cameraAvailable && !photo && (
                                                <Button variant="primary" className="font-black text-[10px] tracking-widest px-8 h-10 shadow-primary" onClick={() => fileInputRef.current?.click()} icon={Upload}>
                                                    PUSH_EVIDENCE
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
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                                        <PenTool size={12} className="text-primary" /> DIGITAL_AUTHORIZATION_LOCK
                                    </label>
                                    <button onClick={clearSignature} className="text-[10px] font-black text-primary/70 hover:text-primary uppercase tracking-widest flex items-center gap-2 transition-colors">
                                        <RefreshCw size={10} /> RESET_PROTOCOL
                                    </button>
                                </div>
                                <div className="bg-neutral-subtle border-2 border-dashed border-border-main rounded-[2.5rem] p-4 h-[240px] relative overflow-hidden group/sig shadow-inner">
                                    {!signature && !isDrawing && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted pointer-events-none transition-all group-hover/sig:text-text-dim">
                                            <PenTool size={48} className="mb-4 opacity-20" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">SIGN_WITHIN_HARDWARE_BOUNDARY</p>
                                        </div>
                                    )}
                                    <canvas
                                        ref={sigCanvasRef}
                                        width={800}
                                        height={240}
                                        className="w-full h-full cursor-crosshair touch-none relative z-10"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                    />
                                    <div className="absolute inset-0 pointer-events-none opacity-[0.05]" 
                                         style={{ backgroundImage: 'linear-gradient(var(--border-main) 1px, transparent 1px), linear-gradient(90deg, var(--border-main) 1px, transparent 1px)', backgroundSize: '15px 15px' }} />
                                </div>
                            </div>
                             <div className="flex items-center gap-4 bg-accent-green/5 p-4 rounded-2xl border border-accent-green/10 transition-colors hover:border-accent-green/20">
                                <div className="p-2 rounded-lg bg-accent-green/10 text-accent-green">
                                    <ShieldCheck size={18} />
                                </div>
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-relaxed">
                                    Terminal Entry Confirmation: Signature capture constitutes a <span className="text-accent-green font-black">LEGALLY_BINDING_TRANSFER</span> of hardware responsibility to the designated recipient node.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-border-main bg-neutral-subtle/20 p-6 -mx-6 -mb-6 backdrop-blur-xl mt-4">
                    {step === 1 && inline ? (
                        <div className="order-2 sm:order-1" />
                    ) : (
                        <Button variant="ghost" onClick={step === 1 ? onClose : () => setStep(step - 1)} icon={step === 1 ? X : ChevronLeft} className="order-2 sm:order-1 text-text-muted hover:text-text-main font-black text-[10px] tracking-widest uppercase">
                            {step === 1 ? 'ABORT_TRANSACTION' : 'PREVIOUS_PHASE'}
                        </Button>
                    )}

                    <div className="flex items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
                        {step < 3 ? (
                            <Button 
                                variant="primary" 
                                disabled={step === 1 && !form.recipient_name} 
                                onClick={() => setStep(step + 1)}
                                icon={ChevronRight}
                                className="w-full sm:w-auto px-10 h-12 shadow-primary font-black text-[10px] tracking-widest uppercase"
                            >
                                {step === 2 && !photo ? 'BYPASS_EVIDENCE' : 'NEXT_SEQUENCE'}
                            </Button>
                        ) : (
                            <Button variant="primary" onClick={handleSubmit} loading={loading} disabled={!signature} icon={ShieldCheck} className="w-full sm:w-auto px-12 h-12 shadow-primary font-black text-[10px] tracking-widest uppercase">
                                COMMIT_HANDOVER_PROTOCOL
                            </Button>
                        )}
                    </div>
                </div>
            </div>
    );

    if (inline) {
        return <div className="p-6 pb-12">{content}</div>;
    }

    return (
        <Modal
            show={true}
            onClose={onClose}
            title="Asset Custody Transfer"
            subtitle={`Initializing handover sequence for ${asset.asset_id}`}
            size="lg"
        >
            {content}
        </Modal>
    );
}


