---
name: mystery-clue-engine
description: >-
  为开放式 TRPG 设计不会因一次失败检定或错过一个 NPC 就崩溃的谜团、调查与秘密。先定义真相与 revelations，再为关键 revelation 布置跨地点/NPC/机制的冗余线索、错误信息、时间变化与 fallback。触发词：谜团、调查、线索、秘密、侦探、推理、clue、mystery、revelation。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "scenario"
---

# Mystery & Clue Engine

TRPG 谜团的目标不是“难住玩家”，而是让玩家通过选择与推理逐渐拥有足够的信息做决定。

## Truth First

先写 GM 真相，再写线索：

```markdown
Core Truth:
What Actually Happened:
Actors & Motives:
Timeline:
Critical Revelations:
Optional Revelations:
Consequences if Unsolved:
```

不要先想酷线索，再临时拼真相。

## Revelation Matrix

每个**关键 revelation** 默认准备至少 3 条独立获得路径，并尽量跨不同节点与玩法：

| Revelation | Clue A | Clue B | Clue C | Fallback |
|---|---|---|---|---|
| 真相片段 | 地点/观察 | NPC/社交 | 文件/系统/实验 | 时间推进后的新信号 |

三条线索都在同一地点不算真正冗余。

## 检定失败不应锁死信息

重要线索不应该采用“失败 = 什么都没发现”。可以把失败改成：

- 得到线索但花更多时间；
- 得到线索但暴露自己；
- 得到不完整版本；
- 得到线索同时触发代价；
- 需要换一种来源确认。

规则系统如何表现由 `rules-system-adapter` 决定。

## 线索类型

- **Direct**：明确指向事实；
- **Contextual**：帮助解释另一条线索；
- **Directional**：告诉玩家下一处可调查节点；
- **Contradictory**：暴露某个叙事不一致；
- **Rumor**：可能真、假、过时，需要验证；
- **False Evidence**：只能来自世界内合理来源，不要为了拖延强行塞红鲱鱼。

## Suspect / Actor Matrix

复杂社会谜团可以记录：

- 角色知道什么；
- 隐瞒什么；
- 为什么隐瞒；
- 会说什么谎；
- 什么证据能让其改口；
- 如果玩家不接触他，他会做什么。

## 时间与谜团

秘密世界也会动：

- 证据可能被移动、公开、毁坏；
- 证人可能离开、死亡、改变立场；
- 新事件可能生成更明显的线索；
- 玩家拖延不应让谜团“自动无法解”，而应改变代价和局势。

## 玩家提前猜中

如果玩家凭有限信息就得出正确结论：

- 不修改真相来“保持悬念”；
- 让他们享受推理收益；
- 接下来把挑战转成证明、说服、抓捕、利用或应对后果。

## 质量门

完成前检查：

- 是否存在单一失败点？
- 是否至少两条关键线索无需战斗获得？
- 是否每条线索都有世界内来源？
- 是否有人会因为真相曝光而行动？
- 如果玩家忽略谜团 7 天/1 周期，会出现什么新可观察变化？
