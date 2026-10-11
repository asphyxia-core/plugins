$("#version").on("change", function () {
  $.ajax({
    type: "post",
    url: "/emit/iidxGetSetting",
    data: {
      refid: refid,
      version: this.value,
    },
    dataType: "text",
    success: function (result) {
      let data = JSON.parse(result);

      if (data["custom"] == null) {
        alert("Theres no customize data available on this version!");
        return;
      }

      $("#frame").val(data["custom"].frame);
      $("#turntable").val(data["custom"].turntable);
      $("#note_burst").val(data["custom"].note_burst);
      $("#menu_music").val(data["custom"].menu_music);
      $("#lane_cover").val(data["custom"].lane_cover);
      $("#category_vox").val(data["custom"].category_vox);
      $("#note_skin").val(data["custom"].note_skin);
      $("#full_combo_splash").val(data["custom"].full_combo_splash);
      $("#note_beam").val(data["custom"].note_beam);
      $("#judge_font").val(data["custom"].judge_font);
      $("#disable_musicpreview").prop("checked", data["custom"].disable_musicpreview);
      $("#pacemaker_cover").val(data["custom"].pacemaker_cover);
      $("#vefx_lock").prop("checked", data["custom"].vefx_lock);
      $("#effect").val(data["custom"].effect);
      $("#bomb_size").val(data["custom"].bomb_size);
      $("#disable_hcn_color").prop("checked", data["custom"].disable_hcn_color);
      $("#first_note_preview").prop("checked", Number(data["custom"].first_note_preview) === 1);

      if (data["custom"].note_size == undefined) $("#note_size").val(0);
      else $("#note_size").val(data["custom"].note_size);
      if (data["custom"].lift_cover == undefined) $("#lift_cover").val(0);
      else $("#lift_cover").val(data["custom"].lift_cover);
      if (data["custom"].note_beam_size == undefined) $("#note_beam_size").val(0);
      else $("#note_beam_size").val(data["custom"].note_beam_size);
      if (data["custom"].cn_color == undefined) $("#cn_color").val(0);
      else $("#cn_color").val(data["custom"].cn_color);
      if (data["custom"].cn_size == undefined) $("#cn_size").val(0);
      else $("#cn_size").val(data["custom"].cn_size);

      $("#rank_folder").prop("checked", data["custom"].rank_folder);
      $("#clear_folder").prop("checked", data["custom"].clear_folder);
      $("#diff_folder").prop("checked", data["custom"].diff_folder);
      $("#alpha_folder").prop("checked", data["custom"].alpha_folder);
      $("#rival_folder").prop("checked", data["custom"].rival_folder);
      $("#rival_battle_folder").prop("checked", data["custom"].rival_battle_folder);
      $("#rival_info").prop("checked", data["custom"].rival_info);
      $("#hide_playcount").prop("checked", data["custom"].hide_playcount);
      $("#disable_graph_cutin").prop("checked", data["custom"].disable_graph_cutin);
      $("#classic_hispeed").prop("checked", data["custom"].classic_hispeed);
      $("#rival_played_folder").prop("checked", data["custom"].rival_played_folder);
      $("#hide_iidxid").prop("checked", data["custom"].hide_iidxid);

      if (data["custom"].disable_beginner_option == undefined) $("#disable_beginner_option").prop("checked", false);
      else $("#disable_beginner_option").prop("checked", data["custom"].disable_beginner_option);

      $("#qpro_head").val(data["custom"].qpro_head);
      $("#qpro_hair").val(data["custom"].qpro_hair);
      $("#qpro_hand").val(data["custom"].qpro_hand);
      $("#qpro_face").val(data["custom"].qpro_face);
      $("#qpro_body").val(data["custom"].qpro_body);

      if (data["custom"].qpro_back == undefined) $("#qpro_back").val(0);
      else $("#qpro_back").val(data["custom"].qpro_back);

      if (data["lm_custom"] == null) {
        $("#lm_skin").val(0);
        $("#lm_bg").val(0);
        $("#lm_bg_2").val(0);
        $("#lm_entry_bg").val(0);
        $("#lm_entry_bg_bright").val(0);
      } else {
        $("#lm_skin").val(data["lm_custom"].premium_skin);
        $("#lm_bg").val(data["lm_custom"].premium_bg);

        if (data["lm_custom"].premium_bg_concent == undefined) $("#lm_bg_2").val(0);
        else $("#lm_bg_2").val(data["lm_custom"].premium_bg_concent);
        if (data["lm_custom"].entry_bg == undefined) $("#lm_entry_bg").val(0);
        else $("#lm_entry_bg").val(data["lm_custom"].entry_bg);
        if (data["lm_custom"].entry_bg_brightness == undefined) $("#lm_entry_bg_bright").val(0);
        else $("#lm_entry_bg_bright").val(data["lm_custom"].entry_bg_brightness);
      }
    },
    error: function () {
      alert("Unable to process data");
    }
  });
});
