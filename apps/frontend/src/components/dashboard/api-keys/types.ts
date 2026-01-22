import type { useAPIKeys } from '@clerk/nextjs/experimental';

export type ApiKey = NonNullable<ReturnType<typeof useAPIKeys>['data']>[number];
