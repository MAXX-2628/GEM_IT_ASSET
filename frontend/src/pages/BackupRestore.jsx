import { useState, useRef } from 'react'
import { Download, Upload, Info, History, ShieldCheck, Save, RotateCcw, RefreshCw, Archive, ShieldAlert, FileJson, Layers, Server, Shield } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Card, CardBody, Button, PageHeader, Badge } from '../components/ui'
import './BackupRestore.css'

export default function BackupRestore() {
    const [loading, setLoading] = useState(false)
    const [restoring, setRestoring] = useState(false)
    const [backupFile, setBackupFile] = useState(null)
    const fileInputRef = useRef()

    const handleDownloadBackup = async () => {
        setLoading(true)
        try {
            const res = await api.get('/backup/download', { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const link = document.createElement('a')
            link.href = url
            const date = new Date().toISOString().split('T')[0]
            link.setAttribute('download', `GEM_IT_Backup_${date}.zip`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            toast.success('System Backup Generated')
        } catch {
            toast.error('Backup Sequence Interrupted')
        } finally {
            setLoading(false)
        }
    }

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (file && file.name.endsWith('.zip')) {
            setBackupFile(file)
            toast.success('Backup Archive Loaded')
        } else {
            toast.error('Invalid Protocol: Select .zip archive')
            e.target.value = null
        }
    }

    const handleRestore = async () => {
        if (!backupFile) return
        if (!confirm('CRITICAL WARNING: This action will overwrite all system data. Proceed?')) return

        setRestoring(true)
        const formData = new FormData()
        formData.append('file', backupFile)

        try {
            await api.post('/backup/restore', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            toast.success('System Restoration Complete')
            setBackupFile(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
        } catch (err) {
            toast.error(err.response?.data?.message || 'Restore Protocol Failed')
        } finally {
            setRestoring(false)
        }
    }

    return (
        <div className="backup-restore-container space-y-6">
            <PageHeader
                title={<span className="text-gradient">Backup & Restore</span>}
                subtitle="Secure system data portability and catastrophic recovery nodes."
                actions={
                    <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="text-text-muted hover:text-text-main">
                        <RefreshCw size={14} className="mr-2" /> REFRESH STATUS
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Backup Node */}
                <Card className="tech-card card-glow-orange border-none bg-[--bg-card]/40 backdrop-blur-xl">
                    <CardBody className="p-6 flex flex-col h-full relative z-10">
                        <div className="flex items-center gap-5 mb-6">
                            <div className="icon-box icon-box-orange h-14 w-14">
                                <Archive size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black tracking-tight text-text-main uppercase">Create Backup</h3>
                                <p className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">Export Central Database</p>
                            </div>
                        </div>

                        <div className="bg-bg-main/10 border border-border-main rounded-xl p-4 flex items-start gap-4 mb-6">
                            <Info size={16} className="text-accent-blue mt-1" />
                            <p className="text-[11px] font-medium text-text-muted leading-relaxed shadow-sm">
                                Generates a secure <code className="text-text-main px-2 py-0.5 bg-bg-main/30 rounded font-bold">.zip</code> archive containing all assets, maintenance logs, and system credentials.
                            </p>
                        </div>

                        <div className="mb-6 flex-1">
                            <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mb-4">Integrity Nodes</h4>
                            <div className="space-y-2">
                                {[
                                    { name: 'Asset Inventory', icon: Layers },
                                    { name: 'Maintenance History', icon: History },
                                    { name: 'Ticket Archives', icon: FileJson },
                                    { name: 'Activity Manifest', icon: Server }
                                ].map(item => (
                                    <div key={item.name} className="item-row flex items-center gap-3 p-3 rounded-lg">
                                        <item.icon size={14} className="text-text-muted/40" />
                                        <span className="text-[11px] font-bold text-text-main tracking-wide uppercase">{item.name}</span>
                                        <div className="ml-auto flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-accent-green shadow-accent-green"></span>
                                            <span className="text-[9px] font-black text-accent-green uppercase tracking-tighter">Verified</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            className="btn-premium w-full py-5 text-lg hover:glow-orange"
                            onClick={handleDownloadBackup}
                            loading={loading}
                        >
                            <Save size={20} className="mr-3" /> Execute Backup
                        </Button>
                    </CardBody>
                </Card>

                {/* Restore Node */}
                <Card className="tech-card card-glow-purple border-none bg-[--bg-card]/40 backdrop-blur-xl">
                    <CardBody className="p-6 flex flex-col h-full relative z-10">
                        <div className="flex items-center gap-5 mb-6">
                            <div className="icon-box icon-box-purple h-14 w-14">
                                <RotateCcw size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black tracking-tight text-text-main uppercase">Restore System</h3>
                                <p className="text-[10px] font-bold text-secondary tracking-[0.2em] uppercase">Revert System State</p>
                            </div>
                        </div>

                        <div className="warning-box flex items-start gap-4 mb-6">
                            <ShieldAlert size={20} className="text-accent-red mt-0.5" />
                            <p className="text-[11px] font-bold text-accent-red leading-relaxed uppercase tracking-tight shadow-sm">
                                Destruction Alert: Restoring will overwrite all current data. Any new entries since the backup point will be purged.
                            </p>
                        </div>

                        <div
                            className={`drop-zone flex-1 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer mb-6 ${
                                backupFile ? 'active' : ''
                            }`}
                            onClick={() => fileInputRef.current.click()}
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".zip" hidden />

                            {backupFile ? (
                                <div className="text-center space-y-4">
                                    <div className="h-20 w-20 rounded-full bg-secondary/20 text-secondary flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(124,92,255,0.4)]">
                                        <ShieldCheck size={40} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-black text-text-main truncate max-w-[200px] uppercase tracking-wider">{backupFile.name}</p>
                                        <Badge variant="success" className="bg-secondary/40 text-text-main border-none animate-pulse">ARCHIVE LOADED</Badge>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center space-y-4 opacity-80 hover:opacity-100 transition-opacity">
                                    <div className="h-20 w-20 rounded-full bg-bg-main/10 text-text-muted flex items-center justify-center mx-auto border border-border-main">
                                        <Upload size={40} />
                                    </div>
                                    <div className="space-y-1">
                                         <p className="text-xs font-black text-text-main tracking-[0.2em] uppercase">Upload Backup</p>
                                        <p className="text-[9px] font-bold text-text-muted uppercase">Drag & Drop .ZIP Manifest</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Button
                            className={`btn-premium w-full py-5 text-lg ${
                                !backupFile 
                                ? 'bg-bg-main/10 text-text-muted/40 opacity-40 cursor-not-allowed border border-border-main' 
                                : 'bg-accent-red hover:bg-accent-red/80 text-white shadow-accent-red'
                            }`}
                            disabled={!backupFile || restoring}
                            onClick={handleRestore}
                            loading={restoring}
                            icon={RotateCcw}
                        >
                            Initiate Protocol
                        </Button>
                    </CardBody>
                </Card>
            </div>

            {/* Footer Status Panel */}
            <Card className="border-none bg-bg-card/40 backdrop-blur-md overflow-hidden border-t border-border-main">
                <CardBody className="p-0 flex flex-col md:flex-row">
                    <div className="p-8 md:w-1/3 flex flex-col items-center justify-center text-center space-y-4 border-r border-border-main">
                        <div className="h-20 w-20 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue shadow-accent-blue">
                            <ShieldCheck size={40} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-text-main uppercase tracking-tighter">System Reliability</h3>
                            <p className="text-[9px] font-bold text-accent-blue/60 uppercase tracking-[0.3em] mt-1">Armor Protocol v4.0</p>
                        </div>
                    </div>
                    <div className="p-10 md:flex-1 grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-accent-blue shadow-accent-blue" />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-blue">Routine Exports</h4>
                            </div>
                            <p className="text-[11px] font-medium text-text-dim leading-relaxed tracking-wide">
                                Generate daily snapshots to secure against hardware failure. Store files in independent storage nodes for maximum survivability.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-accent-red shadow-accent-red" />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-red">Data Overwrite</h4>
                            </div>
                            <p className="text-[11px] font-medium text-text-dim leading-relaxed tracking-wide">
                                Restore operations are total and irreversible. Existing records created post-backup will be permanently erased from the system.
                            </p>
                        </div>
                    </div>
                </CardBody>
            </Card>
        </div>
    )
}
