import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import { cn } from '../lib/cn';

export interface ModalProps {
  open: boolean;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  className?: string;
  closeLabel?: string;
  dismissible?: boolean;
}

export function Modal({
  open,
  title,
  eyebrow,
  children,
  footer,
  onClose,
  className,
  closeLabel = '关闭',
  dismissible = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      if (open) onClose();
    };
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose, open]);

  return (
    <dialog
      ref={dialogRef}
      className={cn('ui-modal', className)}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && dismissible) onClose();
      }}
    >
      <div className="ui-modal__frame" onClick={(event) => event.stopPropagation()}>
        <span className="ui-modal__corner ui-modal__corner--tl" aria-hidden="true" />
        <span className="ui-modal__corner ui-modal__corner--tr" aria-hidden="true" />
        <span className="ui-modal__corner ui-modal__corner--bl" aria-hidden="true" />
        <span className="ui-modal__corner ui-modal__corner--br" aria-hidden="true" />
        <header className="ui-modal__header">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 id={titleId} className="ui-modal__title">
              {title}
            </h2>
          </div>
          {dismissible ? (
            <Button
              variant="ghost"
              size="sm"
              aria-label={closeLabel}
              className="ui-modal__close"
              onClick={onClose}
            >
              <Icon name="close" size={18} />
            </Button>
          ) : null}
        </header>
        <div className="ui-modal__body">{children}</div>
        {footer ? <footer className="ui-modal__footer">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
