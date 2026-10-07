# UNREGISTERED Task0：AIPT 衔接测试版

状态：PROTOTYPE / 待版本采纳。目标是给 AIPT 一个来源闭合、可投影、可声明动作、可判定与回放的任务0。
原 P0/P1 交付、40 条规则、稳定ID、可见性及固定旧来源全部保留。新增试用参数在 parameters.json 显式列出。

## 内容入口

- player-reference.md：玩家公开速查；gm-runbook.md：主持流程及补缺解释。
- characters.json：四座位公开资料；character-private.json：各自秘密与私有触发器；gm-content.json：主持资料。
- parameters.json：固定通用参数与明确的新测试补缺；action-contract.json：动作、Core随机数及完成条件。
- visibility.json：受信任角色投影规则；package-manifest.json：闭合文件摘要。
- scripts/aipt/task0-prototype.mjs：纯参考校验/后果函数；tests：NON_CANON 回归样例。
- task0-aipt-bridge.mjs：角色座位、协议标识、确定性请求与六标签投影；task0-reference-cli.mjs：本地接口样例入口。
- adoption-proposal.md：待审批的参数、范围与来源后继；ci-successor-proposal.yml：尚未应用的公共检查提案。

## 边界与验收

任何来源变更需生成新包摘要。游戏参考函数只接收已认证角色和Run Core提供的随机数，不生成实际玩家选择、种子、账本或模型请求。
新的内容版本不会自动替换 AIPT B007/Q003 的17项固定输入。Owner确认本测试版本并批准独立来源后继/重绑定后，
还须完成AIPT生产入口、完整独立复审、精确CI与实际DIAG验收。
该包不能自行授予模型权限、增长预算、执行QUAL、关闭已失败的验收或把规则提升为CANON。

本次验收目标是让一个任务0诊断版本具有完整可重放的受支持流程。完整战斗/逆转、无双路线、后续战役、
玩家体验与平衡尚未被本次检查验证。实际声明落在这些范围时，必须记录裁决缺口，不能自动换成预设行动。
Q008指定先补齐失败击倒后续：记录与原对手的缠斗，下一次本人主要声明开火或减20重试，
本人合法开火即履行一次后续义务，重试再失败重新产生义务，清除对手也解除相应待办；
此局部流程沿用当前动作时钟，不授予完整战斗引擎或来源采纳状态。
