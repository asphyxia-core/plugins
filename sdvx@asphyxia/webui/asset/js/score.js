let music_db;

function zeroPad(num, places) {
    let zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
}

function getSongName(musicid) {
    //console.log(music_db["mdb"]["music"])
    //console.log(musicid+" "+type);
    let result = music_db["mdb"]["music"].filter(object => object["@id"] == musicid);
    if (result.length == 0) {
        return "Custom Song";
    }
    return result[0]["info"]["title_name"]
        //console.log(result);
}

function getDifficulty(musicid, type) {
    let result = music_db["mdb"]["music"].filter(object => object["@id"] == musicid);
    if (result.length == 0) {
        return "NOV";
    }
    let inf_ver = result[0]["info"]["inf_ver"]["#text"] ? result[0]["info"]["inf_ver"]["#text"] : 5;
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

function getLevel(musicid, type){
    let result = music_db["mdb"]["music"].filter(object => object["@id"] == musicid);
    if (result.length == 0) {
        return 0;
    }
    let info = result[0]["difficulty"];

    switch (type) {
        case 0:
            return parseInt(info["novice"]["difnum"]["#text"]);
        case 1:
            return parseInt(info["advanced"]["difnum"]["#text"]);
        case 2:
            return parseInt(info["exhaust"]["difnum"]["#text"]);
        case 3:
            return parseInt(info["infinite"]["difnum"]["#text"]);
        case 4:
            return parseInt(info["maximum"]["difnum"]["#text"]);
    }
}

function getGrade(grade) {
    switch (grade) {
        case 0:
            return "No Grade";
        case 1:
            return "D";
        case 2:
            return "C";
        case 3:
            return "B";
        case 4:
            return "A";
        case 5:
            return "A+";
        case 6:
            return "AA";
        case 7:
            return "AA+";
        case 8:
            return "AAA";
        case 9:
            return "AAA+";
        case 10:
            return "S";
    }
}

function getMedal(clear) {
    switch (clear) {
        case 0:
            return "No Data";
        case 1:
            return "Played";
        case 2:
            return "Clear";
        case 3:
            return "Hard Clear";
        case 4:
            return "UC";
        case 5:
            return "PUC";
    }
}


function difficultySort(d) {
    switch (d) {
        case "NOV":
            return 1;
        case "ADV":
            return 2;
        case "EXH":
            return 3;
        case "INF":
            return 4;
        case "GRV":
            return 5;
        case "HVN":
            return 6;
        case "VVD":
            return 7;
        case "XCD":
            return 8;
        case "MXM":
            return 9;
    }
    return 0;
};

function markSort(d) {
    switch (d) {
        case "No Grade":
            return 0;
        case "Played":
            return 1;
        case "Clear":
            return 2;
        case "Hard Clear":
            return 3;
        case "UC":
            return 4;
        case "PUC":
            return 5;
    }
    return 0;
};

function gradeSort(d) {
    switch (d) {
        case "No Data":
            return 0;
        case "D":
            return 1;
        case "C":
            return 2;
        case "B":
            return 3;
        case "A":
            return 4;
        case "A+":
            return 5;
        case "AA":
            return 6;
        case "AA+":
            return 7;
        case "AAA":
            return 8;
        case "AAA+":
            return 9;
        case "S":
            return 10;
    }
    return 0;
};

$(document).ready(function() {
    jQuery.fn.dataTableExt.oSort['diff-asc'] = function(a, b) {
        let x = difficultySort(a);
        let y = difficultySort(b);

        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    };

    jQuery.fn.dataTableExt.oSort['diff-desc'] = function(a, b) {
        let x = difficultySort(a);
        let y = difficultySort(b);

        return ((x < y) ? 1 : ((x > y) ? -1 : 0));
    };

    jQuery.fn.dataTableExt.oSort['grade-asc'] = function(a, b) {
        let x = gradeSort(a);
        let y = gradeSort(b);

        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    };

    jQuery.fn.dataTableExt.oSort['grade-desc'] = function(a, b) {
        let x = gradeSort(a);
        let y = gradeSort(b);

        return ((x < y) ? 1 : ((x > y) ? -1 : 0));
    };

    jQuery.fn.dataTableExt.oSort['clear-mark-asc'] = function(a, b) {
        let x = markSort(a);
        let y = markSort(b);

        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    };

    jQuery.fn.dataTableExt.oSort['clear-mark-desc'] = function(a, b) {
        let x = markSort(a);
        let y = markSort(b);

        return ((x < y) ? 1 : ((x > y) ? -1 : 0));
    };
    let profile_data = JSON.parse(document.getElementById("data-pass").innerText);
    profile_data = profile_data.sort(function(a, b) {
        if (a.mid > b.mid) return 1;
        if (a.mid < b.mid) return -1;
        return a.type > b.type ? 1 : -1;
    });

    //console.log(profile_data);
    //$('#music_score').DataTable();

    $.getJSON("static/asset/json/music_db.json", function(json) {
        music_db = json;
        let music_data = [];

        

        for (let i in profile_data) {
            let temp_data = {};
            temp_data.mid = profile_data[i].mid;
            temp_data.songname = getSongName(profile_data[i].mid);
            temp_data.diff = getDifficulty(profile_data[i].mid, profile_data[i].type);
            temp_data.level = getLevel(profile_data[i].mid, profile_data[i].type);
            temp_data.score = profile_data[i].score;
            temp_data.exscore = ((profile_data[i].exscore) ? profile_data[i].exscore : 0);
            temp_data.grade = getGrade(profile_data[i].grade);
            temp_data.clear = getMedal(profile_data[i].clear);
            music_data.push(temp_data);

            // $("#music_score>tbody").append($('<tr>')
            // .append($('<td>').append(getSongName(profile_data[i].mid)))
            // .append($('<td>').append(getDifficulty(profile_data[i].mid,profile_data[i].type)))
            // .append($('<td>').append(profile_data[i].score))
            // .append($('<td>').append((profile_data[i].exscore)? profile_data[i].exscore:0))
            // .append($('<td>').append(getGrade(profile_data[i].grade)))
            // .append($('<td>').append(getMedal(profile_data[i].clear)))
            // );
            // getSongName(1);
        }


        $('#music_score').DataTable({
            data: music_data,
            columns: [
                { data: 'mid' },
                { data: 'songname' },
                { data: 'diff', "type": "diff" },
                { data: 'level'},
                { data: 'score', },
                { data: 'exscore' },
                { data: 'grade', "type": "grade" },
                { data: 'clear', "type": "clear-mark" }
            ],
            columnDefs: [

            ],
            responsive: {
                details: {
                    display: $.fn.dataTable.Responsive.display.modal({
                        header: function(row) {
                            let data = row.data();
                            return 'Details for ' + data.songname;
                        }
                    })
                }
            },
            scrollY: "400px",
        });


    });


})