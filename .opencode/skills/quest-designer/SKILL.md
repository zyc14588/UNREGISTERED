---
name: quest-designer
description: >-
  为开放世界 TRPG 设计非铁路式委托、悬赏、任务、玩家自发目标与分支任务链。把任务视为 situation 的玩家入口，提供多个发现方式、利益相关者、不同解决路径、期限、报酬、拒绝/失败/忽略后果与世界状态变化。触发词：任务、委托、悬赏、支线、任务链、quest、job board、mission。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "scenario"
---

# Quest Designer

在沙盒 TRPG 中，Quest 不是“接任务→按步骤→领奖”的剧本，而是玩家对一个世界 situation 的可操作入口。

## Quest Core

```markdown
Problem State: 世界现在有什么问题/机会
Discovery: 玩家怎样知道它（不只一个 NPC 发任务）
Stakeholders & Wants:
What Is Actually True:
Constraints / Deadline:
Possible Approaches:
Resources / Leverage:
Reward / Consequence:
If Refused:
If Failed:
If Ignored:
World-State Deltas:
Follow-on Possibilities:
```

## 发现方式

尽量提供多个入口：

- 委托人；
- 公开悬赏；
- rumor；
- 玩家自己的目标；
- 目击世界变化；
- 竞争者正在做同一件事；
- 资源需求迫使玩家寻找解决方案。

拒绝委托不代表内容报废。Situation 继续运行。

## 多解法

不要硬写“战斗 / 潜行 / 说服”三选一菜单，但要确保问题本身允许不同类型策略。

检查：

- 能否通过改变利益关系解决？
- 能否绕过而不是清空敌人？
- 能否与另一派系交易？
- 能否改变目标定义？
- 能否部分完成、背叛、转卖或公开信息？

玩家提出未预期方案时，评估世界逻辑，不要因为“模块没写”而拒绝。

## 任务链

长期任务链使用**状态依赖**，不要使用隐藏脚本节点：

```text
如果矿场仍由 Faction A 控制 -> 后续机会 X
如果玩家让矿场独立 -> 后续机会 Y
如果矿场被毁 -> 后续危机 Z
```

这样玩家的结果自然生成下一批内容。

## 奖励

除了货币，考虑：

- faction access；
- 许可证/身份；
- 情报；
- 安全路线；
- NPC 债务；
- 地产/据点；
- 稀缺服务；
- 政治影响；
- 时间优势。

奖励本身最好能打开新选择，而不只是数值上涨。

## Job Board 模式

需要快速提供沙盒选项时，生成 4–8 条短任务，每条只写：

`Hook | Stakeholder | Time Pressure | Visible Reward | Hidden Complication | If Ignored`

不要把所有任务都指向同一“真正主线”。
