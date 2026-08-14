---
name: rules-content-forge
description: >-
  基于已确认或正在测试的规则框架，创建并审查可重复的机械内容：能力、专长、职业特性、法术/技巧、装备、敌人、危险、载具与模板。强调共享标签、统一预算、明确接口和少量真正有价值的例外，避免每个内容条目都发明新子规则。触发词：能力设计、专长、装备、武器、敌人、怪物、法术、feature、perk、item、stat block、content design。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "rules-content"
---

# Rules Content Forge

只在核心规则足够稳定后批量生产内容。内容越多，基础设计错误的返工成本越高。

## 先确定模板

每类内容必须先有统一 schema，例如能力：

- Name
- Trigger / Timing
- Cost
- Target / Range
- Effect
- Duration
- Tags
- Scaling
- Limits
- Rules Interfaces
- Power Budget / Tier
- Status (`PROTOTYPE` / `PLAYTEST` / `CANON`)

先做 3–5 个样例验证模板，再批量扩展。

## 设计原则

- **共享标签优先于独有特例。** 用少量可学习的 tags 组合出差异。
- **能力创造决策。** “+2 伤害”可以存在，但不应成为内容库的主要创新来源。
- **代价可比较。** 同层级能力使用相近的资源、行动与机会成本尺度。
- **接口显式。** 写明会影响核心判定、行动经济、资源、位置还是伤害。
- **避免跨层乘法。** 命中、行动数、暴击、额外目标、资源恢复同时叠加最危险。

## 内容批量前的 Gate

至少满足：

- 核心判定已 PROTOTYPE；
- 角色属性/技能框架已 PROTOTYPE；
- 对应资源和行动经济已定义；
- 有初版 power budget；
- `probability-balance-lab` 能算关键数值；
- 有 `playtest-rules-auditor` 的测试问题。

不满足时，先生成少量实验样本而不是完整列表。
