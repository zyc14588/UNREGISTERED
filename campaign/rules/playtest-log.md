# Playtest Log

## 模拟测试记录（阶段1，非桌测）

### Simulation 2026-08-15 — sim_infiltration_v1（N=20000×3 + 50000×1）

**Build / Rules Version:** vertical-slice v0 + mechanics-fine v1（PROPOSAL）

**Players / Characters:** 模拟 4 预置卡典型值队伍

**Primary Questions:**
| Hypothesis | Observation | Pass Signal | Fail Signal | Result |
|---|---|---|---|---|
| 任务成功率 70–90% | 四场景成功率 | 带内 | 越带 | ✓ 84–90% |
| 无双率稀有可达 | 主动清剿模型 | >0 且 <15% | 0 或 >15% | ✓ 5.4% |
| 加压有真实价值 | never vs on_fail | 成功率+开火率改善 | 无改善/恶化 | ✓ 90.1% vs 84.4%；开火 4.5% vs 11.6% |
| 崩溃率 <5% | 高压场景崩溃局 | <5% | ≥5% | △ 教学关 0.8–2.2%；高压 5.7% |
| 死亡螺旋受控 | 解析+模拟 | 无连锁 | 雪崩 | ✓ 螺旋限于撤离修正 |

**结论与最小改动（PROPOSAL）：** 加压教学提示、避让教学、崩溃待桌测、硬时限压力待桌测。详见 `campaign/playtest/sim-report-v1.md`。

---

## 单人纸面自测记录（阶段2，非桌测）

### Solo 2026-08-15 — solo-kit v1（GM 一人跑任务0 全流程）

**Build / Rules Version:** vertical-slice v0 + mechanics-fine v1（PROPOSAL）

**Players / Characters:** 游隼（渗透者）＋静水（谈判专家）；seed=20260815 预生成骰，可复现

**Primary Questions:**

| Hypothesis | Observation | Pass Signal | Fail Signal | Result |
|---|---|---|---|---|
| 全流程按文档可跑通 | 8 步＋结算五段＋休整全部执行 | 跑通且无"无法继续"级卡点 | 流程断 | ✓ 跑通（0 阻断） |
| 无需现场发明规则 | 文本缺口处的 GM 即时裁定数 | 0 裁定 | >0 | ✗ 9 处缺口需 GM 裁定 |
| 卡点 ≤5 | 卡点清单（P1–P9） | ≤5 | >5 | ✗ 9 处（均非阻断级） |
| 巡逻遭遇/值守处理可执行 | 步骤5 触发情况 | 触发且按规则裁决 | 0 触发 | △ 巡逻遭遇 0 触发（时钟推进不足）；值守用社交引开绕过菜单 |
| 结算五段＋渗漏条目可跑 | 结算文本生成 | 五段齐全＋渗漏当场可察觉 | 缺段 | ✓（决策#42 验证通过） |

**结论与最小改动（PROPOSAL，GM 已确认 A+B+C 全修）：** 阶段2 首轮**不通过**——流程跑通但 9 处卡点全为文本缺口/材料不对齐，非数值问题；数值零改动。按三组根因完成最小改动：A 测试材料层（intel-pack 菜单补社交引开、22:00 办公层预置巡逻遭遇、kit 卡组对齐+5 区路线）；B 规则澄清层（§1.5 双失败条款、D1 时钟归属、D7 休整语义+事件表单位、新建角色规则知识表单 `rule-knowledge-sheet-v1.md`）；C 参数补缺层（mechanics-fine D8 时间单位默认值、vertical-slice §1.2 缺训素质映射表）。**复测（同 seed=20260815）9 卡点清零、阶段2 通过**；双失败/巡逻遭遇/预案重试三个首轮未覆盖分支均被真实触发并按文裁决。规则澄清保持 PROPOSAL，随阶段3 转正。详见 `campaign/playtest/solo-report-v1.md`（§6–§8）。

---

## Test Entry Template

### Playtest YYYY-MM-DD — Prototype N

**Build / Rules Version:**

**Players / Characters:**

**Primary Questions (max 5):**

| Hypothesis | Observation to Capture | Pass Signal | Fail Signal | Result |
|---|---|---|---|---|
| | | | | |

**Observed Data**

- Average action resolution time:
- Conflict rounds / real minutes:
- Rules lookups / questions:
- Resources spent / recovered:
- Unused or always-used options:
- Player downtime / spotlight issues:
- Exploits or unexpected combos:

**Changes Proposed**

| Problem | Suspected Cause | Smallest Change | Regression Risk | Status |
|---|---|---|---|---|
| | | | | PROPOSAL |
