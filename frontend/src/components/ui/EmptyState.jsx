import React from 'react'
import { Inbox } from 'lucide-react'

export default function EmptyState({ 
    icon: IconProp = Inbox, 
    title = "No Data Found", 
    description = "There are no records matching your current filters.",
    action
}) {
    const Icon = IconProp;
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in duration-700">
            <div className="w-20 h-20 rounded-2xl bg-neutral-subtle flex items-center justify-center text-text-muted mb-6 border border-border-main shadow-inner">
                <Icon size={40} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-text-main tracking-tight mb-2">
                {title}
            </h3>
            <p className="text-sm text-text-muted max-w-sm mx-auto leading-relaxed">
                {description}
            </p>
            {action && (
                <div className="mt-8">{action}</div>
            )}
        </div>
    )
}
