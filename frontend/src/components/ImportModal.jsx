import { useState, useRef } from 'react'
import { Download, Upload, X, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Info, ChevronRight, FileDown, AlertTriangle, FileUp, Database, TableIcon, ShieldCheck, ChevronLeft, RefreshCw } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Modal, Button, Input, Badge } from './ui'

export default function ImportModal({ title, endpoint, templateEndpoint, onClose, onDone, context }) {
    const [step, setStep] = useState(1) // 1: Upload, 2: Preview, 3: Results
    const [file, setFile] = useState(null)
    const [duplicateMode, setDuplicateMode] = useState('skip')
    const [loading, setLoading] = useState(false)
    const [previewData, setPreviewData] = useState(null)
    const [importResult, setImportResult] = useState(null)
    const fileInputRef = useRef()

    const handleFileSelect = (e) => {
        const selected = e.target.files[0]
        if (selected && (selected.name.endsWith('.xlsx') || selected.name.endsWith('.xls') || selected.name.endsWith('.csv'))) {
            setFile(selected)
        } else {
            toast.error('Please select an Excel (.xlsx) or CSV file')
            e.target.value = null
        }
    }

    const handlePreview = async () => {
        if (!file) return
        setLoading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const { data } = await api.post(`${endpoint}/preview`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-default-status': context || '',
                    'x-duplicate-mode': duplicateMode
                }
            })
            setPreviewData(data.data)
            setStep(2)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to parse file structure')
        } finally {
            setLoading(false)
        }
    }

    const handleConfirm = async () => {
        setLoading(true)
        try {
            const { data } = await api.post(`${endpoint}/confirm`, {
                rows: previewData.rows,
                duplicateMode,
                fileName: file.name
            })
            setImportResult(data.data)
            setStep(3)
            toast.success('Data ingestion sequence complete.')
        } catch {
            toast.error('Import protocol error')
        } finally {
            setLoading(false)
        }
    }

    const downloadTemplate = async () => {
        try {
            const res = await api.get(templateEndpoint, { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', 'Import_Template.xlsx')
            link.click()
        } catch {
            toast.error('Template retrieval failed')
        }
    }

    const downloadErrorReport = async () => {
        if (!importResult?.batchId) return
        try {
            const res = await api.get(`${endpoint}/error-report/${importResult.batchId}`, { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `Error_Report_${importResult.batchId}.xlsx`)
            link.click()
        } catch {
            toast.error('Failure report generation error')
        }
    }

    return (
        <Modal
            show={true}
            onClose={onClose}
            title={title || "Bulk Data Ingestion"}
            subtitle="Follow the multi-step protocol to import records"
            size={step === 2 ? "lg" : "md"}
        >
            <div className="space-y-6">
                {/* Stepper */}
                <div className="flex items-center justify-between relative px-2 mb-4">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-border-main -translate-y-1/2 z-0" />
                    {[
                        { step: 1, label: 'UPLOAD', icon: FileUp },
                        { step: 2, label: 'VALIDATE', icon: Database },
                        { step: 3, label: 'RESULT', icon: ShieldCheck }
                    ].map((s) => (
                        <div key={s.step} className="relative z-10 flex flex-col items-center gap-3">
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${step >= s.step ? 'bg-primary border-primary text-white shadow-primary' : 'bg-neutral-subtle border-border-main text-text-muted'}`}>
                                <s.icon size={20} className={step === s.step ? 'animate-pulse' : ''} />
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${step >= s.step ? 'text-primary' : 'text-text-muted'}`}>{s.label}</span>
                        </div>
                    ))}
                </div>

                <div className="min-h-[250px] flex flex-col justify-center">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                             <div 
                                onClick={() => fileInputRef.current.click()}
                                className={`group cursor-pointer border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 transition-all relative overflow-hidden ${file ? 'border-accent-green/30 bg-accent-green/5' : 'border-border-main hover:border-primary/50 hover:bg-primary/5 bg-bg-main/20'}`}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx, .xls, .csv" className="hidden" />
                                <div className={`h-20 w-20 rounded-[2rem] flex items-center justify-center transition-all duration-500 ${file ? 'bg-accent-green/20 text-accent-green scale-110 shadow-primary' : 'bg-neutral-subtle text-text-muted group-hover:scale-110 group-hover:text-primary shadow-inner'}`}>
                                    {file ? <CheckCircle2 size={40} /> : <FileUp size={40} />}
                                </div>
                                <div className="text-center space-y-2 relative z-10">
                                    <p className="text-sm font-black text-text-main uppercase tracking-tight">{file ? file.name : 'Select Data Source'}</p>
                                    <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em]">{file ? `Size: ${(file.size / 1024).toFixed(1)} KB` : 'XLSX, XLS, or CSV (Max 10MB)'}</p>
                                </div>
                                
                                {!file && <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                    <RefreshCw size={12} className="text-primary" /> Conflict Resolution Strategy
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {['skip', 'update', 'stop'].map(mode => (
                                        <label key={mode} className={`flex flex-col gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${duplicateMode === mode ? 'border-primary bg-primary/5 shadow-primary' : 'border-border-main bg-neutral-subtle hover:border-primary/30'}`}>
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[11px] font-black uppercase tracking-widest ${duplicateMode === mode ? 'text-primary' : 'text-text-muted'}`}>{mode}</span>
                                                <input
                                                    type="radio"
                                                    name="dup-mode"
                                                    className="accent-primary cursor-pointer h-4 w-4"
                                                    checked={duplicateMode === mode}
                                                    onChange={() => setDuplicateMode(mode)}
                                                />
                                            </div>
                                            <p className={`text-[9px] leading-relaxed font-black uppercase tracking-tight ${duplicateMode === mode ? 'text-text-main' : 'text-text-muted'}`}>
                                                {mode === 'skip' && 'Ignore duplicate records and continue ingestion of new items.'}
                                                {mode === 'update' && 'Synchronize file data with existing system records.'}
                                                {mode === 'stop' && 'Immediate termination of ingestion if collision is detected.'}
                                            </p>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <Button variant="ghost" className="w-full text-primary/70 hover:text-primary font-black text-[10px] tracking-widest uppercase py-4 border border-border-main hover:bg-neutral-subtle rounded-xl" onClick={downloadTemplate} icon={Download}>
                                Download Sample Protocol Template
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'TOTAL_ROWS', count: previewData.summary.total, color: 'text-text-main bg-neutral-subtle border-border-main' },
                                    { label: 'VALID_NODES', count: previewData.summary.valid, color: 'text-accent-green bg-accent-green/5 border-accent-green/10' },
                                    { label: 'COLLISIONS', count: previewData.summary.warnings, color: 'text-primary bg-primary/5 border-primary/10' },
                                    { label: 'CRITICAL_FAIL', count: previewData.summary.errors, color: 'text-accent-red bg-accent-red/5 border-accent-red/10' }
                                ].map((stat) => (
                                    <div key={stat.label} className={`p-5 rounded-2xl border transition-all hover:scale-105 duration-300 ${stat.color}`}>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">{stat.label}</p>
                                        <p className="text-3xl font-black tabular-nums">{stat.count}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="border border-border-main rounded-[2.5rem] overflow-hidden bg-bg-main/20 shadow-inner">
                                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left text-[11px] font-medium text-text-muted">
                                        <thead className="bg-[#0B0F14] sticky top-0 z-20 border-b border-border-main">
                                            <tr>
                                                <th className="px-6 py-4 font-black uppercase tracking-[0.2em] text-text-muted text-[9px]">IDX</th>
                                                <th className="px-6 py-4 font-black uppercase tracking-[0.2em] text-text-muted text-[9px]">RECORD_IDENTIFICATION_NODE</th>
                                                <th className="px-6 py-4 font-black uppercase tracking-[0.2em] text-text-muted text-[9px]">VALIDATION_LOG</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-main">
                                            {previewData.rows.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-neutral-subtle transition-all duration-200 group">
                                                    <td className="px-6 py-4 font-black text-text-muted tracking-widest">{row.rowNumber.toString().padStart(3, '0')}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-black text-text-main uppercase tracking-tight group-hover:text-primary transition-colors">
                                                            {row.data.asset_id || row.data.starnumber || row.data.mobile_number || row.data.email_id || row.data.software_name || row.data.mac_address || row.data.location || `UNNAMED_NODE_${row.rowNumber}`}
                                                        </div>
                                                        <div className="text-[9px] text-text-muted font-black uppercase tracking-widest mt-1">
                                                            {row.data.asset_type ? (
                                                                <span className="text-primary/50">{row.data.asset_type}</span>
                                                            ) : null}
                                                            {row.data.department || row.data.assigned_user ? ` • ${row.data.department || row.data.assigned_user}` : ''}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {row.status === 'valid' ? (
                                                            <div className="flex items-center gap-2 text-accent-green">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-accent-green animate-pulse" />
                                                                <span className="font-black uppercase tracking-widest text-[9px]">VERIFIED_OK</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-2">
                                                                {(row.errors || []).map((err, i) => (
                                                                    <div key={i} className="flex items-center gap-1.5 text-accent-red bg-accent-red/5 px-2 py-0.5 rounded-lg border border-accent-red/20">
                                                                        <AlertCircle size={10} />
                                                                        <span className="font-black text-[8px] uppercase tracking-tighter">{err}</span>
                                                                    </div>
                                                                ))}
                                                                {(row.warnings || []).map((warn, i) => (
                                                                    <div key={i} className="flex items-center gap-1.5 text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/20">
                                                                        <AlertTriangle size={10} />
                                                                        <span className="font-black text-[8px] uppercase tracking-tighter">{warn}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-10 py-6 animate-in fade-in zoom-in-95 duration-700 text-center">
                            <div className="flex flex-col items-center">
                                <div className="h-24 w-24 rounded-[2.5rem] bg-accent-green/10 text-accent-green flex items-center justify-center mb-6 shadow-primary border-2 border-accent-green/20">
                                    <CheckCircle2 size={48} className="animate-bounce" />
                                </div>
                                <h2 className="text-2xl font-black text-text-main uppercase tracking-tight">Ingestion Protocol Complete</h2>
                                <p className="text-text-muted font-black uppercase tracking-[0.2em] text-[10px] mt-2">Batch Reference: <span className="text-primary">{importResult.batchId}</span></p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl mx-auto">
                                <div className="bg-neutral-subtle rounded-[2rem] p-8 border border-border-main relative group overflow-hidden shadow-inner">
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">Success Resolution</p>
                                    <p className="text-4xl font-black text-accent-green tabular-nums">{importResult.success}</p>
                                    <p className="text-[9px] text-accent-green/50 font-black uppercase tracking-[0.2em] mt-2">RECORDS_ARCHIVED</p>
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Database size={60} />
                                    </div>
                                </div>
                                <div className="bg-neutral-subtle rounded-[2rem] p-8 border border-border-main relative group overflow-hidden shadow-inner">
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">Failure / Skipped</p>
                                    <p className="text-4xl font-black text-accent-red tabular-nums">{importResult.failed + importResult.skipped}</p>
                                    <p className="text-[9px] text-accent-red/50 font-black uppercase tracking-[0.2em] mt-2">RECONCILIATION_REQ</p>
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <AlertTriangle size={60} />
                                    </div>
                                </div>
                            </div>

                            {importResult.failed > 0 && (
                                <Button className="w-full bg-accent-red hover:bg-accent-red/80 shadow-primary h-16 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px]" size="lg" onClick={downloadErrorReport} icon={FileDown}>
                                    Download Reconciliation Report (.xlsx)
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-border-main bg-bg-main/20 p-6 -mx-6 -mb-6 backdrop-blur-xl">
                    <Button variant="ghost" onClick={step === 1 ? onClose : () => setStep(step - 1)} icon={step === 1 ? X : ChevronLeft} className="order-2 sm:order-1 text-text-muted hover:text-text-main font-black text-[10px] tracking-widest uppercase">
                        {step === 1 ? 'TERMINATE_PROTOCOL' : 'PREVIOUS_SEGMENT'}
                    </Button>

                    <div className="order-1 sm:order-2 w-full sm:w-auto">
                        {step === 1 && (
                            <Button variant="primary" size="md" disabled={!file || loading} onClick={handlePreview} icon={ChevronRight} loading={loading} className="w-full sm:w-auto px-12 h-12 shadow-primary font-black text-[10px] tracking-widest uppercase">
                                {loading ? 'ANALYZING...' : 'PREVIEW_VALIDATION'}
                            </Button>
                        )}
                        {step === 2 && (
                            <Button variant="primary" size="md" onClick={handleConfirm} disabled={loading || (previewData.summary.total - previewData.summary.errors) === 0} loading={loading} icon={RefreshCw} className="w-full sm:w-auto px-12 h-12 shadow-primary font-black text-[10px] tracking-widest uppercase">
                                {loading ? 'INGESTING...' : `COMMIT_${previewData.summary.valid + previewData.summary.warnings}_RECORDS`}
                            </Button>
                        )}
                        {step === 3 && (
                            <Button variant="primary" size="md" onClick={onDone} icon={CheckCircle2} className="w-full sm:w-auto px-12 h-12 shadow-primary font-black text-[10px] tracking-widest uppercase">
                                RETURN_TO_TERMINAL
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    )
}



