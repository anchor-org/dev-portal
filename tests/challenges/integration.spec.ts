import { describeRpcIntegrationChecks } from '../helpers/rpc-checks';
import { anchorRepoExists, clientText, opsForTag, schemas, sqlFnNames } from '../helpers/fixtures';
import { describe } from 'vitest';

describe.skipIf(!anchorRepoExists)('Challenges vs. anchor source', () => {
  describeRpcIntegrationChecks({
    ops: opsForTag('Challenges'),
    sqlFnNames,
    clientText,
    schemas,
  });
});
