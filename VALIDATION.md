# Validation Report

- Pack version: **2.0.0**
- Skill count: **25**
- Existing sandbox/campaign skills: **15**
- New custom-rules design skills: **10**
- Directory/name regex check: **PASS**
- Required `SKILL.md` frontmatter check: **PASS**
- OpenCode-recognized frontmatter fields only: **PASS**
- Description length (1–1024): **PASS**
- Manifest ↔ skill directory parity: **PASS**
- Bundled probability script smoke tests: **PASS**

## Probability Script Smoke Tests

Verified modes:

- `sum` — exact enumeration for NdS + bonus ≥ target
- `pool` — exact success-count distribution
- `highest` — exact fail / partial / full distribution

The script uses only the Python standard library.

## AIPT Content Gate

当前交付批次 `UNREGISTERED-AIPT-P0-B003` 已 `MERGED_CLOSED`、`global_wip: 0`；implementation merge 为 `5d25dad0dbcb648de565ea723027f999ec5b3a37`，其 post-merge AIPT Content Gate `32621232115` 为 `success`。直接仓库前序 B002 的 40 条 Rule、10 条 Invariant 与历史 0 条 Mutation 均保持冻结；B003 另分配 3 个仅用于 `NON_CANON TEST_FIXTURE` 的 Mutation ID。下一批 `AIPT-M0-B007` 为 `AUTHORIZED_TO_PREPARE`、`next_batch_authorized: true`、`started: false`；本仓库未开始其 implementation。

在 Node.js `v24.19.0` 下运行四个独立、无依赖的标准库验证器：

```sh
node scripts/aipt/validate-p0-b000.mjs
node scripts/aipt/validate-p0-b001.mjs
node scripts/aipt/validate-p0-b002.mjs
node scripts/aipt/validate-p0-b003.mjs
```

验证范围：

- B000：仓库 JSON 和相对 Markdown 链接、正式身份、许可策略、批次状态、交付表面与 CI workflow。
- B001：14 个源与 3 个 registry 引用的冻结哈希/语义、34 个稳定 ID、可见性、安全配置、最终 B002 表面，以及 100 个负向探针。
- B002：40 个 Rule ID、10 个 Invariant ID、40 条机器规则、10 个概念/105 条边的语义图、源定位器、Task 0 域闭合、安全边界，以及 35 个负向探针。
- B003：AIPT 兼容元数据、12 文件 clean fixture、3 个内存 overlay/detector、Human Guide shards、data-only game adapter、精确工件表面，以及 30 个负向探针。

CI workflow [`AIPT Content Gate`](.github/workflows/aipt-content-gate.yml) 固定 `ubuntu-24.04` 与 Node.js `24.19.0`，以四个独立步骤执行 validators，只授予 `contents: read`，使用不可变 action commit；不安装依赖、不使用 cache/token，也不进行远程或模型调用。
