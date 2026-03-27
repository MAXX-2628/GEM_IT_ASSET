import React from 'react'

export function Table({ children, className = '', ...props }) {
    return (
        <div className="w-full overflow-x-auto rounded-2xl border border-border-main bg-bg-card shadow-2xl">
            <table className={`w-full text-left border-collapse text-sm ${className}`} {...props}>
                {children}
            </table>
        </div>
    )
}

export function THead({ children, ...props }) {
    return (
        <thead className="bg-bg-main border-b border-border-main" {...props}>
            {children}
        </thead>
    )
}

export function TBody({ children, ...props }) {
    return (
        <tbody className="divide-y divide-border-main" {...props}>
            {children}
        </tbody>
    )
}

export function TR({ children, className = '', interactive, selected, hover, ...props }) {
    return (
        <tr 
            className={`
                transition-colors duration-200
                ${interactive ? 'cursor-pointer' : ''}
                ${selected ? 'bg-primary/10' : (hover !== false ? 'hover:bg-neutral-subtle' : '')}
                ${className}
            `} 
            {...props}
        >
            {children}
        </tr>
    )
}

export function TH({ children, className = '', ...props }) {
    return (
        <th 
            className={`px-6 py-4 text-left text-[10px] font-black text-text-muted uppercase tracking-[0.2em] whitespace-nowrap ${className}`} 
            {...props}
        >
            {children}
        </th>
    )
}

export function TD({ children, className = '', ...props }) {
    return (
        <td 
            className={`px-6 py-4 text-text-dim font-medium ${className}`} 
            {...props}
        >
            {children}
        </td>
    )
}

