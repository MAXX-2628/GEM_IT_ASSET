import React from 'react'

export default function Badge({ children, variant = 'default', color, textColor, dot = true, className = '', style = {}, ...props }) {
    const variants = {
        default: 'bg-neutral-subtle text-text-muted border-neutral-border',
        primary: 'bg-primary/10 text-primary border-primary/20 shadow-[0_2px_10px_-3px_var(--primary-glow)]',
        cyan: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20 shadow-[0_2px_10px_-3px_rgba(59,130,246,0.3)]',
        magenta: 'bg-secondary/10 text-secondary border-secondary/20 shadow-[0_2px_10px_-3px_var(--secondary-glow)]',
        yellow: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20 shadow-[0_2px_10px_-3px_rgba(245,158,11,0.3)]',
        rose: 'bg-accent-red/10 text-accent-red border-accent-red/20 shadow-[0_2px_10px_-3px_rgba(255,77,77,0.3)]',
        teal: 'bg-accent-green/10 text-accent-green border-accent-green/20 shadow-[0_2px_10px_-3px_var(--accent-green-glow)]',
        gray: 'bg-neutral-subtle text-text-dim border-neutral-border',
        blue: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20 shadow-[0_2px_10px_-3px_var(--accent-blue-glow)]',
        amber: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20 shadow-[0_2px_10px_-3px_rgba(245,158,11,0.3)]',
        orange: 'bg-accent-orange/10 text-accent-orange border-accent-orange/20 shadow-[0_2px_10px_-3px_rgba(249,115,22,0.3)]',
        red: 'bg-accent-red/10 text-accent-red border-accent-red/20 shadow-[0_2px_10px_-3px_rgba(255,77,77,0.3)]',
        slate: 'bg-accent-slate/10 text-accent-slate border-accent-slate/20 shadow-[0_2px_10px_-3px_rgba(100,116,139,0.3)]',
        success: 'bg-accent-green/10 text-accent-green border-accent-green/20 shadow-accent-green',
        danger: 'bg-accent-red/10 text-accent-red border-accent-red/20 shadow-accent-red',
        warning: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20 shadow-accent-amber',
        info: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20 shadow-accent-blue',
        purple: 'bg-secondary/10 text-secondary border-secondary/20 shadow-secondary'
    }

    // Dynamic style generation for custom hex colors
    const customStyle = color?.startsWith('#') ? {
        backgroundColor: `color-mix(in srgb, ${color}, transparent 88%)`,
        color: textColor || color,
        borderColor: `color-mix(in srgb, ${color}, transparent 75%)`,
        boxShadow: `0 2px 10px -3px color-mix(in srgb, ${color}, transparent 70%)`,
        ...style
    } : style;

    return (
        <span 
            className={`
                inline-flex items-center px-3 py-1 rounded-full
                text-[9px] font-black border uppercase tracking-[0.15em]
                transition-all duration-300 whitespace-nowrap
                ${!color?.startsWith('#') ? (variants[variant] || variants.default) : ''} 
                ${className}
            `}
            style={customStyle}
            {...props}
        >
            {dot && (
                <div 
                    className="w-1.5 h-1.5 rounded-full mr-2 shrink-0 animate-pulse bg-current opacity-70"
                />
            )}
            {children}
        </span>
    )
}

