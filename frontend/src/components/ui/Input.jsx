import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Search, ChevronDown, Check, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

export function Field({ label, required, children, className = '' }) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-1.5 ml-1">
                    {label}
                    {required && <span className="text-primary ml-1.5">*</span>}
                </label>
            )}
            {children}
        </div>
    )
}

// Custom Modern Date Picker
function DatePickerField({ label, error, icon: Icon, value, onChange, className = '', disabled, name, ...props }) {
    const [isOpen, setIsOpen] = useState(false)
    const pickerRef = useRef(null)
    const dropdownRef = useRef(null)
    const [alignRight, setAlignRight] = useState(false)
    const [openUpward, setOpenUpward] = useState(false)
    
    const parsedValue = value ? new Date(value) : null
    const [viewDate, setViewDate] = useState(parsedValue || new Date())

    useEffect(() => {
        if (value) {
            const newDate = new Date(value)
            if (!isNaN(newDate)) setViewDate(newDate)
        }
    }, [value])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) setIsOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (isOpen && dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect()
            const inputRect = pickerRef.current.getBoundingClientRect()
            
            // Horizontal check
            if (rect.right > window.innerWidth) {
                setAlignRight(true)
            } else {
                setAlignRight(false)
            }

            // Vertical check
            if (rect.bottom > window.innerHeight && inputRect.top > rect.height) {
                setOpenUpward(true)
            } else {
                setOpenUpward(false)
            }
        }
    }, [isOpen])

    const handleSelect = (date) => {
        if (disabled) return
        const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
        const dateString = offsetDate.toISOString().split('T')[0]
        if (onChange) onChange({ target: { name, value: dateString } })
        setIsOpen(false)
    }

    const [viewMode, setViewMode] = useState('date') // 'date', 'month', 'year'
    const [yearPage, setYearPage] = useState(new Date().getFullYear())

    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    const days = Array.from({ length: firstDay }, () => null)
        .concat(Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)))

    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

    return (
        <Field label={label}>
            <div className="relative group/input" ref={pickerRef}>
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within/input:text-primary transition-colors pointer-events-none z-10">
                        <Icon size={16} />
                    </div>
                )}
                
                <div 
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    tabIndex={0}
                    className={`
                        w-full bg-neutral-subtle border border-border-main rounded-xl px-4 py-2.5
                        text-sm text-text-main flex items-center justify-between
                        transition-all cursor-pointer select-none outline-none
                        ${Icon ? 'pl-11' : ''}
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-text-muted/50'}
                        ${isOpen ? 'border-primary/50 ring-4 ring-primary/10 bg-bg-card' : ''}
                        ${error ? 'border-accent-red/50 ring-accent-red/10' : ''} ${className}
                    `}
                    {...props}
                >
                    <span className={!parsedValue ? 'text-text-muted uppercase tracking-widest text-xs font-bold' : 'text-xs font-black uppercase tracking-widest'}>
                        {parsedValue ? parsedValue.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'SELECT DATE'}
                    </span>
                    <CalendarIcon size={14} className={`transition-colors ${isOpen ? 'text-primary' : 'text-text-muted'}`} />
                </div>

                {isOpen && (
                    <div 
                        ref={dropdownRef}
                        className={`
                            absolute w-72 bg-bg-card border border-border-main rounded-[1.25rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] z-50 overflow-hidden p-5 animate-in fade-in duration-200
                            ${openUpward ? 'bottom-[calc(100%+8px)] slide-in-from-bottom-2' : 'top-[calc(100%+8px)] slide-in-from-top-2'}
                            ${alignRight ? 'right-0' : 'left-0'}
                        `}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <button 
                                type="button" 
                                className="p-1.5 hover:bg-neutral-subtle rounded-xl text-text-muted hover:text-text-main transition-colors border border-transparent hover:border-neutral-border" 
                                onClick={(e) => { 
                                    e.stopPropagation()
                                    if (viewMode === 'date') setViewDate(new Date(year, month - 1, 1))
                                    else if (viewMode === 'month') setViewDate(new Date(year - 1, month, 1))
                                    else if (viewMode === 'year') setYearPage(yearPage - 12)
                                }}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-text-main flex items-center gap-1">
                                {viewMode === 'year' ? (
                                    <span className="px-2 py-1">{yearPage} - {yearPage + 11}</span>
                                ) : (
                                    <>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); setViewMode(viewMode === 'month' ? 'date' : 'month') }} className={`hover:bg-neutral-subtle px-2 py-1 rounded transition-colors ${viewMode === 'month' ? 'bg-neutral-subtle' : 'text-primary'}`}>{MONTHS[month]}</button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); setYearPage(Math.floor(year/12)*12); setViewMode(viewMode === 'year' ? 'date' : 'year') }} className={`hover:bg-neutral-subtle px-2 py-1 rounded transition-colors ${viewMode === 'year' ? 'bg-neutral-subtle text-primary' : ''}`}>{year}</button>
                                    </>
                                )}
                            </span>
                            
                            <button 
                                type="button" 
                                className="p-1.5 hover:bg-neutral-subtle rounded-xl text-text-muted hover:text-text-main transition-colors border border-transparent hover:border-neutral-border" 
                                onClick={(e) => { 
                                    e.stopPropagation()
                                    if (viewMode === 'date') setViewDate(new Date(year, month + 1, 1))
                                    else if (viewMode === 'month') setViewDate(new Date(year + 1, month, 1))
                                    else if (viewMode === 'year') setYearPage(yearPage + 12)
                                }}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                        
                        <div className="min-h-[220px]">
                            {viewMode === 'date' && (
                                <>
                                    <div className="grid grid-cols-7 gap-1 mb-2">
                                        {DAYS.map(d => (
                                            <div key={d} className="text-center text-[9px] font-black uppercase tracking-widest text-text-muted py-2">{d}</div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                        {days.map((d, i) => {
                                            if (!d) return <div key={`empty-${i}`} />
                                            const isSelected = parsedValue && d.toDateString() === parsedValue.toDateString()
                                            const isToday = d.toDateString() === new Date().toDateString()
                                            return (
                                                <button
                                                    type="button"
                                                    key={i}
                                                    onClick={(e) => { e.stopPropagation(); handleSelect(d) }}
                                                    className={`
                                                        h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center
                                                        ${isSelected ? 'bg-primary text-white shadow-primary' : 'text-text-dim hover:bg-neutral-subtle'}
                                                        ${isToday && !isSelected ? 'text-primary border border-primary/30' : ''}
                                                    `}
                                                >
                                                    {d.getDate()}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </>
                            )}

                            {viewMode === 'month' && (
                                <div className="grid grid-cols-3 gap-2 py-2">
                                    {MONTHS.map((m, i) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setViewDate(new Date(year, i, 1)); setViewMode('date') }}
                                            className={`py-4 rounded-xl text-xs font-bold transition-all ${month === i ? 'bg-primary text-white shadow-primary' : 'text-text-dim hover:bg-neutral-subtle'}`}
                                        >
                                            {m.substring(0, 3)}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {viewMode === 'year' && (
                                <div className="grid grid-cols-3 gap-2 py-2">
                                    {Array.from({length: 12}, (_, i) => yearPage + i).map(y => (
                                        <button
                                            key={y}
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setViewDate(new Date(y, month, 1)); setViewMode('date') }}
                                            className={`py-4 rounded-xl text-xs font-bold transition-all ${year === y ? 'bg-primary text-white shadow-primary' : 'text-text-dim hover:bg-neutral-subtle'}`}
                                        >
                                            {y}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-5 pt-4 border-t border-neutral-border flex justify-between">
                             <button type="button" onClick={(e) => { e.stopPropagation(); if(onChange) onChange({ target: { name, value: '' } }); setIsOpen(false) }} className="px-4 py-2 rounded-lg bg-neutral-subtle text-[9px] font-black uppercase tracking-widest text-text-muted hover:text-text-main hover:bg-neutral-border transition-colors">Clear</button>
                             <button type="button" onClick={(e) => { e.stopPropagation(); handleSelect(new Date()) }} className="px-4 py-2 rounded-lg bg-primary/10 text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors border border-primary/20">Today</button>
                        </div>
                    </div>
                )}
            </div>
            {error && <span className="text-[10px] text-accent-red mt-1.5 block px-1 font-bold uppercase tracking-wider">{error}</span>}
        </Field>
    )
}

export function Input({ label, error, icon: Icon, className = '', type = 'text', ...props }) {
    if (type === 'date') {
        return <DatePickerField label={label} error={error} icon={Icon} className={className} disabled={props.disabled} {...props} />
    }

    return (
        <Field label={label}>
            <div className="relative group/input">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within/input:text-primary transition-colors pointer-events-none">
                        <Icon size={16} />
                    </div>
                )}
                <input 
                    type={type}
                    className={`
                        w-full bg-neutral-subtle border border-border-main rounded-xl px-4 py-2.5
                        text-sm text-text-main placeholder:text-text-muted
                        focus:border-primary/50 focus:ring-4 focus:ring-primary/10 
                        focus:bg-bg-card transition-all outline-none
                        ${Icon ? 'pl-11' : ''}
                        ${error ? 'border-accent-red/50 ring-accent-red/10' : ''} ${className}
                    `}
                    {...props} 
                />
            </div>
            {error && <span className="text-[10px] text-accent-red mt-1.5 block px-1 font-bold uppercase tracking-wider">{error}</span>}
        </Field>
    )
}

export function Select({ label, children, error, icon: Icon, className = '', value, onChange, disabled, name, ...props }) {
    const [isOpen, setIsOpen] = useState(false)
    const selectRef = useRef(null)
    const [searchBuffer, setSearchBuffer] = useState('')
    const searchTimeout = useRef(null)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (selectRef.current && !selectRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const extractOptions = (nodes) => {
        let opts = []
        React.Children.forEach(nodes, child => {
            if (!child) return
            if (child.type === 'option') {
                opts.push({ 
                    value: child.props.value !== undefined ? child.props.value : child.props.children, 
                    label: child.props.children 
                })
            } else if (child.props && child.props.children) {
                opts = opts.concat(extractOptions(child.props.children))
            }
        })
        return opts
    }
    const options = useMemo(() => extractOptions(children), [children])

    // Special logic to handle missing value matching (fallback to first option)
    const selectedOption = options.find(o => String(o.value) === String(value)) || options[0]

    const handleSelect = (optionValue) => {
        if (disabled) return
        if (onChange) {
            onChange({ target: { name, value: optionValue } })
        }
        setIsOpen(false)
    }

    const scrollToOption = (val) => {
        if (!selectRef.current) return
        setTimeout(() => {
            const dropdown = selectRef.current.querySelector('.custom-scrollbar')
            // CSS.escape to prevent querySelector errors with special characters in value
            const optionEl = dropdown?.querySelector(`[data-value="${CSS.escape(val)}"]`)
            if (optionEl && dropdown) {
                dropdown.scrollTop = optionEl.offsetTop - (dropdown.clientHeight / 2) + (optionEl.clientHeight / 2)
            }
        }, 10)
    }

    const handleKeyDown = (e) => {
        if (disabled) return

        if (e.key === 'Escape') {
            setIsOpen(false)
            return
        }

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsOpen(!isOpen)
            return
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            const currentIndex = options.findIndex(o => String(o.value) === String(value))
            let nextIndex = currentIndex !== -1 ? currentIndex : 0
            
            if (e.key === 'ArrowDown') nextIndex = Math.min(nextIndex + 1, options.length - 1)
            if (e.key === 'ArrowUp') nextIndex = Math.max(nextIndex - 1, 0)

            if (nextIndex !== currentIndex && onChange) {
                const nextVal = options[nextIndex].value
                onChange({ target: { name, value: nextVal } })
                if (isOpen) scrollToOption(nextVal)
            }
            return
        }

        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault()
            const newBuffer = searchBuffer + e.key.toLowerCase()
            setSearchBuffer(newBuffer)

            if (searchTimeout.current) clearTimeout(searchTimeout.current)
            searchTimeout.current = setTimeout(() => setSearchBuffer(''), 800)

            let match = options.find(o => String(o.label).toLowerCase().startsWith(newBuffer))

            // Fallback for repeated single character keys (cycling) like pressing 'S' multiple times
            if (!match && newBuffer.length > 1) {
                const singleChar = e.key.toLowerCase()
                setSearchBuffer(singleChar)
                const matches = options.filter(o => String(o.label).toLowerCase().startsWith(singleChar))
                if (matches.length > 0) {
                    const currentIndex = matches.findIndex(o => String(o.value) === String(value))
                    const nextMatch = matches[(currentIndex + 1) % matches.length]
                    match = nextMatch || matches[0]
                }
            }

            if (match && onChange && String(match.value) !== String(value)) {
                onChange({ target: { name, value: match.value } })
                if (isOpen) scrollToOption(match.value)
            }
        }
    }

    return (
        <Field label={label}>
            <div className="relative group/select" ref={selectRef}>
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within/select:text-primary transition-colors pointer-events-none z-10">
                        <Icon size={16} />
                    </div>
                )}
                
                <div 
                    tabIndex={0}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    onKeyDown={handleKeyDown}
                    className={`
                        w-full bg-neutral-subtle border border-border-main rounded-xl px-4 py-2.5
                        text-sm text-text-main flex items-center justify-between
                        transition-all cursor-pointer select-none outline-none
                        ${Icon ? 'pl-11' : ''}
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-text-muted/50 hover:bg-bg-card'}
                        ${isOpen ? 'border-primary/50 ring-4 ring-primary/10 bg-bg-card' : ''}
                        ${error ? 'border-accent-red/50 ring-accent-red/10' : ''} ${className}
                    `}
                    {...props}
                >
                    <span className={(!selectedOption || !selectedOption.value) ? 'text-text-muted' : 'truncate pr-4'}>
                        {selectedOption?.label || 'Select...'}
                    </span>
                    <ChevronDown size={14} className={`text-text-muted transition-transform flex-shrink-0 duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                </div>

                {isOpen && (
                    <div className="absolute top-[calc(100%+8px)] left-0 w-full min-w-max bg-bg-card border border-border-main rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] z-50 overflow-hidden py-3 max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                        {options.map((opt, i) => {
                            const isSelected = String(opt.value) === String(value)
                            return (
                                <div 
                                    key={i}
                                    data-value={opt.value}
                                    onClick={(e) => { e.stopPropagation(); handleSelect(opt.value) }}
                                    className={`
                                        px-5 py-3 text-xs cursor-pointer transition-all flex items-center justify-between mx-2 rounded-xl mb-1
                                        ${isSelected ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-text-dim hover:bg-neutral-subtle hover:text-text-main border border-transparent'}
                                    `}
                                >
                                    <span className={`truncate pr-4 ${isSelected ? 'uppercase tracking-[0.1em]' : ''}`}>{opt.label}</span>
                                    {isSelected && <Check size={14} className="flex-shrink-0 text-primary" />}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
            {error && <span className="text-[10px] text-accent-red mt-1.5 block px-1 font-bold uppercase tracking-wider">{error}</span>}
        </Field>
    )
}

export function Textarea({ label, error, className = '', ...props }) {
    return (
        <Field label={label}>
            <textarea 
                className={`
                    w-full bg-neutral-subtle border border-border-main rounded-xl px-4 py-2.5
                    text-sm text-text-main placeholder:text-text-muted
                    focus:border-primary/50 focus:ring-4 focus:ring-primary/10 
                    focus:bg-bg-card transition-all outline-none min-h-[120px] resize-none
                    ${error ? 'border-accent-red/50 ring-accent-red/10' : ''} ${className}
                `}
                {...props} 
            />
            {error && <span className="text-[10px] text-accent-red mt-1.5 block px-1 font-bold uppercase tracking-wider">{error}</span>}
        </Field>
    )
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '', ...props }) {
    return (
        <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
            <input
                type="text"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`
                    w-full bg-neutral-subtle border border-border-main rounded-xl pl-11 pr-4 py-2.5 
                    text-sm text-text-main placeholder:text-text-muted
                    focus:border-primary/50 focus:ring-4 focus:ring-primary/10 
                    focus:bg-bg-card transition-all outline-none ${className}
                `}
                {...props}
            />
        </div>
    )
}


