"""音频修复补丁（零依赖版，可在每次启动时静默运行）。

问题：
    游戏 AudioManagerADX.SetExclusiveWASAPI() 会以「独占模式 + 自定义 48kHz 单声道格式」
    初始化 CRI 的 WASAPI 输出。普通声卡/音箱给不出这种独占格式，CRI 初始化直接失败：

        [CRIWARE] Warning:W2024020600:[WASAPI_EXCLUSIVE] Failed to initialize AudioClient.
        (HRESULT = 0x88890008)        # AUDCLNT_E_UNSUPPORTED_FORMAT

    结果是整个游戏静音（换任何输出设备都一样，因为根本不是设备选错）。

修复（两处同长度 IL 改写，不动文件大小、不破坏 PE 结构）：
    1) SetAudioClientShareMode 的实参 ldc.i4.1(0x17) -> ldc.i4.0(0x16)   共享模式
    2) SetAudioClientFormat 的 call(0x28+token)      -> pop; nop*4        用设备默认格式

用法：
    py tools\\patch_audio.py            # 打补丁（幂等，已打过直接返回）
    py tools\\patch_audio.py --check    # 只看状态
    py tools\\patch_audio.py --revert   # 还原
    py tools\\patch_audio.py --quiet    # 静默（给启动脚本用，出错不打印）

卸载/回滚：--revert 会用同目录的 *.dll.orig 覆盖回来。
游戏更新后如果提示「特征码不匹配」，用 dnfile 版的 tools\\patch_audio_shared.py 重新定位。
"""
import sys
from pathlib import Path

DLL = Path(__file__).resolve().parent.parent / 'game' / 'svm_Data' / 'managed' / 'game.common.foundation.dll'
BAK = DLL.with_name(DLL.name + '.orig')

# 原始特征：ldc.i4.1 ; call SetAudioClientShareMode ; ... ; call SetAudioClientFormat
#           0x17       0x28 <token4>                    0x28 <token4>
SHARE_SIG = bytes([0x17, 0x28, 0xE6, 0x01, 0x00, 0x0A])
FMT_SIG = bytes([0x28, 0xE7, 0x01, 0x00, 0x0A])
SHARE_NEW = bytes([0x16, 0x28, 0xE6, 0x01, 0x00, 0x0A])
FMT_NEW = bytes([0x26, 0x00, 0x00, 0x00, 0x00])


def locate(data: bytes):
    """返回 (share_off, fmt_off, patched)；找不到返回 (None, None, False)。"""
    i = data.find(SHARE_SIG)
    if i >= 0:
        j = data.find(FMT_SIG, i)
        return i, (j if j > 0 else None), False
    i = data.find(SHARE_NEW)
    if i >= 0:
        j = data.find(FMT_NEW, i)
        return i, (j if j > 0 else None), True
    return None, None, False


def main():
    argv = [a.lower() for a in sys.argv[1:]]
    quiet = '--quiet' in argv
    say = (lambda *a: None) if quiet else print

    if not DLL.exists():
        say('找不到游戏 DLL：', DLL)
        return 1

    data = DLL.read_bytes()
    share_off, fmt_off, patched = locate(data)

    if share_off is None or fmt_off is None:
        say('[audio] 特征码不匹配，未做修改（游戏版本可能变了）')
        return 0

    def revert():
        if not BAK.exists():
            say('[audio] 没有备份文件，无法还原')
            return 1
        with open(DLL, 'r+b') as f:
            f.write(BAK.read_bytes())
        say('[audio] 已还原原始 DLL')
        return 0

    if '--check' in argv:
        say('[audio]', 'PATCHED（共享模式）' if patched else 'ORIGINAL（独占模式，会静音）')
        say('        share@0x%x  fmt@0x%x' % (share_off, fmt_off))
        return 0

    if '--revert' in argv:
        return revert()

    if patched:
        say('[audio] 已是修复状态，跳过')
        return 0

    if not BAK.exists():
        BAK.write_bytes(data)
        say('[audio] 已备份 ->', BAK.name)

    with open(DLL, 'r+b') as f:
        f.seek(share_off)
        f.write(SHARE_NEW)
        f.seek(fmt_off)
        f.write(FMT_NEW)
    say('[audio] 已改为共享模式 + 设备默认格式（需要重新启动游戏生效）')
    return 0


if __name__ == '__main__':
    sys.exit(main())
