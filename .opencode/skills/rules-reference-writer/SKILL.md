---
name: rules-reference-writer
description: >-
  把自制 TRPG 机制整理为清晰、可测试、可在桌上查阅的规则文本，包括术语定义、规则顺序、procedure、例子、反例、边缘情况、玩家速查、GM速查与版本迁移说明。用于把设计笔记变成可运行规则，而不是文学化说明。触发词：规则书、规则文本、速查表、术语、例子、reference、rulebook、rules writing、quick reference。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "rules-documentation"
---

# Rules Reference Writer

规则文本首先是**操作说明与共享协议**。目标是让两个不同 GM 阅读后做出尽可能一致的判定。

## 写作层级

每条规则按需要拆成：

1. **Intent**：一句话说明解决什么问题；
2. **Trigger**：何时使用；
3. **Procedure**：按顺序做什么；
4. **Outcome**：结果如何改变游戏状态；
5. **Example**：完整跑一遍常见情况；
6. **Edge Case**：只收录真实会发生且会改变结果的边缘情况。

不要把设计历史和最终操作规则混在一起。

## 术语纪律

- 一个概念只用一个正式名称；
- 同一个词不要同时指属性、资源和结果等级；
- 新术语第一次出现时定义；
- 若普通语言已经足够，不创造专有名词；
- 更新 `campaign/rules/terminology.md`。

## 示例纪律

一个好示例必须展示：

- 初始状态；
- 玩家声明；
- 规则触发；
- 实际计算/选择；
- 最终状态变化。

不要只写“例如：你可以进行检定”。

## 速查与完整规则分离

- **Quick Reference**：只保留桌上执行步骤与高频数值；
- **Full Rules**：解释条件、例子与少量边缘情况；
- **Designer Notes**：若需要，独立文件保存，不混入玩家规则。

每次 CANON 规则变化同步更新 `rules-changelog.md`，并检查所有速查表是否过期。
