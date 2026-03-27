import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, Badge, Counter } from './ui';

export default function StatCard({ label, value, icon: IconProp, colorClass = "accent-blue", trend, onClick }) {
    const Icon = IconProp;
    const isUp = trend > 0;

    const colorMap = {
        'blue': 'accent-blue',
        'teal': 'accent-green',
        'amber': 'accent-amber',
        'magenta': 'accent-magenta',
        'red': 'accent-red',
        'accent-blue': 'accent-blue',
        'accent-magenta': 'accent-magenta',
        'accent-yellow': 'accent-amber',
        'accent-green': 'accent-green'
    }

    const themeColor = colorMap[colorClass] || 'blue'
    
    const glowClass = `hover:shadow-${themeColor} shadow-md`
    return (
        <Card
            interactive={!!onClick}
            onClick={onClick}
            className={`group transition-all duration-500 overflow-visible ${glowClass} border-border-main hover:border-${themeColor}/30 bg-bg-card`}
        >
            <div className="p-5 flex items-center gap-5 relative z-10">
                <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110 border
                    bg-${themeColor}/10 text-${themeColor} border-${themeColor}/20
                `}>
                    <Icon size={24} />
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1 truncate">
                        {label}
                    </div>
                    <div className="flex items-end gap-3">
                        <div className="text-3xl font-black text-text-main leading-none tracking-tight">
                            <Counter value={value} />
                        </div>
                        {trend !== undefined && trend !== 0 && (
                            <div className={`flex items-center gap-1 text-[10px] font-black ${isUp ? 'text-accent-green' : 'text-accent-red'} mb-1 px-1.5 py-0.5 rounded bg-neutral-subtle border border-border-main`}>
                                {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {Math.abs(trend)}%
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Subtle bottom accent line */}
            <div className={`absolute bottom-0 left-4 right-4 h-[3px] rounded-t-lg bg-${themeColor} opacity-20 group-hover:opacity-100 transition-opacity`} />
        </Card>
    );
}
