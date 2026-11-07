import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '../ui/Toast';
import { api } from './api';
import { useAccess } from './auth';

type Query = Record<string, string | number | undefined>;

/** GET helper: the cache key is the path plus its query, so screens share data and refresh together. */
export function useGet<T = any>(path: string, query?: Query, enabled = true) {
  const allowed = useAccess();
  const q = useQuery<T>({ queryKey: [path, query ?? {}], queryFn: () => api<T>(path, { query }), enabled: enabled && allowed });
  // not allowed yet (signing in / being redirected): look "loading" rather than "empty", because screens read the data right after their loading check
  return !allowed && enabled ? ({ ...q, isLoading: true } as typeof q) : q;
}

/** Write helper: shows the server's message on failure and refreshes the listed paths on success. */
export function useSend<TBody = any, TOut = any>(
  path: string | ((b: TBody) => string),
  o: { method?: string; idempotent?: boolean; invalidate?: string[]; onDone?: (out: TOut) => void; success?: string; silent?: boolean } = {},
) {
  const qc = useQueryClient();
  return useMutation<TOut, Error, TBody>({
    mutationFn: (body) => api<TOut>(typeof path === 'function' ? path(body) : path, { method: o.method ?? 'POST', body: body ?? {}, idempotent: o.idempotent }),
    onSuccess: (out) => {
      // screens that handle their own follow-up (onDone) give their own feedback; others get a plain confirmation
      if (!o.silent && (o.success || !o.onDone)) toast.success(o.success ?? 'Done');
      o.invalidate?.forEach((p) => qc.invalidateQueries({ queryKey: [p] }));
      o.onDone?.(out);
    },
    onError: (e) => toast.error(e.message),
  });
}

/** Turns the backend's zod error details into { field: message } for inline form errors. */
export function fieldErrors(e: any): Record<string, string> {
  const f = e?.details?.fieldErrors ?? {};
  return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, (v as string[])[0]]));
}
