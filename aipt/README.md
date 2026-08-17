# AIPT — Identity / Policy / Licensing / First-Roster Metadata

本目录存放身份、许可策略与首轮预置卡（AIPT FIRST ROSTER V2）的机器可读元数据（AIPT 批次 `UNREGISTERED-AIPT-P0-B000`）：

- `status.json` — 批次状态；next = `UNREGISTERED-AIPT-P0-B001`（未开始）。
- `p0-b000/identity.json` — 正式名称、《特工模拟》旧代号标记、`package_id` 技术标识记录。
- `p0-b000/licensing.json` — 政策名称/引用标识/状态与 fail-closed 路径范围映射。
- [`p0-b000/premades-v2.json`](p0-b000/premades-v2.json) — AIPT FIRST ROSTER V2 首轮四人预置卡整合稿（status: PLAYTESTABLE_DRAFT）。

人类可读的策略摘要见 [`../LICENSES/UNREGISTERED-CONTENT-POLICY-1.0.md`](../LICENSES/UNREGISTERED-CONTENT-POLICY-1.0.md)（POLICY SUMMARY / NOT FINAL LICENSE TEXT）。

本目录中的元数据文件本身不构成任何许可证文本、不授予任何权利，也不改变仓库中任何现有文件的许可状态。

## 校验（Validation）

- 本地校验（Node.js 标准库，无依赖）：`node scripts/aipt/validate-p0-b000.mjs`
- CI 校验：workflow [`AIPT Content Gate`](../.github/workflows/aipt-content-gate.yml)（push 与 pull_request 触发，固定 Node.js `v24.19.0`）
