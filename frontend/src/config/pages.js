import { 
    LayoutDashboard, Monitor, Ticket, FileBarChart2, LayoutGrid, Video, 
    ClipboardCheck, History, Database, FileKey2, Boxes, ShieldCheck, Settings, Globe, Trash2
} from 'lucide-react'

export const ALL_PAGES = [
    { id: 'dashboard', label: 'Dashboard', to: '/', icon: LayoutDashboard, section: 'Management' },
    { id: 'handovers', label: 'Handover', to: '/handovers', icon: ClipboardCheck, section: 'Management' },
    { 
        id: 'inventory', 
        label: 'Inventory', 
        icon: Monitor, 
        section: 'Resources',
        children: [
            { id: 'inventory_live', label: 'Live Inventory', to: '/assets/live', icon: Globe },
            { id: 'inventory_stock', label: 'Stock Inventory', to: '/assets/stock', icon: Monitor },
            { id: 'inventory_scrap', label: 'Scrap Inventory', to: '/assets/scrap', icon: Trash2 },
        ]
    },
    { id: 'stock', label: 'Stock & Consumables', to: '/stock', icon: Boxes, section: 'Resources' },
    { id: 'digital', label: 'Digital Assets', to: '/digital', icon: FileKey2, section: 'Support' },
    { id: 'tickets', label: 'Tickets', to: '/tickets', icon: Ticket, section: 'Support' },
    { id: 'pm', label: 'Preventive Maint.', to: '/pm', icon: ShieldCheck, section: 'Support' },
    { id: 'surveillance', label: 'Surveillance', to: '/surveillance', icon: Video, section: 'Support' },
    { id: 'setup', label: 'Master Setup', to: '/setup', icon: LayoutGrid, section: 'System' },
    { id: 'users', label: 'Users', to: '/users', icon: ShieldCheck, section: 'System', role: 'super_admin' },
    { id: 'reports', label: 'Reports', to: '/reports', icon: FileBarChart2, section: 'System' },
    { id: 'activities', label: 'Activity Logs', to: '/activities', icon: History, section: 'System' },
    { id: 'backup', label: 'Backup & Restore', to: '/backup-restore', icon: Database, section: 'System' },
    { id: 'settings', label: 'Settings', to: '/settings', icon: Settings, section: 'System' },
]

export const getPageById = (id) => {
    for (const page of ALL_PAGES) {
        if (page.id === id) return page;
        if (page.children) {
            const child = page.children.find(c => c.id === id);
            if (child) return child;
        }
    }
    return null;
}
