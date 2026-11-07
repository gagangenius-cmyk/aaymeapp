import { createContext } from 'react';

/** Height of the floating tab bar (0 outside tabs), so scroll content can leave room at the bottom. */
export const TabInsetContext = createContext<number>(0);
