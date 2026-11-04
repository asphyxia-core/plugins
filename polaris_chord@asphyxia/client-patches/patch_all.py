"""一键检查 / 施加全部本地补丁（幂等，可反复运行）。

三个补丁
--------
1. tools/patch_audio.py               game.common.foundation.dll
   独占 WASAPI + 自定义格式 -> 共享模式 + 设备默认格式（修无声）

2. tools/patch_updater_exception.py   game.common.contents.dll
   屏蔽 NotUpdateContentsUpdaterException（修黑屏）

3. tools/patch_music_open.py          game.common.contents.dll
   取消「非 Open 谱面跳过」，227 首 Private 曲目进入选曲列表（修 100 首上限）

用法
----
    py tools\\patch_all.py            # 施加（已打过则跳过）
    py tools\\patch_all.py --check    # 只看状态，不改文件
    py tools\\patch_all.py --revert   # 全部还原成原始 DLL

注意：还原 contents 的任一补丁都会把另一个一起还原（共用同一个 .orig）。
"""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
STEPS = [
    ('音频(共享模式)', 'patch_audio.py'),
    ('更新器异常屏蔽', 'patch_updater_exception.py'),
    ('曲目全解禁', 'patch_music_open.py'),
]


def run(script, mode):
    cmd = [sys.executable, str(HERE / script)]
    if mode:
        cmd.append(mode)
    p = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    out = (p.stdout or '').strip() or (p.stderr or '').strip()
    return p.returncode, ' | '.join(x.strip() for x in out.splitlines() if x.strip())


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ''
    if mode not in ('', '--check', '--revert'):
        print('用法: py tools\\patch_all.py [--check|--revert]')
        return 2

    tag = {'': '[patch]', '--check': '[check]', '--revert': '[revert]'}[mode]
    bad = 0
    for label, script in STEPS:
        rc, out = run(script, mode)
        mark = 'OK ' if rc == 0 else 'FAIL'
        if rc != 0:
            bad += 1
        print('%s %s %-14s %s' % (tag, mark, label, out))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
