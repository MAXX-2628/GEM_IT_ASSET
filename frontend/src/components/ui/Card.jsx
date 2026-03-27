import React from 'react'

export function Card({ children, className = '', interactive = false, ...props }) {
    return (
        <div 
            className={`
                bg-bg-card border border-border-main rounded-2xl shadow-xl transition-all duration-300
                ${!className.includes('overflow-') ? 'overflow-hidden' : ''}
                ${interactive ? 'hover:border-primary/50 hover:shadow-primary cursor-pointer active:scale-[0.99] group' : ''} 
                ${className}
            `}
            {...props}
        >
            {children}
        </div>
    )
}

export function CardHeader({ children, className = '', borderless = false, ...props }) {
    return (
        <div 
            className={`px-6 py-5 flex items-center justify-between border-b ${borderless ? 'border-transparent' : 'border-border-main'} ${className}`}
            {...props}
        >
            {children}
        </div>
    )
}

export function CardTitle({ children, className = '', ...props }) {
    return (
        <h3 
            className={`text-xs font-black text-text-muted uppercase tracking-[0.2em] ${className}`}
            {...props}
        >
            {children}
        </h3>
    )
}

export function CardBody({ children, className = '', ...props }) {
    return (
        <div className={`p-6 ${className}`} {...props}>
            {children}
        </div>
    )
}

export function CardFooter({ children, className = '', ...props }) {
    return (
        <div 
            className={`px-6 py-4 border-t border-border-main bg-neutral-subtle rounded-b-2xl flex justify-end gap-3 ${className}`}
            {...props}
        >
            {children}
        </div>
    )
}

