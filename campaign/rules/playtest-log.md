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
