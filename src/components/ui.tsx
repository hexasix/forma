'use client';
import { useEffect, useId, useRef, type ReactNode, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, Minus, X } from 'lucide-react';
import type { Member, Priority } from '@/lib/types';
import { initials } from '@/lib/utils';
export function Avatar({
  member,
  small = false,
}: {
  member: Pick<Member, 'name' | 'color'>;
  small?: boolean;
}) {
  return (
    <span
      className={`avatar ${small ? 'avatar-small' : ''}`}
      style={{ '--avatar-color': member.color } as CSSProperties}
      title={member.name}
      aria-label={member.name}
    >
      {initials(member.name)}
    </span>
  );
}
export function PriorityMark({ priority, text = false }: { priority: Priority; text?: boolean }) {
  const Icon = priority === 'high' ? ArrowUp : priority === 'low' ? ArrowDown : Minus;
  return (
    <span className={`priority priority-${priority}`} title={`${priority} priority`}>
      <Icon size={13} strokeWidth={2} />
      {text && <span>{priority[0].toUpperCase() + priority.slice(1)}</span>}
    </span>
  );
}
export function Dialog({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  drawer = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const element = ref.current;
    const focusable = () =>
      Array.from(
        element?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]',
        ) || [],
      ).filter((el) => el.getClientRects().length);
    (element?.querySelector<HTMLElement>('[data-autofocus]') || focusable()[0] || element)?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      }
      if (event.key === 'Tab') {
        const items = focusable(),
          first = items[0],
          last = items.at(-1);
        if (!first) {
          event.preventDefault();
          element?.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === element)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <div
      className={`modal-backdrop ${drawer ? 'drawer-backdrop' : ''}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`dialog ${wide ? 'dialog-wide' : ''} ${drawer ? 'dialog-drawer' : ''}`}
      >
        <header className="dialog-header">
          <div>
            <span className="eyebrow">YOUR WORKSPACE</span>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
}
export function StatusDot({ status }: { status: string }) {
  return <span aria-hidden="true" className={`status-dot status-${status}`} />;
}
