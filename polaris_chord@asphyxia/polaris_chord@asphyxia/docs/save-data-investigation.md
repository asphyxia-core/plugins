# XIF 私服数据不保存 / 卡牌异常 排查报告

> 排查时间：2026-10-29 ~ 11-01
> 环境：Windows + spice2x + Asphyxia CORE（端口 8083）+ 游戏 `game/svm_data/managed`（Unity Mono）

> **11-01 更新（重要）**：第三轮复核推翻了本文对「道具跨局不保留」的结论。
> 真正的根因不是「游戏没调用 `usr.save`」，而是**服务端把存档存下来了、却一件都没下发**
> （`mergePersistentItems` 里多写了一次 `JSON.parse`，异常被吞掉）。
> 「称号不保存」「抽到的卡不保存」也各有各的代码 bug。三处都已修复并做了不依赖游戏的
> 往返验证，**请直接跳到[第九章](#九2026-11-01-复核三个不保存的真正原因已修复)**，
> 前八章作为过程记录保留（其中 4.3 / 5.2 的结论已被修正）。

---

## 一、摘要

用户反馈的四类现象：**每日奖励重复发**、**首次称号重复发**、**商店/抽卡获得的道具不保留**、**卡牌一览只有 4 张 N 卡**（并伴随抽卡偶发 301、抽卡卡死）。

排查结论（10-31 时的版本，其中「道具跨局不保留」「称号」两行的结论见第九章修正）：

| 现象 | 状态 | 根因 |
|---|---|---|
| 抽卡卡死 / 302 弹窗 | ✅ 已修复 | `end_gacha` 的 `player_data` 缺 `crew_id`、`now_date` |
| 每日奖励 / 称号重复发 | ⚠️ 已修数据，待确认 | `usr_login_bonus`、`usr_name_titles` 一直发的是占位空节点 |
| 抽卡偶发 301 | ✅ 已规避 | 融合卡扭蛋强制要求 Model 数据，改走支援卡扭蛋 |
| 卡牌只有 4 张 | ❌ 未解决 | 游戏端 master 的 `CharacterCardMaster` 只有 1 行数据 |
| 道具跨局不保留 | ❌ 未解决 | 游戏从不调用 `usr.save`（只发 `pcb.save`） |

---

## 二、方法

全程用**反编译 + 运行时探针**定位，不靠猜测：

- `ilspycmd`（.NET 8 工具 + `DOTNET_ROLL_FORWARD=LatestMajor`）反编译游戏 managed DLL
- `dnfile` + `dncil` 读元数据、反汇编 IL
- 等长 IL patch（`call`→`ldc.i4.x`、`brfalse.s`→`br.s` 等）做实验，每次改动都有 `.bak` 备份并用 `ilspycmd` 验证结构完整
- 服务端侧：`xrpc.log` 记录请求/响应、`log.txt`（spice2x 捕获的 Unity 日志，只有 `W:UNITY` 会落盘）

---

## 三、已确认的关键事实

### 3.1 服务端数据是正确的

`usr.get` 响应逐项核对通过：

| 节点 | 内容 | 校验 |
|---|---|---|
| `usr_character_card` | 113 条，字段与 `UsrCharacterCard` 的 10 个 `[XmlElement]` 逐一对应 | ✅ |
| `usr_item` | 1380 条（chart 1248 + chara_card 113 + story 5 + ticket 14），ID 全部合法 | ✅ |
| `usr_play_info` | 所有日期字段合法，无 `0001-01-01` | ✅ |
| `usr_profile` / `usr_main_option` | 与契约一致 | ✅ |
| 空值检查 | 4811 个 `s32` / 1776 个 `str` / 229 个 `bool`，无「数字类型字段为空」 | ✅ |

### 3.2 卡实例确实被游戏读到了（探针实验）

把 `data/characters.json` 首张卡的 `index` 改成非法值 `PROBE-INVALID-GUID` → 游戏登录时弹「通信に失敗しました」。

`LoadCharacterCard` 的 `Select` 里有 `new Guid(card.Index.Value)`，只有该卡**通过 Where 三关**才会执行到 → 证明：

1. `usr_character_card` 反序列化成功（113 条都在）
2. `ItemId.TryParse`、`CharacterCardId.TryParse`、`registry.IsRegistered` 都通过
3. **master 里有 `00030001` 这张卡**

### 3.3 但 master 里几乎只有这一张卡

`ItemRegistry.IsRegistered(CharacterCardId)` 的实现就是 `_cardDB.CardInfo.TryGet(...)`，和 `LoadCharacterCard` 里 foreach 的第二关是**同一份数据**。

把它 patch 成恒真后，卡数只从 4 变 5 → master 里只有 1 张卡。

**数据源链条**：

```
CharacterCardInfoProvider.TryGet
  → CharacterCardStatusDataCollection.TryGetCharacterCardData（线性遍历比较 ID）
  → 集合由 MakeCharacterCardData 遍历 CharacterCardMasterAccessor.GetAll()
  → GetAll = SELECT * FROM 'CharacterCardMaster'（内存 SQLite）
  → 由 QueryMaster.LoadAsync 从 bundle 的 CSV 导入
```

### 3.4 CSV 本身是好的，问题在导入

`charactercardmaster.bytes.bundle` 里的 TextAsset：

- 113 行 × 16 列，标准 CSV 解析无异常行
- `CardUsage` / `CardRarity` / `CardType` 的所有取值都在枚举里（`ForMatchingCpu`、`N`、`Contenter` 等）
- 主键是 `CharacterCardId`（`primary = 1`），不存在唯一冲突

导入代码（`QueryMaster.LoadAsync`）：

```csharp
List<SqlDatabaseRecord> list = DatabaseRecord.CreateFromCsv(db, columns, csvFile);
for (int num = 0; num < list.Count; num++)
    list[num].Insert(retDb, columns);        // ← 逐行插入，第 N 行抛异常则后面全部丢失
...
if (exception.Any()) throw new AggregateException(exception);
```

**推断**：第 1 行（卡名 `Stella-Voltage`，纯 ASCII）插入成功，第 2 行（日文卡名）抛异常 → 表中只剩 1 行。

CSV 里纯 ASCII 卡名的卡只有 9 张，其余 104 张是日文——这是第 1 行与第 2 行之间**唯一显著的差异**。

### 3.5 抽卡 301 的原因：融合卡扭蛋要求 Model 数据

```csharp
// ToCharacterCardGachaResultOrNull
ICharacterModelInfo defaultModel = modelDB.TryDefaultGet(characterId, out info) ? info : null;
ICharacterModelInfo model = modelDB.TryGet(characterId, costumeId, out info2) ? info2 : null;
...
if (mustContainModelInfo && (model.DefaultModel == null || model.Model == null))
    return null;                              // → GachaErrorCode.UnsupportedDrawnItems(301)
// mustContainModelInfo = (gachaInfo.Category == GachaBoxCategory.Contenter)
```

**关键**：`GachaEventEntry.Category` 来自游戏 master（`GachaEventMaster`），**不是服务端响应**——改服务端 `gacha.json` 的 `category` 字段无效。

`GachaBoxCategory`：`Unknown=0, Contenter=1, Snapshot=2, Fukubiki=3`
master 实际分布：`Contenter 60 / Snapshot 47 / Fukubiki 2`

`CharacterModelMaster` 同样缺数据 → Contenter 类扭蛋 Convert 返回 null → 301。
**Snapshot 类不检查 model**，所以是唯一能抽的类别。

### 3.6 游戏从不调用 `usr.save`

翻遍 `xrpc.log`：`usr.save` 只被调用过 3 次（很早以前），近期所有存档请求都是 `pcb.save`——而 `pcb.save` 的内容只是硬件/存储信息（`loc_id`、`region`、`hardware_id`、磁盘空间），**不含玩家数据**。

这是「道具跨局不保留」的直接原因：服务端的 `usr.save` 处理逻辑（道具变化日志累加）从未执行过。

---

## 四、已修复的问题

### 4.1 抽卡卡死（302 → 永久卡死）

`GachaLotteryAndCommitService.RunAsync` 在 `player_data` 应用失败时返回 `PlayerDataFetchCatchException(302)`，游戏随即 `SetGachaFailed` + `UniTask.Never`，永久卡在弹窗。

**真正原因**：`end_gacha` 的 `player_data` 比 `usr.get` 响应少了 `crew_id` 和 `now_date`，而 `CreatePlayerStatus` 里有 `new CrewId(res.CrewId)`，缺失即抛异常。

**修复**：`player_data` 与 `usr.get` 响应完全同构（不删任何节点）。

### 4.2 `last_play_week` 格式

```csharp
public static DateTime? ParseYYYYMMDD(string str)
{
    string[] array = str.Split('-');    // ← 按横线分割，要求 3 段
    if (array.Length == 3 && ...) return new DateTime(y, m, d);
    return null;                        // null → DateTime.MinValue
}
```

方法名极具误导性：它要的是 **`2026-10-31`**，不是 `20261031`。

发 `20261031` → 解析失败 → `MinValue` → `PlayerStatus.Update` 做 UTC 换算时抛
`The UTC time represented when the offset is applied must be between year 0 and 10,000` → `FetchAsync` 整段中断。

**修复**：`new Date().toISOString().slice(0, 10)`（带横线）。

### 4.3 `usr_login_bonus` / `usr_name_titles` 是占位空节点

诊断期留下的 `placeholder()` 会给未构建的节点塞 `<zzz __type="s32">0</zzz>`（游戏不认识的元素，等于空列表）：

```csharp
playerData.LoginBonusInternal.Initialize(空);        // 领取进度清零 → 每日奖励重发
playerData.TitleInventoryInternal.OnPlayerDataFetched(空);  // 称号库空 → 每次退局重发「初次游玩」称号
```

而游戏端 `usr.save` 从不上报这些节点（它自己内存里也是空的）→ 形成死循环：发空 → 回放空 → 继续发空。

**修复**：从 master 提取真实数据构造节点
- `usr_login_bonus`：93 条（`event_id` 必须是 `^\d{5}\.\d{4}$`，例如 `00001.0001`；只发活动 ID 会让 `LoginBonusEventId` 抛 `FormatException`，导致**登录进不去**）
- `usr_name_titles`：189 个

> **11-01 修正**：这一版只解决了「发」（把静态数据发出去），没解决「存」——
> `usr_name_titles` / `usr_login_bonus` 被写进 `REPLAY_KEYS` 却**没进 `RAW_KEYS`**，
> 于是「每次都想回放，但从来没存过」，游戏上报的持有列表被直接丢弃。
> 见第九章 9.2。

### 4.4 抽卡 301（规避）

只保留 master 里 `Category=Snapshot` 的 47 个扭蛋，卡池收敛为 `chara_card.00030001`（master 唯一认识的卡，SupportSnap SSR）。

---

## 五、未解决的问题与限制

### 5.1 卡牌只有 4 张（核心遗留）

| 尝试 | 结果 | 失败原因 |
|---|---|---|
| 改 bundle：日文卡名 → ASCII，`pack='none'` | **黑屏** | 重打包成未压缩格式，游戏无法加载 |
| 改 bundle：同上，`pack='lz4'` | **黑屏** | 压缩格式对了（读回 113 行完整），仍加载失败——推测 catalog 哈希校验或 UnityPy 与游戏 Unity 版本不兼容 |
| patch `CardInfo.TryGet` 恒命中（`op_Equality` → `pop;pop;ldc.i4.1`） | **登录失败** | 该查询被 `IsRegistered`、UI 等全局共用，连锁影响过大 |
| patch `QueryMaster.LoadAsync` 跳过 `throw AggregateException` | 保留（无副作用） | 只是不中断，master 数据仍然是缺的 |

**结论**：需要 `CharacterCardMaster` 表里有 113 行，而这张表的数据来自游戏自带 bundle。bundle 无法安全重建、游戏代码又无法局部绕过——**在当前条件下做不到**。

### 5.2 道具跨局不保留 —— ✅ 已定位并验证（此前是操作方式问题）

**`usr.save` 的唯一触发点**：`game.scene.continue` 的 `SavePlayDataStepRunner`

```csharp
// ContinueRunner.RunAsync（进入 Continue 场景时）
_bgmPlayer.PlayBgm();
await _finishMatchingStepRunner.RunAsync(token);        // 结束联机
_outgameCommonUI.SetPlayerCheckCondition(PlayerCheckConditionType.None);
ISavePlayDataStepRunner.Result saveResult = await _savePlayDataStepRunner.RunAsync(token);  // ← usr.save
```

```csharp
// SavePlayDataStepRunner.RunAsync
_entryContextWriter.NotifyGameEnd();
var (flag, obj) = await _playerDataTransfer.UploadAsync(UploadType.Server);
```

即：**打完一首歌 → 结算 → 进入 Continue 场景的那一瞬间就存档**（早于界面显示）。
在结算画面直接退出 / 关窗口 → 不存档。

**实测验证（2026-10-31 20:06:40）**：用户完整打完一首歌并进入 Continue，
`usr.save` 到达服务端，持久道具表累计出 11 条：

```
growth.lv.s.normal: 1386
caravan.point.location.00010001: 100
growth.lv.l.normal: 42
growth.lv.m.normal: 28
ticket.event.special_00009: 7
banner.pose.70050001: 5        ← 商店购买的姿势
banner.pose.70050004: 1        ← 商店购买的姿势
chatstamp.88000409: 1          ← 表情
growth.slv.s.normal: 1
caravan.point.season.00000001: 0
ticket.event.normal_00009: -530  ← 票券消耗（负数，回放时被过滤 = 无限票）
```

**结论**：商店购买的道具现在能正确落库，下次登录由 `usr_item` 合并回放。
负数（消耗类）在回放时被 `filter(n > 0)` 过滤，等于消耗不生效（无限资源）。

> **11-01 修正**：这段只验证了「落库」，没验证「下一次登录有没有真的下发」。
> 实际上 `mergePersistentItems` 一直静默失败（多写了一次 `JSON.parse`，抛出的
> `SyntaxError` 被 `catch` 吞掉 → 整张持久表当成空表），所以道具从来没有回到过游戏里。
> 见第九章 9.1。

> **11-01 修正**：这条也是错的。`usr.save` **带** `usr_character_card`（实测 111 条，
> 每条含 `index` / `item_id` / 经验 / 界限突破 / 收藏 / `created_at`），
> 也带 `usr_name_titles`、`usr_character`、`usr_login_bonus`、`pa_skill`、`usr_chatstamp`。
> 只是这些节点此前**一个都没被存下来**。见第九章 9.2/9.3。

### 5.2b 使用提醒

**每局游玩必须走到 Continue 画面才会保存**。在结算画面直接 Alt+F4 / 关窗口不会存档。

### 5.3 每日奖励是否真的修好

`usr_login_bonus` 已发真实数据，但用户尚未在「数据正确」的状态下确认过是否还重复发放。若仍重复，说明另有机制（如 `usr.checkin` 之外的每日重置逻辑）。

---

## 六、改动清单

### 服务端（`asphyxia-src/plugins/xif@asphyxia`）

| 文件 | 改动 |
|---|---|
| `index.ts` | ① `last_play_week` 用 `YYYY-MM-DD` ② `end_gacha` 的 `player_data` 与 `usr.get` 同构 ③ 新增 `usr_login_bonus`（93 条）/ `usr_name_titles`（189 条）④ `usr_item` 合并持久道具表 ⑤ `usr_item_change_log` 累加到 `u.raw['usr_persistent_items']` |
| `data/login_bonus.json` | 新增，93 条 `{event_id, progress}` |
| `data/name_titles.json` | 新增，189 个称号 ID |
| `data/gacha.json` | 卡池收敛为 `chara_card.00030001`；只保留 47 个 Snapshot 活动 |

### 游戏端（`game/svm_data/managed`）

| 文件 | 状态 |
|---|---|
| `game.common.gacha.dll` | **原版**（302 补丁已撤销） |
| `game.common.playerinfo.dll` | **原版** |
| `game.common.contents.dll` | **原版** |
| `kam.querymaster.runtime.dll` | 保留一处补丁：`<LoadAsync>d__13::MoveNext` 偏移 `0x4e60`，`brfalse.s` → `pop; br.s`，跳过末尾的 `throw new AggregateException`（避免 `BeginAsync` 抛异常中断 `FetchAsync`） |
| `charactercardmaster.bytes.bundle` | **原版**（改 bundle 的实验已全部还原） |

---

## 七、还原方法

```bash
# 游戏端全部还原（如需回退所有补丁）
copy /Y game\svm_data\managed\kam.querymaster.runtime.dll.origthrow game\svm_data\managed\kam.querymaster.runtime.dll

# 卡数据 bundle 还原（黑屏时）
还原卡数据.bat        # 根目录，双击即可

# 扭蛋恢复为完整卡池
copy /Y asphyxia-src\plugins\xif@asphyxia\data\gacha.json.bak_fullpool asphyxia-src\plugins\xif@asphyxia\data\gacha.json
```

---

## 八、经验教训

1. **方法名不可信**：`ParseYYYYMMDD` 实为 `Split('-')`，必须看实现不能看名字。
2. **XML 字段大小写必须逐字核对**：`XmlSerializer` 严格区分，`Index` vs `index` 会让 113 条数据全部静默丢失。
3. **调试日志的级别**：spice2x 只把 Unity 的 `Warning` 转发到 `log.txt`（`W:UNITY`），`Debug.Log` / `LogError` 不落盘——诊断必须用 `LogWarning` 或探针法。
4. **探针法最有效**：植入一个会让目标路径必然抛异常的值，用「是否弹窗」判断代码是否执行到那里，比读日志可靠得多。
5. **改 Unity bundle 风险极高**：UnityPy 重打包后游戏不一定能加载，务必先备份并准备一键还原脚本。
6. **全局 patch 要谨慎**：`CardInfo.TryGet`、`IsRegistered` 这类被多处共用的查询，改一处会牵动整个登录流程。
7. **（11-01 补）「落库了」不等于「会回放」**：上一轮只确认了数据写进 nedb，就宣布修好了；
   真正决定玩家能不能看到的是**下发那一步**，而它被一个被 `catch` 吞掉的 `JSON.parse` 废掉了。
   凡是宣称「已修复」，必须做一次 **save → 重新 get** 的往返验证（见 9.5）。
8. **（11-01 补）`catch (e) { /* 忽略 */ }` 是这类 bug 的温床**：`mergePersistentItems` 里
   `try { persistent = JSON.parse(...) } catch { /* 首局无数据 */ }` 直接把「解析失败」当成
   「没有数据」，于是永久静默。要么记日志，要么让失败可见。
9. **（11-01 补）先看清楚游戏上报了什么，再决定存什么**：把 `usr.save` 的请求体解析出来
   列一下顶层节点（11 个节点里有 6 个从没落库），比读十遍代码都快。
10. **（11-01 补）顺着「数据从哪来」往上翻，能翻到官方给的扩展点**：`mst_patch` 就是官方
    留的主数据补丁通道（CSV），之前被判成「做不到」的 `CharacterCardMaster` 缺行问题
    其实有解（见第十章）。

---

## 九、2026-11-01 复核：三个「不保存」的真正原因（已修复）

### 9.0 怎么查的

这轮不再依赖游戏本体，直接对 CORE 打纯 XML 请求做**往返验证**：

```bash
# 1) 起服务（和 启动XIF.bat 用的是同一套）
asphyxia-src\run-server.cmd

# 2) 只看当前 usr.get 下发了什么
node recon/work/xif_probe.mjs get

# 3) 模拟一局：发一次 usr.save（买两件、拿一个称号、多一张卡）→ 再 usr.get 看能不能读回来
node recon/work/xif_probe.mjs roundtrip

# 4) 走一遍 begin/draw/end 抽卡，检查抽到的东西有没有进存档
node recon/work/xif_probe.mjs gacha

# 5) 看 mst.get_common 里有没有 mst_patch
node recon/work/xif_probe.mjs mst
```

`xif_probe.mjs` 自带 LZ77 解压（`usr.get` / `end_gacha` 的响应是压缩的）和
一轮断言，跑完直接打印 PASS/FAIL。

### 9.1 商店购买的物品不保存 —— `mergePersistentItems` 多解析了一次 JSON

```ts
// 旧代码（store.ts）
let persistent = {};
try {
  persistent = JSON.parse(rawNode(u, 'usr_persistent_items') || '{}') || {};
} catch (e) { /* 首局无数据 */ }
```

`rawNode()` 的实现是「值是字符串就 `JSON.parse` 后返回**对象**」，
所以这里拿到的已经是对象，再 `JSON.parse(对象)` 会先把对象转成 `"[object Object]"` 再解析
→ 必抛 `SyntaxError` → 被 `catch` 吃掉 → `persistent` 保持 `{}` → 后面的
`deltas.length === 0` 直接 `return`。

**结果：持久道具表里有 12 条数据，登录时一件都没发。** 商店买的姿势、表情、成长道具
全部“消失”，而数据库里明明是好的——这就是上一轮「验证通过」的假象。

**修复**：新增 `rawData()`（对象/字符串都吃，只解析一次），
`mergePersistentItems` / `accumulateItemChangeLog` / `persistentItemDeltas` 全部走它。

### 9.2 获得的称号不保存 —— 只回放、不存储

```ts
// 旧代码
export const RAW_KEYS = [ ... ];        // ← 里面没有 usr_name_titles
export const REPLAY_KEYS = [
  'usr_count',
  'usr_login_bonus',   // ← 想回放
  'usr_name_titles',   // ← 想回放
  'usr_action_count',
];
```

`usr.save` 会把持有列表整包报上来（实测 `<title>0</title>` +
`<title>1,2,3,…,10013000000</title>`，客户端 `PlayerNameTagTitleInventory.OnPlayerDataUpload`
就是把 id 用逗号拼成一个字符串）。但 `RAW_KEYS` 里没有它，**存都没存**，
回放自然永远拿不到，每次登录只能退回 `data/name_titles.json` 的静态 189 个
→ 这一局新拿的称号下一局消失。

**修复**：
- `usr_name_titles` 加进 `RAW_KEYS`；
- 下发时用「存档 ∪ 静态基线」（存档优先）：`playerdata.ts` 的 `mergeTitleIds`；
- 客户端本来就会按 `,` 再拆一次，所以合并成**单个** `<title>` 元素下发（更省体积，语义不变）。

顺带把同样「只回放不存储」的 `usr_login_bonus` 补进 `RAW_KEYS`
（有存档用存档，没有才用静态 93 条）。

### 9.3 抽到的卡不保存 —— 卡实例从未落库，抽卡结果也从未落库

两个独立的坑：

1. **`usr_character_card` / `usr_character` 不在 `RAW_KEYS`**。游戏明明每局都上报
   （115 条卡实例，含经验 / 界限突破 / 收藏 / 获得时间），服务端全部丢弃，
   登录时永远发 `data/characters.json` 的静态 113 张 → 抽到的卡、练过的卡、收藏标记
   全部回到出厂状态。
2. **`gacha.end_gacha` 从来没有把抽到的东西写进存档**。`end_gacha` 是真正决定结果的地方，
   但旧实现只回 `gacha_result` + `player_data`，`player_data` 又是从存档拼出来的
   —— 抽到的东西不在存档里，等于演出播完就丢。

**修复**：
- `usr_character_card` / `usr_character` 进 `RAW_KEYS`，
  `character.ts` 里加了一层「纯数据」中间表示 + 三路合并：
  **基线（characters.json）→ 存档（游戏上报，同 index 覆盖）→ 本次会话抽到的卡**，
  按 `index` 去重、`deleted` 的丢弃；
- `gacha.end_gacha`：**先** `recordDrawnItem()` 落库（数量进持久道具表，
  `chara_card.*` 额外生成一个卡实例进 `u.raw['usr_extra_cards']`）并 `saveUser()`，
  **再** `buildPlayerBody()` 拼 `player_data` —— 这样抽到的卡当次就能被
  `PlayerDataServerFetcher` 应用到游戏里，重启后也还在；
- 卡实例对应的 `usr_item`（`chara_card.xxxxxxx`）由合并后的卡列表统一生成，不会漏。

### 9.4 顺手修掉的同源问题

| 问题 | 现象 | 修复 |
|---|---|---|
| 变化日志重复累加 | 一局里 `usr.save` 可能被调用多次，日志会被重发 → 数值滚雪球（`growth.lv.s.normal` 已经涨到 1612） | 按日志里的 `uuid` 去重（`u.raw['usr_item_log_applied']`，保留最近 4000 条） |
| `usr_action_count` 只回放不累加 | PA 任务/称号条件的计数器永远是 0 | 累加 `usr_action_count_change_log`（同样按 uuid 去重），下发时生成 `usr_action_count` 总量节点 |
| `pa_skill` 从未落库 | PA 技能等级 / 排名每局重置 | 进 `RAW_KEYS` + 透传回放 |
| `usr_chatstamp` 从未落库 | 贴纸使用历史清空 | 进 `RAW_KEYS` + 透传回放（空节点用占位符兜底，避免整节点消失） |
| `usr_deck` 存了不回放 | 卡组名 / 当前卡组每局重置 | 现在卡实例齐了，可以安全回放；回放前把非 GUID 槽位换成空 GUID（游戏端 `new Guid("")` 会抛异常，而那段代码不在 try 里，一抛就登录失败） |
| 空的透传节点被序列化器整段跳过 | 缺节点 → 游戏判 `RegisteredUserNoData` → 走新玩家流程 | `isEmptyNode()` 判断后改用 `zzz` 占位符的版本 |

### 9.5 验证结果（不需要游戏）

`node recon/work/xif_probe.mjs roundtrip`（先 save 再 get，模拟重启登录）：

```
PASS  商店购买的姿势出现在 usr_item        (banner.pose.99990001)
PASS  商店购买的表情出现在 usr_item        (chatstamp.99990001)
PASS  新获得的称号出现在 usr_name_titles   (99020000099)
PASS  称号数量没有缩水                      (189 -> 189)
PASS  新卡实例出现在 usr_character_card    (11111111-…-555555555555)
PASS  卡经验原样保留                        (exp=1234)
PASS  界限突破数原样保留                    (limit_over=2)
PASS  卡实例数量没有缩水                    (115 -> 115)
```

`node recon/work/xif_probe.mjs gacha`（begin → draw → end → 重新 get）：

```
PASS  抽到的道具出现在 player_data.usr_item          (chara_card.00270005)
PASS  抽到的卡出现在 player_data.usr_character_card  (chara_card.00270005)
PASS  抽到的道具跨局保留                             (chara_card.00270005)
PASS  抽到的卡跨局保留                               (chara_card.00270005)
```

同一个 `usr.save` 连发两次，数值不会翻倍（uuid 去重生效）。
验证用的假数据（`banner.pose.99990001` 等）在测完之后把存档还原了，
没有留在玩家的真实存档里。

### 9.6 还要注意的两件事

1. **`usr.save` 仍然只在「打完歌 → Continue」和「退店」时发**。
   在商店买完东西直接 Alt+F4，这一局不会存档。想保住购买，请回到 Continue 画面或退店。
2. **静态基线仍然存在**：`characters.json` 给全部 113 张卡、`name_titles.json` 给 189 个称号。
   所以存档是在「本来就全有」的基础上做增量 —— 抽到重复卡是正常的（会多一个卡实例）。
   想让收集有实感，把 `data/characters.json` 的 `cards` 缩成起始卡组即可，
   但要注意游戏端 `RepairCharacterDeck` 要求**至少 1 张 Contenter + 4 张 SupportSnap**，
   否则登录直接抛异常（`ArgumentException: least 1 contenter required`）。

---

## 十、新线索：`mst_patch` 是官方留的主数据补丁通道（可用于补回 113 张卡）

> **11-01 第二轮修正**：本章「补回 112 行」的前提是错的 —— `CharacterCardMaster`
> **本来就有 113 行**，缺的只有 2 行（`Version=9999999` 被 `FilterDatabase` 删掉）。
> 真实的机制和修法见第十二章。本章保留 `mst_patch` 通道本身的说明（那部分是对的），
> 只是要补的不再是「112 行」。

5.1 的结论是「bundle 改不了，master 缺行无解」。**这一条要收回**。

`game.common.contents` 的 `ContentsRepository.ApplyPatchAsync`：

```csharp
using IQueryMaster transaction = await QueryMaster.BeginAsync(token);
await transaction.RestoreDatabase();                 // 从 bundle 的 CSV 重新导入（就是丢掉 112 行的这步）
if (patch != null) transaction.ApplyPatch(patch.Patch);   // ← 服务端下发的补丁，在导入**之后**执行
```

`ApplyPatch` = `kam.querymaster.runtime` 的 `QueryMasterPatch.ApplyDatabasePatch`，
吃的是 **CSV 文本**，逐行按主键 `UPDATE` / `INSERT` 到任意主数据表：

```
<表名>              ← 单列一行，必须等于 C# 类型名，如 CharacterCardMaster
<列名,列名,...>      ← 必须是该表的 ColumnName，主键列不能少
<值,值,...>         ← 列数必须与列名行一致
<空行>              ← 这张表结束
```

服务端只要在 `mst.get_common` 里带上 `<mst_patch><version/><patch>CSV</patch></mst_patch>`，
游戏就会在每次启动时把缺的行补进内存 SQLite。**113 行 `CharacterCardMaster` 就在
`recon/out/db/CharacterCardMaster.csv` 里，是现成的。**

配套已经做好：
- `py tools\gen_mst_patch.py` → 生成 `data/mst_patch.csv`（默认只含 `CharacterCardMaster`，
  113 行 16 列；`--tables` 可加 `CharacterModelMaster`，`--ascii-names` 可把日文卡名换成
  ASCII，用于排除编码因素）；
- 插件的 `buildPatch()` 新增 `mode = "csv"`，把该文件原样塞进 `mst_patch`；
- **默认仍是 `mode = "omit"`**（不改动现有能跑的启动路径）。

启用方式（一行，不用重启 CORE）：

```json
// asphyxia-src/plugins/xif@asphyxia/data/patch.json
{ "mode": "csv", "version": "2025070800" }
```

然后看两个地方判断成功与否：

| 位置 | 期望 |
|---|---|
| 游戏目录 `game/dev/raw/log/output_log.txt` | 出现 113 条 `PATCH: Insert CharacterCardMaster …` |
| 游戏内「角色卡一览」 | 卡片数量从个位数变成上百张 |

失败也不要紧：`ApplyPatchAsync` 整段包在 `try/catch` 里，抛异常只会记一条
`LogException`，然后是**和现在完全一样的状态**；把 `mode` 改回 `omit` 即可。
如果日志里是 `PATCH : Column not found` / `Column Count not match`，说明列名或行有错，
用 `py tools\gen_mst_patch.py --check` 先跑一遍校验。

> 还没做的一步：`CharacterModelMaster`（融合卡扭蛋 301 的根因）也可以照同样方式补，
> 只是需要先确认该表的行在本地是缺的。`py tools\gen_mst_patch.py --tables
> CharacterCardMaster CharacterModelMaster` 就会把两张表都塞进同一个补丁。

---

## 十一、改动清单（2026-11-01）

服务端（`asphyxia-src/plugins/xif@asphyxia`，同步到了 `dist/xif@asphyxia`、
`dist/xif-asphyxia`、`asphyxia-core-win-x64/plugins/xif@asphyxia`）：

| 文件 | 改动 |
|---|---|
| `handlers/store.ts` | ① 新增 `rawData()` 修掉 `mergePersistentItems` 的双重 `JSON.parse` ② `RAW_KEYS` 补 `usr_name_titles` / `usr_character_card` / `usr_character` / `usr_login_bonus` / `usr_chatstamp` / `pa_skill` ③ `accumulateActionCountLog` + `buildActionCountNode` ④ 变化日志按 uuid 去重 ⑤ `recordDrawnItem` / `readExtraCards` / `pruneExtraCards`（抽卡落库） |
| `handlers/playerdata.ts` | ① 称号「存档 ∪ 基线」② 卡/角色三路合并 ③ 登录奖励用存档优先 ④ `usr_action_count` 由累加值生成 ⑤ `isEmptyNode` 防空节点 ⑥ `sanitizeDeck` 后回放 `usr_deck` |
| `handlers/character.ts` | 重写为「纯数据 → XML / 纯数据 ↔ XML」双向转换（`cardNodes` / `charaNodes` / `cardItems` / `parseCards` / `parseCharas` / `mergeCards` / `mergeCharas`） |
| `handlers/gacha.ts` | `end_gacha` 先落库再拼 `player_data` |
| `handlers/usr.ts` | `usr.save` 里累加 action count、清理抽卡临时卡 |
| `handlers/music.ts` | `buildPatch()` 新增 `mode = "csv"`（下发 `data/mst_patch.csv`） |
| `data/mst_patch.csv` | 新增，`CharacterCardMaster` 113 行（由 `tools/gen_mst_patch.py` 生成） |

工具 / 验证脚本：

| 文件 | 用途 |
|---|---|
| `tools/gen_mst_patch.py` | 从 `recon/out/db/*.csv` 生成 `mst_patch` 用的 CSV 补丁（自动去掉重复 BOM、按 CSV 规则重新加引号、自校验、`Version` 压到 asset_version） |
| `recon/work/xif_probe.mjs` | 存档往返探针（`get` / `roundtrip` / `gacha` / `mst`），自带 LZ77 解压与断言 |
| `recon/work/offline_body.mjs` | **离线跑 `buildPlayerBody()`**，不起 CORE 不碰游戏，直接看 usr.get 会下发什么 |
| `recon/work/db_summary.mjs` | 打印 nedb 存档摘要（档案、成绩、raw 节点、持久道具表） |
| `recon/work/analyze_save.mjs` | 解析 `xrpc.log` 里最后一次 `usr.save`，列出装备/更换类节点（nametag / deck / 排序 / 道具变化） |
| `recon/work/diff_cards.mjs` | 比对「服务端下发的卡」与「客户端上报的卡」，揪出被客户端丢弃的卡 |

---

## 十二、2026-11-01 第二轮：卡其实有 111 张，`FilterDatabase` 吃掉了 2 张

### 12.1 先纠正一个错了三轮的结论

5.1 说「`CharacterCardMaster` 只成功写入 1 行，其余 112 条丢失，bundle 改不了所以无解」。
**这是错的。** 打开 `mst_patch` 后游戏的日志（`game/dev/raw/log/output_log.txt`）给出了铁证：

```
PATCH: Update CharacterCardMaster 00030001 CardName=Stella-Voltage,CardRarity=3,CardType=1,...,Version=0
PATCH: Update CharacterCardMaster 00030002 CardName=いつもどおりの一日,...,Version=0
...（共 226 行 = 113 行 × 2 次请求，全部是 Update，没有一条 Insert，且没有任何异常）
```

`ApplyDatabasePatch` 对每行先按主键 `SELECT`，命中就 `UPDATE`、没命中才 `INSERT`。
**全部是 `Update` ⇒ 表里本来就有 113 行**，导入一直是对的。
（`CardType` 只出现 0/1，`CardRarity` 只出现 1/2/3，与 CSV 的 49 Contenter + 64 SupportSnap、
66 SSR / 26 SR / 21 R 完全吻合。）

之前「只有 1 行 / 只有 4 张卡」的判断，来自「patch 掉 `CardInfo.TryGet` 后卡数从 4 变 5」
这个探针 —— 那个探针本身就把 `IsRegistered` 之类共用查询一起改坏了，结论不可信。

### 12.2 真正的缺口：`FilterDatabase` 按 Version 删行

`ContentsRepository.FetchAsync` 的顺序是：

```csharp
await ApplyPatchAsync(patch, token);                    // RestoreDatabase() → ApplyPatch(csv)
using (IQueryMaster qm = await QueryMaster.BeginAsync(null))
    qm.FilterDatabase((int)XIFApplication.AssetBuildInfo.Version);   // ← 这里
```

```csharp
public void FilterDatabase(int assetVersion)
{
    foreach (Type t in /* 所有 VersionableSqlDatabaseRecord 表 */)
        DatabaseConnection.Delete(DatabaseRecord.GetTableName(t), "Version > ?", assetVersion);
}
```

`assetVersion` = **37**。而导出的 `CharacterCardMaster.csv` 里：

| Version 值 | 行数 | 说明 |
|---|---|---|
| 0 | 84 | 首发内容 |
| 18 ~ 36 | 27 | 各版本追加内容（都 <= 37，保留） |
| **9999999** | **2** | `00080001` 綿間瀬わたこ【チアフルコード】 / `00080004` 日下育彦【チアフルコード】 ← **被删** |

所以游戏里实际是 **111 张卡**，少的正好是这两张「另一套服装」的 Contenter。

客户端侧的连锁反应（`RegisteredPlayerDataFetcher.FetchAsync`）：

```csharp
IEnumerable<UsrItem> usrItem = playDataResponse.Items
    .Where(i => _itemRegistry.IsRegistered(new ItemId(i.ItemId)));   // 未注册的道具被丢弃
playerData.ItemInventoryInternal.OnPlayerDataFetched(usrItem);
...
var tuple = LoadCharacterCard(playDataResponse, _characterDataProvider, _itemRegistry);
    // ↑ CardInfo.TryGet(卡号) 失败 → 这张卡的实例直接不加入列表
```

于是 `chara_card.00080001` / `chara_card.00080004` 的道具和卡实例在客户端被静默丢弃。
抽到它们时 `ToCharacterCardGachaResultOrNull` 查不到卡定义 → **返回 null → 301 弹窗**。

这解释了两个现象：**卡一览少 2 张** + **偶尔抽卡 301**。

### 12.3 修法：patch 在 FilterDatabase 之前，把 Version 压下来

顺序是 `ApplyPatch` → `FilterDatabase`，所以只要补丁里的 `Version <= 37`，
这两行就能活过 `FilterDatabase`：

```bash
py tools\gen_mst_patch.py            # 默认 --version-cap 37
#   mst_patch contents:
#     CharacterCardMaster  columns=16  rows=113  (Version 压到 37 的行: 2)
```

`clamp_version()` 只压「大于 cap」的行 —— CSV 里那 27 行 Version=18~36 是正常的
「某版本起发布」标记，本来就不会被删，不能一起改成 0（第一版把 29 行全改成 0，
虽然无害但破坏了语义）。

改完后 `data/patch.json` 保持 `{ "mode": "csv", "version": "2025070800" }`。
下次启动游戏，日志里这两行会变成 `Version=37`；卡一览应该是 **113 张**。

### 12.4 「更换的物品会被重置」：只存不回放的第二批节点

这一轮用户反馈「商店的物品保留了、称号全解锁了，但**更换的东西会被重置**」。
查存档里的实际值，问题很清楚：

| 节点 | 存档里的值 | 玩家实际拥有的 |
|---|---|---|
| `usr_nametag.nametag_plate_id` | `nametag.plate.00000000`（默认） | `nametag.plate.49010021` / `49010004` / `49010005`（买了 3 个铭牌底板） |
| `usr_nametag.nametag_title_id` | `nametag.title.00000000000`（默认，显示「初めまして」） | 189 个称号 |
| `usr_deck[0].pose_id` / `frame_id` | `banner.pose.90000001` / `banner.frame.90000001`（默认） | `banner.pose.70050001/2/3/4`（买了 4 个姿势） |

买了东西（`usr_item` 里都有，能看见），但**装备不上去 / 装上去下一局又回默认**。

根因和第九章的称号是同一类：`usr_nametag` / `usr_privacy` / `usr_sort_setting` /
`usr_music_mission` 这 4 个节点 **只落库、从不回放**，于是：

```
玩家换铭牌 → 内存变了
   ↓  任何一次拿 player_data（登录 usr.get、抽卡 end_gacha 的 player_data）
CreatePlayerOption(res)：服务端发的是空节点 → NameTagPlate 解析失败 → 强制 Default
   ↓
玩家换的东西被刷回默认 → usr.save 上报的又是默认值 → 服务端存的永远是默认
```

这是个**自我维持的死循环**：服务端发空 → 游戏重置 → 上报默认 → 服务端存默认。

**修复**：把 4 个节点加进 `REPLAY_KEYS`（它们本来就都在 `RAW_KEYS` 里，存是存着的）。
透传回放游戏自己上报的原始 XML 结构最安全，游戏端对非法 id 本来就有兜底
（`PlayerOption.NameTagTitle / NameTagPlate` 校验失败会回落 Default）。

顺带确认：`usr_deck` 在第九章已经加了回放（含 `frame_id` / `pose_id` /
`another_costume_id`），所以装备在卡组上的姿势/边框这一轮已经能持久化。

### 12.5 离线验证工具：`offline_body.mjs`

这一轮没法启动游戏（`spice64.exe` 需要提权，非交互环境起不来），也杀不掉用户正在跑的
CORE，所以加了一个**离线跑 `buildPlayerBody()`** 的 harness：

```bash
node recon\work\offline_body.mjs
```

它 mock 了 asphyxia 注入给插件的全局对象（`K` / `IO` / `DB` / `U` / `$`），
直接读 `savedata/xif@asphyxia.db`，不需要起服务、不需要游戏。输出：

```
[数据] usr_name_titles            1 个 title 元素
[数据] usr_privacy                disp_name_to_other,...
[数据] usr_nametag                nametag_badge1_id,...,nametag_title_id   ← 之前是 [占位] zzz
[数据] usr_sort_setting           musicselect_sort,musicselect_filter,...
[数据] usr_character_card         115 张卡实例（113 唯一 + 2 张抽到的重复卡）
[数据] usr_deck                   10 组
[数据] usr_music_mission          24 条
[数据] usr_item                   1404 条（chart 1248 / chara_card 113 / banner 4 / chatstamp 10 / nametag 3 …）
节点数 25，其中占位 5 个
```

同时新增两个日志分析脚本：`analyze_save.mjs`（看客户端到底上报了什么装备状态）、
`diff_cards.mjs`（比对下发与上报的卡，直接揪出被客户端丢掉的卡）：

```
服务端下发: 113 张（113 个不同 item_id）
客户端上报: 113 条（111 个不同 item_id）
下发了但客户端没有 (2):
   chara_card.00080001  Contenter  綿間瀬 わたこ【チアフルコード】
   chara_card.00080004  Contenter  日下 育彦【チアフルコード】
客户端里重复的 item_id (2):
   chara_card.00280002 x2   ← 用户抽到的重复卡，服务端已经正确持久化了
   chara_card.00270009 x2
```

**这张 diff 表就是 12.2 的独立证据**：客户端缺的两张，正是 `Version=9999999` 的那两张。

### 12.6 还剩什么

1. **卡是全的，所以抽卡必然抽到重复卡。** 静态基线（`characters.json`）一次把 113 张全发了，
   `gacha` 池也是这 113 张 —— 抽到的基本都是已拥有的。想要「收集感」，
   把 `characters.json` 的 `cards` 缩成起始卡组（**必须 ≥ 1 张 Contenter + 4 张 SupportSnap**，
   否则游戏端 `RepairCharacterDeck` 会抛 `least 1 contenter required` 直接登录失败）。
2. **`CharacterModelMaster` 是否也缺行还没验证**（融合卡 301 的根因）。用
   `py tools\gen_mst_patch.py --tables CharacterCardMaster CharacterModelMaster` 可以一起补，
   但先要确认这张表在本地是不是真的少行 —— 有了 `diff_cards.mjs` 和 PATCH 日志，这类判断
   现在有据可依，不用再靠猜。

---

## 十三、2026-11-01 第三轮：`mst_patch` 验证通过，卡是通的，卡组是租借卡

### 13.1 三重证据：`mst_patch` 真的把那 2 张卡救回来了

| 证据 | 内容 |
|---|---|
| PATCH 日志 | `PATCH: Update CharacterCardMaster 00080001 … Version=37`（之前写入的是 9999999）；4 次 `mst.get_common` 共 452 行，**0 条 Insert**（表里一直有 113 行） |
| 客户端上报 | `usr_character_card` 113 个**唯一卡号**里**包含** `chara_card.00080001` / `00080004` —— 而 `LoadCharacterCard` 会用 `CardInfo.TryGet` 过滤，master 里没有的卡根本不会出现在上报里 |
| 数量变化 | 上一轮客户端缺这 2 张；这一轮 113 张全在（116 个实例 = 113 唯一 + 3 张抽到的重复卡） |

所以这一轮之后，**游戏端的卡池是完整的 113 张**。

### 13.2 「卡组只有 4 张」：卡组里装的全是租借卡

查最新一次 `usr.save`（18:14:01）的 `usr_deck`，10 个卡组**全部**长这样：

```
contenter        8613079a-…  → 租借卡 00060001（綿間瀬 わたこ）
supportsnap1     258e2ae7-…  → 租借卡 00010001
supportsnap2     04059182-…  → 租借卡 00010002
supportsnap3     309a03f9-…  → 租借卡 00010003
supportsnap4     8c4a6938-…  → 租借卡 00010004
```

这 5 个 index 全部来自 `CharacterRentalCardMaster`（对照 `recon/out/db/CharacterRentalCardMaster.csv`
的 `UserCardId`），而玩家自有的 113 张卡（52 个 Contenter 实例 + 64 个 SupportSnap 实例）
**一张都没有进卡组**。

原因在 `RegisteredPlayerDataFetcher`：

```csharp
var rental = await PlayerDataTransferUtils.LoadRentalCharacterCardAsync();   // 租借卡
var own    = LoadCharacterCard(playDataResponse, ...);                       // 自有卡
array  = rental.Item1.Concat(own.Item1).ToArray();    // ← 租借卡排在前面
array2 = rental.Item2.Concat(own.Item2).ToArray();
...
RepairCharacterDeck(decks, array, array2, ...)        // deck 无效时用 array[0] / array2[0..3]
```

`RepairCharacterDeck` 在槽位无效时填的是 `contenters[0]` / `supports[0..3]` ——
**租借卡排在最前面，所以「默认编成」永远填 5 张租借卡**。这就是「按 default 编成后
卡变了、但总有一张被替掉」的直接原因：每次 default 都往租借卡上收敛。

> 另外 `PlayerDataUsrCharacterCardConverter.ToUploadData` 用的是
> `GetExcludeRental(includeDeletedCard: true)` —— **上报时排除租借卡**，
> 所以服务端存档里永远看不到这 5 张租借卡，它们只活在 `usr_deck` 的 index 里。

**这不是服务端的 bug**，是游戏对「新玩家」的设定：先给你一套租借卡去打，想用自己抽到的卡
得在**卡组编成界面里手动换**。换完之后 `usr_deck` 里存的就是自有卡的 `index`，
服务端这一轮已经在回放 `usr_deck`（含 `frame_id` / `pose_id`），所以换过的卡组会保留。

### 13.3 「抽到的卡找不到」：抽到的是重复卡

静态基线 `data/characters.json` 一次就把 113 张全发给玩家，`gacha.json` 的池子也是这 113 张
—— 所以**每一次抽卡必然是重复卡**。存档里能明确看到：116 个卡实例里只有 113 个不同卡号，
多出来的 3 个就是抽到的重复实例（`00280002` / `00270009` / …）。

游戏端 `PlayerCharacterCardList` 是按 `UserCharacterCardId`（实例 UUID）做 key 的
（`Update()` 里 `.ToDictionary(item => item.UserCharacterCardId)`），**不去重卡号**，
所以卡一览里同一张卡会显示成多个实例、或者显示成「同一张卡」—— 无论哪种，玩家的观感都是
「没抽到新卡」。

**想要真正的收集感，只能改基线**：把 `characters.json` 的 `cards` 缩成起始卡组
（≥ 1 Contenter + 4 SupportSnap），其余 108 张靠抽卡/剧情获得。

### 13.4 多出来的 HIMEHINA 卡池：`mst_patch` 的连锁副作用（正向）

`mode = "omit"` 时 `patch == null`，`ApplyPatchAsync` 里那段
`XIFApplication.ApplyPatchVersion(patch.Version, …)` 根本不会执行；
改成 `mode = "csv"` 之后每次启动都会走：

```csharp
XIFApplication.ClearPatchVersion();
transaction.RestoreDatabase();
if (patch != null) {
    transaction.ApplyPatch(patch.Patch);              // 我们下发的 CSV
    int num = MatchingPatchVersionMasterAccessor.GetAll(transaction).FirstOrDefault()?.MatchingVer ?? …;
    XIFApplication.ApplyPatchVersion(patch.Version, flag ? num : (int)patch.Version);
}
```

游戏的「补丁版本」从「无」变成 `2025070800`，按版本发布的内容（联动扭蛋活动、
`Version=18~36` 的那些卡）就都能看见了 —— HIMEHINA 卡池（`00380004 田中ヒメ` /
`00380005 鈴木ヒナ`）正是其中之一。这是**期望行为**，不是 bug。

### 13.5 待确认

「卡组只能显示 4 张」还需要和玩家看到的界面核对一下（卡一览 vs 卡组编成 vs パートナー），
因为服务端能确认的只有：**自有卡 113 种都在 `usr_character_card` 里下发并被客户端收下**，
而 `usr_deck` 里是 5 张租借卡。因此更可能是：

1. 玩家看的是**卡组编成的 4 个 support 槽**（contenter 在另一个位置/页签），
   而槽里全是租借卡 → 「只有 4 张」；
2. 或者卡一览本身正常显示 113 张，只是抽到的重复卡看起来「没变化」。

两种情况都不需要改服务端，需要的是**在游戏里手动把卡组换成自有卡**。

---

## 十四、2026-11-01 第四轮：「卡一览只有 4~5 张、全是 N 卡」= 筛选位掩码为 0

### 14.1 现象与矛盾

玩家反馈：卡一览里只能看到 4~5 张卡，**看不到名字，而且全是 N 卡**；按「默认编成」卡组里
总有一张会被替换。而服务端与客户端的卡数据都是好的：

| 事实 | 证据 |
|---|---|
| master 有 113 行 | PATCH 日志 452 行全 `Update`、0 条 `Insert` |
| 客户端收下 113 种 | `usr_character_card` 上报 113 个唯一卡号（含救回的 `00080001` / `00080004`） |
| 道具也全收下 | `ItemRegistry.IsRegistered(chara_card.*)` → `CardInfo.TryGet` → 113 张都在 |
| 已排除的两个怀疑 | `CharacterCardInfo` 5 条硬校验逐行模拟 **0 违规**；第一张 Contenter 在第 65 行，前 64 行都是 SupportSnap，就算真在 Contenter 处抛异常也该剩 64 张 |

所以问题不在数据，在**界面过滤**。反编译 `game.scene.outgame.character.dll` 找到了。

### 14.2 真凶：`CardFilterType` 位掩码 = 0（NONE）

`CharacterCardReplacementListDataUtil.GenerateCardList` 的过滤链：

```csharp
foreach (var card in 全部卡) {                       // GetAllIncludeRental
    if (!CardInfo.TryGet(card.CharacterCardId, out var info)) continue;
    if (info.CardType != 当前页签的 cardType) continue;
    var data = new CharacterCardReplacementListData { ..., IsDecked = 是否已编入卡组 };
    if (CardListFilterEliminate(filterType, data)) continue;   // ← 位掩码没勾就丢弃
    list.Add(data);
}

bool CardListFilterEliminate(t, data) {
    if (data.IsDecked) return false;     // 已编入卡组的卡**永远显示**，不受筛选影响
    if (RarityEliminate(t, data)) return true;
    if (LevelEliminate(t, data)) return true;
    if (SkillLevelEliminate(t, data)) return true;
    if (RankEliminate(t, data)) return true;
    if (SkillEliminate(t, data)) return true;
    return false;
}
```

`CardFilterType`（`game.common.foundation`，逐个 `dump_il` 出来的常量）：

```
NONE=0
RARITY_N=0x01  RARITY_R=0x02  RARITY_SR=0x04  RARITY_SSR=0x08
ENABLE_LEVEL_TRAINING=0x10  UNENABLE_LEVEL_TRAINING=0x20
ENABLE_SKILL_LEVEL_TRAINING=0x40  UNENABLE_SKILL_LEVEL_TRAINING=0x80
RANK_SINGLE=0x100  RANK_DOUBLE=0x200  RANK_TRIPLE=0x400
SKILL_*(Contenter)=0x800..0x3F800    SKILL_*(Support)=0x40000..0x1FC0000

DEFAULT = ALLRARITY(0x0F) | ALLLEVEL(0x30) | ALLSKILLLEVEL(0xC0)
        | ALLRANK(0x700) | ALLCONTENTERSKILL(0x3F800) | ALLSUPPORTSKILL(0x1FC0000)
        = 0x1FFFFFF = 33554431
```

**`filterType == 0` ⇒ 一张都不勾 ⇒ 只剩 `IsDecked == true` 的卡（卡组里那几张）。**

### 14.3 为什么「全是 N 卡、看不到名字」

玩家的卡组（`usr_deck`）里 5 张全是**租借卡**，而 `RarityEliminate` 第一句是：

```csharp
CardRarity rarity = card.PlayerCharacterCardData.IsRental ? (CardRarity)0 : card.CharacterCardProfile.CardRarity;
```

**租借卡一律按稀有度 0 处理，而 0 就是 N** —— 所以卡一览里那 4~5 张全是 N 徽章、名字也对不上号
（卡组 = 1 张租借 Contenter + 4 张租借 SupportSnap，分到两个页签就是 1 张和 4 张）。

### 14.4 filter 为什么是 0

`PlayerSortSetting.Default`（全选）只在 `.cctor` 里构造；
而 `CreateSortSetting(res)` 在服务端字段缺失或为 0 时用的是 `new PlayerSortSetting()`（字段默认 0）。
玩家不动筛选 → 上报 0 → 服务端原样回放 0 → 下一局还是 0。**又是一个自我维持的死循环。**

旁证：同一节点里的 `musicselect_filter` 是 **3617 = 0x0E21**，正好等于
`FilterTypeExtensions.Default`（`dump_il` 确认）—— 说明玩家从没动过选曲筛选，它是被游戏用
默认值填上的；而卡筛选的默认值偏偏是 0。

### 14.5 修复

`handlers/playerdata.ts` 新增 `fixSortSetting()`：`usr_sort_setting` 不再纯透传，而是

- **三个 `*_filter` 字段值为 0 / 缺失时，换成 `0x1FFFFFF`（全选）**；
- 其余字段（sort / order / musicselect_filter）原样保留，**玩家真设过的筛选不会被覆盖**
  （真筛选一定是非 0 值）；
- 缺失字段按 `PlayerSortSetting.Default` 补齐（replacement sort=1、material sort=6 等），
  避免空节点退化。

离线验证（`node recon\work\offline_body.mjs`）：

```
usr_sort_setting : {"musicselect_sort":0,"musicselect_filter":3617,"musicselect_order":0,
                    "character_training_list_sort":0,"character_training_list_filter":33554431,
                    "character_replacement_list_sort":0,"character_replacement_list_filter":33554431,
                    "character_material_list_sort":0,"character_material_list_filter":33554431,...}
```

修好之后，卡一览 / 训练列表 / 素材列表都会显示**全部 113 张**（而不是卡组里那 4~5 张）。

> 顺带确认：`usr_deck` 回放也生效了 —— 存档里 `pose_id` 已经变成玩家买的
> `banner.pose.70050001`、`frame_id` 变成 `banner.frame.90000002`，不再是默认的 90000001。
