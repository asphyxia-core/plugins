# XIF 抽卡（Hunt / ガチャ）机制逆向文档

> 逆向来源：ilspycmd 反编译 `game.scene.outgame.gacha.dll`、`game.common.gacha.dll`、
> `game.common.infra.dll`、`game.common.playerinfo.dll`、`game.common.contents.dll`、
> `game.common.foundation.dll`、`game.common.database.dll`。
> 服务端实现对照：`asphyxia-src/plugins/xif@asphyxia/index.ts`。

---

## 一、整体架构

抽卡横跨 **6 个程序集**、3 层：

| 层 | 程序集 | 关键类 | 职责 |
|---|---|---|---|
| UI/场景 | `game.scene.outgame.gacha.dll` | `GachaSelectScenePage`、`GachaResultScenePage`、`GachaPaymentMethodModal` | 扭蛋选择、支付弹窗、演出、结果页 |
| 流程编排 | `game.common.gacha.dll` | `GachaServiceRunner`、`GachaLotteryAndCommitService`、`GachaLotteryService` | 扣款→协议→提交→演出 |
| 协议/网络 | `game.common.infra.dll` | `BeginGachaModeler`、`DrawGachaModeler`、`EndGachaModeler`、`XrpcSerializeHelper` | XRPC XML 序列化、请求/响应模型 |

**核心思想**：抽卡服务端**只负责发卡和记档**，客户端负责**表现**（动画、卡面、结果页）。
游戏端不保存任何玩家数据，全部以服务端 `usr.get` / `get_gacha_info` / `end_gacha` 为准。

---

## 二、完整调用链（从点按钮到出结果）

```
用户点「ハントする」
  ↓
GachaSelectScenePage.WaitPageChangeAsync()          ※ 场景页主循环
  ├─ _nextPage = Gacha
  ├─ _paseliBalance.HidePaseliBalance(false)         ← 显示 PASELI 余额
  ├─ RunSequentialGachaAsync(gachaId)                ← 支付弹窗 + 抽卡
  │   ├─ _gachaEventProvider.TryGet(gachaId)         失败 → 空列表
  │   ├─ _paymentModalStacker.PushWithPromise(支付方式弹窗)
  │   │     用户选：PASELI / Credit / Ticket(票券)
  │   │     弹窗内部循环调用 GachaHandler.DrawGachaAsync(...)
  │   │       → GachaServiceRunner.RunGachaFlowAsync(...)
  │   │       → 结果攒进 _result.Results（List<OperationResult>）
  │   └─ 返回 aggregateGachaResults
  ├─ PlayLotteryAnimationAsync(aggregateGachaResults
  │      .SelectMany(g => g.LotteryResult.Items)
  │      .Cast<GachaDrawnItemCharacterCard>())        ← 演出
  ├─ _scenePageStacker.Push(GachaResult, ...)        ← 结果页
  └─ _paseliBalance.HidePaseliBalance(true)
```

---

## 三、核心流程：GachaServiceRunner

```
RunGachaFlowAsync(gachaId, drawCount, sequenceId, sequenceCount, method)
  ├─ !_gachaEventProvider.TryGet(gachaId) → return null      ← 扭蛋不存在
  ├─ _isTaskRunning → return null                            ← 重入保护
  └─ RunMainFlowAsync(...)
       ├─ MoveToOverlayArea()                               ← 弹窗挂到 overlay 层
       ├─ RunCharacterCardLotteryAndConsumeAsync(...)
       │    ├─ 1. consumeService.RunAsync(gachaId, method)   ★ 扣款
       │    ├─ 2. lotteryService.RunAsync(...)              ★ 三步协议
       │    └─ 3. return OperationResult(IsSuccess, LotteryResult, ConsumeResult)
       └─ 失败处理：
            ├─ method == PASELI/Credit 或 ErrorLevel == Fatal
            │    → _gachaDialog.SetGachaFailed(...) + UniTask.Never   ★★ 永久卡死弹窗
            └─ 否则
                 → _gachaDialog.SetRecoverableError(code) + 5 秒后关闭
```

**关键**：`SetGachaFailed` 后 `await UniTask.Never()` —— 这是"弹窗后什么都点不了"的原因，
只能强制退出游戏。

---

## 四、三步协议（GachaLotteryService.DrawGachaOnServerAsync）

```
1) BeginGacha.RequestAsync(BeginGachaRequest(
       PlayerDataServerUploader.CreateRequest(...),   // 玩家数据上传
       sequenceId, sequenceCount))
   ├─ Header.IsSuccess() == false → BeginGachaReqFailed(200)
   └─ transactionId = Body.TransactionId               ← 事务 ID（Guid）

2) DrawGacha.RequestAsync(DrawGachaRequest(
       usrId, pcbId, transactionId, gachaId,
       drawCount, sequenceId, sequenceCount, method))
   └─ 失败 → DrawGachaReqFailed(201)

3) EndGacha.RequestAsync(EndGachaRequest(
       usrId, pcbId, transactionId,
       useItems,                                      // Ticket 支付时的道具消耗
       sequenceId, sequenceCount, method))
   ├─ 失败 → EndGachaReqFailed(202)
   └─ 成功 → GachaLotteryResult(
         ErrorCode  = (body.error.code != 0)
                        ? (code == 1 ? ItemShortBalance : UnexpectedServerResponse)
                        : Ok,
         DrawnItems = body.gacha_result.items/counts/params,
         PlayerDataAfterDrawn = body.player_data,
         )
```

**协议要点**：
- `begin` 拿事务 ID，`draw` 确认，`end` **出结果**（真正的抽卡发生在 end）
- 三个请求都带 `sequence_id`（同一次连抽的序列号）和 `sequence_count`（连抽次数）
- `draw_count` 是已抽的次数（从 0 开始递增）

**服务端响应结构（end_gacha）**：
```xml
<gacha status="0">
  <transaction_id>...</transaction_id>
  <gacha_result>
    <items><item __type="str">chara_card.00030001</item></items>
    <item_counts><count __type="s32">1</count></item_counts>
    <item_params><param __type="str"/></item_params>       ← 三个数组长度必须相等！
    <error><code __type="s32">0</code><message __type="str"/></error>
  </gacha_result>
  <player_data>
    <result/><now_date/><usr_id/><crew_id/>...             ← 必须与 usr.get 同构
  </player_data>
</gacha>
```

---

## 五、结果处理：GachaLotteryAndCommitService.RunAsync

```
1) lotteryResult.ErrorCode.ToErrorLevel() == Fatal
   → return GachaCommitResult(code, null, DrawnItems)        ← 直接失败

2) lotteryResult.PlayerDataAfterDrawn != null
   → PlayerDataServerFetcher.FetchFromServerResponseAsync(
         playerDataAfterDrawn, internalPlayerData, ...)      ★ 应用玩家数据
      ├─ 内部抛异常 → PlayerDataFetchCatchException(302)     ← 我们的坑
      └─ 返回 false  → PlayerDataApplyFailed(300)

3) RecoverableError → return

4) gachaItemProcessor.Convert(gachaInfo, lotteryResult)      ★ 卡转换
   → 内部 ToCharacterCardGachaResultOrNull
      ├─ ErrorCode != Ok → null
      ├─ ItemId.TryParse / CharacterCardId.TryParse 失败 → null
      ├─ charaDB.CardInfo.TryGet 失败（master 没有这张卡）→ null   ← 4-5 张的限制
      ├─ mustContainModelInfo（Contenter 必须有模型）→ modelDB.TryGet 失败 → null
      └─ null → UnsupportedDrawnItems(301)

5) ReportPpEvent(EA3 additem 事件)                            ← 埋点
6) return GachaCommitResult(Ok, items, DrawnItems)
```

---

## 六、错误码表（GachaErrorCode）

| 值 | 名称 | 含义 | 错误级别 |
|---|---|---|---|
| 0 | Ok | 成功 | NoError |
| 1 | ItemShortBalance | 道具余额不足 | Recoverable |
| 100 | GachaIdUnregistered | 扭蛋 ID 未注册 | Fatal |
| 101 | UserNotLoggedin | 未登录 | Fatal |
| 200 | BeginGachaReqFailed | begin 请求失败 | Fatal |
| 201 | DrawGachaReqFailed | draw 请求失败 | Fatal |
| 202 | EndGachaReqFailed | end 请求失败 | Fatal |
| 299 | UnexpectedServerResponse | 响应解析异常 | Fatal |
| 300 | PlayerDataApplyFailed | 玩家数据应用失败 | Fatal |
| 301 | UnsupportedDrawnItems | 抽到的卡无法转换 | Fatal |
| 302 | PlayerDataFetchCatchException | 玩家数据应用抛异常 | Fatal |

`ToErrorLevel()`：`Ok → NoError`；`< 100 → Recoverable`；`>= 100 → Fatal`。

**Fatal + PASELI/Credit → 弹「ハントデータの通信に失敗しました」并永久卡死**。

---

## 七、演出（PlayLotteryAnimationAsync）

```
1) 启动 1 秒窗口定时器（gacha-anim）
2) ShutterUtility.CloseAsync（百叶窗关闭，遮住画面）
3) PrepareFirstFrameAsync(lotteryResults)
   ├─ GashaResultPlayer.CreateAsync(1920, 1080)         ← 演出播放器（首次创建）
   ├─ _view.SetRenderTexture(_player.RenderTexture)
   ├─ ChangeGachaRenderTextureColorRoutine（淡入）
   ├─ characterCards.Select(s => s.CardInfo.CharacterCardInfo.CardRarity).ToArray()
   │      → _player.PreparePrequel(...)                 ★ 这里 SelectMany/Cast 链
   └─ 逐张 CacheToPoolAsync(model / defaultModel)       ← 预加载卡模型
4) PrepareCharacterAsync(lotteryResults.First())
5) _subMonitorProvider.PushTextureAsync（副屏推送）
6) PlaySkippableAnimAsync：
   ├─ SetGachaClickToStartBanner(true)                  ← 「点击开始」
   ├─ 等待点击 / AllSkip
   ├─ ShutterUtility.OpenAsync（百叶窗打开）
   ├─ bgmPlayer.PlaySystemBgm(AtomCueSystemBgm.bgm_gacha)
   ├─ IOManager.LedPatternGacha()                      ← LED 灯效
   └─ 播放卡面动画（可跳过）
7) 完成后 → GachaResultScenePage
```

**关键坑**：`_player.PreparePrequel` 之前如果 `Items` 是 null（catch 路径返回的
CommitResult），`Select` 会抛 `NullReferenceException` —— 表现为**卡在加载界面**
（`_view.PlayCompleted` 永远为 false）。

---

## 八、结果页（GachaResultScenePage）

```
AfterEnter → WaitSceneChagneAsync：
  ├─ 15 秒倒计时定时器（gacha-res，可倒计时音效）
  ├─ await UniTask.WaitUntil(() => _view.PlayCompleted)     ← 演出播完才继续
  ├─ SetFrontRaycastEnabled(false)
  ├─ 计算 RewardInfo（票券奖励）：
  │    method == Credit/Paseli 时
  │      ├─ Contenter → _ticketEventRepository.AquireContenterHant(gachaId)
  │      └─ Snapshot  → _ticketEventRepository.AquireSupportSnapHant(gachaId)
  ├─ _rewardNotifyRouter.ShowAsync(rewards)                 ← 奖励提示
  └─ 倒计时结束 → PopOrDefault(GachaSelect)                 ← 回到扭蛋选择页
```

**结果页数据**（`GachaResultSceneParameter`）：
```csharp
DrawnItems = aggregateGachaResults.Select(r => new GachaResult(
    r.LotteryResult.DrawnItems[0].Item,      // 卡的 item_id
    r.ConsumeResult.Method)).ToArray(),      // 支付方式
DrawnCount = aggregateGachaResults.Count,
DrawnGachaId = gachaId,
```

---

## 九、扣款（GachaConsumeService，未深入）

`consumeService.RunAsync(gachaId, method)` 按 `method` 分支：

| 方式 | 实现 | 说明 |
|---|---|---|
| `Paseli` | `IEACoinService`（PASELI 扣款） | 走 spice 的 ea3 扣款，每抽 300 日元 |
| `Credit` | `ICoinSlotBank`（投币） | 街机投币 |
| `Ticket` | 消耗道具（`gacha_consume_item_id/count`） | 用票券抽 |
| `TutorialFree` | 免费 | 教程用 |

失败会走 `IGachaConsumeResult`（`IsSuccess=false`），由 `RunMainFlowAsync` 决定
是否弹窗（PASELI/Credit 失败必弹）。

---

## 十、服务端实现对照

| 请求 | 服务端处理 | 返回 |
|---|---|---|
| `gacha.get_gacha_info` | 读 `gacha.json` 的扭蛋列表 | `gacha_list`（ID/名称/分类/价格/卡池） |
| `gacha.begin_gacha` | 生成/回传 `transaction_id`，接收玩家数据上传 | `transaction_id` + `now_date` |
| `gacha.draw_gacha` | 校验（不决定结果） | `error.code=0` |
| `gacha.end_gacha` | **按权重抽卡** → 写玩家数据 → 返回结果 | `items/counts/params` + `error` + `player_data` |

**抽卡概率由服务端决定**（`prob_weight_r/sr/ss/ssr/pickup`），客户端只展示。

---

## 十一、实战踩坑清单（按出现顺序）

1. **`error` 字段是对象不是数字**（`<error><code>0</code><message/></error>`）
2. **`gacha_result` 的 items/counts/params 三个数组长度必须相等**（否则
   `EndGachaResponse` 构造抛 `ArgumentException` → 299）
3. **`gacha_result` 的子元素必须小写**（`[XmlArray("items")][XmlArrayItem("item")]`）
4. **XrpcString 是 `__type` 属性 + 文本值**（`<item __type="str">值</item>`）
5. **`player_data` 不能缺 `result`/`crew_id`/`now_date`**（`new CrewId(res.CrewId)`
   对 null 抛异常 → 302）
6. **`last_play_week` 必须是紧凑 `YYYYMMDD`**（`ParseYYYYMMDD` 不吃带横线的格式，
   解析失败回 MinValue → UTC 转换异常 → 302）
7. **FetchAsync 抛异常 → 302 → Fatal → 弹窗 + `UniTask.Never` 永久卡死**
8. **302 补丁（把 catch 返回值改 0）会导致 `Items=null` → 演出 NPE → 卡加载界面**
9. **游戏本地 master 只导入 4-5 张卡**（`QueryMaster` 的 CSV→SQLite 导入中断），
   抽到其他卡 → `Convert` 返回 null → 301

---

## 十二、结论：抽卡能正常工作的最小条件

1. **端响应结构**：items/counts/params 等长、小写、XrpcString 正确
2. **player_data**：与 `usr.get` 响应**完全同构**（含 result/crew_id/now_date，
   所有日期为合法值，`last_play_week` 为紧凑 YYYYMMDD）
3. **卡池**：只放 `CharacterCardMaster` 里有、且游戏能加载的卡
4. **不要打 302 补丁**（会让异常路径返回 Items=null，破坏演出）

满足这 4 条，抽卡全链路（扣款 → 协议 → 提交 → 演出 → 结果 → 保存）即可走通。
