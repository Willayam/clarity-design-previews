# How Clarity calls AI models

Synthesized design, 2026-10-06. Two independent designs (Claude Opus and GPT-6 Astra) were compared, a third model judged them, and this page combines them. A third runner (Fable) dropped out on a usage limit.

## The problem

Clarity makes one model call today: page generation, a raw `fetch` to OpenAI in `workers/frontend-router/src/journey-page-model.ts`, with the model as a constant. William wants four more things from every AI feature:

- swap models often, and only after evals pass
- see cost, latency, tokens and failures for every call
- fall back to a different provider family when one fails
- one shared path that every future feature uses (page from recording, edit by asking, prospect from a URL, AI themes, word timestamps for auto-trim)

What we found while grounding:

- The Cloudflare account had no AI Gateways. The code names three, and the `AI_GATEWAY_TOKEN` secret never existed, so 100% of calls in the last 30 days went straight to OpenAI. Nothing recorded the model, the tokens or the cost.
- AI Gateway's own Evaluations feature is deprecated for new accounts. Evals have to be ours.
- Gateway dynamic routes (fallback chains and A/B splits configured in Cloudflare) accept only the OpenAI request shape. Nobody has confirmed that Cloudflare's cross-provider translation keeps structured output intact.
- An AI Gateway Run token covers every gateway in the account. It can't be scoped to one.

## What a feature author writes

Every model call is a **task**. A task is a spec plus a route plus an eval.

```ts
// packages/journey-page-domain/src/page-generation-task.ts. The domain owns prompt, schema and conversion.
export const pageGenerationSpec = defineTask({
  output: json('journey_page_blocks', blockGenerationJsonSchema()),   // the existing schema, unchanged
  prompt: ({ base, request }) => ({ system: SYSTEM_PROMPT, user: [text(buildGenerationPrompt(base, request))] }),
  // Runs after the reply passed the schema. Production and evals both get this value.
  complete: ({ base, request }, page) =>
    placeMediaAttachments(applyGeneratedBlocks(page, base, { userPrompt: request.message }), request.attachments ?? []),
});
```

```ts
// packages/ai-tasks/src/index.ts. Every production model choice, in one file.
export const AI_TASKS = defineAiTasks({
  'journey-page-generation': task({
    spec: pageGenerationSpec,
    latency: 'interactive',
    route: [
      { model: 'openai/gpt-6-luna', reasoning: 'low', maxOutputTokens: 16_384, timeoutMs: 60_000 },
      { model: 'anthropic/<model chosen by eval>', maxOutputTokens: 16_384, timeoutMs: 45_000 },
    ],
  }),
});
```

```ts
// workers/frontend-router/src/journey-page-generation.ts. The call site.
const answer = await runTask(AI_TASKS['journey-page-generation'], { base, request }, {
  env, workspaceId: job.workspace_id, timeoutMs: GENERATION_TIMEOUT_MS,
});
const landed = await landGeneratedDraft(db, job, base, answer.output);   // a JourneyPageDocument
```

Callers pass only domain input, the workspace and a time budget. They never pick a model, a provider, a retry policy or a logging option, so a swap never touches a call site.

## How a model swap works

1. Try the candidate: `node scripts/ai.mjs eval journey-page-generation --model <ref> --publish`. This runs every eval case through the same code production runs and prints checks, judge scores, cost and p95 next to the current model. `--publish` gives William a page that compares the two case by case.
2. Edit one line in `packages/ai-tasks/src/index.ts`, plus a catalog row in `packages/ai/src/catalog.ts` if the model is new.
3. Re-run `node scripts/ai.mjs eval journey-page-generation` to rewrite `evals/ai/journey-page-generation/receipts.json`.
4. Open a PR. CI recomputes each step's fingerprint without calling a model, and fails with the command to run if a receipt is missing or stale.
5. After deploy: `node scripts/ai.mjs usage --env production --task journey-page-generation`.

## Load-bearing decisions

**1. Model choice lives in code, not in gateway dynamic routes.** Both designs reached this on their own. A swap often changes request knobs as well as the model (PR #1015 dropped temperature and added `reasoning_effort`). Dynamic routes take only the OpenAI shape, sit outside review, skip the eval gate, and break "this release means this model". The cost is a deploy per swap, which at our volume is nothing.

**2. Every call goes through the gateway on the provider's native path.** That's `/openai/chat/completions`, `/anthropic/v1/messages` and `/google-ai-studio/...:generateContent`. The gateway passes native bodies through, so structured output never depends on Cloudflare translating it. There is no direct-to-provider bypass: a missing gateway id is `not_configured`. That bypass is how 30 days of calls went unrecorded.

**3. Our executor owns fallback, and every reply is validated in our code.** Each provider adapter encodes the schema in its strongest native mode: OpenAI strict `json_schema`, Anthropic a forced tool, Google `responseJsonSchema`. Then `conform()` checks every reply against the same schema, whichever provider answered. A reply that fails the check moves to the next model. Every route step must pass the eval bar on its own, so a fallback can't serve worse pages than the bar allows. Gateway retries stay off, so every attempt is counted.

| Failure | Same model again | Next model | Job retries the call later |
|---|---|---|---|
| network, 429, 5xx | once, if it failed within 5 s | yes | yes |
| this model's timeout | no | yes | yes |
| other 4xx | no | yes | no |
| refusal, truncated, empty, invalid output | no | yes | no |
| no key for this provider here | skipped and recorded | yes | no |
| call deadline or caller cancelled | stop | stop | yes |

**4. Keep the existing schema, and validate a strict subset of it.** `blockGenerationJsonSchema()` stays the single source for the wire schema and for validation. A small `conform()` validates the subset that all three providers' strict modes accept: objects with every property required, arrays, strings, enums, numbers, booleans. A test fails if a task's schema leaves that subset. The judge talked us out of a bespoke schema builder: it was migration work with no payoff.

**5. Evals grade the value production gets, and CI checks them without calling a model.** The spec's `complete()` runs inside the executor, so eval checks see the same `JourneyPageDocument` production lands, attachments included. Each route step has a committed receipt. Its fingerprint is a sha256 over the exact wire requests for every case (from the pure `encode()`, no key and no network), plus the `packages/ai` source, the eval files and the judge panel. Edit a prompt, a block description, a model, a knob, a check or the executor, and the receipt goes stale. CI then fails and prints the command to run.

**6. Telemetry is one Analytics Engine point per attempt, with prices from one catalog.** `runTask` writes an `ai_call` point to the RUM dataset per attempt. The point records task, model, provider, release, outcome, step, served, latency, tokens, cost and the gateway log id. Unknown tokens or cost are written as -1, never 0. The same prices go to the gateway as `cf-aig-custom-cost`, so the dashboard agrees with our points. Gateway metadata carries `task`, `release`, `call` and `purpose`, but no workspace or prospect data. `ai_generate` stays as the page feature's outcome point and gains the call id.

**7. Gateways are set up by a rerunnable script.** `node scripts/ai-gateway.mjs plan|apply` creates the three gateways and pulls their settings back in line. Gateway ids come from `wrangler.jsonc` and `PREVIEW_AI_GATEWAY_ID`. The dashboard is read-only for the settings the script manages. All three gateways:
- log requests but not request or response bodies
- don't cache
- don't retry
- set `byok_only`, so a call without a provider key fails instead of quietly billing Cloudflare credits

**8. Provider keys are Worker secrets per environment, and previews hold no Cloudflare token.** The Run token covers every gateway in the account, so it never reaches branch code. Production and staging use an authenticated gateway. Previews call an unauthenticated `clarity-preview` gateway with preview-only provider keys, and no gateway stores a provider key. A stranger who finds the preview gateway can only spend their own key. A deploy fails when a key that a route needs is missing, instead of today's "put it if the GitHub secret exists".

## What it deliberately doesn't do

- no dynamic routes, compat endpoint, BYOK, cache or gateway retries
- no D1 call ledger, reconciler or daily rollups (Astra's design had these; we can add them if Analytics Engine sampling or retention ever bites)
- no live A/B split in production: at 2 generations a month it would take years to read
- no prompts or outputs in Analytics Engine, Sentry or gateway logs, except eval-judge calls on synthetic data
- no fetching inside the AI layer: features hand it bytes and text, so each feature keeps its own SSRF policy

## Module map

```
packages/ai/src/            runtime, imports no other repo package
  index.ts                  the only importable entry (lint-enforced)
  task.ts                   defineTask, task, defineAiTasks, text(), image()
  schema.ts                 json(), conform(), the strict-subset check
  catalog.ts                MODELS: provider, wire id, price, operation, accepted inputs, knob style
  run.ts                    runTask, aiReady, execute: deadline, retries, fallback, recording
  gateway.ts                the only module that names a model host
  telemetry.ts              the ai_call point layout
  providers/openai.ts       chat completions json_schema; transcription later
  providers/anthropic.ts    messages with a forced tool
  providers/google.ts       generateContent with responseJsonSchema
  evaluate.ts               defineEval, evaluate, fingerprint, judge panel
packages/ai-tasks/src/index.ts      AI_TASKS, the production registry
evals/ai/<task>/{cases.ts, eval.ts, receipts.json}
scripts/ai-gateway.mjs      gateway plan | apply
scripts/ai.mjs              eval | usage | secrets
scripts/check-ai.mjs        CI guard: receipts, registry and eval directories, key wiring
DELETED in PR 2: journey-page-model.ts and its test
```

## Delivery

| PR | What lands | Proof |
|---|---|---|
| 1 | `scripts/ai-gateway.mjs` creates the three gateways and keeps them in line; the Run token becomes the `AI_GATEWAY_TOKEN` secret | a second `apply` reports in sync; a staging generate shows `openai_gateway` and a gateway log with tokens, cost and metadata but no payload |
| 2 | `packages/ai` with the OpenAI adapter, page generation on `runTask`, page evals with receipts, and the `check-ai` gate, all in one change, with the old path deleted | root `pnpm test`; passing receipts; a one-word prompt edit fails the gate; generate on preview and staging; `ai_call` rows with tokens and cost |
| 3 | Anthropic and Google adapters, catalog rows and keys; candidate evals decide which join the route | a forced primary failure lands a schema-checked page from step 2 on a preview |
| 4 | `scripts/ai.mjs usage` with reconciliation against gateway totals | matches gateway totals for staging over 7 days |
| 5+ | one PR per feature: page from recording, edit by asking, prospect from URL, AI theme, speech words | each adds a spec, a registry entry and evals |

The judge flagged that both original sequences shipped the production cutover before the eval gate. PR 2 now lands both together.

## Synthesis record

- **Base:** the Opus design (task registry, Analytics Engine telemetry, committed receipts with request fingerprints, token-free previews).
- **Cross-judge (GPT-6 Astra):** preferred the Astra design for its stronger guarantees, and scored the Opus design higher on laziness and preview security. We took Opus as the base, because the Astra design's D1 ledger written before every paid call, reconciler, R2 report archive, CI attestations and repeated bootstrap comparisons are far more machinery than 2 to 50 calls a month needs.
- **Grafted from Astra:**
  - the spec's `complete()`, so evals grade the domain value production lands
  - unknown usage and cost recorded as unknown, never zero
  - keep the existing schema rather than writing a new builder
  - fingerprints that also cover the runtime source, not only wire requests
  - eval gate and cutover in the same PR
  - weekly drift evals for model aliases a provider can change under us (later, once evals can run headless with keys)
- **Rejected from Astra:** the D1 call ledger, the gateway observations table and reconciler, R2 report retention, CI-run live evals with attestations, and 40 cases × 3 repetitions with bootstrap intervals.

## Open questions for William

1. **Fallback providers:** which do you want to pay for? Anthropic and Google mean two more API accounts and keys. Their models get picked by evals, not by hand.
2. **Budgets:** daily spend limits per environment (gateway spend rules, added once we confirm they apply to our own provider keys).
3. **Real data in evals:** may eval cases ever come from real generations? This design assumes synthetic cases only, because the job payloads carry prospect data.
4. **Who runs evals:** headless agent lanes need network access and the preview keys to run evals. Without that, a prompt change needs you or a Claude lane before CI goes green.
