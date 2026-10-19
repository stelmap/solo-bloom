/** Small pages stay below the API row limit; callers must provide stable ordering. */
export async function fetchAllPages<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const size = 500;
  const all: T[] = [];
  for (let offset = 0; ; offset += size) {
    const { data, error } = await fetchPage(offset, offset + size - 1);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < size) return all;
  }
}