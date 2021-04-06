export type FixedSizeArray<T, TSize extends number> = [T, ...T[]] & { readonly length: TSize }
export function fillArray<T, TSize extends number>(size: TSize, fillValue: T): FixedSizeArray<T, TSize> {
    return <any>Array(size).fill(fillValue)
}