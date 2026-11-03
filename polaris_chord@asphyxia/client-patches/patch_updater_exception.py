"""让内容更新器不再因为「有更新器没更新」而抛异常（黑屏根因）。

背景
----
`ContentsRepository.UpdateContentsUpdaterAsync` 的判定是：

    if (updateCount != 0) {
        if (contentsUpdaters.All(x => updated.Contains(x))) { /* OK */ }
        else {
            var notUpdated = contentsUpdaters.Except(updated);
            if (notUpdated.Any())
                throw new NotUpdateContentsUpdaterException(notUpdated.ToArray());
        }
    }

只要「有任意一个更新器没更新」，就抛异常 → `NotUpdateContentsUpdaterException`
→ `ContentsRepository.FetchAsync` 中断 → 场景加载不出来 → 黑屏。

我们（asphyxia 插件）只能提供曲目数据，其余几类内容更新器永远是「没更新」，
所以只要发 mst_music 就必然黑屏 —— 这与曲目内容无关。

修法
----
把 `notUpdated.Any()` 的结果强制成常量 false，throw 分支永远不执行：

    原:  ldloc.1          (0x11)          ; notUpdated
         call Any         (0x28 + token)  ; -> bool
         brfalse.s ...

    新:  ldc.i4.0         (0x16)          ; 栈上放 false
         nop × 5          (0x00)

指令总长都是 6 字节，IL 布局和分支目标完全不变。

用法
----
    py tools\\patch_updater_exception.py            # 打补丁
    py tools\\patch_updater_exception.py --check    # 只看状态
    py tools\\patch_updater_exception.py --revert   # 还原（用同目录 .dll.orig）
"""
import sys
from pathlib import Path

import dnfile
from dncil.cil.body.reader import read_method_body_from_bytes

DLL = Path(__file__).resolve().parent.parent / 'game' / 'svm_Data' / 'managed' / 'game.common.contents.dll'
BAK = DLL.with_name(DLL.name + '.orig')

NEW = bytes([0x16, 0x00, 0x00, 0x00, 0x00, 0x00])   # ldc.i4.0 + nop*5


def find_body(pe, type_name, method_name):
    mt = pe.net.mdtables
    for t in mt.TypeDef.rows:
        if str(t.TypeName) != type_name:
            continue
        for m in t.MethodList:
            row = m.row
            if str(row.Name) != method_name:
                continue
            if row.Rva == 0:
                return None
            off = pe.get_offset_from_rva(row.Rva)
            header = pe.__data__[off]
            if header & 0x3 == 0x2:      # tiny
                return off, 1
            if header & 0x3 == 0x3:      # fat
                size_flags = int.from_bytes(pe.__data__[off:off + 2], 'little')
                header_size = ((size_flags >> 12) & 0x0F) * 4
                return off, header_size
            return None
    return None


def resolve(pe, token):
    mt = pe.net.mdtables
    tag, rid = token & 0xFF000000, token & 0xFFFFFF
    try:
        if tag == 0x0A000000:
            return str(mt.MemberRef.rows[rid - 1].Name)
        if tag == 0x06000000:
            return str(mt.MethodDef.rows[rid - 1].Name)
        if tag == 0x2B000000:                       # MethodSpec（LINQ 泛型调用走这里）
            row = mt.MethodSpec.rows[rid - 1]
            inner = getattr(row.Method, 'row_index', None)
            table = row.Method.table.__class__.__name__
            if table == 'MethodDef':
                return str(mt.MethodDef.rows[inner - 1].Name)
            if table == 'MemberRef':
                return str(mt.MemberRef.rows[inner - 1].Name)
    except Exception:
        pass
    return ''


def locate(pe):
    """全文件搜 `ldloc.1; call Any; brfalse.s`，并要求紧跟着 throw 区域（newobj 0x73）。

    不用方法体偏移计算（fat header 换算容易错位，之前踩过坑），
    直接按字节模式 + token 解析校验。
    """
    mt = pe.net.mdtables
    data = pe.__data__

    def name(tok):
        tag, rid = tok & 0xFF000000, tok & 0xFFFFFF
        try:
            if tag == 0x0A000000:
                return str(mt.MemberRef.rows[rid - 1].Name)
            if tag == 0x2B000000:
                row = mt.MethodSpec.rows[rid - 1]
                inner = getattr(row.Method, 'row_index', None)
                table = row.Method.table.__class__.__name__
                if table == 'MemberRef':
                    return str(mt.MemberRef.rows[inner - 1].Name)
                if table == 'MethodDef':
                    return str(mt.MethodDef.rows[inner - 1].Name)
        except Exception:
            pass
        return ''

    cands = []
    for o in range(len(data) - 7):
        if data[o] != 0x07 or data[o + 1] != 0x28:      # ldloc.1 ; call
            continue
        if name(int.from_bytes(data[o + 2:o + 6], 'little')) != 'Any':
            continue
        if data[o + 6] != 0x2C:                          # brfalse.s
            continue
        # 后面 24 字节里应有 newobj(0x73) —— 即 throw new NotUpdate...
        tail = data[o + 7:o + 31]
        cands.append((o, 0x73 in tail))
    hits = [c for c in cands if c[1]]
    if len(hits) == 1:
        return hits[0][0]
    if len(cands) == 1:
        return cands[0][0]
    return None


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--patch'
    if not DLL.exists():
        print('找不到', DLL)
        return 1
    # 打上补丁后原指令序列已不存在，无法从当前 DLL 反查位置，
    # 所以定位一律以 .orig 原始文件为准（幂等的前提）。
    ld_off = None
    for src in (BAK, DLL):
        if src.exists():
            ld_off = locate(dnfile.dnPE(str(src)))
            if ld_off is not None:
                break
    if ld_off is None:
        print('没找到目标指令序列（游戏版本可能变了），不做修改')
        return 1
    data = DLL.read_bytes()
    patched = data[ld_off:ld_off + 6] == NEW

    if mode == '--check':
        print('ldloc.1 @0x%x -> %s' % (ld_off,
              'PATCHED' if patched else 'ORIGINAL'))
        return 0
    if mode == '--revert':
        if not BAK.exists():
            print('没有备份，无法还原')
            return 1
        with open(DLL, 'r+b') as f:
            f.write(BAK.read_bytes())
        print('已还原原始 DLL')
        return 0
    if patched:
        print('已经是补丁后的状态')
        return 0
    if not BAK.exists():
        BAK.write_bytes(data)
        print('已备份 ->', BAK.name)
    with open(DLL, 'r+b') as f:
        f.seek(ld_off)
        f.write(NEW)
    print('已屏蔽 NotUpdateContentsUpdaterException 的抛出（需要重新启动游戏）')
    return 0


if __name__ == '__main__':
    sys.exit(main())
