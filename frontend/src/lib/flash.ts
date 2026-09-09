import { createContext, useContext } from 'react';
import type { FlashbarProps } from '@cloudscape-design/components/flashbar';

export type PushFlash = (msg: Omit<FlashbarProps.MessageDefinition, 'id' | 'onDismiss' | 'dismissible'>) => void;

export const FlashContext = createContext<PushFlash>(() => {});

export function useFlash(): PushFlash {
  return useContext(FlashContext);
}
