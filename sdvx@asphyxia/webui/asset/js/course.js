var course_db, music_db;
var version_name = ["", "Booth", "Infinite Infection", "Gravity Wars", "Heavenly Haven", "Vividwave", "Exceed Gear"];

var ii = [];
var gw = [];
var hh = [];
var vw = [];
var eg = [];

function zeroPad(num, places) {
    var zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
}

function getSkillAsset(skill) {
    return "static/asset/skill_lv/skill_" + zeroPad(skill, 2) + ".png";
}

function getMedalAsset(medal) {
    return "static/asset/mark_" + medal + ".png";
}

function getRateAsset(rate) {
    return "static/asset/skill_num/num_mmscore_" + rate + ".png";
}

function getRate(rate) {
    var rateArray = Array.from(rate.toString());
    switch (rateArray.length) {
        case 1:
            rateArray[2] = rateArray[0];
            rateArray[0] = rateArray[1] = 0;
            break;
        case 2:
            rateArray[2] = rateArray[1];
            rateArray[1] = rateArray[0];
            rateArray[0] = 0;
            break;
    }
    return $('<span>').append(
        $('<img>').attr('src', getRateAsset(rateArray[0]))
        .attr('style', "height: 30px;")
    ).append(
        $('<img>').attr('src', getRateAsset(rateArray[1]))
        .attr('style', "height: 30px;")
    ).append(
        $('<img>').attr('src', getRateAsset(rateArray[2]))
        .attr('style', "height: 30px;")
    ).append(
        $('<img>').attr('src', "static/asset/skill_tex_percent.png")
        .attr('style', "height: 20px;")
    ).attr('style', "vertical-align: middle;height:100%;")



}

function getSongLevel(musicid, type) {
    var result = music_db["mdb"]["music"].filter(object => object["@id"] == musicid);
    var resultDifficulty = result[0]["difficulty"];
    switch (type) {
        case 0:
            return resultDifficulty["novice"]["difnum"]["#text"];
        case 1:
            return resultDifficulty["advanced"]["difnum"]["#text"];
        case 2:
            return resultDifficulty["exhaust"]["difnum"]["#text"];
        case 3:
            return resultDifficulty["infinite"]["difnum"]["#text"];
        case 4:
            return resultDifficulty["maximum"]["difnum"]["#text"];
    }
    //console.log(result);
}

function getSongName(musicid) {
    //console.log(music_db["mdb"]["music"])
    //console.log(musicid+" "+type);
    var result = music_db["mdb"]["music"].filter(object => object["@id"] == musicid);
    return result[0]["info"]["title_name"]
        //console.log(result);
}

function getDifficulty(musicid, type) {
    var result = music_db["mdb"]["music"].filter(object => object["@id"] == musicid);
    var inf_ver = result[0]["info"]["inf_ver"]["#text"];
    console.log([type, inf_ver]);
    switch (type) {
        case 0:
            return "NOV";
        case 1:
            return "ADV";
        case 2:
            return "EXH";
        case 3:
            {
                switch (inf_ver) {
                    case "2":
                        return "INF";
                    case "3":
                        return "GRV";
                    case "4":
                        return "HVN";
                    case "5":
                        return "VVD";
                }
            }
        case 4:
            return "MXM";
    }
}

function getDifficultyAsset(type, level) {
    //var diff = getDifficulty(musicid, type); //.toLowerCase();
    //return "static/asset/difficulty/level_small_" + diff + ".png";
    var t = $('<div>').append(
        $('<img>').attr("src", "static/asset/difficulty/level_small_" + type + ".png")
        //.attr("style", "position: relative; width: 100%;")
    ).append(
        $('<div>').append(level)
        .attr("style", "position:absolute;text-align:right;top:1px;width: 100%;padding: 0 1em 0 0;font-family:\"testfont\";font-weight:\"bold\";color:white;")
    ).attr("style", "position: relative; width: 100%;");

    return t;
}




function getTrackInfo(track) {
    var currentTrack = {};
    currentTrack.name = getSongName(track.mid);
    currentTrack.mid = track.mid;
    currentTrack.type = getDifficulty(track.mid, track.mty);
    currentTrack.level = getSongLevel(track.mid, track.mty);
    return currentTrack;
}

function getCourseInfo(sid, cid, version) {
    var course = {}
    var courseVersionFiltered = course_db.courseData.filter(function(a) {
        return a.version == version;
    });
    console.log(courseVersionFiltered);
    var courseSeasonFiltered = courseVersionFiltered[0].info.filter(function(a) {
        return a.id == sid;
    });
    console.log(courseSeasonFiltered);
    if (courseSeasonFiltered.length == 0) { //custom 
        course.seasonName = "Custom Season";
        course.skillName = "Custom Skill";
        course.level = 0;
        var tracksInfo = [];

        for (var i in courseLevelFiltered.tracks) {
            tracksInfo.push(getTrackInfo(
                [{
                    mid: 1,
                    type: 0
                }, {
                    mid: 1,
                    type: 0
                }, {
                    mid: 1,
                    type: 0
                }]
            ));
        }
        course.tracks = tracksInfo;
        return course;
    }
    course.seasonName = courseSeasonFiltered[0].name;
    var courseLevelFiltered = courseSeasonFiltered[0].courses.filter(function(a) {
        return a.id == cid;
    });
    courseLevelFiltered = courseLevelFiltered[0] ? courseLevelFiltered[0] : 0;
    console.log(courseLevelFiltered);
    course.skillName = courseLevelFiltered.name;
    var tracksInfo = [];
    for (var i in courseLevelFiltered.tracks) {
        tracksInfo.push(getTrackInfo(courseLevelFiltered.tracks[i]));
    }
    course.level = courseLevelFiltered.level;
    course.tracks = tracksInfo;
    console.log(course.tracks);
    return course;
}





function setCourseInfo(courseArray) {
    var courseCtx = $('#course_content');
    courseCtx.empty();
    console.log(courseArray);
    for (var i in courseArray) {
        var courseSeason = courseArray[i].sid;
        var cid = courseArray[i].cid;
        var version = courseArray[i].version;
        var score = courseArray[i].score;
        var rate = courseArray[i].rate;
        var info = getCourseInfo(courseSeason, cid, version);
        var clear_medal = courseArray[i].clear;
        var clear_rate = Math.trunc(courseArray[i].rate / 100);
        //var inner = $('div').append(info)
        courseCtx.append(
            $('<div class="card  is-inlineblocked">').append(
                $('<div class="card-header">').append(
                    $('<p class="card-header-title">').append(
                        $('<span class="icon">').append(
                            $('<i class="mdi mdi-account-edit">')
                        )
                    ).append(info.seasonName)
                )
            ).append(
                $('<div class="card-content">').append(
                    $('<div class="course-content">').append(
                        $('<table class="is-center">').append(
                            $('<tr>').append(
                                $('<td>').append(info.skillName)
                            )
                        )
                        .append(
                            $('<tr>').append(
                                $('<td>').append( //info.level
                                    $('<img>').attr('src', getSkillAsset(info.level))
                                ).append(
                                    $('<img>').attr('src', getMedalAsset(clear_medal))
                                ).append(
                                    getRate(clear_rate)
                                ).attr('style', 'display: inline-flex;align-items: center;width:100%;')
                            )
                        ).attr('style', "table-color:#00000000")
                    ).append(
                        $('<table class="is-borderless">').append(
                            $('<tr>').append(
                                $('<td>').append(
                                    $('<div style="vertical-align: top;">').append(
                                        $('<div style="width:80%;display:inline-block;vertical-align: center;font-family:ffff">')
                                        .append(info.tracks[0].name)

                                    )
                                    .append(
                                        $('<div style="width:20%;display:inline-block;vertical-align: center;">')
                                        .append(getDifficultyAsset(info.tracks[0].type.toLowerCase(), info.tracks[0].level)) //.append(info.tracks[0].level)
                                        //.css('background-image', 'url(' + "static/asset/difficulty/level_small_" + info.tracks[0].type.toLowerCase() + ".png" + ')')
                                    )
                                ).attr('style', "padding:1em 2em")
                            )
                        ).append(
                            $('<tr>').append(
                                $('<td>').append(
                                    $('<div style="vertical-align: top;">').append(
                                        $('<div style="width:80%;display:inline-block;vertical-align: center;font-family:ffff">')
                                        .append(info.tracks[1].name)
                                    )
                                    .append(
                                        $('<div style="width:20%;display:inline-block;vertical-align: center;">')
                                        .append(getDifficultyAsset(info.tracks[1].type.toLowerCase(), info.tracks[1].level)) //.append(info.tracks[1].level)
                                        //.css('background-image', 'url(' + "static/asset/difficulty/level_small_" + info.tracks[1].type.toLowerCase() + ".png" + ')')
                                    )
                                ).attr('style', "padding:1em 2em")
                            )
                        ).append(
                            $('<tr>').append(
                                $('<td>').append(
                                    $('<div style="vertical-align: top;">').append(
                                        $('<div style="width:80%;display:inline-block;vertical-align: center;font-family:ffff">')
                                        .append(info.tracks[2].name)
                                    )
                                    .append(
                                        $('<div style="width:20%;display:inline-block;vertical-align: center;">')
                                        .append(getDifficultyAsset(info.tracks[2].type.toLowerCase(), info.tracks[2].level)) //info.tracks[2].level)
                                        //.css('background-image', 'url(' + "static/asset/difficulty/level_small_" + info.tracks[2].type.toLowerCase() + ".png" + ')')
                                    )
                                ).attr('style', "padding:1em 2em")
                            )
                        )
                    ).attr('style', "table-color:#00000000")
                )
            )
        );
        // $('<div>').append(
        //     $('<div>').append("Season Name: " + info.seasonName)
        // ).append(
        //     $('<div>').append("Course Name: " + info.skillName)
        // ).append(
        //     $('<div>').append("Clear Mark: " + clear_medal)
        // ).append(
        //     $('<div>').append("Tracks: ").append(
        //         $('<div>').append('&emsp;' + info.tracks[0].name + info.tracks[0].type + info.tracks[0].level)
        //     ).append(
        //         $('<div>').append('&emsp;' + info.tracks[1].name + info.tracks[1].type + info.tracks[1].level)
        //     ).append(
        //         $('<div>').append('&emsp;' + info.tracks[2].name + info.tracks[2].type + info.tracks[2].level)
        //     )
        // ));
        //console.log("SET");
    }
    //console.log(content);
}

function setDataSource(dataSource) {
    //console.log("currentDATA" + dataSource);
    switch (parseInt(dataSource)) {
        case 2:
            setCourseInfo(ii);
            break;
        case 3:
            setCourseInfo(gw);
            break;
        case 4:
            setCourseInfo(hh);
            break;
        case 5:
            setCourseInfo(vw);
            break;
        case 6:
            setCourseInfo(eg);
            break;
    }
}

$('#version_select').change(function() {
    $('#course_content').fadeOut(200, () => {
        console.log("change version select");
        setDataSource($('#version_select').val());
    });
    $('#course_content').fadeIn(200);
});




$(document).ready(function() {
    var profile_data = JSON.parse(document.getElementById("data-pass").innerText);
    profile_data = profile_data.sort(function(a, b) {
        if (a.version > b.version) return 1;
        if (a.version < b.version) return -1;

        if (a.cid > b.cid) return 1;
        if (a.cid < b.cid) return -1;

        if (a.sid > b.sid) return 1;
        if (a.sid < b.sid) return -1;
    });

    for (var i in profile_data) {
        switch (profile_data[i].version) {
            case 2:
                ii.push(profile_data[i]);
                continue;
            case 3:
                gw.push(profile_data[i]);
                continue;
            case 4:
                hh.push(profile_data[i]);
                continue;
            case 5:
                vw.push(profile_data[i]);
                continue;
            case 6:
                eg.push(profile_data[i]);
                continue;
        }
    }

    //console.log(profile_data);
    //$('#music_score').DataTable();

    $.when(
        $.getJSON("static/asset/json/music_db.json", function(json) {
            music_db = json;
        }),
        $.getJSON("static/asset/json/course_data.json", function(json) {
            course_db = json;
        })
    ).then(function() {
        var arr = [];
        for (var i in music_db["mdb"]["music"]) {
            arr.push(music_db["mdb"]["music"][i]["info"]["title_name"]);
        }
        console.log(arr);
        $('#version_select').val(6);
        setDataSource($('#version_select').val());
    })

    // $.getJSON("static/asset/json/music_db.json", function(json) {
    //     music_db = json;
    // });
    // $.getJSON("static/asset/json/course_data.json", function(json) {
    //     course_db = json;
    //     console.log(course_db);

    // });

})