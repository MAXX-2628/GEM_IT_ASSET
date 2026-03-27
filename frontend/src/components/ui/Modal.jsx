import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const SIZE_MAP = {
    xs: '320px',
    sm: '400px',
    md: '600px',
    lg: '800px',
    xl: '1000px',
    '2xl': '1200px',
    full: '95vw'
}

export default function Modal({
    show = true,
    onClose,
    title,
    subtitle,
    children,
    footer,
    width,
    size = 'md'
}) {
    const maxWidth = width || SIZE_MAP[size] || SIZE_MAP.md

    useEffect(() => {
        if (show) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = 'unset'
        return () => { document.body.style.overflow = 'unset' }
    }, [show])

    if (!show) return null

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-bg-main/90 backdrop-blur-md animate-in fade-in duration-500"
            onMouseDown={e => { if (e.target === e.currentTarget) window.modalMouseDown = true }}
            onMouseUp={e => {
                if (e.target === e.currentTarget && window.modalMouseDown) onClose()
                window.modalMouseDown = false
            }}
        >
            <div 
                className="bg-bg-card border border-border-main rounded-[2.5rem] shadow-[0_0_80px_-15px_rgba(0,0,0,0.8)] w-full relative animate-in zoom-in-95 duration-500 max-h-[95vh] flex flex-col overflow-hidden ring-1 ring-neutral-subtle"
                style={{ maxWidth }}
            >
                {/* Visual Top Accent */}
                <div className="h-1.5 bg-gradient-to-r from-primary to-secondary shadow-primary" />
                
                <div className="px-10 py-8 border-b border-border-main bg-neutral-subtle flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-sm font-black text-text-main uppercase tracking-[0.3em] leading-none">{title}</h2>
                        {subtitle && <div className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none mt-2">{subtitle}</div>}
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 rounded-2xl bg-neutral-subtle border border-neutral-border hover:bg-neutral-border text-text-muted hover:text-text-main transition-all active:scale-90 hover:rotate-90 duration-300"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="px-10 py-8 overflow-y-auto flex-1 custom-scrollbar bg-gradient-to-b from-bg-card to-bg-main">
                    {children}
                </div>
                
                {footer && (
                    <div className="px-10 py-6 border-t border-border-main bg-bg-main/80 backdrop-blur-xl flex justify-end gap-5">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}

