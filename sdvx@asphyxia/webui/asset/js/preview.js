function zeroPad(num, places) {
    var zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
}

;
(function($) {
    $.preload = function() {
        var imgs = Object.prototype.toString.call(arguments[0]) === '[object Array]' ?
            arguments[0] : arguments;

        var tmp = [];
        var i = imgs.length;

        // reverse loop run faster
        for (; i--;) tmp.push($('<img />').attr('src', imgs[i]));
    };
})(jQuery);

$('#nemsys_select').change(function() {
    $('#nemsys_pre').fadeOut(200, () => {
        if ($('#nemsys_select').val() != 30) {
            $('#nemsys_pre').attr("src", "static/asset/nemsys/nemsys_" + zeroPad($('#nemsys_select').val(), 4) + ".png");
        } else {
            $('#nemsys_pre').attr("src", "static/asset/nemsys/nemsys_aprilfool.png");
        }

    });
    $('#nemsys_pre').fadeIn(200);
});

$('[name="subbg"]').change(function() {
    $('#sub_pre').fadeOut(200, () => { $('#sub_pre').attr("src", "static/asset/submonitor_bg/subbg_" + zeroPad($('[name="subbg"]').val(), 4) + ".png"); });
    $('#sub_pre').fadeIn(200);
});

$('[name="bgm"]').change(function() {
    $('#custom_0').attr("src", "static/asset/audio/custom_" + zeroPad($('[name="bgm"]').val(), 2) + "/0.mp3");
    $('#custom_1').attr("src", "static/asset/audio/custom_" + zeroPad($('[name="bgm"]').val(), 2) + "/1.mp3");
    if ($('[name="bgm"]').val() == 99) {
        $('#custom_0').attr("src", "static/asset/audio/special_00/0.m4a");
        $('#custom_1').attr("src", "static/asset/audio/custom_00/1.m4a");
    }
    $('#custom_0').prop("volume", 0.5);
    $('#custom_1').prop("volume", 0.2);

    $('#play_sel').animate({ 'opacity': 0 }, 200, function() {
        $(this).text('Play').animate({ 'opacity': 1 }, 200);
    });
    play_sel = false;

    $('#play_bgm').animate({ 'opacity': 0 }, 200, function() {
        $(this).text('Play').animate({ 'opacity': 1 }, 200);
    });

    play_bgm = false;
});

var testcurrent = 2.8;



$('[name="stampA"]').change(function() {
    $('#a_pre').fadeOut(200, () => {
        var stamp = $('[name="stampA"]').val();
        if (stamp == 0) {
            $('#a_pre').attr("src", "static/asset/nostamp.png");
        } else {
            var group = Math.trunc((stamp - 1) / 4 + 1);
            var item = stamp % 4;
            if (item == 0) item = 4;
            $('#a_pre').attr("src", "static/asset/chat_stamp/stamp_" + zeroPad(group, 4) + "/stamp_" + zeroPad(group, 4) + "_" + zeroPad(item, 2) + ".png");
        }
    });
    $('#a_pre').fadeIn(200);
});

$('[name="stampB"]').change(function() {
    $('#b_pre').fadeOut(200, () => {
        var stamp = $('[name="stampB"]').val();
        if (stamp == 0) {
            $('#b_pre').attr("src", "static/asset/nostamp.png");
        } else {
            var group = Math.trunc((stamp - 1) / 4 + 1);
            var item = stamp % 4;
            if (item == 0) item = 4;
            $('#b_pre').attr("src", "static/asset/chat_stamp/stamp_" + zeroPad(group, 4) + "/stamp_" + zeroPad(group, 4) + "_" + zeroPad(item, 2) + ".png");
        }
    });
    $('#b_pre').fadeIn(200);
});

$('[name="stampC"]').change(function() {
    $('#c_pre').fadeOut(200, () => {
        var stamp = $('[name="stampC"]').val();
        if (stamp == 0) {
            $('#c_pre').attr("src", "static/asset/nostamp.png");
        } else {
            var group = Math.trunc((stamp - 1) / 4 + 1);
            var item = stamp % 4;
            if (item == 0) item = 4;
            $('#c_pre').attr("src", "static/asset/chat_stamp/stamp_" + zeroPad(group, 4) + "/stamp_" + zeroPad(group, 4) + "_" + zeroPad(item, 2) + ".png");
        }
    });
    $('#c_pre').fadeIn(200);
});

$('[name="stampD"]').change(function() {
    $('#d_pre').fadeOut(200, () => {
        var stamp = $('[name="stampD"]').val();
        if (stamp == 0) {
            $('#d_pre').attr("src", "static/asset/nostamp.png");
        } else {
            var group = Math.trunc((stamp - 1) / 4 + 1);
            var item = stamp % 4;
            if (item == 0) item = 4;
            $('#d_pre').attr("src", "static/asset/chat_stamp/stamp_" + zeroPad(group, 4) + "/stamp_" + zeroPad(group, 4) + "_" + zeroPad(item, 2) + ".png");
        }
    });
    $('#d_pre').fadeIn(200);
});
var profile_data, database;
var play_bgm = false;
var play_sel = false;
$(document).ready(function() {
    profile_data = JSON.parse(document.getElementById("data-pass").innerText);

    $.getJSON("static/asset/json/data.json", function(json) {
        database = json;

        //console.log(json); // this will show the info it in firebug console
        //console.log(profile_data);

        for (var i in json["nemsys"]) {
            $('#nemsys_select').append($('<option>', {
                value: json["nemsys"][i].value,
                text: json["nemsys"][i].name,
            }));
            var image = new Image();
            if (json["nemsys"][i].value != 30) {
                image.src = "static/asset/nemsys/nemsys_" + zeroPad(json["nemsys"][i].value, 4) + ".png";
            } else {
                image.src = "static/asset/nemsys/nemsys_aprilfool.png";
            }
            //console.log(profile_data["nemsys"])
        }
        $('#nemsys_select').val(profile_data["nemsys"]);

        for (var i in json["subbg"]) {
            $('[name="subbg"]').append($('<option>', {
                value: json["subbg"][i].value,
                text: json["subbg"][i].name,
            }));
            var image = new Image();
            image.src = "static/asset/submonitor_bg/subbg_" + zeroPad(json["subbg"][i].value, 4) + ".png";
            // console.log(image);
            //console.log(profile_data["subbg"])
        }
        $('[name="subbg"]').val(profile_data["subbg"]);

        for (var i in json["bgm"]) {
            $('[name="bgm"]').append($('<option>', {
                value: json["bgm"][i].value,
                text: json["bgm"][i].name,
            }));
            var audio = new Audio();
            var audio1 = new Audio();
            if (json["bgm"][i].value == 99) {
                audio.src = "static/asset/audio/special_00/0.mp3"
            } else {
                audio.src = "static/asset/audio/custom_" + zeroPad(json["bgm"][i].value, 2) + "/0.mp3"
                audio1.src = "static/asset/audio/custom_" + zeroPad(json["bgm"][i].value, 2) + "/1.mp3"
            }

            //console.log(profile_data["bgm"])
        }
        $('[name="bgm"]').val(profile_data["bgm"]);

        for (var i in json["akaname"]) {
            $('[name="akaname"]').append($('<option>', {
                value: json["akaname"][i].value,
                text: json["akaname"][i].name,
            }));
            //console.log(profile_data["akaname"])
        }
        $('[name="akaname"]').val(profile_data["akaname"]);

        for (var i in json["stamp"]) {
            $('[name="stampA"]').append($('<option>', {
                value: json["stamp"][i].value,
                text: json["stamp"][i].name,
            }));
            $('[name="stampA"]').val(profile_data["stampA"]);

            $('[name="stampB"]').append($('<option>', {
                value: json["stamp"][i].value,
                text: json["stamp"][i].name,
            }));
            $('[name="stampB"]').val(profile_data["stampB"]);

            $('[name="stampC"]').append($('<option>', {
                value: json["stamp"][i].value,
                text: json["stamp"][i].name,
            }));
            $('[name="stampC"]').val(profile_data["stampC"]);

            $('[name="stampD"]').append($('<option>', {
                value: json["stamp"][i].value,
                text: json["stamp"][i].name,
            }));
            $('[name="stampD"]').val(profile_data["stampD"]);
            var group = Math.trunc((json["stamp"][i].value - 1) / 4 + 1);
            var item = json["stamp"][i].value % 4;
            if (item == 0) item = 4;
            var image = new Image();

            image.src = "static/asset/chat_stamp/stamp_" + zeroPad(group, 4) + "/stamp_" + zeroPad(group, 4) + "_" + zeroPad(item, 2) + ".png";
        }
    });


    if (profile_data["nemsys"] != 30) {
        $('#nemsys_pre').attr("src", "static/asset/nemsys/nemsys_" + zeroPad(profile_data["nemsys"], 4) + ".png");
    } else {
        $('#nemsys_pre').attr("src", "static/asset/nemsys/nemsys_aprilfool.png");
    }

    $('#sub_pre').attr("src", "static/asset/submonitor_bg/subbg_" + zeroPad(profile_data["subbg"], 4) + ".png");
    $('#custom_0').attr("src", "static/asset/audio/custom_" + zeroPad(profile_data["bgm"], 2) + "/0.mp3");
    $('#custom_1').attr("src", "static/asset/audio/custom_" + zeroPad(profile_data["bgm"], 2) + "/1.mp3");
    $('#custom_0').prop("volume", 0.5);
    $('#custom_1').prop("volume", 0.2);

    var stamp = profile_data["stampA"];
    if (stamp == 0) {
        $('#a_pre').attr("src", "static/asset/nostamp.png");
    } else {
        var group = Math.trunc((stamp - 1) / 4 + 1);
        var item = stamp % 4;
        if (item == 0) item = 4;
        $('#a_pre').attr("src", "static/asset/chat_stamp/stamp_" + zeroPad(group, 4) + "/stamp_" + zeroPad(group, 4) + "_" + zeroPad(item, 2) + ".png");
    }
    stamp = profile_data["stampB"];
    if (stamp == 0) {
        $('#b_pre').attr("src", "static/asset/nostamp.png");
    } else {
        var group = Math.trunc((stamp - 1) / 4 + 1);
        var item = stamp % 4;
        if (item == 0) item = 4;
        $('#b_pre').attr("src", "static/asset/chat_stamp/stamp_" + zeroPad(group, 4) + "/stamp_" + zeroPad(group, 4) + "_" + zeroPad(item, 2) + ".png");
    }
    stamp = profile_data["stampC"];
    if (stamp == 0) {
        $('#c_pre').attr("src", "static/asset/nostamp.png");
    } else {
        var group = Math.trunc((stamp - 1) / 4 + 1);
        var item = stamp % 4;
        if (item == 0) item = 4;
        $('#c_pre').attr("src", "static/asset/chat_stamp/stamp_" + zeroPad(group, 4) + "/stamp_" + zeroPad(group, 4) + "_" + zeroPad(item, 2) + ".png");
    }
    stamp = profile_data["stampD"];
    if (stamp == 0) {
        $('#d_pre').attr("src", "static/asset/nostamp.png");
    } else {
        var group = Math.trunc((stamp - 1) / 4 + 1);
        var item = stamp % 4;
        if (item == 0) item = 4;
        $('#d_pre').attr("src", "static/asset/chat_stamp/stamp_" + zeroPad(group, 4) + "/stamp_" + zeroPad(group, 4) + "_" + zeroPad(item, 2) + ".png");
    }

    $('#bgm_pre').append(
        $('<div class="buttons">').append(
            $('<button class="button is-primary" type="button" id="play_bgm">')
            .append("Play")
            .click(function() {
                if (play_bgm) {
                    $('#custom_0').trigger('pause');
                    $('#play_bgm').animate({ 'opacity': 0 }, 200, function() {
                        $(this).text('Play').animate({ 'opacity': 1 }, 200);
                    });
                    play_bgm = false;
                } else {
                    $('#custom_0').trigger('play');

                    $('#play_bgm').animate({ 'opacity': 0 }, 200, function() {
                        $(this).text('Pause').animate({ 'opacity': 1 }, 200);
                    });
                    play_bgm = true;
                }
            })
        )
    )

    $('#sel_pre').append(
        $('<div class="buttons">').append(
            $('<button class="button is-primary" type="button" id="play_sel">')
            .append("Play")
            .click(function() {
                if (play_sel) {
                    $('#custom_1').trigger('pause');
                    $('#play_sel').animate({ 'opacity': 0 }, 200, function() {
                        $(this).text('Play').animate({ 'opacity': 1 }, 200);
                    });
                    play_sel = false;
                } else {
                    $('#custom_1').trigger('play');

                    $('#play_sel').animate({ 'opacity': 0 }, 200, function() {
                        $(this).text('Pause').animate({ 'opacity': 1 }, 200);
                    });
                    play_sel = true;
                }
            })
        )
    )

    $('#custom_0').on('ended', function() {
        $('#custom_0').currentTime = 0;
        $('#play_bgm').animate({ 'opacity': 0 }, 200, function() {
            $(this).text('Play').animate({ 'opacity': 1 }, 200);
        });

        play_bgm = false;
    });

    $('#custom_1').on('ended', function() {
        $('#custom_1').currentTime = 0;
        $('#play_sel').animate({ 'opacity': 0 }, 200, function() {
            $(this).text('Play').animate({ 'opacity': 1 }, 200);
        });
        play_sel = false;
    });

    $('#custom_0').on('timeupdate', function() {
        var currentTime = parseInt($('#custom_0').prop('currentTime'));
        var duration = parseInt($('#custom_0').prop('duration'));
        var percent = currentTime / duration * 100;

    });

    $('#custom_1').on('timeupdate', function() {
        var currentTime = parseInt($('#custom_1').prop('currentTime'));
        var duration = parseInt($('#custom_1').prop('duration'));
        var percent = currentTime / duration * 100;


    });
})