import React from 'react'

export default function Skeleton({ className = "", variant = "rect" }) {
    return (
        <div className={`
            bg-neutral-subtle animate-pulse
            ${variant === 'circle' ? 'rounded-full' : 'rounded-lg'}
            ${className}
        `} />
    )
}

export function SkeletonWrapper({ children, loading, fallback, className = "" }) {
    if (loading) return fallback
    return <div className={className}>{children}</div>
}
