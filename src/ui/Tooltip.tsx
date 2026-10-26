import type { ReactNode } from 'react';
import { Tooltip as RadixTooltip } from 'radix-ui';

interface TooltipProps {
  content: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** When false the trigger renders without a tooltip. */
  enabled?: boolean;
  children: ReactNode;
}

/**
 * Text label shown on hover and keyboard focus. Needs a `Tooltip.Provider`
 * (radix-ui) above it. The trigger keeps its own accessible name.
 */
export function Tooltip({ content, side = 'right', enabled = true, children }: TooltipProps) {
  if (!enabled) return children;
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={8}
          className="z-50 rounded-md border border-border-strong bg-popup px-2 py-1 text-xs text-text shadow-lg"
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
