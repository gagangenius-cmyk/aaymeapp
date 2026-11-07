import React, { useState } from 'react';
import { Button } from './kit';
import { PRODUCT_CODES, Scanner } from './Scanner';

/** "Scan barcode" button for a search field: puts the scanned code into the search so the product with that barcode shows up. */
export function SearchScan({ onCode }: { onCode: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button small variant="ghost" title="Scan barcode" onPress={() => setOpen(true)} />
      <Scanner visible={open} types={PRODUCT_CODES} title="Scan the product barcode" onClose={() => setOpen(false)} onCode={(c) => { setOpen(false); onCode(c.trim()); }} />
    </>
  );
}
