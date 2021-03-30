export function toFullWidth(s: string): string {
    let resultCharCodes: number[] = []
    for (let i = 0; i < s.length; i++) {
        let cc = s.charCodeAt(i)
        if ((cc >= 33) && (cc <= 126)) resultCharCodes.push(cc + 65281 - 33)
        else if (cc == 32) resultCharCodes.push(12288) // Full-width space
        else resultCharCodes.push(cc)
    }
    return String.fromCharCode(...resultCharCodes)
}
export function toHalfWidth(s: string): string {
    let resultCharCodes: number[] = []
    for (let i = 0; i < s.length; i++) {
        let cc = s.charCodeAt(i)
        if ((cc >= 65281) && (cc <= 65374)) resultCharCodes.push(cc - 65281 + 33)
        else if (cc == 12288) resultCharCodes.push(32) // Full-width space
        else resultCharCodes.push(cc)
    }
    return String.fromCharCode(...resultCharCodes)
}
export function isToday(st: bigint): boolean {
    let now = new Date()
    let today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return (st >= (today.valueOf())) && (st < (tomorrow.valueOf()))
}
export async function log(data: any, file?: string) {
    if (file == null) file = "./log.txt"
    let s = IO.Exists(file) ? await IO.ReadFile(file, "") : ""
    if (typeof data == "string") s += data + "\n"
    else {
        let n = ""
        try {
            n = JSON.stringify(data)
        } catch { }
        s += n + "\n"
    }
    await IO.WriteFile(file, s)
}
export function base64ToBuffer(str: string, size?: number): Buffer {
    if (size != null) {
        let rem = size - Math.trunc(size / 3) * 3
        str = str.replace("=", "A").replace("=", "A").padEnd(Math.trunc(size / 3) * 4 + rem + 1, "A")
        if (rem == 1) str += "=="
        else if (rem == 2) str += "="
        let result = Buffer.alloc(size, str, "base64")
        return result
    }
    else return Buffer.from(str, "base64")
}
export function bufferToBase64(buffer: Buffer, isTrimZero: boolean = true): string {
    if (isTrimZero) for (let i = buffer.length - 1; i >= 0; i--) if (buffer.readInt8(i) != 0) return buffer.toString("base64", 0, i + 1)
    return buffer.toString("base64")
}
export function isHigherVersion(left: string, right: string): boolean {
    let splitedLeft = left.split(".")
    let splitedRight = right.split(".")

    if (parseInt(splitedLeft[0]) < parseInt(splitedRight[0])) return true
    else if (parseInt(splitedLeft[0]) == parseInt(splitedRight[0])) {
        if (parseInt(splitedLeft[1]) < parseInt(splitedRight[1])) return true
        else if (parseInt(splitedLeft[1]) == parseInt(splitedRight[1])) {
            if (parseInt(splitedLeft[2]) < parseInt(splitedRight[2])) return true
        }
    }
    return false
}
