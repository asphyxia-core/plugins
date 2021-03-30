export namespace UtilityHandlersCommon {
    export const WriteShopInfo: EPR = async (__, ___, send) => {
        let result = {
            sinfo: {
                lid: K.ITEM("str", "ea"),
                nm: K.ITEM("str", "Asphyxia shop"),
                cntry: K.ITEM("str", "Japan"),
                rgn: K.ITEM("str", "1"),
                prf: K.ITEM("s16", 13),
                cl_enbl: K.ITEM("bool", 0),
                cl_h: K.ITEM("u8", 8),
                cl_m: K.ITEM("u8", 0)
            }
        }
        send.object(result)
    }
}