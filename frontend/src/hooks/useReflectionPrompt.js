import { useState, useEffect } from 'react';

// Module-level singleton so any component can call openReflection()
// without prop-drilling or a new React context.
let _open = null;

export function openReflection(context) {
    _open?.(context);
}

export function useReflectionPromptRegistry() {
    const [isOpen, setIsOpen] = useState(false);
    const [context, setContext] = useState(null);

    useEffect(() => {
        _open = (ctx) => {
            setContext(ctx);
            setIsOpen(true);
        };
        return () => { _open = null; };
    }, []);

    const onClose = () => setIsOpen(false);
    return { isOpen, context, onClose };
}
