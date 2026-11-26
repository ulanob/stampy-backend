// src/lib/timezone.ts
import { find } from 'geo-tz';

export type TimezoneResolver = (lat: number, lng: number) => Promise<string[]>;

// geo-tz can return several zones near borders; empty array for open ocean
export const resolveTimezones: TimezoneResolver = async (lat, lng) => find(lat, lng);
