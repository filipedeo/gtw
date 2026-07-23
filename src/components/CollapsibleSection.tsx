import React, { useState } from 'react';
import { ChevronDownIcon } from './icons';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  titleColor?: string;
  borderColor?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  defaultOpen = true,
  children,
  titleColor,
  borderColor,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold" style={{ color: titleColor || 'var(--text-primary)' }}>
          {title}
        </span>
        <span
          className="text-xs transition-transform duration-200 text-fg-muted"
          style={{
            transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
            borderLeft: borderColor ? `2px solid ${borderColor}` : undefined,
          }}
        >
          <ChevronDownIcon size={14} />
        </span>
      </button>
      <div
        className="collapsible-grid"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

export default React.memo(CollapsibleSection);
