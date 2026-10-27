import { useId } from 'react';
import { cn } from '../lib/cn';

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  className?: string;
}

export function Toggle({ label, checked, onChange, description, className }: ToggleProps) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className={cn('ui-toggle-row', className)}>
      <div className="ui-toggle-row__copy">
        <label className="ui-toggle-row__label" htmlFor={id}>
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="ui-toggle-row__description">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={descriptionId}
        className="ui-switch"
        onClick={() => onChange(!checked)}
      >
        <span className="ui-switch__track" aria-hidden="true">
          <span className="ui-switch__thumb" />
        </span>
        <span className="ui-switch__state">{checked ? '开' : '关'}</span>
      </button>
    </div>
  );
}
