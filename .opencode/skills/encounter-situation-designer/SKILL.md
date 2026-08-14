---
name: encounter-situation-designer
description: >-
  设计 TRPG 中可用战斗、社交、探索、追逐、谈判或撤退解决的动态遭遇。关注参与者目标、环境、胜负以外的目标、升级条件、逃跑/投降、增援、后果、线索和与世界状态的连接。触发词：遭遇、战斗场景、追逐、伏击、谈判、随机遭遇、encounter、combat scene。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "table-content"
---

# Encounter Situation Designer

Encounter 是短时高压 situation，不等于“敌人出现，打到 HP 归零”。

## Encounter Frame

```markdown
Trigger: 为什么此刻发生
Actors & Immediate Wants:
PC-Visible Situation:
Primary Objective: 除“杀光”之外真正要解决什么
Environment / Interactive Features:
Pressure / Timer:
Escalation:
Noncombat Openings:
Retreat / Surrender / Bargain Logic:
Reinforcements / Third Parties:
Clues / Information:
Rewards / Leverage:
Aftermath:
If Avoided:
```

## 目标优先于敌人数量

可用目标包括：

- 护送某人通过；
- 拖延 5 轮；
- 抢到物品先撤；
- 阻止仪式；
- 逃离坍塌区；
- 说服一方停火；
- 保护证据；
- 识别真正目标；
- 在两派冲突中选择介入程度。

敌人也有目标。它们不必战斗到死。

## 环境必须可互动

至少准备 2–4 个可改变局势的环境元素，例如：

- 可破坏支撑；
- 可关闭的闸门；
- 人群；
- 火、洪水、浓烟；
- 高地/掩体；
- 可移动载具；
- 易受影响的仪式节点；
- 第三方资产。

不要只写装饰性地形。

## 遭遇与沙盒连接

随机/旅行遭遇优先做至少一件事：

- 显示 faction 的新动作；
- 让 location 变化变得可见；
- 提供 rumor / clue；
- 创造新的资源或债务；
- 让玩家看到尚未选择的 situation；
- 产生可持续的 NPC 关系。

纯“路上刷怪”优先删掉。

## 难度与数值

本 Skill 先定义叙事结构和目标。具体 stat block、DC、CR、threat tier、行动经济等交给 `rules-system-adapter`。

## 结束条件

预先想至少三类结束：

- 一方完成目标；
- 一方撤退/投降/交易；
- 环境或第三方改变局势。

不要写死“Boss 必须逃走”或“必须战胜后才触发剧情”。
