// The row an `insert(...).returning()` of one value gives back. Drizzle types the
// result as a list, so under `noUncheckedIndexedAccess` the first element may be
// absent; an insert that returns nothing is a broken invariant, not a case to handle.
export const insertedRow = <Row>(rows: Row[]): Row => {
  const [row] = rows;
  if (row === undefined) {
    throw new Error('The insert returned no row.');
  }

  return row;
};
