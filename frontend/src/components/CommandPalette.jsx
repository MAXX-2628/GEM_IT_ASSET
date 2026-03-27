import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { AnimatePresence, motion } from 'framer-motion'
import {
    Search, LayoutDashboard, Monitor, HardDrive,
    Trash2, LayoutGrid, Globe, Ticket, ShieldCheck,
    Video, FileBarChart2, History, Database, Settings, CornerDownLeft, Box, Loader2
} from 'lucide-react'
import api from '../api/client'

const navItems = [
    { label: 'Dashboard', to: '/', icon: LayoutDashboard, section: 'Navigation' },
    { label: 'Live Inventory', to: '/assets/live', icon: Globe, section: 'Navigation' },
    { label: 'Stock Inventory', to: '/assets/stock', icon: Monitor, section: 'Navigation' },
    { label: 'Scrap Inventory', to: '/assets/scrap', icon: Trash2, section: 'Navigation' },
    { label: 'Master Setup', to: '/setup', icon: LayoutGrid, section: 'Navigation' },
    { label: 'Tickets', to: '/tickets', icon: Ticket, section: 'Navigation' },
    { label: 'Preventive Maint.', to: '/pm', icon: ShieldCheck, section: 'Navigation' },
    { label: 'Surveillance', to: '/surveillance', icon: Video, section: 'Navigation' },
    { label: 'Reports', to: '/reports', icon: FileBarChart2, section: 'Navigation' },
    { label: 'Activity Logs', to: '/activities', icon: History, section: 'Navigation' },
    { label: 'Backup & Restore', to: '/backup-restore', icon: Database, section: 'System' },
    { label: 'Settings', to: '/settings', icon: Settings, section: 'System' },
]

export default function CommandPalette() {
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [assetResults, setAssetResults] = useState([])
    const [isSearching, setIsSearching] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        if (searchQuery.length < 2) {
            setAssetResults([])
            setIsSearching(false)
            return
        }

        const timer = setTimeout(async () => {
            setIsSearching(true)
            try {
                const { data } = await api.get('/assets', { params: { search: searchQuery, limit: 5 } })
                setAssetResults(data?.data || [])
            } catch (err) {
                console.error(err)
            } finally {
                setIsSearching(false)
            }
        }, 250)

        return () => clearTimeout(timer)
    }, [searchQuery])

    useEffect(() => {
        const down = (e) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener('keydown', down)
        
        const handleCustomOpen = () => setOpen(true)
        window.addEventListener('open-command-palette', handleCustomOpen)
        
        return () => {
            document.removeEventListener('keydown', down)
            window.removeEventListener('open-command-palette', handleCustomOpen)
        }
    }, [])

    const runCommand = (command) => {
        setOpen(false)
        setSearchQuery('')
        command()
    }

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
                    {/* Dark Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setOpen(false)}
                        className="absolute inset-0 bg-bg-main/60 backdrop-blur-sm"
                    />

                    {/* Palette Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="relative w-full max-w-2xl bg-bg-card-elevated border border-border-main rounded-2xl shadow-2xl overflow-hidden ring-1 ring-primary/20 backdrop-blur-2xl"
                    >
                        <Command 
                            className="bg-transparent"
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') setOpen(false)
                            }}
                            filter={(value, search) => {
                                if (value.toLowerCase().includes(search.toLowerCase())) return 1
                                return 0
                            }}
                        >
                            {/* Input Header */}
                            <div className="flex items-center px-4 border-b border-border-main bg-bg-card-elevated/50">
                                <Search size={20} className="text-primary animate-pulse" />
                                <Command.Input 
                                    autoFocus
                                    value={searchQuery}
                                    onValueChange={setSearchQuery}
                                    placeholder="Execute command, search assets, or navigate..." 
                                    className="flex-1 bg-transparent border-none px-4 py-5 text-[13px] font-bold text-text-main outline-none placeholder:text-text-muted placeholder:font-black placeholder:uppercase placeholder:tracking-widest" 
                                />
                                <div className="px-2.5 py-1 rounded-lg bg-neutral-subtle border border-border-main text-[9px] font-black text-text-muted uppercase tracking-widest hidden sm:flex items-center gap-1 shadow-inner">
                                    ESC
                                </div>
                            </div>

                            {/* Command Lists */}
                            <Command.List className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                                <Command.Empty className="py-12 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 rounded-full bg-neutral-subtle flex items-center justify-center text-text-muted mb-4 border border-border-main">
                                        <Search size={20} />
                                    </div>
                                    <p className="text-sm font-black text-text-main uppercase tracking-widest mb-1">Unrecognized Command</p>
                                    <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest">
                                        No exact match found in the registry.
                                    </p>
                                    
                                    {searchQuery.length > 2 && (
                                        <button 
                                            onClick={() => runCommand(() => navigate(`/assets/live?search=${encodeURIComponent(searchQuery)}`))}
                                            className="mt-6 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center gap-2"
                                        >
                                            <Globe size={14} /> Search Global Assets for "{searchQuery}"
                                        </button>
                                    )}
                                </Command.Empty>

                                {/* Generic Asset Search Injector */}
                                {searchQuery.length > 2 && assetResults.length === 0 && !isSearching && (
                                     <Command.Item 
                                        value={`search assets ${searchQuery} default fallback`}
                                        onSelect={() => runCommand(() => navigate(`/assets/live?search=${encodeURIComponent(searchQuery)}`))}
                                        className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer text-text-main font-bold hover:bg-neutral-subtle hover:text-text-main aria-selected:bg-primary/10 aria-selected:text-primary transition-colors group mb-2 border border-transparent aria-selected:border-primary/20"
                                     >
                                         <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-aria-selected:animate-pulse">
                                             <Globe size={18} />
                                         </div>
                                         <div className="flex-1 flex flex-col">
                                             <span className="text-xs uppercase tracking-widest">Global Asset Search</span>
                                             <span className="text-[10px] text-text-muted flex items-center gap-1">Search registry for: <strong className="text-primary">{searchQuery}</strong></span>
                                         </div>
                                         <CornerDownLeft size={14} className="opacity-0 group-aria-selected:opacity-100 transition-opacity" />
                                     </Command.Item>
                                )}

                                {/* Live Asset API Results */}
                                {searchQuery.length > 1 && (
                                    <Command.Group heading={<div className="flex items-center justify-between text-[10px] font-black uppercase text-text-muted tracking-[0.2em] px-2 py-4"><span>Live Asset Results</span> {isSearching && <Loader2 size={12} className="animate-spin text-primary" />}</div>}>
                                        {assetResults.map(asset => (
                                            <Command.Item
                                                key={asset._id}
                                                value={`asset result id ${asset._id} name ${asset.asset_id} model ${asset.model} search ${searchQuery}`}
                                                onSelect={() => runCommand(() => navigate(`/assets/live?search=${asset.asset_id}`))}
                                                className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer text-text-main font-bold hover:bg-neutral-subtle hover:text-text-main aria-selected:bg-primary/10 aria-selected:text-primary transition-colors group mb-1 border border-transparent aria-selected:border-primary/20"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-bg-main border border-border-main/50 flex items-center justify-center text-text-muted group-aria-selected:border-primary/30 group-aria-selected:text-primary transition-colors">
                                                    <Box size={18} />
                                                </div>
                                                <div className="flex-1 flex flex-col">
                                                    <span className="text-[11px] uppercase tracking-widest text-text-main font-mono">{asset.asset_id}</span>
                                                    <span className="text-[9px] text-text-muted">{asset.manufacturer || 'Unknown Make'} {asset.model}</span>
                                                </div>
                                                <div className="text-[9px] font-bold px-2 py-0.5 rounded bg-bg-main border border-border-main/50 uppercase tracking-widest text-text-muted group-aria-selected:text-primary group-aria-selected:border-primary/30 flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${asset.status === 'Active' ? 'bg-accent-green' : asset.status === 'Under Maintenance' ? 'bg-accent-amber' : 'bg-accent-red'}`} />
                                                    {asset.status}
                                                </div>
                                                <CornerDownLeft size={14} className="opacity-0 group-aria-selected:opacity-100 transition-opacity ml-2 text-primary" />
                                            </Command.Item>
                                        ))}

                                        {assetResults.length > 0 && (
                                            <Command.Item 
                                                value={`search assets see all fallback ${searchQuery}`}
                                                onSelect={() => runCommand(() => navigate(`/assets/live?search=${encodeURIComponent(searchQuery)}`))}
                                                className="flex items-center justify-center gap-2 px-4 py-2 mt-2 rounded-lg cursor-pointer text-text-muted text-[10px] font-black uppercase tracking-widest hover:bg-neutral-subtle hover:text-text-main aria-selected:bg-primary/10 aria-selected:text-primary transition-colors group"
                                            >
                                                See All Results for "{searchQuery}" <Globe size={12} className="group-hover:translate-x-1 transition-transform" />
                                            </Command.Item>
                                        )}
                                    </Command.Group>
                                )}

                                <Command.Group heading={<span className="text-[10px] font-black uppercase text-text-muted tracking-[0.2em] px-2 py-4">Operational Shortcuts</span>}>
                                    <Command.Item 
                                        value="initialize new hardware asset"
                                        onSelect={() => runCommand(() => navigate('/assets/new'))}
                                        className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer text-text-main font-bold hover:bg-neutral-subtle hover:text-text-main aria-selected:bg-primary/10 aria-selected:text-primary transition-colors group border border-transparent aria-selected:border-primary/20"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-neutral-subtle flex items-center justify-center text-text-muted group-aria-selected:text-primary group-aria-selected:bg-primary/10 transition-colors">
                                            <Monitor size={18} />
                                        </div>
                                        <div className="flex-1 flex flex-col">
                                            <span className="text-xs uppercase tracking-widest">Construct New Asset</span>
                                            <span className="text-[10px] text-text-muted tracking-[0.1em]">Provision hardware to the registry</span>
                                        </div>
                                        <CornerDownLeft size={14} className="opacity-0 group-aria-selected:opacity-100 transition-opacity" />
                                    </Command.Item>
                                    <Command.Item 
                                        value="create incident ticket"
                                        onSelect={() => runCommand(() => navigate('/tickets'))}
                                        className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer text-text-main font-bold hover:bg-neutral-subtle hover:text-text-main aria-selected:bg-accent-red/10 aria-selected:text-accent-red transition-colors group border border-transparent aria-selected:border-accent-red/20"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-neutral-subtle flex items-center justify-center text-text-muted group-aria-selected:text-accent-red group-aria-selected:bg-accent-red/10 transition-colors">
                                            <Ticket size={18} />
                                        </div>
                                        <div className="flex-1 flex flex-col">
                                            <span className="text-xs uppercase tracking-widest">Log Incident Ticket</span>
                                            <span className="text-[10px] text-text-muted tracking-[0.1em]">File a new service request</span>
                                        </div>
                                        <CornerDownLeft size={14} className="opacity-0 group-aria-selected:opacity-100 transition-opacity" />
                                    </Command.Item>
                                </Command.Group>

                                <Command.Group heading={<span className="text-[10px] font-black uppercase text-text-muted tracking-[0.2em] px-2 py-4 block mt-2 border-t border-border-main">System Navigation</span>}>
                                    {navItems.map((item) => (
                                        <Command.Item
                                            key={item.to}
                                            value={`Navigate ${item.label}`}
                                            onSelect={() => runCommand(() => navigate(item.to))}
                                            className="flex items-center gap-4 px-4 py-2.5 rounded-xl cursor-pointer text-text-main font-bold hover:bg-neutral-subtle hover:text-text-main aria-selected:bg-primary/10 aria-selected:text-primary transition-colors group border border-transparent aria-selected:border-primary/20"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-neutral-subtle flex items-center justify-center text-text-muted group-aria-selected:text-primary group-aria-selected:bg-transparent transition-colors">
                                                <item.icon size={16} />
                                            </div>
                                            <span className="text-[11px] uppercase tracking-widest">{item.label}</span>
                                        </Command.Item>
                                    ))}
                                </Command.Group>
                            </Command.List>
                        </Command>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
