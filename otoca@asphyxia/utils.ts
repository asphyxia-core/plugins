export const now = () => Math.floor(Date.now() / 1000);
export const rand = (n: number) => Math.floor(Math.random() * n);
export const u8 = (v: number) => K.ITEM('u8', v || 0);
export const u32 = (v: number) => K.ITEM('u32', v || 0);
export const bool = (v: boolean) => K.ITEM('bool', !!v);

export function log(method: string, data: any) {
  console.log(`[otoca] ${method} ${JSON.stringify(data)}`);
}
