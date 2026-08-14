---
name: npc-web
description: >-
  为长战役 TRPG 创建可持续运行的 NPC 与关系网：即时目标、长期向量、方法、秘密、杠杆、派系关系、PC 关系、表演把手、活动日志和继任后果。用于 recurring NPC、反派、联系人、商人、盟友、临时 NPC 与社会网络。触发词：NPC、角色、反派、联系人、关系网、人物卡、roleplay NPC、npc web。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "entities"
---

# NPC Web

NPC 的价值不是完整传记，而是 GM 在 5 秒内能演出来，并且即使玩家不找他，他也会继续做事。

## NPC 三层详细度

### Tier 1 — Recurring
用于核心反派、盟友、重要关系人。完整记录。

### Tier 2 — Supporting
保留 Goal / Method / Hook / Connection / Current Problem / Voice 即可。

### Tier 3 — Table NPC
临场 NPC 只要：名字、职能、一个显眼特征、现在想要什么、一个说话习惯。被玩家持续关注后再升级。

不要一开始给每个酒保写三页背景。

## Recurring NPC Card

```markdown
# [Name]
Role: 在世界中的功能
Current Want: 此刻具体想得到什么
Long Vector: 长期正在朝哪里移动
Method: 反复使用的做事方式
Leverage: 他能给/拿走什么
Constraint: 不会做什么、做不到什么
Current Problem: 眼下阻碍
Secret: GM 真相
Knowledge: 确实知道什么；不知道什么
Affiliations:
Relationships:
Performance Hook: 一眼能演出的节奏/动作/语气
Voice Samples: 3 句以内
If Ignored: 他接下来自己会做什么
Activity Log:
```

## “向量而非状态”

差：`很贪婪`、`很忠诚`、`很焦虑`。

好：`在审计到来前攒够钱离开这座城`、`让弟弟在公会选举中当上席位`、`找到能证明自己无罪的账本`。

行为向量会自然产生可玩的场景。

## 关系网

重要关系记录四件事：

- 当前状态；
- 依赖/债务；
- 对方掌握的杠杆；
- 关系改变的触发条件。

对 PC 的关系不要只写“好感度”。可以使用：信任、债务、恐惧、尊重、怀疑、承诺、利益绑定等不同维度。

## PC 关联：可选但有用

开放世界里**不是每个 NPC 都必须硬连某个 PC 背景**。至少要求这个 NPC 与下列之一有真实连接：

- 一个 PC 目标/关系；
- 一个 faction；
- 一个 active situation；
- 一个 location/resource。

这样既保持世界独立，也避免 NPC 完全漂浮。

## 反派附加项

Recurring antagonist 额外记录：

- 具体目标；
- 真正害怕失去什么；
- 一个可被玩家观察的 tell；
- 逃生/退场逻辑（不是强制逃走，而是合理选项）；
- 保护自己的结构性优势；
- 如果死亡/倒台，谁填补权力真空。

## 知识边界

NPC 只能基于自己能知道的信息说话。审问、谈判和传闻中：

- 区分事实、推测、谎言、误解；
- 不让普通 NPC 自动知道 GM 真相；
- NPC 的谎言应服务其 Want 或 Constraint，而不是为了“制造剧情”。

## 活动日志

每次重要互动后追加：

```markdown
**Session XX / 游戏内日期** — 做了什么；对谁作出承诺；关系或资源如何改变。
```

事实化记录，不写心理小说。
