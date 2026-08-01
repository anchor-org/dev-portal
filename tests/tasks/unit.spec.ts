import { describeOperationChecks } from '../helpers/operation-checks';
import { declaredTags, opsForTag } from '../helpers/fixtures';

describeOperationChecks(opsForTag('Tasks'), declaredTags);
