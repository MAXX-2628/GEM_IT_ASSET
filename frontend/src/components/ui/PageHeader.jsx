import React from 'react';

export default function PageHeader({ title, subtitle, actions, className = "", icon: Icon }) {
    return (
        <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 ${className}`}>
            <div className="flex items-center gap-6">
                {Icon && (
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-primary shrink-0">
                        <Icon size={28} />
                    </div>
                )}
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-text-main tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-br from-text-main to-text-muted">
                        {title}
                    </h1>
                    {subtitle && (
                        <div className="text-xs font-bold text-text-muted uppercase tracking-[0.15em] mt-1.5 flex items-center gap-2">
                             <div className="w-1 h-1 rounded-full bg-primary" />
                            {subtitle}
                        </div>
                    )}
                </div>
            </div>
            {actions && (
                <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                    {actions}
                </div>
            )}
        </div>
    );
}

