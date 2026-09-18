import { useEffect, useRef } from 'react';

interface UseModalOptions {
  isOpen: boolean;
  onClose: () => void;
  containerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Handles modal accessibility:
 * - Locks body scroll when open
 * - Closes modal on ESC key press
 * - Focuses the first interactive element when opened
 * - Returns focus to the trigger element when closed
 * - Restores body scroll upon close/unmount
 */
export function useModalAccessibility({ isOpen, onClose, containerRef }: UseModalOptions) {
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Remember the trigger element that had focus before opening
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    // 2. Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 3. Focus first interactive element inside the modal
    const focusTimer = setTimeout(() => {
      const container = containerRef?.current || document.querySelector('[role="dialog"]');
      if (container) {
        const focusable = container.querySelectorAll<HTMLElement>(
          'input:not([disabled]), button:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        // Prefer first input or textarea, else first focusable
        const firstInput = Array.from(focusable).find(
          (el) => el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'
        );
        if (firstInput) {
          firstInput.focus();
        } else if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    }, 50);

    // 4. Handle ESC key press
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);

      // 5. Restore focus to the element that triggered the modal
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        setTimeout(() => {
          previousActiveElementRef.current?.focus();
        }, 10);
      }
    };
  }, [isOpen, onClose, containerRef]);
}
