# Design Sources & Adaptation Notes

本包为重新设计与重写，不是上游 Skill 的逐字复制。主要吸收的是结构性思想：

- OpenCode official Agent Skills documentation: https://opencode.ai/docs/skills/
- Agent Skills specification / documentation: https://github.com/agentskills/agentskills
- Thedougler/agent-skills — sandbox-narrative, ttrpg-writing, prep-session, prep-situation, prep-faction, prep-npc, prep-location, world-update
  https://github.com/Thedougler/agent-skills
- jwynia/agent-skills — fiction story sense, dialogue, interactive fiction
  https://github.com/jwynia/agent-skills
- danjdewhurst/story-skills — continuity/revision ideas
  https://github.com/danjdewhurst/story-skills
- omer-metin/skills-for-antigravity — tabletop-rpg-design; used as a survey source for fiction-first resolution, reusable procedures, probability awareness, progression, GM tooling and playtest concerns
  https://github.com/omer-metin/skills-for-antigravity/tree/main/skills/tabletop-rpg-design

v2.0 的规则设计层把这些通用思想重新拆成 OpenCode 可按需加载的专业 Skill，并增加规则生命周期、数学脚本、机制 ledger、playtest log 和与沙盒战役状态之间的明确边界。
