## [2.2.0](https://github.com/tabkram/execution-engine/compare/v2.1.1...v2.2.0) (2025-02-19)
## [2.1.1](https://github.com/tabkram/execution-engine/compare/v2.1.0...v2.1.1) (2025-02-16)
## [2.1.0](https://github.com/tabkram/execution-engine/compare/v2.0.2...v2.1.0) (2023-12-15)

### ⚠ BREAKING CHANGES

* Replace 'getOrderedNarratives' method with 'getNarratives'

This method retrieves an ordered array of narratives from the nodes property.

### Features

* make in trace return The traceable execution object ([c38efe9](https://github.com/tabkram/execution-engine/commit/c38efe9e7dceddf915de26c2ffc7b651ccb15edf))
* remove options.additionalAttributes from ExecutionEngine constructor ([11962ef](https://github.com/tabkram/execution-engine/commit/11962ef62d56327de39f813aee78a833a6574a72))
* rename `getOrderedNarratives` to `getNarratives` ([ec8aea9](https://github.com/tabkram/execution-engine/commit/ec8aea96c4b0e414bd73d3c539a0eb530eca3ab7))
* use engine.options.id when provided as ExecutionId for ExecutionEngine ([73f539a](https://github.com/tabkram/execution-engine/commit/73f539a30438fa7e15d1e85c78a6c8db75abf162))
## [2.0.2](https://github.com/tabkram/execution-engine/compare/v2.0.1...v2.0.2) (2023-12-14)

### Bug Fixes

* display narratives when no traceOptions is mentioned ([42e9c9d](https://github.com/tabkram/execution-engine/commit/42e9c9d238a68cb76dc2a2abe14282b6610b75c2))
## [2.0.1](https://github.com/tabkram/execution-engine/compare/v2.0.0...v2.0.1) (2023-12-12)

### Bug Fixes

* engineTask run annotation for sync methods ([eb979ee](https://github.com/tabkram/execution-engine/commit/eb979eeef60b50cdf53dcba0ba9943bea32b6979))
## [2.0.0](https://github.com/tabkram/execution-engine/compare/v1.2.0...v2.0.0) (2023-12-10)

### Features

* add execution engine decorators [@engine](https://github.com/engine)() and [@run](https://github.com/run)() ([447fec9](https://github.com/tabkram/execution-engine/commit/447fec9c393f428ed9c1ca2edc27a312626166e4))
## [1.2.0](https://github.com/tabkram/execution-engine/compare/v1.1.0...v1.2.0) (2023-12-04)

### Features

* use async_hooks local storage in trace in order to auto detect parent node ([ee98fa8](https://github.com/tabkram/execution-engine/commit/ee98fa8cc095096d1ead02bc57e054201bdd9d45))
## [1.1.0](https://github.com/tabkram/execution-engine/compare/v1.0.1...v1.1.0) (2023-11-26)

### Features

* remove deprecated `appendNarratives` ([9d65edc](https://github.com/tabkram/execution-engine/commit/9d65edc654768dc42d5169f6bd5fd270369a0eff))
## [1.0.1](https://github.com/tabkram/execution-engine/compare/v1.0.0...v1.0.1) (2023-11-26)

### Features

* make `appendNarratives` deprecated and replace it with `pushNarratives` ([a42f882](https://github.com/tabkram/execution-engine/commit/a42f882320baa059eca81c9ece2ec8f9a5aff568))
## [1.0.0](https://github.com/tabkram/execution-engine/compare/v0.0.10...v1.0.0) (2023-11-26)

### Features

* remove tags associated with the executions and consider them as part of context ([df39ab2](https://github.com/tabkram/execution-engine/commit/df39ab2be6d929308b8f4e34ad98c8924929097f))
* use appendNarratives instead of deprecated pushNarrative ([73aad23](https://github.com/tabkram/execution-engine/commit/73aad234b8219c69f3ec6008fc3d73be2255648d))
## [0.0.10](https://github.com/tabkram/execution-engine/compare/v0.0.9...v0.0.10) (2023-11-26)
## [0.0.9](https://github.com/tabkram/execution-engine/compare/v0.0.8...v0.0.9) (2023-11-26)

### Bug Fixes

* the temporary storage for narratives associated with non-found nodes in order to improve them ([97545b2](https://github.com/tabkram/execution-engine/commit/97545b28bb609722c232bf231328a113b2ffe1f8))
* trace narratives extraction and configuration ([4806da8](https://github.com/tabkram/execution-engine/commit/4806da8df051603fef62602cdd909f4acce034dc))
## [0.0.8](https://github.com/tabkram/execution-engine/compare/v0.0.7...v0.0.8) (2023-11-26)

### Bug Fixes

* filtering trace node data based on options trace data an trace config ([5c58ba1](https://github.com/tabkram/execution-engine/commit/5c58ba1dc8cf08f6bdb8aada38ea6101068eb96e))
## [0.0.7](https://github.com/tabkram/execution-engine/compare/v0.0.6...v0.0.7) (2023-11-25)

### Bug Fixes

* resolve narrative bug ([bcea36f](https://github.com/tabkram/execution-engine/commit/bcea36faf6da728512f0753e7e944828d4aad3c5))
## [0.0.6](https://github.com/tabkram/execution-engine/compare/v0.0.5...v0.0.6) (2023-11-25)

### Features

* add initial trace when instantiating new executions ([37693f2](https://github.com/tabkram/execution-engine/commit/37693f251e5f6f10608e8bec83a04792826f9bf1))
* add npm repository keywords ([5f72831](https://github.com/tabkram/execution-engine/commit/5f7283198a94a79f1e779f800c73cb04cd766964))

### Bug Fixes

* eslint with plugin and config, include prettier ([a3aadfa](https://github.com/tabkram/execution-engine/commit/a3aadfa7908830339d7833808f156accac2102f9))
## [0.0.5](https://github.com/tabkram/execution-engine/compare/v0.0.4...v0.0.5) (2023-11-24)

### Bug Fixes

* execution getStartDate and getEndDate and improve getElapsedTime ([8eb30cb](https://github.com/tabkram/execution-engine/commit/8eb30cb2306e737cdb54b671be47011459e0a575))
## [0.0.4](https://github.com/tabkram/execution-engine/compare/v0.0.3...v0.0.4) (2023-11-24)

### Features

* add execution timer to index ([511eab2](https://github.com/tabkram/execution-engine/commit/511eab242e1fc98669c54075440def88b8535f34))
## [0.0.3](https://github.com/tabkram/execution-engine/compare/v0.0.2...v0.0.3) (2023-11-24)

### Features

* add more examples to explain ExecutionEngine usage ([28feb55](https://github.com/tabkram/execution-engine/commit/28feb558c4b5a96b17a4af156c2fb641478055d8))
* better duration measuring especially for short time intervals ([393429b](https://github.com/tabkram/execution-engine/commit/393429bcf156171d96a20cbd43057ba96c3faa55))

### Bug Fixes

* execution timer tests ([4259811](https://github.com/tabkram/execution-engine/commit/4259811e87c762d035630f5f5aea2f65f727f0a3))
## [0.0.2](https://github.com/tabkram/execution-engine/compare/8243be45fd13a0fbb968c18bf9401b7ea657cf8e...v0.0.2) (2023-11-18)

### Features

* add index.js file ([d1cab65](https://github.com/tabkram/execution-engine/commit/d1cab65af368fe6fc1fc085a8a60e5c7e59974a7))
* init execution-engine library ([8243be4](https://github.com/tabkram/execution-engine/commit/8243be45fd13a0fbb968c18bf9401b7ea657cf8e))
