import { describe } from 'vitest';
import { describeRpcIntegrationChecks } from '../helpers/rpc-checks';
import { anchorRepoExists, clientText, opsForTag, schemas, sqlFnNames } from '../helpers/fixtures';

describe.skipIf(!anchorRepoExists)('Invites vs. anchor source', () => {
  describeRpcIntegrationChecks({
    ops: opsForTag('Invites'),
    sqlFnNames,
    clientText,
    schemas,
  });
});
