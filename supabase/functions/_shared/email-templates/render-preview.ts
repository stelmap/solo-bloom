import * as React from 'npm:react@18.3.1'
import { render } from 'npm:@react-email/components@0.0.22'

// The old renderAsync decoder splits multibyte UTF-8 at stream boundaries.
// These synchronous templates need no stream; keep SDK production delivery untouched.
export function renderEmailPreview(element: React.ReactElement): string {
  return render(element)
}