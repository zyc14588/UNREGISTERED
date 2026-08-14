---
name: dialogue-voice
description: >-
  为 TRPG NPC 提供桌上可演的独特声音、谈判、审问、威胁、谎言、反派演说和模块化对白，同时严格不替玩家角色写决定或台词。用于 NPC voice、对话润色、社交场景和说话风格区分。触发词：对白、台词、NPC 怎么说、谈判、审问、演讲、dialogue、voice。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "prose"
---

# Dialogue & Voice

TRPG 对白首先是**可表演工具**，其次才是文学文本。

## 玩家角色边界

除非用户明确要求“给玩家可能说的话做示例”，否则：

- 不替 PC 写台词；
- 不规定 PC 的态度、感受或结论；
- 不让 NPC 独白夺走玩家打断、质问、攻击、离开的权利。

## NPC Voice Packet

为 recurring NPC 建议记录：

```markdown
Tempo: 快/慢/停顿方式
Sentence Shape: 短句、长句、问句、命令句等
Diction: 常用词汇层级与领域词
Default Social Move: 讨价还价/教训/讨好/转移/威吓……
Physical Delivery: 一个可演动作
Avoids Saying: 一个禁区
Lie Tell: 撒谎时的可观察变化
Neutral Line:
Under Pressure Line:
Bargaining Line:
```

如果三句样例换个名字也能属于任何 NPC，重写。

## 对话由 Want 驱动

写每段 NPC 对话前先确认：

- 他此刻想从 PC 得到什么？
- 他愿意提供什么？
- 他隐藏什么？为什么？
- 什么会让他改变策略？

“信息倾倒”应改造成有利益的交流。

## 谈判/审问

NPC 回答只能来自自己的 Knowledge。可以标记：

- `KNOWS`：确定知道；
- `BELIEVES`：相信但可能错；
- `HIDES`：知道但主动隐瞒；
- `LIES`：明确撒谎；
- `UNKNOWN`：真的不知道。

不要让所有 NPC 都成为 lore 数据库。

## 反派演说

TRPG 演说必须可被打断。写成 3–6 个独立“可插拔 beat”，每个 1–2 句：

- 立场；
- 对玩家行动的具体指控/评价；
- 自己的合理化；
- 诱惑/威胁；
- 可选 reveal。

玩家在第二句开枪，场景也必须成立。

## 桌上语言

- 大情绪时句子可以更短。
- 具体名词优先于抽象形容词。
- 不用“你感觉到……”替玩家定义情绪。
- 关键事实不要藏在华丽比喻里。
