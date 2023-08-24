let course_db, music_db;
let version_name = ["", "Booth", "Infinite Infection", "Gravity Wars", "Heavenly Haven", "Vividwave", "Exceed Gear"];

let ii = [];
let gw = [];
let hh = [];
let vw = [];
let eg = [];

let special_name = {
    "4":{},
    "5":{
        "13": "U.S.O",
        "14": "",
        "15": "",
        "16": "",
    },
    "6":{
        "13": "BMK2021",
    },
}

function zeroPad(num, places) {
    let zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
}

function getSkillAsset(skill, special_name) {
    // return "static/asset/skill_lv/skill_" + zeroPad(skill, 2) + ".png";
    let t = $('<div>')
    let c = $('<img class="is-50">')

    let p = "";
    if(special_name != undefined){
        p = special_name;
    }
    console.log(p);
    let canvas = document.createElement("canvas");
    canvas.width = 228;
    canvas.height = 66;
    
    loadImage("static/asset/skill_lv/skill_" + zeroPad(skill, 2) + ".png").then(image => {
        let ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);
        ctx.font = "40px course";

        let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop("0.2", "grey");
        gradient.addColorStop("0.5", "white");
        gradient.addColorStop("0.7", "grey");

        ctx.fillStyle = gradient;
        ctx.textAlign = "center";
        ctx.fillText(p, 133, 47);
        c.attr("src", canvas.toDataURL());
    })

    // return t.append(c);
    return c;
}

function getMedalAsset(medal) {
    return "static/asset/mark_" + medal + ".png";
}

function getRateAsset(rate) {
    return "static/asset/skill_num/num_mmscore_" + rate + ".png";
}

function getRate(rate) {
    let rateArray = Array.from(rate.toString());
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

    let c = $('<img class="is-50">');

    let canvas = document.createElement("canvas");
    canvas.width = 188;
    canvas.height = 52;
    
    loadImage(getRateAsset(rateArray[0])).then(image => {
        let ctx = canvas.getContext("2d");
        if(rateArray[0] == 0){
            ctx.globalAlpha = 0.4;
        }else{
            ctx.globalAlpha = 1;
        }
        ctx.drawImage(image, 0, 0);
    }).finally(() => {
        loadImage(getRateAsset(rateArray[1])).then(image => {
            let ctx = canvas.getContext("2d");
            ctx.globalAlpha = 1;
            ctx.drawImage(image, 52, 0);
        }).finally(() => {
            loadImage(getRateAsset(rateArray[2])).then(image => {
                let ctx = canvas.getContext("2d");
                ctx.drawImage(image, 104, 0);
            }).finally(() => {
                loadImage("static/asset/skill_tex_percent.png").then(image => {
                    let ctx = canvas.getContext("2d");
                    ctx.drawImage(image, 156, 24);
                    c.attr("src", canvas.toDataURL());
                })
            })
        })
    })


    // return $('<span>').append(
    //     $('<img>').attr('src', getRateAsset(rateArray[0]))
    //     .attr('style', "height: 50px;")
    // ).append(
    //     $('<img>').attr('src', getRateAsset(rateArray[1]))
    //     .attr('style', "height: 50px;")
    // ).append(
    //     $('<img>').attr('src', getRateAsset(rateArray[2]))
    //     .attr('style', "height: 50px;")
    // ).append(
    //     $('<img>').attr('src', "static/asset/skill_tex_percent.png")
    //     .attr('style', "height: 32px;")
    // ).attr('style', "vertical-align: middle;height:100%;")
    return c;


}

function getSongLevel(musicid, type) {
    let result = music_db["mdb"]["music"].filter(object => object["@id"] == musicid);
    let resultDifficulty = result[0]["difficulty"];
    console.log(result);
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
    console.log(musicid);
    let result = music_db["mdb"]["music"].filter(object => object["@id"] == musicid);
    return result[0]["info"]["title_name"]
        //console.log(result);
}

function getDifficulty(musicid, type) {
    let result = music_db["mdb"]["music"].filter(object => object["@id"] == musicid);
    let inf_ver = result[0]["info"]["inf_ver"]["#text"];
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
                    case "6":
                        return "XCD";
                }
            }
        case 4:
            return "MXM";
    }
}

function loadImage(url) {
    return new Promise(resolve => {
        const image = new Image();
        image.addEventListener('load', () => {
            resolve(image);
        });
        image.src = url; 
    });
}


function getDifficultyAsset(type, level) {
    let t = $('<div>')
    let c = $('<img>')
    
    // ).append(
    //     $('<div>').append(level)
    //     .attr("style", `position:absolute;
    //     text-align:right;
    //     top:1px;
    //     width: 100%;
    //     font-family:\"testfont\";
    //     font-weight:\"bold\";
    //     color:white;`)
    // ).attr("style", "position: relative; width: 100%; contain: size;");


    let canvas = document.createElement("canvas");
    canvas.width = 108;
    canvas.height = 26;
    
    loadImage("static/asset/difficulty/level_small_" + type + ".png").then(image => {
        // return new Promise(resolve => {
        //     let font = new FontFace("number-font", "url(static/asset/css/font/0001.ttf)");
        //     font.load().then(font => {
        //         resolve(image, font);
        //     });
        // })
        let ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);
        ctx.font = "17px testfont";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText(level, 90, 19.3);
        c.attr("src", canvas.toDataURL());
    })
    // .then((image, font) => {
        
    // });

    return t.append(c);
}




function getTrackInfo(track) {
    let currentTrack = {};
    currentTrack.name = getSongName(track.mid);
    currentTrack.mid = track.mid;
    currentTrack.type = getDifficulty(track.mid, track.mty);
    currentTrack.level = getSongLevel(track.mid, track.mty);
    return currentTrack;
}

function getCourseInfo(sid, cid, version) {
    let course = {}
    let courseVersionFiltered = course_db.courseData.filter(function(a) {
        return a.version == version;
    });
    console.log(courseVersionFiltered);
    let courseSeasonFiltered = courseVersionFiltered[0].info.filter(function(a) {
        return a.id == sid;
    });
    console.log(courseSeasonFiltered);
    if (courseSeasonFiltered.length == 0) { //custom 
        course.seasonName = "Custom Season";
        course.skillName = "Custom Skill";
        course.level = 0;
        let tracksInfo = [];

        // for (let i in courseLevelFiltered.tracks) {
        tracksInfo.push(getTrackInfo(
            [{
                mid: 2,
                type: 0
            }, {
                mid: 2,
                type: 0
            }, {
                mid: 2,
                type: 0
            }]
        ));
        // }
        course.tracks = tracksInfo;
        return course;
    }
    course.seasonName = courseSeasonFiltered[0].name;
    let courseLevelFiltered = courseSeasonFiltered[0].courses.filter(function(a) {
        return a.id == cid;
    });
    courseLevelFiltered = courseLevelFiltered[0] ? courseLevelFiltered[0] : 0;
    console.log(courseLevelFiltered);
    course.skillName = courseLevelFiltered.name;
    let tracksInfo = [];
    for (let i in courseLevelFiltered.tracks) {
        tracksInfo.push(getTrackInfo(courseLevelFiltered.tracks[i]));
    }
    course.level = courseLevelFiltered.level;
    course.tracks = tracksInfo;
    console.log(courseLevelFiltered.special_name);
    if(special_name[`${version}`][`${courseLevelFiltered.nameID}`] != undefined){
        course.specialName = special_name[`${version}`][`${courseLevelFiltered.nameID}`];
    }
    console.log(course);
    return course;
}





function setCourseInfo(courseArray) {
    let courseCtx = $('#course_content');
    courseCtx.empty();
    console.log(courseArray);
    for (let i in courseArray) {
        let courseSeason = courseArray[i].sid;
        let cid = courseArray[i].cid;
        let version = courseArray[i].version;
        let score = courseArray[i].score;
        let rate = courseArray[i].rate;
        let info = getCourseInfo(courseSeason, cid, version);
        let clear_medal = courseArray[i].clear;
        let clear_rate = Math.trunc(courseArray[i].rate / 100);
        courseCtx.append(
            $('<div class="column is-half">').append(
                $('<div class="card">').append(
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
                            $('<div class="tile is-ancestor">').append(
                                $('<div class="tile is-vertical">').append(
                                    $('<div class="tile is-parent">').append(
                                        $('<div class="tile is-child">').append(
                                            $('<div class="box">').append(
                                                info.skillName
                                            )
                                        )
                                    )
                                ).append(
                                    $('<div class="tile is-parent">').append(
                                        $('<div class="tile is-child">').append(getSkillAsset(info.level, info.specialName))
                                    ).append(
                                        $('<div class="tile is-child">').append($('<img class="is-50">').attr('src', getMedalAsset(clear_medal)))
                                    ).append(
                                        $('<div class="tile is-child">').append(getRate(clear_rate))
                                    ).attr('style', 'display: flex;align-items: center;width:100%;')
                                ).append(
                                    $('<div class="tile is-parent">').append(
                                        $('<div class="tile is-child is-8" style="font-family:ffff">').append(info.tracks[0].name)
                                    ).append(
                                        $('<div class="tile is-child is-4">').append(
                                            getDifficultyAsset(info.tracks[0].type.toLowerCase(), info.tracks[0].level)
                                        )
                                    )
                                ).append(
                                    $('<div class="tile is-parent">').append(
                                        $('<div class="tile is-child is-8" style="font-family:ffff">').append(info.tracks[1].name)
                                    ).append(
                                        $('<div class="tile is-child is-4">').append(
                                            getDifficultyAsset(info.tracks[1].type.toLowerCase(), info.tracks[1].level)
                                        )
                                    )
                                ).append(
                                    $('<div class="tile is-parent">').append(
                                        $('<div class="tile is-child is-8" style="font-family:ffff">').append(info.tracks[2].name)
                                    ).append(
                                        $('<div class="tile is-child is-4">').append(
                                            getDifficultyAsset(info.tracks[2].type.toLowerCase(), info.tracks[2].level)
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            )
        );
    }
}

function setDataSource(dataSource) {
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
    let profile_data = JSON.parse(document.getElementById("data-pass").innerText);
    profile_data = profile_data.sort(function(a, b) {
        if (a.version > b.version) return 1;
        if (a.version < b.version) return -1;

        if (a.cid > b.cid) return 1;
        if (a.cid < b.cid) return -1;

        if (a.sid > b.sid) return 1;
        if (a.sid < b.sid) return -1;
    });

    for (let i in profile_data) {
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
        let arr = [];
        for (let i in music_db["mdb"]["music"]) {
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