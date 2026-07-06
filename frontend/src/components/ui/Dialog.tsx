import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
 
interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}
 
export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className
}) => {
  if (!isOpen) return null;
 
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 light text-foreground">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-transparent transition-opacity duration-300"
        onClick={onClose}
      />
 
      {/* Dialog Content */}
      <div
        className={cn(
          'relative w-[92%] sm:w-full max-w-lg rounded-xl border border-border bg-card/95 p-5 sm:p-6 shadow-xl transition-all duration-300 transform scale-100 opacity-100 z-10 max-h-[88vh] overflow-y-auto scrollbar-thin',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pb-2 border-b border-border/40">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-secondary/35 hover:bg-secondary/50 text-foreground transition-colors shrink-0"
            title="Back"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div className="flex-1 space-y-0.5">
            <h2 className="text-sm font-black tracking-tight text-primary uppercase">{title}</h2>
            {description && (
              <p className="text-[11px] text-muted-foreground font-semibold">{description}</p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};
