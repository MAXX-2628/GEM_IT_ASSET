import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Trash2, Eye, EyeOff, GripVertical, Type, Hash, Calendar, List, AlignLeft, ChevronDown, SeparatorHorizontal, Move, Info, LayoutGrid, HelpCircle, Lock, Save, Layout, Palette, Database, Settings, Box } from 'lucide-react'
import { Checkbox, Button, Input, Select, Badge, Card, CardBody, Textarea, Field } from './ui'
import api from '../api/client'
import toast from 'react-hot-toast'

const COLS = 12      // total grid columns
const ROW_H = 64     // pixels per row
const COL_GAP = 8    // gap between cells (px)

const FIELD_TYPE_ICONS = {
    text: Type,
    number: Hash,
    date: Calendar,
    select: List,
    textarea: AlignLeft,
    section: SeparatorHorizontal,
}

const BASE_FIELDS = [
    { label: 'Asset ID', key: 'asset_id', field_type: 'text', x: 0, y: 0, w: 6, h: 1, required: true, isSystem: true, locked: true },
    { label: 'Asset Type', key: 'asset_type', field_type: 'select', x: 6, y: 0, w: 6, h: 1, required: true, isSystem: true, locked: true },
    { label: 'Department *', key: 'department', field_type: 'select', x: 0, y: 1, w: 6, h: 1, required: true, isSystem: true },
    { label: 'Status', key: 'status', field_type: 'select', x: 6, y: 1, w: 6, h: 1, required: true, isSystem: true },
    { label: 'Sub-Category', key: 'sub_category', field_type: 'select', x: 0, y: 2, w: 6, h: 1, isSystem: true },
    { label: 'MAC Address *', key: 'mac_address', field_type: 'text', x: 6, y: 2, w: 6, h: 1, required: true, isSystem: true },
    { label: 'Hostname', key: 'hostname', field_type: 'text', x: 0, y: 3, w: 6, h: 1, isSystem: true },
    { label: 'IP Address', key: 'ip_address', field_type: 'text', x: 6, y: 3, w: 6, h: 1, isSystem: true },
    { label: 'Floor', key: 'location', field_type: 'select', x: 0, y: 4, w: 6, h: 1, isSystem: true },
    { label: 'Assigned User', key: 'assigned_user', field_type: 'text', x: 6, y: 4, w: 6, h: 1, isSystem: true },
    { label: 'Notes', key: 'notes', field_type: 'textarea', x: 0, y: 5, w: 12, h: 2, isSystem: true },
]

function getDefaultY(fields) {
    if (!fields.length) return 0
    return Math.max(...fields.map(f => (f.y || 0) + (f.h || 1)))
}

// Auto-layout: place fields left-to-right per row


export default function FormDesigner({ fields: initFields = [], onSave, onClose, typeName }) {
    const [fields, setFields] = useState(() => initFields.length ? initFields : BASE_FIELDS)
    const [templates, setTemplates] = useState([])
    const [showTemplates, setShowTemplates] = useState(false)
    const [templateName, setTemplateName] = useState('')
    const [hoveredTemplate, setHoveredTemplate] = useState(null)
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState(null)
    const [preview, setPreview] = useState(false)
    const [dragGhost, setDragGhost] = useState(null)
    const canvasRef = useRef(null)
    const dragState = useRef(null)
    const resizeState = useRef(null)
    const fieldsRef = useRef(fields)
    const fieldCounter = useRef(0)

    useEffect(() => {
        fieldsRef.current = fields
    }, [fields])

    useEffect(() => {
        fetchTemplates()
    }, [])

    // ─── helpers ────────────────────────────────────────────────────────────────






    // ─── drag to move ────────────────────────────────────────────────────────────
    const onDragMove = useCallback((e) => {
        if (!dragState.current || !canvasRef.current) return
        const { idx, startX, startY, w, h } = dragState.current
        const rect = canvasRef.current.getBoundingClientRect()
        const px = e.clientX - rect.left - startX
        const py = e.clientY - rect.top - startY

        const cw = (canvasRef.current.offsetWidth - (COLS - 1) * COL_GAP) / COLS
        const gridX = Math.round(px / (cw + COL_GAP))
        const gridY = Math.round(py / (ROW_H + COL_GAP))

        const newX = Math.max(0, Math.min(gridX, COLS - w))
        const newY = Math.max(0, gridY)

        setDragGhost({ x: newX, y: newY, w, h })

        setFields(prev => prev.map((f, i) => i === idx ? { ...f, x: newX, y: newY } : f))
    }, [])

    const onDragEnd = useCallback(() => {
        dragState.current = null
        setDragGhost(null)
        window.removeEventListener('mousemove', onDragMove)
        // Use a local reference if needed, but for now let's keep it simple
        // The linter complains about self-reference in useCallback.
        // We can use a ref to store the current handler to ensure we remove the right one.
    }, [onDragMove])

    // We need to handle the self-removal carefully. 
    // Actually, the easiest way to fix "accessed before it is declared" for self-referencing handlers
    // is to use a named function expression or just move the removal logic.


    const onDragStart = (e, idx) => {
        const field = fieldsRef.current[idx]
        if (resizeState.current || field.locked) return
        e.stopPropagation()
        e.preventDefault()
        const rect = canvasRef.current.getBoundingClientRect()
        const cw = (canvasRef.current.offsetWidth - (COLS - 1) * COL_GAP) / COLS
        const startX = e.clientX - rect.left - field.x * (cw + COL_GAP)
        const startY = e.clientY - rect.top - field.y * (ROW_H + COL_GAP)
        dragState.current = { idx, startX, startY, w: field.w, h: field.h }
        setSelected(idx)
        
        const cleanup = () => {
            window.removeEventListener('mousemove', onDragMove)
            window.removeEventListener('mouseup', cleanup)
            onDragEnd()
        }

        window.addEventListener('mousemove', onDragMove)
        window.addEventListener('mouseup', cleanup)
    }


    // ─── drag to resize ──────────────────────────────────────────────────────────
    const fetchTemplates = useCallback(async () => {
        try {
            const { data } = await api.get('/form-templates')
            setTemplates(data.data || [])
        } catch {
            console.error('Failed to fetch templates')
        }
    }, [])

    const onResizeMove = useCallback((e) => {
        if (!resizeState.current) return
        const { idx, startClientX, startClientY, startW, startH, cw } = resizeState.current
        const dx = e.clientX - startClientX
        const dy = e.clientY - startClientY
        const dCols = Math.round(dx / (cw + COL_GAP))
        const dRows = Math.round(dy / (ROW_H + COL_GAP))
        setFields(prev => prev.map((f, i) => i === idx ? {
            ...f,
            w: Math.max(1, Math.min(COLS - f.x, startW + dCols)),
            h: Math.max(1, startH + dRows),
        } : f))
    }, [])

    const onResizeEnd = useCallback(() => {
        resizeState.current = null
        window.removeEventListener('mousemove', onResizeMove)
        // window.removeEventListener('mouseup', onResizeEnd) // Handled in start
    }, [onResizeMove])

    const onResizeStart = (e, idx) => {
        const field = fieldsRef.current[idx]
        if (field.locked) return
        e.stopPropagation()
        e.preventDefault()
        const cw = (canvasRef.current.offsetWidth - (COLS - 1) * COL_GAP) / COLS
        resizeState.current = {
            idx,
            startClientX: e.clientX,
            startClientY: e.clientY,
            startW: field.w,
            startH: field.h,
            cw,
        }
        
        const cleanup = () => {
            window.removeEventListener('mousemove', onResizeMove)
            window.removeEventListener('mouseup', cleanup)
            onResizeEnd()
        }

        window.addEventListener('mousemove', onResizeMove)
        window.addEventListener('mouseup', cleanup)
    }



    const saveTemplate = async () => {
        if (!templateName.trim()) return toast.error('Enter a template name')
        setLoading(true)
        try {
            await api.post('/form-templates', {
                name: templateName,
                fields: fields.map(f => { const { _keyManual, ...rest } = f; return rest; })
            })
            setTemplateName('')
            fetchTemplates()
            toast.success('Template saved!')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error saving template')
        }
        setLoading(false)
    }

    const deleteTemplate = async (e, id) => {
        e.stopPropagation()
        if (!confirm('Delete this template?')) return
        try {
            await api.delete(`/form-templates/${id}`)
            fetchTemplates()
            toast.success('Template removed')
        } catch {
            toast.error('Failed to delete template')
        }
    }

    // ─── field management ────────────────────────────────────────────────────────
    const addField = (type = 'text', label = 'New Field') => {
        const y = getDefaultY(fields)
        const isSection = type === 'section'
        const newId = `${isSection ? 'section' : 'field'}_${++fieldCounter.current}`
        const newField = {
            label: isSection ? 'New Section' : label,
            key: newId,
            field_type: type,
            required: false,
            placeholder: '',
            options: [],
            x: 0, y,
            w: isSection ? 12 : 6,
            h: 1,
            help_text: ''
        }

        setFields(prev => [...prev, newField])
        setSelected(fields.length)
        if (canvasRef.current) {
            setTimeout(() => {
                canvasRef.current.scrollTo({ top: y * (ROW_H + COL_GAP), behavior: 'smooth' })
            }, 100)
        }
    }

    const deleteField = (idx) => {
        if (fields[idx].locked) return
        setFields(prev => prev.filter((_, i) => i !== idx))
        setSelected(null)
    }

    const updateField = (idx, key, val) => {
        setFields(prev => prev.map((f, i) => {
            if (i !== idx) return f
            const updated = { ...f, [key]: val }
            if (key === 'label' && !f._keyManual) {
                updated.key = val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
            }
            if (key === 'key') updated._keyManual = true
            return updated
        }))
    }

    const sel = selected !== null ? fields[selected] : null

    // ─── render ──────────────────────────────────────────────────────────────────
    return createPortal(
        <div className="fixed inset-0 z-[20000] bg-bg-main flex flex-col animate-in fade-in duration-300 overflow-hidden font-sans text-text-main selection:bg-primary/30">
            {/* ── Header ── */}
            <div className="h-20 border-b border-border-main bg-bg-main/40 backdrop-blur-xl flex items-center justify-between px-8 relative z-50 shadow-2xl">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-primary">
                        <Palette size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-black text-text-main uppercase tracking-tighter leading-none mb-1">UI Form Architecture</div>
                        <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] flex items-center gap-2">
                             <Database size={10} className="text-primary/50" />
                             {typeName} <span className="text-text-muted">/</span> <span className="text-primary">{fields.length} Node{fields.length !== 1 ? 's' : ''} Configured</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-bg-main/40 p-1 rounded-2xl border border-border-main mr-4">
                        <button
                            onClick={() => setPreview(false)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!preview ? 'bg-primary text-white shadow-primary' : 'text-text-muted hover:text-text-main'}`}
                        >
                            Architect Mode
                        </button>
                        <button
                            onClick={() => setPreview(true)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${preview ? 'bg-primary text-white shadow-primary' : 'text-text-muted hover:text-text-main'}`}
                        >
                            Pulse Preview
                        </button>
                    </div>
                    
                    <Button variant="ghost" onClick={() => setShowTemplates(true)} icon={List} className="border border-border-main hover:bg-neutral-subtle text-[10px] font-black tracking-widest uppercase">
                        Registry
                    </Button>
                    
                    <div className="w-px h-8 bg-border-main mx-2" />
                    
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 text-text-muted hover:text-text-main hover:bg-accent-red/10 hover:border-accent-red/20">
                        <X size={20} />
                    </Button>
                    
                    <Button variant="primary" onClick={() => onSave(fields.map(f => { const { _keyManual, ...rest } = f; return rest; }))} icon={Save} className="h-12 px-10 shadow-primary font-black text-[10px] tracking-widest uppercase">
                        Finalize Architecture
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* ── Left Palette ── */}
                {!preview && (
                    <div className="w-80 border-r border-border-main bg-bg-main/20 flex flex-col animate-in slide-in-from-left duration-500">
                        <div className="p-6 border-b border-border-main">
                            <div className="text-[10px] font-black text-text-main uppercase tracking-[0.3em] mb-1">Architecture Nodes</div>
                            <div className="text-[8px] font-black text-text-dim uppercase tracking-widest leading-relaxed">Inject new data points into the schema</div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {/* Standard Fields */}
                            {[
                                { type: 'text', label: 'Single Line Text', sub: 'Input, ID, Name', icon: Type },
                                { type: 'number', label: 'Number Input', sub: 'Quantity, Price, Count', icon: Hash },
                                { type: 'date', label: 'Date Picker', sub: 'Deadlines, Purchase, Expiry', icon: Calendar },
                                { type: 'select', label: 'Dropdown List', sub: 'Single choice options', icon: List },
                                { type: 'textarea', label: 'Multi-line Text', sub: 'Notes, Description, Logs', icon: AlignLeft },
                            ].map(item => (
                                <button
                                    key={item.type}
                                    onClick={() => addField(item.type, item.label)}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-bg-main/5 border border-border-main hover:border-primary/30 hover:bg-primary/5 transition-all group text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-bg-main/40 border border-border-main flex items-center justify-center text-text-muted group-hover:text-primary group-hover:bg-primary/10 transition-all">
                                        <item.icon size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-black text-text-main uppercase tracking-tight group-hover:text-primary transition-colors">{item.label}</div>
                                        <div className="text-[8px] font-black text-text-dim uppercase tracking-widest group-hover:text-text-muted transition-colors mt-0.5 truncate">{item.sub}</div>
                                    </div>
                                    <Plus size={14} className="text-text-muted group-hover:text-primary transition-colors" />
                                </button>
                            ))}

                            <div className="pt-6 pb-2 px-2 text-[8px] font-black text-text-muted uppercase tracking-[0.4em]">Structure Elements</div>
                            <button
                                onClick={() => addField('section', 'New Section')}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 hover:border-primary/40 hover:bg-primary/10 transition-all group text-left shadow-primary"
                            >
                                <div className="w-10 h-10 rounded-xl bg-bg-main/40 border border-primary/20 flex items-center justify-center text-primary">
                                    <SeparatorHorizontal size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-black text-primary uppercase tracking-tight">Section Divider</div>
                                    <div className="text-[8px] font-black text-primary/40 uppercase tracking-widest mt-0.5">Logical grouping</div>
                                </div>
                                <Plus size={14} className="text-primary" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Canvas ── */}
                <div className={`flex-1 overflow-y-auto custom-scrollbar relative bg-bg-main/20 ${preview ? 'p-12' : 'p-8'}`}>
                    {preview ? (
                        <div className="max-w-4xl mx-auto animate-in zoom-in-95 duration-500">
                             <PreviewForm fields={fields} />
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
                            <div className="flex items-center justify-between border-b border-border-main pb-6 mb-8">
                                <div className="flex items-center gap-3">
                                    <GripVertical size={16} className="text-primary" />
                                    <p className="text-[10px] font-black text-text-main uppercase tracking-[0.2em]">
                                        Architecture Workspace <span className="text-text-dim font-mono ml-2">/ Grid: {COLS}x∞</span>
                                    </p>
                                </div>
                                <div className="flex gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-primary shadow-primary" />
                                        <span className="text-[8px] font-black text-text-dim uppercase tracking-widest">Selected Item</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-neutral-subtle" />
                                        <span className="text-[8px] font-black text-text-dim uppercase tracking-widest">Empty Slot</span>
                                    </div>
                                </div>
                            </div>

                            {/* Grid canvas */}
                            <div
                                ref={canvasRef}
                                onClick={() => setSelected(null)}
                                className="relative bg-bg-main rounded-[2rem] border border-border-main shadow-2xl p-[COL_GAP] overflow-hidden min-h-[calc(100vh-280px)] group"
                                style={{ 
                                    padding: COL_GAP,
                                    backgroundImage: 'radial-gradient(circle at 1px 1px, var(--border-main) 1px, transparent 0)',
                                    backgroundSize: `${(100/COLS).toFixed(2)}% ${ROW_H + COL_GAP}px`
                                }}
                            >
                                {/* Grid guide lines (only visible on hover or drag) */}
                                <div className="absolute inset-x-0 top-0 h-full grid grid-cols-12 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity">
                                    {Array.from({ length: COLS }).map((_, i) => (
                                        <div key={i} className="border-r border-dashed border-white" />
                                    ))}
                                </div>

                                {/* Drag Ghost Indicator */}
                                {dragGhost && (
                                    <div 
                                        className="absolute bg-primary/10 border-2 border-dashed border-primary/50 rounded-2xl pointer-events-none z-10 animate-pulse"
                                        style={{
                                            left: dragGhost.x * (100 / COLS) + '%',
                                            top: dragGhost.y * (ROW_H + COL_GAP),
                                            width: dragGhost.w * (100 / COLS) + '%',
                                            height: dragGhost.h * (ROW_H + COL_GAP) - COL_GAP,
                                            margin: COL_GAP/2
                                        }}
                                    />
                                )}

                                {fields.map((f, idx) => {
                                    const isSelected = selected === idx
                                    const Icon = FIELD_TYPE_ICONS[f.field_type] || Type
                                    const isSection = f.field_type === 'section'

                                    return (
                                        <div
                                            key={f.key}
                                            onClick={e => { e.stopPropagation(); setSelected(idx) }}
                                            onMouseDown={e => onDragStart(e, idx)}
                                            className={`absolute rounded-2xl transition-all duration-300 backdrop-blur-md flex flex-col pointer-events-auto border group/item shadow-lg ${
                                                isSelected 
                                                ? 'bg-primary/20 border-primary shadow-primary z-20 cursor-grabbing' 
                                                : isSection ? 'bg-bg-main/60 border-border-main hover:border-primary/30 font-black z-10 cursor-grab hover:bg-bg-main/80' : 'bg-bg-main/5 border-border-main hover:border-primary/30 z-10 cursor-grab'
                                            }`}
                                            style={{
                                                left: (f.x || 0) * (100 / COLS) + '%',
                                                top: (f.y || 0) * (ROW_H + COL_GAP),
                                                width: (f.w || 1) * (100 / COLS) + '%',
                                                height: (f.h || 1) * (ROW_H + COL_GAP) - COL_GAP,
                                                margin: COL_GAP/2
                                            }}
                                        >
                                            {isSection ? (
                                                <div className="flex-1 flex items-center justify-center relative px-6 group/sec transition-all">
                                                    <div className="absolute inset-x-0 h-px bg-border-main" />
                                                    <div className="relative bg-bg-main px-4 flex items-center gap-3">
                                                        <SeparatorHorizontal size={14} className="text-primary" />
                                                        <span className="text-[10px] font-black text-text-main uppercase tracking-[0.2em]">
                                                            {f.label || 'New Section'}
                                                        </span>
                                                    </div>
                                                    {isSelected && (
                                                        <button
                                                            onMouseDown={e => e.stopPropagation()}
                                                            onClick={e => { e.stopPropagation(); deleteField(idx) }}
                                                            className="absolute right-4 p-2 rounded-xl bg-accent-red/10 text-accent-red hover:bg-accent-red border border-accent-red/20 hover:text-white transition-all shadow-lg scale-90"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Field header */}
                                                    <div className="px-4 pt-3 flex items-center justify-between gap-2 overflow-hidden">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Icon size={12} className={isSelected ? 'text-primary' : 'text-text-dim'} />
                                                            <span className="text-[9px] font-black text-text-main uppercase tracking-tight truncate">
                                                                {f.label || 'Untitled'}{f.required && <span className="text-accent-red ml-0.5">*</span>}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className={`text-[7px] font-black uppercase tracking-widest ${isSelected ? 'text-primary/60' : 'text-text-muted'}`}>{f.field_type}</span>
                                                            {f.locked ? (
                                                                <div className="p-1 rounded-md bg-bg-main/5 border border-border-main text-text-muted" title="System field - locked">
                                                                    <Lock size={10} />
                                                                </div>
                                                            ) : isSelected && (
                                                                <button
                                                                    onMouseDown={e => e.stopPropagation()}
                                                                    onClick={e => { e.stopPropagation(); deleteField(idx) }}
                                                                    className="p-1.5 rounded-lg bg-accent-red/10 text-accent-red hover:bg-accent-red hover:text-white transition-all"
                                                                >
                                                                    <Trash2 size={10} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Mock input */}
                                                    <div className="flex-1 px-4 flex items-center">
                                                        {f.field_type === 'textarea' ? (
                                                            <div className="w-full h-8 rounded-lg bg-bg-main/40 border border-border-main flex items-center px-3 text-[9px] text-text-muted uppercase tracking-widest italic">
                                                                {f.placeholder || 'Text area node...'}
                                                            </div>
                                                        ) : f.field_type === 'select' ? (
                                                            <div className="w-full h-8 rounded-lg bg-bg-main/40 border border-border-main flex items-center justify-between px-3">
                                                                <span className="text-[9px] text-text-muted uppercase tracking-widest truncate">{f.placeholder || `Select ${f.label}`}</span>
                                                                <ChevronDown size={11} className="text-text-dim" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-full h-8 rounded-lg bg-bg-main/40 border border-border-main flex items-center px-3 text-[9px] text-text-muted uppercase tracking-widest">
                                                                {f.placeholder || (f.field_type === 'date' ? 'DD-MM-YYYY' : 'Type value...')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}

                                            {/* Resize handle */}
                                            {!f.locked && (
                                                <div
                                                    onMouseDown={e => onResizeStart(e, idx)}
                                                    className="absolute bottom-1 right-1 cursor-nwse-resize p-1 hover:scale-125 transition-transform"
                                                >
                                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={isSelected ? 'text-primary' : 'text-text-muted/20'}>
                                                        <path d="M2 8L8 2M5 8L8 5M8 8L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                    </svg>
                                                </div>
                                            )}

                                            {/* Position badge */}
                                            {isSelected && (
                                                <div className="absolute -bottom-6 left-0 right-0 text-center animate-in fade-in slide-in-from-top-1 duration-300">
                                                    <span className="bg-primary text-white px-3 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest shadow-primary">
                                                        {isSection ? 'Full Infrastructure Width' : `X:${f.x + 1} Y:${f.y + 1} · SPAN:${f.w}`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {fields.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-40 text-text-muted border-2 border-dashed border-border-main rounded-[2rem]">
                                    <Move size={48} className="mb-6 opacity-20" />
                                    <div className="text-[10px] font-black uppercase tracking-widest">Workspace is offline — select nodes from palette</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Properties Panel ── */}
                {!preview && (
                    <div className="w-96 border-l border-border-main bg-bg-main/20 flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
                        <div className="p-6 border-b border-border-main flex items-center gap-4 bg-primary/5">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-primary">
                                <Settings size={18} className={sel ? 'animate-spin-slow' : ''} />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-text-main uppercase tracking-[0.3em]">Node Protocol</div>
                                {sel ? <div className="text-[8px] font-black text-primary uppercase tracking-widest mt-1">Configuring {sel.label}</div> : <div className="text-[8px] font-black text-text-muted uppercase tracking-widest mt-1">Select node to configure</div>}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {sel ? (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {sel.locked && (
                                        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-4">
                                            <div className="text-primary shrink-0"><Lock size={16} /></div>
                                            <div className="text-[9px] font-black text-primary uppercase tracking-widest leading-relaxed">System Critical Node · Core identity logic is read-only</div>
                                        </div>
                                    )}

                                    {/* Label */}
                                    <Field label="Node Label *">
                                        <Input 
                                            value={sel.label} 
                                            onChange={e => updateField(selected, 'label', e.target.value)}
                                            className="font-black text-xs uppercase"
                                            icon={Type}
                                        />
                                    </Field>

                                    {/* Key (Hide for sections) */}
                                    {sel.field_type !== 'section' && (
                                        <Field label="Data Registry Key">
                                            <Input 
                                                value={sel.key} 
                                                onChange={e => updateField(selected, 'key', e.target.value)} 
                                                disabled={sel.isSystem}
                                                className="font-mono text-[10px] text-primary"
                                                icon={Hash}
                                            />
                                            <p className="text-[7px] font-black text-text-muted uppercase tracking-[0.2em] mt-2">
                                                {sel.isSystem ? 'System reserved identifier' : 'Used for reporting infrastructure outputs'}
                                            </p>
                                        </Field>
                                    )}

                                    {/* Type (Hide for sections) */}
                                    {sel.field_type !== 'section' && (
                                        <Field label="Data Protocol Type">
                                            <Select 
                                                value={sel.field_type} 
                                                onChange={e => updateField(selected, 'field_type', e.target.value)} 
                                                disabled={sel.isSystem}
                                                className="font-black text-[10px] uppercase tracking-widest"
                                                icon={Box}
                                            >
                                                <option value="text">Single Line Protocol</option>
                                                <option value="number">Numeric Metrics</option>
                                                <option value="date">Temporal Node (Date)</option>
                                                <option value="select">Dropdown Menu (Array)</option>
                                                <option value="textarea">Large Text Blob (Log)</option>
                                            </Select>
                                        </Field>
                                    )}

                                    {/* Help Text */}
                                    {sel.field_type !== 'section' && (
                                        <Field label="Deployment Tooltip">
                                            <Input 
                                                placeholder="e.g. Enter the 12-digit serial..." 
                                                value={sel.help_text || ''} 
                                                onChange={updateField ? e => updateField(selected, 'help_text', e.target.value) : undefined}
                                                className="font-black text-[10px] uppercase"
                                                icon={HelpCircle}
                                            />
                                            <p className="text-[7px] font-black text-text-muted uppercase tracking-widest mt-2">Instructional metadata for the user</p>
                                        </Field>
                                    )}

                                    {/* Data Source (select only) */}
                                    {sel.field_type === 'select' && (
                                        <Field label="Source Ingestion Mode">
                                            <Select 
                                                value={sel.data_source || 'static'} 
                                                onChange={e => updateField(selected, 'data_source', e.target.value)} 
                                                disabled={sel.isSystem}
                                                className="font-black text-[10px] uppercase tracking-widest"
                                            >
                                                <option value="static">Manual Ingestion (Comma Separated)</option>
                                                <option value="departments">Department Registry Feed</option>
                                                <option value="asset_types">Category Definitions Feed</option>
                                            </Select>
                                        </Field>
                                    )}

                                    {/* Options (select only, static only) */}
                                    {sel.field_type === 'select' && (sel.data_source === 'static' || !sel.data_source) && (
                                        <Field label="Option Registry">
                                            <Textarea
                                                rows={4}
                                                placeholder="e.g. Active, Offline, Faulty"
                                                value={sel.options?.join(', ') || ''}
                                                onChange={e => updateField(selected, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                                className="font-black text-[10px] uppercase tracking-tight font-mono leading-relaxed"
                                            />
                                        </Field>
                                    )}

                                    {/* Validation Section */}
                                    {sel.field_type !== 'section' && (
                                        <div className="p-6 bg-bg-main/40 rounded-[2rem] border border-border-main space-y-4">
                                            <div className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-2">Integrity Control</div>
                                            <Checkbox 
                                                label="Critical Requirement"
                                                checked={sel.required} 
                                                onChange={e => updateField(selected, 'required', e.target.checked)} 
                                                disabled={sel.locked} 
                                            />
                                            <p className="text-[7px] font-black text-text-muted uppercase tracking-widest ml-8 mt-1 italic opacity-60">System will block submissions if null</p>
                                        </div>
                                    )}

                                    <div className="p-6 bg-bg-main/40 rounded-[2rem] border border-border-main space-y-6">
                                        <div className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-2 text-center">Grid Coordinates</div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { label: 'IDX_X', prop: 'x', min: 0, max: COLS - 1, disabled: false },
                                                { label: 'IDX_Y', prop: 'y', min: 0, max: 999, disabled: false },
                                                { label: 'SPAN_W', prop: 'w', min: 1, max: COLS, disabled: sel.field_type === 'section' },
                                                { label: 'SPAN_H', prop: 'h', min: 1, max: 10, disabled: false },
                                            ].map(item => (
                                                <div key={item.prop} className="space-y-2">
                                                    <label className="text-[7px] font-black text-text-muted uppercase tracking-widest pl-1">{item.label}</label>
                                                    <Input
                                                        type="number" min={item.min} max={item.max}
                                                        value={sel[item.prop]}
                                                        disabled={item.disabled}
                                                        onChange={e => updateField(selected, item.prop, Math.max(item.min, Math.min(item.max, Number(e.target.value))))}
                                                        className="h-10 font-mono text-xs text-primary"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4 pb-12">
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => deleteField(selected)}
                                            disabled={sel.locked}
                                            icon={Trash2}
                                            className={`w-full h-12 border border-border-main font-black text-[10px] tracking-widest uppercase transition-all ${sel.locked ? 'opacity-30' : 'text-accent-red hover:bg-accent-red/10 hover:border-accent-red/30'}`}
                                        >
                                            {sel.locked ? 'System Protected' : 'Purge Node'}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-40 text-center space-y-6 opacity-30">
                                    <div className="w-16 h-16 rounded-3xl bg-neutral-subtle border border-border-main flex items-center justify-center">
                                        <Layout size={32} />
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-text-main leading-relaxed max-w-[200px]">Node details will appear here upon selection</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Templates Sidebar ── */}
                {showTemplates && (
                    <div className="fixed inset-y-0 right-0 w-[420px] bg-[#0c0f17] border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-[60] flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
                        <div className="p-8 border-b border-border-main flex items-center justify-between bg-bg-main/40">
                            <div>
                                <div className="text-xs font-black text-text-main uppercase tracking-widest">Protocol Registry</div>
                                <div className="text-[8px] font-black text-text-dim uppercase tracking-[0.3em] mt-1">Stored layout templates</div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowTemplates(false)} className="h-10 w-10 border border-border-main text-text-muted hover:text-text-main">
                                <X size={20} />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar relative">
                            <div className="space-y-4">
                                <label className="text-[9px] font-black text-text-muted uppercase tracking-[0.3em] block mb-2 px-1">Commit Current Version</label>
                                <div className="flex gap-3">
                                    <Input
                                        placeholder="Enter template name..."
                                        value={templateName}
                                        onChange={e => setTemplateName(e.target.value)}
                                        className="h-12 bg-black/40 border-white/5 font-black text-xs"
                                        icon={Move}
                                    />
                                    <Button variant="primary" onClick={saveTemplate} disabled={loading} className="h-12 px-6 shadow-lg shadow-accent-amber/20 font-black text-[10px] tracking-widest uppercase">
                                        Save
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="text-[9px] font-black text-text-muted uppercase tracking-[0.3em] px-1 border-b border-border-main pb-2">Select to Override Workspace</div>
                                {templates.length === 0 ? (
                                    <div className="py-20 text-center bg-bg-main/20 rounded-[2rem] border border-dashed border-border-main">
                                        <Database size={32} className="mx-auto mb-4 opacity-10" />
                                        <div className="text-[9px] font-black text-text-muted uppercase tracking-widest">No protocols synchronized</div>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {templates.map(t => (
                                            <div
                                                key={t._id}
                                                onMouseEnter={() => setHoveredTemplate(t)}
                                                onMouseLeave={() => setHoveredTemplate(null)}
                                                onClick={() => {
                                                    if (confirm('Replace current layout with this template? This cannot be undone.')) {
                                                        setFields(t.fields)
                                                        setShowTemplates(false)
                                                    }
                                                }}
                                                className="p-5 rounded-2xl bg-neutral-subtle border border-border-main hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all group relative overflow-hidden"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="text-[10px] font-black text-text-main uppercase tracking-tight group-hover:text-primary transition-colors">{t.name}</div>
                                                    <Badge variant="slate" className="text-[8px] font-black tracking-widest bg-bg-main/40">{t.fields.length} NODES</Badge>
                                                </div>
                                                <div className="text-[7px] font-black tracking-[0.3em] text-text-dim uppercase">Synchronized Registry Protocol</div>
                                                
                                                <div className="absolute right-2 bottom-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                                    <button
                                                        onClick={(e) => deleteTemplate(e, t._id)}
                                                        className="h-8 w-8 rounded-lg bg-accent-red/10 border border-accent-red/20 text-accent-red hover:bg-accent-red hover:text-white flex items-center justify-center transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Template Hover Preview */}
                        {hoveredTemplate && (
                            <div className="absolute bottom-0 inset-x-0 p-8 bg-primary animate-in slide-in-from-bottom duration-500 text-white z-[70] shadow-2xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <LayoutGrid size={20} className="text-white" />
                                    <div className="text-sm font-black uppercase tracking-tighter">Protocol Snapshot: {hoveredTemplate.name}</div>
                                </div>
                                <div className="grid grid-cols-12 gap-1 opacity-60 mb-6">
                                    {[...hoveredTemplate.fields].sort((a, b) => a.y - b.y || a.x - b.x).map((f) => (
                                        <div 
                                            key={f.key} 
                                            className="h-3 bg-white/20 rounded-sm"
                                            style={{ gridColumn: `span ${f.w || 1}` }}
                                        />
                                    ))}
                                </div>
                                <div className="text-[9px] font-black bg-white text-primary px-4 py-2 rounded-xl text-center uppercase tracking-widest animate-pulse shadow-xl">
                                    Click template to architect this layout
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}

// ─── Live Preview Component ───────────────────────────────────────────────────
function PreviewForm({ fields }) {
    let customFields = [...fields]

    // Auto-layout for fields lacking coordinates
    if (customFields.some(f => f.x === undefined || f.y === undefined)) {
        let rowX = 0, rowY = 0
        customFields = customFields.map(f => {
            const w = f.w || (f.field_type === 'section' ? 12 : 6)
            const h = f.h || 1
            if (rowX + w > 12) { rowX = 0; rowY += 1 }
            const out = { ...f, x: rowX, y: rowY, w, h }
            rowX += w
            return out
        })
    }

    const sorted = [...customFields].sort((a, b) => a.y - b.y || a.x - b.x)

    return (
        <div className="bg-bg-card rounded-[3rem] border border-border-main p-12 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            
            <div className="relative flex items-center justify-between mb-16 border-b border-border-main pb-8">
                <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Eye size={28} className="animate-pulse" />
                    </div>
                    <div>
                        <div className="text-xl font-black text-text-main uppercase tracking-tighter">Architecture Node Preview</div>
                        <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mt-1">Live simulation of the structural output</div>
                    </div>
                </div>
                <Badge variant="primary" className="h-8 px-6 text-[10px] font-black tracking-widest uppercase shadow-primary">Read-Only Mode</Badge>
            </div>

            <div className="grid grid-cols-12 gap-8 relative">
                {sorted.map((f) => {
                    const isSection = f.field_type === 'section'
                    const gridStyle = {
                        gridColumn: `span ${f.w || (isSection ? 12 : 6)}`,
                    }

                    return (
                        <div key={f.key} style={gridStyle} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {isSection ? (
                                <div className="pt-8 pb-4 border-b border-border-main mb-4">
                                    <div className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-2">{f.label}</div>
                                    <div className="h-0.5 w-12 bg-primary shadow-primary" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] ml-1 block">
                                        {f.label}{f.required && <span className="text-accent-red ml-1">*</span>}
                                    </label>
                                    
                                    {f.field_type === 'textarea' ? (
                                        <div className="w-full min-h-[120px] rounded-2xl bg-bg-main/5 border border-border-main p-6 text-text-muted text-[11px] uppercase tracking-widest leading-relaxed italic select-none">
                                            {f.placeholder || 'Type description here...'}
                                        </div>
                                    ) : f.field_type === 'select' ? (
                                        <div className="w-full h-14 rounded-xl bg-bg-main/5 border border-border-main flex items-center justify-between px-6 select-none group/item hover:border-border-main/40 transition-all cursor-default text-text-muted">
                                            <span className="text-[11px] uppercase tracking-widest">{f.placeholder || `Select ${f.label}`}</span>
                                            <ChevronDown size={14} className="text-text-dim" />
                                        </div>
                                    ) : (
                                        <div className="w-full h-14 rounded-xl bg-bg-main/5 border border-border-main flex items-center px-6 text-text-muted text-[11px] uppercase tracking-widest select-none group/item hover:border-border-main/40 transition-all cursor-default">
                                            {f.placeholder || (f.field_type === 'date' ? 'DD-MM-YYYY' : `Enter ${f.label.toLowerCase()}...`)}
                                        </div>
                                    )}
                                    
                                    {f.help_text && (
                                        <div className="flex items-start gap-2 px-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                            <Info size={10} className="mt-0.5 text-primary" />
                                            <p className="text-[8px] font-black text-text-dim uppercase tracking-widest leading-tight">{f.help_text}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            
            <div className="mt-20 pt-10 border-t border-border-main flex items-center justify-center">
                 <div className="text-[9px] font-black text-text-dim uppercase tracking-widest flex items-center gap-4">
                    <div className="w-8 h-px bg-border-main" />
                    End of Node Simulation
                    <div className="w-8 h-px bg-border-main" />
                 </div>
            </div>
        </div>
    )
}


