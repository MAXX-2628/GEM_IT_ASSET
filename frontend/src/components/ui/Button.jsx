import React from 'react'

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    icon: Icon,
    loading = false,
    disabled = false,
    ...props
}) {
    const variants = {
        primary: 'bg-gradient-to-br from-primary to-primary-hover text-white shadow-primary hover:shadow-[0_0_25px_-2px_var(--primary-glow)] border-transparent font-bold uppercase tracking-widest',
        secondary: 'glass text-text-main hover:shadow-secondary border-neutral-border font-bold uppercase tracking-widest',
        danger: 'bg-accent-red/10 text-accent-red border-accent-red/30 hover:bg-accent-red hover:text-white hover:shadow-[0_0_20px_rgba(255,77,77,0.4)] shadow-[0_0_15px_-5px_rgba(255,77,77,0.3)]',
        ghost: 'bg-transparent border-transparent text-text-muted hover:text-text-main hover:bg-neutral-subtle font-bold uppercase tracking-widest',
        link: 'bg-transparent border-transparent text-primary hover:underline p-0 underline-offset-4 font-bold'
    }

    const sizes = {
        sm: 'px-3 py-1.5 text-[10px]',
        md: 'px-6 py-2.5 text-xs',
        lg: 'px-8 py-3.5 text-sm'
    }

    return (
        <button
            disabled={disabled || loading}
            className={`
                inline-flex items-center justify-center gap-2 
                rounded-xl transition-all duration-300
                active:scale-95 disabled:opacity-40 disabled:active:scale-100 disabled:cursor-not-allowed
                ${variants[variant]} ${sizes[size]} ${className}
            `}
            {...props}
        >
            {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : Icon && <Icon size={size === 'sm' ? 12 : 16} className="shrink-0" />}
            {children}
        </button>
    )
}

