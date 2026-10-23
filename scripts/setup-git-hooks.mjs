import { spawnSync } from 'node:child_process'

const inRepository = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { stdio: 'ignore' })
if (inRepository.status === 0)
    spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'inherit' })
