import type { CareSchedulesQuery } from '#gql';

// A single configured care routine, as the detail page reads it — derived from
// the codegen types, never hand-written.
export type CareSchedule = CareSchedulesQuery['careSchedules'][number];
