---
name: gm-procedure-designer
description: >-
  为自制 TRPG 设计可重复运行的 GM/桌面流程，包括探索回合、旅行、营地、调查、停机期、派系回合、制造、随机遭遇、声望与世界推进。把模糊“GM 自行判断”改写成清晰步骤、触发条件、输入与状态变化，并控制 GM 认知负担。触发词：流程、procedure、旅行规则、探索规则、停机期、faction turn、GM工具、探索回合、downtime loop。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "rules-procedure"
---

# GM Procedure Designer

高频玩法需要稳定流程。一个好的 procedure 让新 GM 知道“现在做什么”，也让玩家能预测系统会如何响应。

## Procedure 模板

每个流程写明：

- **Trigger**：何时进入；
- **Inputs**：需要哪些状态/资源；
- **Steps**：按顺序执行的最小步骤；
- **Choices**：玩家/GМ 在哪里做决策；
- **Random Checks**：若有，何时掷骰；
- **State Changes**：时间、资源、位置、警戒、关系如何变化；
- **Exit**：何时退出；
- **Handoff**：接到哪个其他 procedure。

## 沙盒优先流程

对于长战役开放世界，优先考虑：

- 区域旅行；
- 探索/搜寻；
- 营地与恢复；
- 调查与情报收集；
- 停机期；
- 派系/世界推进；
- 城市活动；
- 逃亡/追逐；
- 交易与补给。

## 认知负担

一次 procedure 的核心循环应能在短速查表里表达。若每一步都需要查不同章节，先合并状态和术语。

## 与战役 Skill 协作

- `sandbox-world-engine` 定义世界可行动内容；
- 本 Skill 定义“如何玩这些内容”；
- `campaign-state-keeper` 记录结果；
- `faction-simulator` 可使用已确认的 faction procedure；
- `rules-system-adapter` 把 procedure 接到实际 Session/Encounter。

不要让 procedure 预先决定玩家必须去哪里或得到什么结局。
