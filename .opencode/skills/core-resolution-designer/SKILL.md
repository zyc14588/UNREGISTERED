---
name: core-resolution-designer
description: >-
  设计和审查自制 TRPG 的核心判定机制：何时掷骰、骰池/单骰/多骰、目标值、对抗、成功层级、修正、优势劣势、协助、推动、失败后果与无须检定的情况。重点让规则从虚构情境中触发，并让每次检定改变状态。触发词：核心判定、骰子机制、检定、DC、成功失败、degrees of success、dice pool、resolution mechanic。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "rules-core"
---

# Core Resolution Designer

设计“全系统最常按下的按钮”。核心判定的复杂度会被每场 Session 重复放大。

## 设计顺序

1. **Fiction Trigger**：什么具体风险/不确定性值得检定？
2. **Stakes Before Roll**：成功想得到什么，失败会改变什么？
3. **Input**：角色能力、环境、工具、协助、资源如何进入？
4. **Randomizer**：是否需要随机；若需要，选择骰型/骰池/抽牌等。
5. **Output**：二元、成功层级、效果等级、代价选择或其他结果。
6. **Return to Fiction**：结果如何明确改变位置、时间、资源、关系或信息状态？

## 不要为以下情况强制检定

- 没有真实风险；
- 失败只意味着“再试一次”；
- 成功是剧情继续的唯一入口；
- 角色在当前条件下显然能做到；
- GM 只是想制造随机感但没有可执行后果。

## 核心机制规格

每个候选机制至少定义：

- Roll trigger；
- 输入范围（attribute/skill/gear/etc.）；
- 难度如何表示；
- 结果区间；
- crit / botch 是否存在；
- opposed roll 是否存在；
- assistance；
- repeated attempts；
- modifier stacking policy；
- player mitigation（重掷、push、资源消费等）；
- 信息型检定的失败处理。

## 修正值纪律

避免无限堆叠零碎 +1/-1。优先选择一种主要表达：

- 固定目标值变化；
- 优势/劣势；
- 骰池增减；
- 效果等级；
- 位置/风险等级；
- 有上限的少量修正。

让一次检定的主要修正来源在桌上 5–10 秒内可判断。

## 调查与关键情报

关键真相不应被一次失败锁死。检定可以决定：

- 花费多少时间；
- 是否暴露自己；
- 获得线索的完整度；
- 是否同时触发代价/威胁；
- 是否获得额外优势。

和 `mystery-clue-engine` 协作时，规则服务线索冗余，而不是破坏它。

## 输出候选方案时

若用户尚未定骰型，给 2–3 种**结构明显不同**的机制，并分别说明：

- 概率形状；
- 玩家能感知的稳定/摆动程度；
- 对角色能力成长的容纳空间；
- 桌上速度；
- 与资源系统、冲突系统的接口。

需要精确概率时加载 `probability-balance-lab`，不要凭直觉猜数字。
