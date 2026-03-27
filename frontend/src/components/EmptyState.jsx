import React from 'react';
import { Monitor } from 'lucide-react';

/**
 * Shared Empty State component
 * @param {Object} props
 * @param {React.ElementType} [props.icon] - Lucide icon component
 * @param {string} props.title - Main heading
 * @param {string} [props.message] - Description text
 * @param {React.ReactNode} [props.action] - Optional action button
 */
export default function EmptyState({ icon: IconProp, title, message, action }) {
    const Icon = IconProp || Monitor;
    return (
        <div>
            <Icon />
            <h3>{title}</h3>
            {message && <p>{message}</p>}
            {action && <div>{action}</div>}
        </div>
    );
}
