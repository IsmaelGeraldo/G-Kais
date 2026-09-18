import { useEffect } from 'react';

interface UseModalOptions {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Handles modal accessibility:
 * - Locks body scroll when open
 * - Closes modal on ESC key press
 * - Restores body scroll upon close/unmount
 */
export function useModalAccessibility({ isOpen, onClose }: UseModalOptions) {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
}
