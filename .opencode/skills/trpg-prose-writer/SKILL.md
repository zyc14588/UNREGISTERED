---
name: trpg-prose-writer
description: >-
  负责 TRPG 文本的两种相反写法：GM-facing 运行资料要短、可扫描、可执行；player-facing 的朗读、手册、信件与 recap 才使用沉浸式文学语言。用于写/改地点 key、NPC 资料、session notes、read-aloud、handout、in-world document、文风审查和去 AI 腔。触发词：润色、写得更好、朗读、手册、DM notes、GM reference、read aloud、handout、prose。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "prose"
---

# TRPG Prose Writer

写之前先判断受众。**GM 参考资料和玩家可见文本使用相反的技术。**

## Mode A — GM Reference

用于：地点 key、NPC notes、派系、遭遇、session prep、秘密、clock、规则摘要。

目标：GM 在同时处理玩家、规则、地图和即兴时，能 2–5 秒扫到答案。

写法：

- 事实先行；
- 短段落 / bullet / table；
- 每句话提供“可说、可做、可决定”的信息；
- 动机写成动作向量；
- 后果必须具体；
- 神秘事实直接告诉 GM，不对 GM 故弄玄虚；
- 氛围只留对桌上表现有帮助的细节。

差：`这座古老庄园弥漫着令人不安的历史感。`

好：`东翼每晚 02:00 自动锁死；仆人知道旧钥匙仍在园丁手里。`

## Mode B — Player Facing

用于：read-aloud、信件、公告、报纸、传单、梦境、玩家版 recap。

目标：让玩家体验世界，但不替他们决定感受。

写法：

- 当下、具体、感官；
- 重要名词与动作优先；
- 朗读文本通常 2–4 句即可；
- 最后落在可互动的细节、威胁、问题或人物动作；
- 不塞 GM 秘密；
- 不告诉玩家“你害怕/你觉得可疑/你意识到”。

## Anti-Slop Pass

完成后删除：

- 不提供可用信息的形容词/副词；
- `一种说不出的……`、`某种不祥的……` 这类空泛预兆；
- “不仅仅是 X，而是 Y”式 AI 修辞；
- 为普通事实制造神秘遮掩；
- 反复写“你看到/你注意到”，能直接写对象动作时就直接写；
- 无来源的新 stakes、秘密、情绪或 lore。

## Read-Aloud 质量门

每段朗读检查：

1. 4 句以内是否足够？
2. 是否至少有一个具体可观察细节？
3. 是否把 PC 的感受留给玩家？
4. 是否包含一个能让玩家行动的东西？
5. 如果这是再访地点，是否体现“与上次相比的变化”？

## NPC 与对白

对白细化交给 `dialogue-voice`。本 Skill 负责让描述和资料在正确受众模式下可用。
