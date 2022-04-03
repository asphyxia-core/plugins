var music_db, course_db, score_db, data_db, appeal_db;
var volforceArray = [];
var profile_data, skill_data;
var baseTBodyCMpD, baseTBodyCMpL, baseTBodyGpD, baseTBodyGpL, baseTBodyASpL;
var notFirst = false;
var versionText = ['', 'BOOTH', 'INFINTE INFECTION', 'GRAVITY WARS', 'HEAVENLY HAVEN', 'VIVIDWAVE', 'EXCEED GEAR']

function createArray(length) {
    var arr = new Array(length || 0),
        i = length;
    arr.fill(0);
    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while (i--) arr[length - 1 - i] = createArray.apply(this, args);
    }

    return arr;
}

function zeroPad(num, places) {
    var zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
}


function getSkillAsset(skill) {
    return "static/asset/skill_lv/skill_" + zeroPad(skill, 2) + ".png";
}

function getGrade(grade) {
    switch (grade) {
        case 0:
            return 0;
        case 1:
            return 0.80;
        case 2:
            return 0.82;
        case 3:
            return 0.85;
        case 4:
            return 0.88;
        case 5:
            return 0.91;
        case 6:
            return 0.94;
        case 7:
            return 0.97;
        case 8:
            return 1.00;
        case 9:
            return 1.02;
        case 10:
            return 1.05;
    }
}

function getMedal(clear) {
    switch (clear) {
        case 0:
            return 0;
        case 1:
            return 0.5;
        case 2:
            return 1.0;
        case 3:
            return 1.02;
        case 4:
            return 1.05;
        case 5:
            return 1.10;
    }
}

function getAppealCard(appeal) {

    var result = appeal_db["appeal_card_data"]["card"].filter(object => object["@id"] == appeal);
    return "static/asset/ap_card/" + result[0]["info"]["texture"] + ".jpg"
}

function getSongLevel(musicid, type) {
    //console.log(music_db["mdb"]["music"])
    // console.log(musicid + " " + type);
    // console.log(musicid)
    var result = music_db["mdb"]["music"].filter(object => object["@id"] == musicid);
    // console.log(result[0]["difficulty"]["novice"]["difnum"]["#text"])
    if (result.length == 0) {
        return "1"
    }

    var diffnum = 0;

    switch (type) {
        case 0:
            if (!(result[0]["difficulty"]["novice"] === undefined))
                diffnum = result[0]["difficulty"]["novice"]["difnum"]["#text"]
                // return result[0]["difficulty"]["novice"]["difnum"]["#text"]
            break;
        case 1:
            if (!(result[0]["difficulty"]["advanced"] === undefined))
                diffnum = result[0]["difficulty"]["advanced"]["difnum"]["#text"]
                // return result[0]["difficulty"]["advanced"]["difnum"]["#text"]
            break;
        case 2:
            if (!(result[0]["difficulty"]["exhaust"] === undefined))
                diffnum = result[0]["difficulty"]["exhaust"]["difnum"]["#text"]
                // return result[0]["difficulty"]["exhaust"]["difnum"]["#text"]
            break;
        case 3:
            if (!(result[0]["difficulty"]["infinite"] === undefined))
                diffnum = result[0]["difficulty"]["infinite"]["difnum"]["#text"]
                // return result[0]["difficulty"]["infinite"]["difnum"]["#text"]
            break;
        case 4:
            if (!(result[0]["difficulty"]["maximum"] === undefined))
                diffnum = result[0]["difficulty"]["maximum"]["difnum"]["#text"]
                // return result[0]["difficulty"]["maximum"]["difnum"]["#text"]
            break;
    }
    // console.log(diffnum)
    if (diffnum == 0) {
        diffnum = 1;
    }
    // console.log(diffnum)
    return diffnum;
    // return result[0]["info"]["title_name"]
    //console.log(result);
}

function getVFLevel(VF) {
    // console.log(VF);
    switch (true) {
        case VF < 10:
            return zeroPad(1, 2);
        case VF < 12:
            return zeroPad(2, 2);
        case VF < 14:
            return zeroPad(3, 2);
        case VF < 15:
            return zeroPad(4, 2);
        case VF < 16:
            return zeroPad(5, 2);
        case VF < 17:
            return zeroPad(6, 2);
        case VF < 18:
            return zeroPad(7, 2);
        case VF < 19:
            return zeroPad(8, 2);
        case VF < 20:
            return zeroPad(9, 2);
        case VF >= 20:
            return zeroPad(10, 2);
    }
}

function getAkaname(akaname) {
    //var result = music_db["mdb"]["music"].filter(object => object["@id"] == musicid);
    var result = data_db["akaname"].filter(obj => obj["value"] == akaname)[0];
    // console.log(result);
    return result["name"];
}

function getVFAsset(vf) {
    var floatVF = parseFloat(vf);
    return "static/asset/force/em6_" + getVFLevel(floatVF) + "_i_eab.png"
}

function singleScoreVolforce(score) {
    // lv * (score / 10000000) * gradeattr * clearmedalattr * 2
    var level = getSongLevel(score.mid, score.type);
    // console.log(level);
    var tempVF = parseInt(level) * (parseInt(score.score) / 10000000) * getGrade(score.grade) * getMedal(score.clear) * 2;
    // console.log(tempVF);
    return tempVF;
}

function toFixed(num, fixed) {
    var re = new RegExp('^-?\\d+(?:\.\\d{0,' + (fixed || -1) + '})?');
    return num.toString().match(re)[0];
}

function calculateVolforce() {
    for (var i in score_db) {
        var temp = singleScoreVolforce(score_db[i]);
        temp = parseFloat(toFixed(temp, 1));
        volforceArray.push(temp);
    }
    volforceArray.sort(function(a, b) { return b - a });
    // console.log(volforceArray);
    var VF = 0;
    if (volforceArray.length > 50) {
        for (var i = 0; i < 50; i++) {
            VF += volforceArray[i];
        }
    } else {
        for (var i = 0; i < volforceArray.length; i++) {
            VF += volforceArray[i];
        }
    }
    VF /= 100;
    // console.log(toFixed(VF, 3));
    return toFixed(VF, 3);
}

var diffName = ["NOV", "ADV", "EXH", "INF\nGRV\nHVN\nVVD", "MXM"];

function preSetTableMark(type) {
    $('#statistic-table').empty();
    $('#statistic-table').append(
        $('<thead>').append(
            $('<tr>').append(
                $('<th>').append(
                    type
                )
            ).append(
                $('<th>').append(
                    "Played"
                )
            ).append(
                $('<th>').append(
                    "Clear"
                )
            ).append(
                $('<th>').append(
                    "Hard Clear"
                )
            ).append(
                $('<th>').append(
                    "UC"
                )
            ).append(
                $('<th>').append(
                    "PUC"
                )
            )
        )
    )
}

function preSetTableGrade(type) {
    $('#statistic-table').empty();
    $('#statistic-table').append(
        $('<thead>').append(
            $('<tr>').append(
                $('<th>').append(
                    type
                )
            ).append(
                $('<th>').append(
                    "D"
                )
            ).append(
                $('<th>').append(
                    "C"
                )
            ).append(
                $('<th>').append(
                    "B"
                )
            ).append(
                $('<th>').append(
                    "A"
                )
            ).append(
                $('<th>').append(
                    "A+"
                )
            ).append(
                $('<th>').append(
                    "AA"
                )
            ).append(
                $('<th>').append(
                    "AA+"
                )
            ).append(
                $('<th>').append(
                    "AAA"
                )
            ).append(
                $('<th>').append(
                    "AAA+"
                )
            ).append(
                $('<th>').append(
                    "S"
                )
            )
        )
    )
}

function preSetTableAvg(type) {
    $('#statistic-table').empty();
    $('#statistic-table').append(
        $('<thead>').append(
            $('<tr>')
            .append($('<th>').append(type))
            .append($('<th>').append('Average Score'))
        )
    );
}


function setCMpD() {
    if ($('[name="cmpd"]').hasClass('is-active') && notFirst) {
        return;
    }
    $('[name="cmpd"]').addClass('is-active');
    $('[name="cmpl"]').removeClass('is-active');
    $('[name="gpd"]').removeClass('is-active');
    $('[name="gpl"]').removeClass('is-active');
    $('[name="aspl"]').removeClass('is-active');
    notFirst = true;

    $('#statistic-table').fadeOut(200, function() {
        preSetTableMark("Difficulty");
        $('#statistic-table').append(baseTBodyCMpD)
            .removeClass("is-narrow")
            .css('width', '45%');
        $('#statistic-table').fadeIn(200);
    })



}

function setCMpL() {
    if ($('[name="cmpl"]').hasClass('is-active')) {
        return;
    }
    $('[name="cmpd"]').removeClass('is-active');
    $('[name="cmpl"]').addClass('is-active');
    $('[name="gpd"]').removeClass('is-active');
    $('[name="gpl"]').removeClass('is-active');
    $('[name="aspl"]').removeClass('is-active');

    $('#statistic-table').fadeOut(200, function() {
        preSetTableMark("Level");
        //var tableBody = $('#tbodyin');
        $('#statistic-table').append(baseTBodyCMpL)
            .removeClass("is-narrow")
            .css('width', '45%');
        $('#statistic-table').fadeIn(200);
    })
}

function setGpD() {
    if ($('[name="gpd"]').hasClass('is-active')) {
        return;
    }
    $('[name="cmpd"]').removeClass('is-active');
    $('[name="cmpl"]').removeClass('is-active');
    $('[name="gpd"]').addClass('is-active');
    $('[name="gpl"]').removeClass('is-active');
    $('[name="aspl"]').removeClass('is-active');

    $('#statistic-table').fadeOut(200, function() {
            preSetTableGrade("Difficulty");
            $('#statistic-table').append(baseTBodyGpD)
                .removeClass("is-narrow")
                .css('width', '45%');
            $('#statistic-table').fadeIn(200);
        })
        //$('#statistic-table').empty();
}

function setGpL() {
    if ($('[name="gpl"]').hasClass('is-active')) {
        return;
    }
    $('[name="cmpd"]').removeClass('is-active');
    $('[name="cmpl"]').removeClass('is-active');
    $('[name="gpd"]').removeClass('is-active');
    $('[name="gpl"]').addClass('is-active');
    $('[name="aspl"]').removeClass('is-active');
    $('#statistic-table').fadeOut(200, function() {
            preSetTableGrade("Level");
            $('#statistic-table').append(baseTBodyGpL)
                .removeClass("is-narrow")
                .css('width', '45%');
            $('#statistic-table').fadeIn(200);
        })
        //$('#statistic-table').empty();
}

function setASpL() {
    if ($('[name="aspl"]').hasClass('is-active')) {
        return;
    }
    $('[name="cmpd"]').removeClass('is-active');
    $('[name="cmpl"]').removeClass('is-active');
    $('[name="gpd"]').removeClass('is-active');
    $('[name="gpl"]').removeClass('is-active');
    $('[name="aspl"]').addClass('is-active');
    $('#statistic-table').fadeOut(200, function() {
            preSetTableAvg('Level');
            $('#statistic-table').append(baseTBodyASpL)
                .addClass("is-narrow")
                .css('width', '30%');
            $('#statistic-table').fadeIn(200);
        })
        //$('#statistic-table').empty();
}


function getAvg(array, lv) {
    if (array[lv - 1][0] == 0) {
        return 0;
    } else {
        return parseInt(array[lv - 1][1] / array[lv - 1][0]);
    }
}


function setUpStatistics() {
    baseTBodyCMpD = $('<tbody>');
    baseTBodyCMpL = $('<tbody>');
    baseTBodyGpL = $('<tbody>');
    baseTBodyGpD = $('<tbody>');
    baseTBodyASpL = $('<tbody>');

    var CMpDArray = createArray(5, 5);
    var CMpLArray = createArray(20, 5);
    var GpDArray = createArray(5, 10);
    var GpLArray = createArray(20, 10);
    var ASpLArray = createArray(20, 2);

    score_db.forEach(function(currentValue, index, array) {
        //console.log(currentValue);
        CMpDArray[currentValue.type][currentValue.clear - 1] += 1;
        CMpLArray[parseInt(getSongLevel(currentValue.mid, currentValue.type)) - 1][currentValue.clear - 1] += 1;
        GpDArray[currentValue.type][currentValue.grade - 1]++;
        GpLArray[parseInt(getSongLevel(currentValue.mid, currentValue.type)) - 1][currentValue.grade - 1] += 1;
        ASpLArray[parseInt(getSongLevel(currentValue.mid, currentValue.type)) - 1][0] += 1;
        ASpLArray[parseInt(getSongLevel(currentValue.mid, currentValue.type)) - 1][1] += currentValue.score;
    });

    // console.log(CMpDArray);
    // console.log(CMpLArray);
    // console.log(GpDArray);
    // console.log(GpLArray);
    // console.log(ASpLArray);
    for (var diff = 0; diff < 5; diff++) {
        baseTBodyCMpD.append(
            $('<tr>').append(
                $('<th>').append(
                    diffName[diff]
                )
            ).append(
                $('<td>').append(
                    CMpDArray[diff][0]
                )
            ).append(
                $('<td>').append(
                    CMpDArray[diff][1]
                )
            ).append(
                $('<td>').append(
                    CMpDArray[diff][2]
                )
            ).append(
                $('<td>').append(
                    CMpDArray[diff][3]
                )
            ).append(
                $('<td>').append(
                    CMpDArray[diff][4]
                )
            )
        )
    }
    for (var lv = 1; lv <= 20; lv++) {
        baseTBodyCMpL.append(
            $('<tr>').append(
                $('<th>').append(
                    lv
                )
            ).append(
                $('<td>').append(
                    CMpLArray[lv - 1][0]
                )
            ).append(
                $('<td>').append(
                    CMpLArray[lv - 1][1]
                )
            ).append(
                $('<td>').append(
                    CMpLArray[lv - 1][2]
                )
            ).append(
                $('<td>').append(
                    CMpLArray[lv - 1][3]
                )
            ).append(
                $('<td>').append(
                    CMpLArray[lv - 1][4]
                )
            )
        )
    }
    for (var diff = 0; diff < 5; diff++) {
        baseTBodyGpD.append(
            $('<tr>').append(
                $('<th>').append(
                    diffName[diff]
                )
            ).append(
                $('<td>').append(
                    GpDArray[diff][0]
                )
            ).append(
                $('<td>').append(
                    GpDArray[diff][1]
                )
            ).append(
                $('<td>').append(
                    GpDArray[diff][2]
                )
            ).append(
                $('<td>').append(
                    GpDArray[diff][3]
                )
            ).append(
                $('<td>').append(
                    GpDArray[diff][4]
                )
            ).append(
                $('<td>').append(
                    GpDArray[diff][5]
                )
            ).append(
                $('<td>').append(
                    GpDArray[diff][6]
                )
            ).append(
                $('<td>').append(
                    GpDArray[diff][7]
                )
            ).append(
                $('<td>').append(
                    GpDArray[diff][8]
                )
            ).append(
                $('<td>').append(
                    GpDArray[diff][9]
                )
            )
        )
    }

    for (var lv = 1; lv <= 20; lv++) {
        baseTBodyGpL.append(
            $('<tr>').append(
                $('<th>').append(
                    lv
                )
            ).append(
                $('<td>').append(
                    GpLArray[lv - 1][0]
                )
            ).append(
                $('<td>').append(
                    GpLArray[lv - 1][1]
                )
            ).append(
                $('<td>').append(
                    GpLArray[lv - 1][2]
                )
            ).append(
                $('<td>').append(
                    GpLArray[lv - 1][3]
                )
            ).append(
                $('<td>').append(
                    GpLArray[lv - 1][4]
                )
            ).append(
                $('<td>').append(
                    GpLArray[lv - 1][5]
                )
            ).append(
                $('<td>').append(
                    GpLArray[lv - 1][6]
                )
            ).append(
                $('<td>').append(
                    GpLArray[lv - 1][7]
                )
            ).append(
                $('<td>').append(
                    GpLArray[lv - 1][8]
                )
            ).append(
                $('<td>').append(
                    GpLArray[lv - 1][9]
                )
            )
        )
    }
    for (var lv = 1; lv <= 20; lv++) {
        baseTBodyASpL.append(
            $('<tr>').append(
                $('<th>').append(
                    lv
                )
            )
            .append(
                $('<td>').append(
                    getAvg(ASpLArray, lv)
                )
            )
        );
    }
}

// $('cmpd').on('click', function(e) {
//     //setCMpD();
//     $('cmpdli').addClass('is-active');
// })

// $('cmpl').on('click', function(e) {
//     //setCMpD();
//     $('cmplli').addClass('is-active');
// })
// $('gpd').on('click', function(e) {
//     //setCMpD();
//     $('gpdli').addClass('is-active');
// })
// $('gpl').on('click', function(e) {
//     //setCMpD();
//     $('gplli').addClass('is-active');
// })

$('#version_select').change(function() {
    $('#skillLV').fadeOut(200, () => {
        console.log("change version select");
        $('#skillLV').attr('src', getSkillAsset(getPlayerSkill($('#version_select').val())))
    });
    $('#skillLV').fadeIn(200);
});


function getPlayerSkill(version) {
    // console.log(getPlayerMaxVersion())
    if (skill_data.length == 0) return 0;
    var k = skill_data.filter(e => e.version == version)
    return parseInt(k[0].level);
}

function getVersionSelect() {
    if (skill_data.length == 0) return [];
    var versionDATA = [];
    for (var i = 0; i < skill_data.length; i++) {
        versionDATA.push(parseInt(skill_data[i].version));
    }
    return versionDATA;
}

$(document).ready(function() {
    profile_data = JSON.parse(document.getElementById("data-pass").innerText);
    score_db = JSON.parse(document.getElementById("score-pass").innerText);
    skill_data = JSON.parse(document.getElementById("skill-pass").innerText);

    skill_data.sort(function(a, b) {
            return b.version - a.version;
        })
        // console.log(score_db);

    // $('#test').append(
    //     $('<div>').append(
    //         profile_data["name"]
    //     ).css('font-family', "testfont")
    //     .css('font-size', "35px")
    // )

    $.when(
        $.getJSON("static/asset/json/music_db.json", function(json) {
            music_db = json;
            // console.log(music_db);
        }),
        $.getJSON("static/asset/json/course_data.json", function(json) {
            course_db = json;
        }),
        $.getJSON("static/asset/json/data.json", function(json) {
            data_db = json;
        }),
        $.getJSON("static/asset/json/appeal.json", function(json) {
            appeal_db = json;
            //console.log(appeal_db);
        })
    ).then(function() {
        var currentVF = calculateVolforce();
        var maxVer = parseInt(skill_data[0]["version"])

        var versionInfo = getVersionSelect();
        console.log(versionInfo);
        for (var i = 0; i < versionInfo.length; i++) {
            console.log(versionInfo[i])
            $('#version_select').append(
                $('<option>', {
                    value: versionInfo[i],
                    text: versionText[versionInfo[i]],
                })
            )
        }

        $('#test').append(
            $('<div class="card is-inlineblocked">').append(
                $('<div class="card-header">').append(
                    $('<p class="card-header-title">').append(
                        $('<span class="icon">').append(
                            $('<i class="mdi mdi-account-edit">')
                        )
                    ).append("Basic Data")
                )
            ).append(
                $('<div class="card-content">').append(
                    $('<div class="tile is-ancestor is-centered">').append(
                        $('<div class="tile is-parent is-3">').append(
                            $('<article class="tile is-child">').append(
                                $('<img>').attr('src', getAppealCard(profile_data.appeal))
                                .css('width', '150px')
                            ).css('vertical-align', 'middle')
                        )
                    ).append(
                        $('<div class="tile is-parent is-6">').append(
                            $('<article class="tile is-child">').append(
                                $('<div>').append(
                                    $('<div>').append("Player Name:").css('font-size', '15').append($('<br>'))
                                ).append(
                                    $('<div>').append(profile_data["name"]).css('font-size', "35px")
                                ).append(
                                    $('<div>').append("Akaname:").css('font-size', '15')
                                ).append(
                                    $('<div>').append(getAkaname(profile_data["akaname"])).css('font-size', "35px")
                                )
                                .css('font-family', "testfont,ffff")
                            )
                        )
                    ).append(
                        $('<div class="tile is-parent is-3">').append(
                            $('<article class="tile is-child is-centered">').append(
                                $('<div>').append(
                                    $('<img>').attr('src', getVFAsset(currentVF)).css('width', '7em')
                                    .css('margin', '0 auto')
                                ).append(
                                    $('<div>').append(
                                        currentVF
                                    ).css('font-family', "testfont")
                                    .css('font-size', "35px")
                                    .css('text-align', 'center')
                                )
                                .css('vertical-align', 'middle')
                                .css('min-height', '100%')
                                .css('height', '100%')
                            )
                        )
                    )
                ).append(
                    $('<div>').append(
                        
                    ).append(
                        
                    ).append(
                        
                    ).css("display", "table")
                    .css('width', '100%')
                    .css('text-align', 'left')
                ).css('width', '100%')
            ).css('vertical-align', 'top')
            .css('max-width', '100%')
        ).append(
            $('<div class="card  is-inlineblocked">').append(
                $('<div class="card-header">').append(
                    $('<p class="card-header-title">').append(
                        $('<span class="icon">').append(
                            $('<i class="mdi mdi-pulse">')
                        )
                    ).append("Other Data")
                )
            ).append(
                $('<div class="card-content">').append(
                    $('<div class="tile is-ancestor">').append(
                        $('<div class="tile is-parent is-7">').append(
                            $('<article class="tile is-child box">').append(
                                $('<p class="title">').append(
                                    "Skill Level"
                                ).append(
                                    $('<div class="content">').append(
                                            $('<img id="skillLV">').attr('src', getSkillAsset(getPlayerSkill(maxVer)))
                                    )
                                ).css('font-family', "testfont")
                            )
                        )
                    ).append(
                        $('<div class="tile is-parent is-5">').append(
                            $('<article class="tile is-child box">').append(
                                $('<p class="title">').append(
                                    "PCB"
                                ).append(
                                    $('<div class="content">').append(
                                        profile_data.blocks
                                    )
                                ).css('font-family', "testfont") 
                            )
                        )
                    ).css('vertical-align', 'middle')
                )
            )
        ).append(
            $('<div class="card">').append(
                $('<div class="card-header">').append(
                    $('<p class="card-header-title">').append(
                        $('<span class="icon">').append(
                            $('<i class="mdi mdi-pulse">')
                        )
                    ).append("Statistics")
                )
            ).append(
                $('<div class="card-content">').append(
                    $('<div class="tabs is-toggle is-paddingless is-centered is-fullwidth">').append(
                        $('<ul class="is-marginless">').append(
                            $('<li class="is-active" name="cmpd">').append(
                                $('<a onclick="setCMpD()">').append(
                                    "Clear Mark per Difficulty"
                                )
                            )
                        ).append(
                            $('<li name="cmpl">').append(
                                $('<a onclick="setCMpL()">').append(
                                    "Clear Mark per Level"
                                )
                            )
                        ).append(
                            $('<li name="gpd">').append(
                                $('<a onclick="setGpD()">').append(
                                    "Grade per Difficulty"
                                )
                            )
                        ).append(
                            $('<li name="gpl">').append(
                                $('<a onclick="setGpL()">').append(
                                    "Grade per Level"
                                )
                            )
                        ).append(
                            $('<li name="aspl">').append(
                                $('<a onclick="setASpL()">').append(
                                    'Average Score per Level'
                                )
                            )
                        )
                    )
                ).append(
                    $('<hr>')
                ).append(
                    $('<div class="tile is-ancestor">').append(
                        $('<div class="tile is-parent">').append(
                            $('<article class="tile is-child">').append(
                                // $('<div class="table-container">').append(
                                    $('<table class="table mx-auto is-fullwidth is-hoverable" id="statistic-table">')
                                    .css('margin-left', 'auto')
                                    .css('margin-right', 'auto')
                                    // .css('width', '100%')
                                // )
                            )//.css('text-align', 'center')
                             .css('overflow-x', 'auto')
                        )
                    )
                    
                )
            )
        )

        setUpStatistics();
        setCMpD();

        $('.dots').fadeOut(400, function() {

        })
        $('#test').fadeIn(1000);
    })



})