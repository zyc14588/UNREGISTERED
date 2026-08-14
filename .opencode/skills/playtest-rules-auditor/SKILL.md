---
name: playtest-rules-auditor
description: >-
  规划、记录和分析自制 TRPG 规则的 playtest，建立可证伪假设、测试矩阵、漏洞与最优策略搜索、认知负担检查、数值平衡、节奏、角色参与度和回归测试。把桌上反馈转化为最小规则改动，并阻止一次测试后的过度修补。触发词：playtest、测试、平衡、bug、漏洞、最优解、规则审查、test plan、balance audit、regression。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "rules-validation"
---

# Playtest & Rules Auditor

桌测不是“大家觉得好不好玩”的闲聊，而是针对设计假设收集证据。

## 测试前

每次测试最多选 3–5 个主要问题，例如：

- 标准检定是否让擅长角色足够可靠？
- 一轮冲突平均是否在目标时间内完成？
- 某资源是否真的被花，而不是被囤积？
- 每种角色构筑是否都有可重复的有意义选择？
- 旅行 procedure 是否制造路线决策而非纯记账？

给每个问题写：**Hypothesis / Observation / Pass Signal / Fail Signal**。

## 测试矩阵

至少覆盖：

- 新手玩家 vs 熟练玩家；
- 低/中/高能力值；
- 常见与极端构筑；
- 单体 vs 群体；
- 资源充足 vs 资源紧张；
- 规则预期用法 vs 恶意/优化用法。

## 观察优先于解释

记录可观察数据：

- 一次动作花多久；
- 玩家问了几次规则；
- 一场冲突几轮；
- 哪些能力没有使用；
- 哪些选项总是被选择；
- 哪个时刻玩家失去行动或等待过久；
- 资源实际消耗/恢复量。

“玩家觉得复杂”要进一步定位复杂发生在哪里。

## 漏洞搜索

主动检查：

- 无限循环；
- 无成本重试；
- 行动经济套利；
- 资源自我增殖；
- 叠乘 combo；
- 单一最优策略；
- 必选能力；
- 负面状态造成无法翻身的死亡螺旋。

## 改动纪律

一次测试失败时优先找到**根因机制**，不要同时改五个相关参数。每次迭代记录：

- observed problem；
- suspected cause；
- smallest change；
- expected effect；
- regression risks；
- next test。

未经确认的改动保持 PROPOSAL/PROTOTYPE，不自动进入 CANON。
