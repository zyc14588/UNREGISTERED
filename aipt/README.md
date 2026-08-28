# AIPT — P1 Playtest Package and Historical P0 Contracts

本目录保存《未登记》AIPT 机器可读交付。当前唯一 active WIP 是 `UNREGISTERED-AIPT-P1-B000` implementation candidate；固定 historical predecessor 为 `UNREGISTERED@358d6d9d08a86818e34fd0c0d9a62bfe66e73abe`（tree `5585271c78d1fe5cd8357c7b36a501bee34f0240`）。P0-B000…P0-B003 资产与 validators 保持 byte-exact，不在 P1 candidate 上改写或扩展。

## P1-B000 工件

- [`p1-b000/playtest-package.json`](p1-b000/playtest-package.json) — versioned Playtest Package；绑定 immutable source commit/tree、闭合 source digest inventory、scene/guide/rule/asset/reference mapping 与三类 visibility。
- [`p1-b000/runtime-adapter-input.json`](p1-b000/runtime-adapter-input.json) — data-only Runtime Adapter Input；绑定 package、selected test unit、resolved mapping、visibility proof 与现有 B001 immutable Run Manifest。
- [`p1-b000/compatibility-evidence.json`](p1-b000/compatibility-evidence.json) — predecessor/candidate target separation、Authority provenance 与 Campaign → Suite → Case → Run compatibility evidence。
- [`../scripts/aipt/validate-p1-b000.mjs`](../scripts/aipt/validate-p1-b000.mjs) — dependency-free、provider-independent concrete validator，执行 N01–N39 与额外 path/hidden-information probes。

P1-B000 只定义 package/input contract；不实现 Run Core、agent orchestration、model gateway 或真实桌测。`merge_authorized`、`closeout_authorized` 与 `next_batch_authorized` 均为 `false`。

## 工件索引

- [`status.json`](status.json) — 当前 B003 closeout 生命周期、已关闭的直接仓库前序 B002、已关闭的外部历史祖先 AIPT-M0-B006，以及仅获准准备但尚未开始的 AIPT-M0-B007。
- [`input-manifest.json`](input-manifest.json) — B001 冻结输入清单：14 个源文件和 3 个 registry 引用。
- [`p0-b000/identity.json`](p0-b000/identity.json) — 正式名称、旧代号历史标记与 `package_id`。
- [`p0-b000/licensing.json`](p0-b000/licensing.json) — 政策名称、引用标识、状态和 fail-closed 路径范围。
- [`p0-b000/premades-v2.json`](p0-b000/premades-v2.json) — AIPT FIRST ROSTER V2 首轮四人预置卡整合稿（`PLAYTESTABLE_DRAFT`）。
- [`p0-b001/stable-ids.json`](p0-b001/stable-ids.json) — B001 历史稳定 ID 注册表；RULE/INVARIANT/MUTATION 在该历史工件中仍为 RESERVED zero。
- [`p0-b001/visibility.json`](p0-b001/visibility.json) — 73 个 fail-closed 可见性映射。
- [`p0-b001/safety-profile.json`](p0-b001/safety-profile.json) — 2 Lines、1 Veil、5 项必确认与数据处理边界。
- [`p0-b002/README.md`](p0-b002/README.md) — B002 交付说明与冻结摘要。
- [`p0-b002/rule-id-map.json`](p0-b002/rule-id-map.json) — 40 个 Rule ID、10 个 Invariant ID、0 个 Mutation ID。
- [`p0-b002/machine-rules.json`](p0-b002/machine-rules.json) — 40 条 data-only、deterministic、`ACTIVE_PROPOSAL` 机器规则。
- [`p0-b002/semantic-graph.json`](p0-b002/semantic-graph.json) — 10 个概念节点、40 个 Rule ref、10 个 Invariant ref、105 条有类型边。
- [`p0-b003/README.md`](p0-b003/README.md) — B003 已关闭范围、摘要与验证入口。
- [`p0-b003/compatibility.json`](p0-b003/compatibility.json) — AIPT commit/protocol/schema/SDK 兼容声明。
- [`p0-b003/game-adapter.json`](p0-b003/game-adapter.json) — first roster + Task 0 的 data-only game adapter 契约。
- [`p0-b003/human-guide-map.json`](p0-b003/human-guide-map.json) — 两个 Human Guide shard 的 reference-only 索引。
- [`p0-b003/NON_CANON_TEST_FIXTURE/clean/manifest.json`](p0-b003/NON_CANON_TEST_FIXTURE/clean/manifest.json) — 确定性 clean baseline。
- [`p0-b003/NON_CANON_TEST_FIXTURE/mutants/manifest.json`](p0-b003/NON_CANON_TEST_FIXTURE/mutants/manifest.json) — 三个 NON_CANON overlay/oracle 的固定索引。

所有 B002 规则输出仍为 `PROPOSAL`、`canonical: false`。B003 只增加 PLAYTESTABLE_DRAFT adapter/validation 契约和测试工件；它不是完整 runtime，不构成 release evidence，也不修改 B002 规则 Authority。

人类可读政策摘要见 [`../LICENSES/UNREGISTERED-CONTENT-POLICY-1.0.md`](../LICENSES/UNREGISTERED-CONTENT-POLICY-1.0.md)（POLICY SUMMARY / NOT FINAL LICENSE TEXT）。本目录元数据不构成许可证文本、不授予权利，也不改变其他文件的许可状态。

## 校验

使用 Node.js `v24.19.0`，无需依赖、安装、模型或 provider 调用：

```sh
node scripts/aipt/validate-p1-b000.mjs
```

Historical P0 gates 只能在 exact detached historical predecessor checkout 上运行：

```sh
node scripts/aipt/validate-p0-b000.mjs
node scripts/aipt/validate-p0-b001.mjs
node scripts/aipt/validate-p0-b002.mjs
node scripts/aipt/validate-p0-b003.mjs
```

P0-B000…P0-B003 是 predecessor gates，不得把其 closed-set validator 直接当作 P1 successor gate。CI 的 [`AIPT Content Gate`](../.github/workflows/aipt-content-gate.yml) 分离 exact predecessor checkout 与 clean detached candidate checkout，再由 accepted Amendment-002 semantics 组合 P0 preservation、controlled P1 delta、P1 validation 与 B001 compatibility。
