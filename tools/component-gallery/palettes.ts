import { theme } from '../../src/theme';
import type { GalleryPalette } from './types';

// Development previews only: applied before rendering in this separate process.
export const palettes: Record<string, GalleryPalette> = {
    default: { ...theme },
    light: {
        background: '#ffffff',
        panel: '#f1f5f9',
        raised: '#e2e8f0',
        border: '#64748b',
        text: '#172033',
        muted: '#475569',
        accent: '#006653',
        selection: '#c5e8dd',
        stripe: '#f8fafc',
        modified: '#854d0e',
    },
    contrast: {
        background: '#000000',
        panel: '#000000',
        raised: '#202020',
        border: '#ffffff',
        text: '#ffffff',
        muted: '#dddddd',
        accent: '#00ffff',
        selection: '#003f5c',
        stripe: '#111111',
        modified: '#ffff00',
    },
};
