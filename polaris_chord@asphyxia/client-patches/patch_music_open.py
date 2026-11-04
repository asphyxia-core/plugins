"""让「未配信（Private）」的曲目也进入选曲列表。

背景
----
`MusicDataQueryMasterUpdater.UpdateAsync` 构建内存曲目表时：

    bool isOpen = _catalogCache.TryGetValue(chart.chart_id, out var entry)
        ? entry.LimitationType == 2          // 服务端给的
        : chart.limitation_type == 2;        // 本地 master 的（Private = 1）

    if (!isOpen) continue;                   // ← 这里被跳过
    music.Item2.Add(new ChartData(chart, entry));

本地 ChartDataMaster 里有 227 首是 `Private`（未配信），服务端目录的 key 又对不上，
于是 isOpen 恒为 false，这些谱面根本不会进入 MusicData —— 选曲列表永远只有 100 首。

修法
----
把 IL787 处的 `brfalse.s` 改成 `nop; nop`（不再跳过），
无论 isOpen 真假都执行 `Add` → 全部 323 首进入列表。

配合 `usr_item` 已下发的全部谱面道具，`PlayerMusicChartAccessControl.GetAccessLevel`
会对这些谱面返回 Playable(20)，所以它们不仅显示，而且能打。

用法
----
    py tools\\patch_music_open.py            # 打补丁
    py tools\\patch_music_open.py --check
    py tools\\patch_music_open.py --revert   # 还原（.orig 是最初的原始 DLL）
"""
import sys
from pathlib import Path

import dnfile
from dncil.cil.body.reader import read_method_body_from_bytes

DLL = Path(__file__).resolve().parent.parent / 'game' / 'svm_Data' / 'managed' / 'game.common.contents.dll'
BAK = DLL.with_name(DLL.name + '.orig')

NOP2 = b'\x00\x00'


def find_target(pe):
    """在 MusicDataQueryMasterUpdater+<UpdateAsync>d__10.MoveNext 里找 `ceq` 后的 brfalse.s。"""
    mt = pe.net.mdtables
    owner = None
    for i, t in enumerate(mt.TypeDef.rows, 1):
        if str(t.TypeName) == 'MusicDataQueryMasterUpdater':
            owner = i
    if not owner:
        return None
    rid = None
    for nc in mt.NestedClass.rows:
        if nc.EnclosingClass.row_index == owner and str(nc.NestedClass.row.TypeName) == '<UpdateAsync>d__10':
            rid = nc.NestedClass.row_index
    if not rid:
        return None
    for m in mt.TypeDef.rows[rid - 1].MethodList:
        row = m.row
        if str(row.Name) != 'MoveNext' or row.Rva == 0:
            continue
        body_off = pe.get_offset_from_rva(row.Rva)
        body = read_method_body_from_bytes(pe.__data__[body_off:body_off + 8192])
        insns = list(body.instructions)
        for i, insn in enumerate(insns):
            if str(insn.opcode) != 'brfalse.s':
                continue
            prev = insns[i - 1] if i else None
            if prev is None or str(prev.opcode) != 'ceq':
                continue
            off = body_off + insn.offset
            if pe.__data__[off] != 0x2C:
                continue
            return off
    return None


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--patch'
    if not DLL.exists():
        print('找不到', DLL)
        return 1
    data = DLL.read_bytes()
    if mode == '--revert':
        if not BAK.exists():
            print('没有备份，无法还原')
            return 1
        with open(DLL, 'r+b') as f:
            f.write(BAK.read_bytes())
        print('已还原原始 DLL（会同时撤销更新器异常补丁，需要重新打）')
        return 0

    # 打上补丁后指令已变成 nop，无法再从当前 DLL 反查出位置，
    # 所以定位一律以 .orig 原始文件为准（幂等的前提）。
    off = None
    for src in (BAK, DLL):
        if src.exists():
            off = find_target(dnfile.dnPE(str(src)))
            if off is not None:
                break
    if off is None:
        print('没找到目标 brfalse.s（游戏版本可能变了）')
        return 1
    patched = data[off:off + 2] == NOP2
    if mode == '--check':
        print('brfalse.s @0x%x -> %s' % (off, 'PATCHED' if patched else 'ORIGINAL'))
        return 0
    if patched:
        print('已经是补丁后的状态')
        return 0
    with open(DLL, 'r+b') as f:
        f.seek(off)
        f.write(NOP2)
    print('已取消「非 Open 谱面跳过」的判断（0x%x → nop nop）' % off)
    print('注意：需要重新启动游戏生效')
    return 0


if __name__ == '__main__':
    sys.exit(main())
