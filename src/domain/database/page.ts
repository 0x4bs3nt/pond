import type { PageRequest } from './types';

export const isValidPageRange = ({ offset, limit }: PageRequest, maximum: number) =>
    Number.isSafeInteger(offset) && offset >= 0 && Number.isSafeInteger(limit) && limit > 0 && limit <= maximum;
