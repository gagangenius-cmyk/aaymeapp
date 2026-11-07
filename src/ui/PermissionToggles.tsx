import React from 'react';
import { Toggle } from './kit';

export interface CatalogItem { key: string; label: string; help?: string }

/** A list of on/off switches driven by a catalog the server sends (so new permissions appear without an app update). */
export function PermissionToggles({ catalog, value, onChange, locked = [] }: { catalog: CatalogItem[]; value: string[]; onChange: (next: string[]) => void; locked?: string[] }) {
  return (
    <>
      {catalog.map((c) => (
        <Toggle key={c.key} label={c.label} help={c.help} value={value.includes(c.key)} disabled={locked.includes(c.key)}
          onChange={(on) => onChange(on ? [...new Set([...value, c.key])] : value.filter((k) => k !== c.key))} />
      ))}
    </>
  );
}
