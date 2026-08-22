# AIPT — Identity, Policy, Registry, and Rule Metadata

本目录保存《未登记》AIPT 机器可读交付。当前仓库批次为 `UNREGISTERED-AIPT-P0-B002`，状态保持 `IN_PROGRESS`、`global_wip: 1`；下一批 `UNREGISTERED-AIPT-P0-B003` 为 `NOT_AUTHORIZED`，未授权且未开始。

## 工件索引

- [`status.json`](status.json) — 当前 B002 生命周期、已关闭的仓库前序 B001，以及已关闭的外部串行前序 AIPT-M0-B006。
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

所有 B002 规则输出均为 `PROPOSAL`、`canonical: false`。它们只覆盖 first roster 与 Task 0 最小闭环，不是运行时、适配器或后续批次实现。

人类可读政策摘要见 [`../LICENSES/UNREGISTERED-CONTENT-POLICY-1.0.md`](../LICENSES/UNREGISTERED-CONTENT-POLICY-1.0.md)（POLICY SUMMARY / NOT FINAL LICENSE TEXT）。本目录元数据不构成许可证文本、不授予权利，也不改变其他文件的许可状态。

## 校验

使用 Node.js `v24.19.0`，无需依赖、安装、网络或模型调用：

```sh
node scripts/aipt/validate-p0-b000.mjs
node scripts/aipt/validate-p0-b001.mjs
node scripts/aipt/validate-p0-b002.mjs
```

- B000 门：仓库 JSON/相对链接、身份、许可、状态、交付面与 workflow 静态约束。
- B001 门：冻结输入、稳定 ID、可见性、安全配置、最终工件表面与 100 个负向探针。
- B002 门：冻结哈希、Rule ID、机器规则、语义图、安全表面与 35 个负向探针。
- CI：[`AIPT Content Gate`](../.github/workflows/aipt-content-gate.yml) 在 `ubuntu-24.04` / Node.js `24.19.0` 上以三个独立步骤运行以上命令。
