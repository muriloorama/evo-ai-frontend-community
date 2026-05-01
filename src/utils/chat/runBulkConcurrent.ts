/**
 * runBulkConcurrent — executes `fn(item)` for each item with bounded
 * concurrency, never letting more than `concurrency` promises in flight at
 * once. Used by bulk actions on the conversation list so we don't fan out
 * dozens of simultaneous requests against the backend.
 *
 * It collects successes and failures separately so the caller can show a
 * partial-success toast (`X de N concluídas, Y falharam`).
 */
export interface BulkConcurrentResult<T, R> {
  succeeded: { item: T; result: R }[];
  failed: { item: T; error: unknown }[];
}

export async function runBulkConcurrent<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = 5,
): Promise<BulkConcurrentResult<T, R>> {
  const succeeded: { item: T; result: R }[] = [];
  const failed: { item: T; error: unknown }[] = [];

  if (items.length === 0) return { succeeded, failed };

  const limit = Math.max(1, Math.min(concurrency, items.length));
  let cursor = 0;

  const runWorker = async (): Promise<void> => {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= items.length) return;
      const item = items[idx];
      try {
        const result = await fn(item);
        succeeded.push({ item, result });
      } catch (error) {
        failed.push({ item, error });
      }
    }
  };

  const workers: Promise<void>[] = [];
  for (let i = 0; i < limit; i += 1) {
    workers.push(runWorker());
  }
  await Promise.all(workers);

  return { succeeded, failed };
}
