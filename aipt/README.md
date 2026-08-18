# AIPT — Identity / Policy / Licensing / First-Roster Metadata

本目录存放身份、许可策略、首轮预置卡（AIPT FIRST ROSTER V2）与 B001 输入清单/稳定 ID/可见性/安全配置的机器可读元数据：

- `status.json` — 批次状态；B000 与 B001 均已 `MERGED_CLOSED`（`global_wip` 为 0）；下一批次 `AIPT-M0-B003` 已获授权准备（`AUTHORIZED_TO_PREPARE`，`next_batch_authorized: true`）但尚未开始（`next_batch_started: false`）。
- `input-manifest.json` — B001 输入清单（game-owned；14 个源文件 + 3 个 registry 引用的生命周期与摘要锚定）。
- `p0-b000/identity.json` — 正式名称、《特工模拟》旧代号标记、`package_id` 技术标识记录。
- `p0-b000/licensing.json` — 政策名称/引用标识/状态与 fail-closed 路径范围映射。
- [`p0-b000/premades-v2.json`](p0-b000/premades-v2.json) — AIPT FIRST ROSTER V2 首轮四人预置卡整合稿（status: PLAYTESTABLE_DRAFT）。
- [`p0-b001/stable-ids.json`](p0-b001/stable-ids.json) — 稳定 ID 注册表（34 个已分配实体、STATE/ENDING 零分配论证、RULE/INVARIANT/MUTATION 保留命名空间）。
- [`p0-b001/visibility.json`](p0-b001/visibility.json) — 可见性映射（73 个映射 ID；fail-closed 标签/主体/定位器策略）。
- [`p0-b001/safety-profile.json`](p0-b001/safety-profile.json) — 安全配置（2 Lines / 1 Veil / 5 项必确认；仅派生自 `campaign/session0-redlines.md`）。

人类可读的策略摘要见 [`../LICENSES/UNREGISTERED-CONTENT-POLICY-1.0.md`](../LICENSES/UNREGISTERED-CONTENT-POLICY-1.0.md)（POLICY SUMMARY / NOT FINAL LICENSE TEXT）。

本目录中的元数据文件本身不构成任何许可证文本、不授予任何权利，也不改变仓库中任何现有文件的许可状态。

## 校验（Validation）

- 本地校验（Node.js 标准库，无依赖）：
  - `node scripts/aipt/validate-p0-b000.mjs` — B000 内容门（仓库 JSON/相对链接、身份、许可、路径范围、premades、交付面扫描、workflow 静态检查与状态探针）。
  - `node scripts/aipt/validate-p0-b001.mjs` — B001 内容门（状态、输入清单、摘要、路径策略、稳定 ID、可见性、安全配置、工件清单与 93 个负向/对抗探针）。
- CI 校验：workflow [`AIPT Content Gate`](../.github/workflows/aipt-content-gate.yml)（push 与 pull_request 触发，固定 Node.js `v24.19.0`；两个校验命令各为独立步骤）。
