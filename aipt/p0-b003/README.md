# UNREGISTERED-AIPT-P0-B003 Adapter and Mutant Validation

状态：`MERGED_CLOSED`。implementation merge `5d25dad0dbcb648de565ea723027f999ec5b3a37` 及其 post-merge AIPT Content Gate `32621232115` 均已通过。本批次为 first roster + Task 0 提供 data-only game adapter 契约、确定性 clean fixture、三个 `NON_CANON TEST_FIXTURE` Mutant overlay/oracle，以及 Human Guide 映射。它不启动游戏 runtime，不复制 AIPT schema/SDK，不提升任何规则或战役内容为 CANON。

## 中央契约

| 工件 | 约束 / SHA-256 |
|---|---|
| [`compatibility.json`](compatibility.json) | AIPT commit/protocol/schema/SDK 精确绑定；`cfe8f112a5bbff6a95286953f2d9cfd5629ed1fe1f58d0a578ae17ee87a52d06` |
| [`human-guide-map.json`](human-guide-map.json) | 仅引用两个 shard，不重新解释人类指南；`3e0dcc3106afaa10307ed42894c2e761a14783070dcd540bc383a7679f31b867` |
| [`game-adapter.json`](game-adapter.json) | 40 Rule / 10 Invariant / 3 Mutation / 4 Character seat；`5ddef252e1b93a4b9348fb71e9490f106c02e9e0b8b11fa9a11a589bbc3effc5` |
| [`mutation-id-map.json`](mutation-id-map.json) | B003 的三个测试专用 Mutation ID；B002 的 0-Mutation 历史保持不变；`ea2dfaf379e9f99e6a3e2ae292d9cbf5787e45d9f7270e894728dbbb66cc50ae` |

Human Guide shards：

- [`core-map.json`](human-guide/core-map.json) — 四类时间、计划指标、场景/终止/降级/歧义映射；`5d06362f1993502f0f2f7b6488f65196a3a9a31256b46328846078b9f1935635`。
- [`safety-observer-map.json`](human-guide/safety-observer-map.json) — 仅证明安全协议符合性，主观报告不进入客观 hard gate；`e280c39c6b28241e9a66cb50354b4e307a5241699279a6038ba65ee7d3933e0d`。

## NON_CANON 测试工件

- [clean fixture manifest](NON_CANON_TEST_FIXTURE/clean/manifest.json) 固定 12 文件、4 个 seat、无模型/网络/随机性，并提供一致的 final-state/replay；SHA-256 `e52d53541afd15b86dcf79e1e89baa74b8f2c494e342bc02ee8863b0e9ce8faa`。
- [Mutant manifest](NON_CANON_TEST_FIXTURE/mutants/manifest.json) 精确索引三个 overlay/oracle；SHA-256 `8904b4c884b046d1dd5637aaec4deb1c518db2297b9cae3af4375ddb11894841`。
- `UNR-MUTATION-0001`：隐藏信息泄漏；预期 detector `AIPT_VISIBILITY_UNAUTHORIZED_FIELD`。
- `UNR-MUTATION-0002`：prose-machine 偏离；预期 detector `UNREGISTERED_PROSE_MACHINE_DIVERGENCE`。
- `UNR-MUTATION-0003`：state replay 不一致；预期 detector `AIPT_REPLAY_HASH_MISMATCH`。

三个 Mutant 都绑定 foundation `62daf4a6de3f5560d3b2ea8ac7527654a6da616c`，每个最多一次检测运行。overlay 仅由 validator 在内存中应用；真实 Authority 文件始终保持 clean。

## 生命周期与验证

- 规则来源：`PROPOSAL`；运行资格：`PLAYTESTABLE_DRAFT_ONLY`；`release_evidence_eligible: false`。
- Persona 与 Character 分离；具体 Persona profile 延迟到 AIPT Run Manifest。
- commit pair 绑定延迟到 `INT-AIPT-UNREGISTERED-001`。
- 下一批 `AIPT-M0-B007` 为 `AUTHORIZED_TO_PREPARE`、`next_batch_authorized: true`、`started: false`；它属于另一仓库，本次未创建其分支或开始 implementation。

使用 Node.js `v24.19.0`，无需依赖、安装、网络、模型或 subprocess：

```sh
node scripts/aipt/validate-p0-b000.mjs
node scripts/aipt/validate-p0-b001.mjs
node scripts/aipt/validate-p0-b002.mjs
node scripts/aipt/validate-p0-b003.mjs
```

[`validate-p0-b003.mjs`](../../scripts/aipt/validate-p0-b003.mjs) 冻结历史摘要，校验 clean fixture、受限内存 overlay、三个 detector、Human Guide 与 adapter 契约，并要求 30 个负向探针全部拒绝。
