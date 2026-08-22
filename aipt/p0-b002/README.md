# UNREGISTERED-AIPT-P0-B002 Rule Model

状态：`IN_PROGRESS`。本批次把已冻结的规则 prose 转为可审计的 Rule ID、data-only 机器规则与语义图；所有输出仍为 `PROPOSAL`、`canonical: false`，不构成 CANON 或玩家行动结论。

## 交付

| 工件 | 冻结摘要 |
|---|---|
| [`rule-id-map.json`](rule-id-map.json) | 40 个连续 Rule ID、10 个连续 Invariant ID、0 个 Mutation ID；SHA-256 `321550a1bb91066c263e5857c8095878d708af3f296430bc00011d70f5bb242c` |
| [`machine-rules.json`](machine-rules.json) | 40 条唯一 active 机器规则，结构化 randomness，无 eval/code/runtime；SHA-256 `139d095fe54926e1599edf208b65f7a89061f1cda6d8b492f83b5e47c0693c78` |
| [`semantic-graph.json`](semantic-graph.json) | 10 个概念、40 个 Rule ref、10 个 Invariant ref、105 条有类型边、无 orphan；SHA-256 `8c9ad9ade247ac6195019b7225725c70cd26b55270979d31c7b3701d02092562` |

## 冻结来源

- [`vertical-slice-v0.md`](../../campaign/rules/vertical-slice-v0.md) — `e4fa4070ee48ed97e7483d844f04f233967cb04ea2c2abfd6672af4ad07433c2`
- [`mechanics-fine-v1.md`](../../campaign/rules/mechanics-fine-v1.md) — `69c6effd923b18b8bbb83331489fbd8f7949197501ab897a92e9338fdb62c37a`
- [`logic-map-v1.md`](../../campaign/rules/logic-map-v1.md) — `7ba536f1d235981b32a8a8f27c7429d6b53ead6daa4c0f3e82e465584a89f1b4`
- [`input-manifest.json`](../input-manifest.json) — `0b5f13c4dbfe429fc07a59a67b2d1c10db9ba74d205f1b3e7a9a1e896577608a`
- [`p0-b001/stable-ids.json`](../p0-b001/stable-ids.json) — B001 历史 RESERVED-zero 权威保持不变。

## 边界与验证

范围仅为 first roster + Task 0 运行所需最小闭环。没有 adapter、runtime、mutant、Mutation 分配或 P0-B003 工件；没有修改规则源，也没有提升生命周期。

```sh
node scripts/aipt/validate-p0-b000.mjs
node scripts/aipt/validate-p0-b001.mjs
node scripts/aipt/validate-p0-b002.mjs
```

B002 严格门使用 Node.js 标准库，锁定源与工件哈希，并运行 35 个内存负向探针。候选阶段仍保持 B002 `IN_PROGRESS`、B003 `NOT_AUTHORIZED`。
