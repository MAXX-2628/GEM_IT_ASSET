import React, { useEffect, useState } from 'react';

/**
 * Animated counter component
 * @param {Object} props
 * @param {number|string} props.value - Final value to count up to
 * @param {number} [props.duration=1000] - Animation duration in ms
 * @param {string} [props.className] - Extra class names
 */
export default function Counter({ value, duration = 1000 }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = parseInt(value) || 0;

        if (start === end) return;

        const timer = setInterval(() => {
            const step = Math.ceil(end / (duration / 16));
            start += step;

            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(start);
            }
        }, 16);

        return () => clearInterval(timer);
    }, [value, duration]);

    return <span>{count}</span>;
}
