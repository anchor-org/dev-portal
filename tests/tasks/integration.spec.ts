import { describe } from 'vitest';
import { describeRpcIntegrationChecks } from '../helpers/rpc-checks';
import { anchorRepoExists, clientText, opsForTag, schemas, sqlFnNames } from '../helpers/fixtures';

describe.skipIf(!anchorRepoExists)('Tasks vs. anchor source', () => {
  describeRpcIntegrationChecks({
    ops: opsForTag('Tasks'),
    sqlFnNames,
    clientText,
    schemas,
  });
});
