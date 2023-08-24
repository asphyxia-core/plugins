export default (_: EamuseInfo, data: any, send: EamuseSend) => {
  
  const locId = $(data).element("shop").content("locationid");
  console.log({...require("../templates/gameInfos.ts")()}, {depth:null});
  return send.object(
    {
      data: {
        cabid: K.ITEM("u32", 1),
        locationid: K.ITEM("str", locId),
        tax_phase: K.ITEM("u8", 0),
        facility: {
          exist: K.ITEM("u32", 0),
        },

        ...require("../templates/gameInfos.ts")(),
      },
    },
    { compress: true }
  );
};