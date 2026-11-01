import { appendFileSync } from 'node:fs';
import { productionTarget } from './lib/production-target.mjs';

const url = productionTarget(process.env.SYSTEM_TEST_BASE_URL);
if (!process.env.GITHUB_ENV) throw new Error('This command is intended for the scheduled GitHub workflow.');
appendFileSync(process.env.GITHUB_ENV, `SYSTEM_TEST_BASE_URL=${url}\nSYSTEM_TEST_REQUIRE_PRODUCTION=1\n`);
console.log(`Production system-test target validated: ${url}`);
