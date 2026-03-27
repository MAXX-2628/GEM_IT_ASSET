import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, RotateCcw, Check } from 'lucide-react'
import { Button, Input, Field } from './ui'

export default function DateRangeFilter({ onFilter, onClear }) {
    const [isOpen, setIsOpen] = useState(false)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const dropdownRef = useRef(null)

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleFilter = () => {
        if (!startDate && !endDate) return
        onFilter({ startDate, endDate })
        setIsOpen(false)
    }

    const handleClear = () => {
        setStartDate('')
        setEndDate('')
        onClear()
        setIsOpen(false)
    }

    const setPreset = (type) => {
        const end = new Date()
        let start = new Date()

        switch (type) {
            case 'today':
                break
            case '7days':
                start.setDate(end.getDate() - 7)
                break
            case '30days':
                start.setDate(end.getDate() - 30)
                break
            case 'month':
                start.setDate(1)
                break
            default:
                break
        }

        const startStr = start.toISOString().split('T')[0]
        const endStr = end.toISOString().split('T')[0]
        setStartDate(startStr)
        setEndDate(endStr)
    }

    const hasValue = startDate || endDate
    const formatDate = (dateStr) => {
        if (!dateStr) return ''
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    return (
        <div ref={dropdownRef} className="relative">
            <Button
                variant={hasValue ? 'primary' : 'ghost'}
                onClick={() => setIsOpen(!isOpen)}
                icon={Calendar}
                className={`h-10 px-4 gap-2 border-border-main ${hasValue ? 'shadow-primary' : 'bg-bg-main'}`}
            >
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                    {hasValue
                        ? `${formatDate(startDate)} — ${formatDate(endDate)}`
                        : 'Filter Date'
                    }
                </span>
                <ChevronDown size={14} className={`text-text-dim transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </Button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-3 z-50 bg-bg-card border border-border-main rounded-[2rem] p-6 shadow-[0_10px_40px_-5px_rgba(0,0,0,0.8)] min-w-[340px] animate-in fade-in zoom-in-95 duration-200">
                    <div className="space-y-6">
                        <div className="flex flex-col gap-3">
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">QUICK_PRESETS</span>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { label: 'Today', type: 'today' },
                                    { label: '7 Days', type: '7days' },
                                    { label: '30 Days', type: '30days' },
                                    { label: 'Month', type: 'month' }
                                ].map(p => (
                                    <button
                                        key={p.type}
                                        onClick={() => setPreset(p.type)}
                                        className="px-3 py-1.5 rounded-full bg-bg-main/5 border border-border-main text-[9px] font-bold text-text-muted uppercase tracking-widest hover:bg-primary hover:text-white hover:border-primary transition-all duration-300"
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">CUSTOM_WINDOW</span>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="START_NODE">
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="uppercase font-black text-[10px] bg-bg-main/40 border-border-main"
                                    />
                                </Field>
                                <Field label="END_NODE">
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="uppercase font-black text-[10px] bg-bg-main/40 border-border-main"
                                    />
                                </Field>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t border-border-main">
                            <Button variant="ghost" size="sm" onClick={handleClear} icon={RotateCcw} className="flex-1 h-10 border-border-main text-[9px] font-black uppercase tracking-widest text-text-muted">
                                RESET
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleFilter}
                                disabled={!startDate && !endDate}
                                className="flex-1 h-10 shadow-primary text-[9px] font-black uppercase tracking-widest"
                            >
                                APPLY_RANGE
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
