import { createTRPCReact } from '@trpc/react-query';

import type { AppRouter } from '@learnspace/api';

export const trpc = createTRPCReact<AppRouter>();
