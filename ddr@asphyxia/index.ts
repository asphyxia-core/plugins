import { convcardnumber, eventLog } from "./handlers/common";
import { usergamedata } from "./handlers/usergamedata";
import { usergamedata_recv } from "./handlers/usergamedata_recv";
import { usergamedata_send } from "./handlers/usergamedata_send";
import { CommonOffset, OptionOffset, Profile } from "./models/profile";

export function register() {
  R.GameCode("MDX");

  R.Config("save_option", {
    name: "Save option",
    desc: "Gets the previously set options as they are.",
    default: true,
    type: "boolean"
  });

  R.Route("playerdata.usergamedata_advanced", usergamedata);
  R.Route("playerdata.usergamedata_recv", usergamedata_recv);
  R.Route("playerdata.usergamedata_send", usergamedata_send);

  R.Route("system.convcardnumber", convcardnumber);
  R.Route("eventlog.write", eventLog);

  R.WebUIEvent("updateName", async ({ refid, name }) => {
    let strdata: Profile | string[] = await DB.FindOne<Profile>(refid, { collection: "profile" });

    if (strdata) {
      strdata = strdata.usergamedata.COMMON.strdata.split(",");
      strdata[CommonOffset.NAME] = name;
      await DB.Update<Profile>(refid, { collection: "profile" }, {
        $set: {
          "usergamedata.COMMON.strdata": strdata.join(",")
        }
      });
    }
  });

  R.WebUIEvent("updateWeight", async ({ refid, weight }) => {
    let strdata: Profile | string[] = await DB.FindOne<Profile>(refid, { collection: "profile" });

    if (strdata) {
      strdata = strdata.usergamedata.COMMON.strdata.split(",");
      strdata[CommonOffset.WEIGHT] = weight;
      await DB.Update<Profile>(refid, { collection: "profile" }, {
        $set: {
          "usergamedata.COMMON.strdata": strdata.join(",")
        }
      });
    }
  });

  R.WebUIEvent("updateDisplayCalories", async ({ refid, selected }) => {
    let strdata: Profile | string[] = await DB.FindOne<Profile>(refid, { collection: "profile" });

    if (strdata) {
      strdata = strdata.usergamedata.COMMON.strdata.split(",");
      strdata[CommonOffset.WEIGHT_DISPLAY] = selected;
      await DB.Update<Profile>(refid, { collection: "profile" }, {
        $set: {
          "usergamedata.COMMON.strdata": strdata.join(",")
        }
      });
    }
  });

  R.WebUIEvent("updateArrowSkin", async ({ refid, selected }) => {
    let strdata: Profile | string[] = await DB.FindOne<Profile>(refid, { collection: "profile" });

    if (strdata) {
      strdata = strdata.usergamedata.OPTION.strdata.split(",");
      strdata[OptionOffset.ARROW_SKIN] = selected;
      await DB.Update<Profile>(refid, { collection: "profile" }, {
        $set: {
          "usergamedata.OPTION.strdata": strdata.join(",")
        }
      });
    }
  });

  R.WebUIEvent("updateGuideline", async ({ refid, selected }) => {
    let strdata: Profile | string[] = await DB.FindOne<Profile>(refid, { collection: "profile" });

    if (strdata) {
      strdata = strdata.usergamedata.OPTION.strdata.split(",");
      strdata[OptionOffset.GUIDELINE] = selected;
      await DB.Update<Profile>(refid, { collection: "profile" }, {
        $set: {
          "usergamedata.OPTION.strdata": strdata.join(",")
        }
      });
    }
  });

  R.WebUIEvent("updateFilter", async ({ refid, selected }) => {
    let strdata: Profile | string[] = await DB.FindOne<Profile>(refid, { collection: "profile" });

    if (strdata) {
      strdata = strdata.usergamedata.OPTION.strdata.split(",");
      strdata[OptionOffset.FILTER] = selected;
      await DB.Update<Profile>(refid, { collection: "profile" }, {
        $set: {
          "usergamedata.OPTION.strdata": strdata.join(",")
        }
      });
    }
  });

  R.WebUIEvent("updateJudgmentPriority", async ({ refid, selected }) => {
    let strdata: Profile | string[] = await DB.FindOne<Profile>(refid, { collection: "profile" });

    if (strdata) {
      strdata = strdata.usergamedata.OPTION.strdata.split(",");
      strdata[OptionOffset.COMBO_POSITION] = selected;
      await DB.Update<Profile>(refid, { collection: "profile" }, {
        $set: {
          "usergamedata.OPTION.strdata": strdata.join(",")
        }
      });
    }
  });

  R.WebUIEvent("updateDisplayTiming", async ({ refid, selected }) => {
    let strdata: Profile | string[] = await DB.FindOne<Profile>(refid, { collection: "profile" });

    if (strdata) {
      strdata = strdata.usergamedata.OPTION.strdata.split(",");
      strdata[OptionOffset.FAST_SLOW] = selected;
      await DB.Update<Profile>(refid, { collection: "profile" }, {
        $set: {
          "usergamedata.OPTION.strdata": strdata.join(",")
        }
      });
    }
  });
}
