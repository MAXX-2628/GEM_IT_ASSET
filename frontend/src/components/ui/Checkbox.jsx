import React from 'react'

export function Checkbox({ checked, onChange, label, className = '', disabled = false }) {
    return (
        <label className={`flex items-center gap-3 cursor-pointer group select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
            <div className={`
                w-5 h-5 rounded-md border-2 transition-all duration-300 flex items-center justify-center
                ${checked 
                    ? 'bg-primary border-primary shadow-primary' 
                    : 'bg-neutral-subtle border-border-main group-hover:border-primary/50'}
            `}>
                {checked && (
                    <svg 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="4" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="text-white animate-in zoom-in duration-200"
                    >
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                )}
            </div>
            {label && (
                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${checked ? 'text-text-main' : 'text-text-muted group-hover:text-text-dim'}`}>
                    {label}
                </span>
            )}
            <input 
                type="checkbox" 
                checked={checked} 
                onChange={onChange} 
                disabled={disabled}
                className="hidden" 
            />
        </label>
    )
}


