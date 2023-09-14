function zeroPad(num, places) {
    let zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
}

const preloadImage = src => 
    new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = resolve
        image.onerror = reject
        image.src = src
})

function generateElements(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.children[0];
}

function isSlideShow(num){
    return database["subbg"].filter(x => x.value == num)[0]["multi"] ?? false;
}

function isScroll(num){ //238-255 200-213
    if((num >= 238 && num <= 255 )|| (num>=200 && num <=213)){
        return true;
    }else{
        return false;
    }
}

function isVideo(num){
    return database["subbg"].filter(x => x.value == num)[0]["video"] ?? false;
}


let nemsys_selector = document.querySelector('#nemsys_select');
nemsys_selector.addEventListener('change', ()=>{
    let preview = document.querySelector('#nemsys_pre');
    let preview_fade = document.querySelector('#nemsys_pre_fade');
    let value = nemsys_selector.value;
    preview.classList.toggle('fade');
    preview_fade.setAttribute("src", "static/asset/nemsys/nemsys_" + zeroPad(value, 4) + ".png");
    preview_fade.classList.toggle('fade');
    setTimeout(()=>{
        preview.setAttribute("src", "static/asset/nemsys/nemsys_" + zeroPad(value, 4) + ".png");
        preview.classList.toggle('fade');
        preview_fade.classList.toggle('fade');
        
    },500);
});

document.querySelector('#nemsys_pre').addEventListener('mousemove', (e)=>{
    let x = e.layerX;
    let y = e.layerY;
    let preview = document.querySelector('#nemsys_pre');
    let width = preview.clientWidth;
    let height = preview.clientHeight;

    let yRot = 10 * ((x - width / 2) / width);
    let xRot = -10 * ((y - height / 2) / height);

    let string = 'perspective(500px) scale(1) rotateX(' + xRot + 'deg) rotateY(' + yRot + 'deg)'
    preview.style.transform = string;
    preview.style.transition = 'transform 0s';
});

document.querySelector('#nemsys_pre').addEventListener('mouseout', (e)=>{
    let preview = document.querySelector('#nemsys_pre');
    let string = 'perspective(500px) scale(1) rotateX(0) rotateY(0)'
    preview.style.transform = string;
    preview.style.transition = 'transform 0.5s';
});

let subbg_select = document.querySelector('[name="subbg"]');
let interval;
let cnt = 1;
subbg_select.addEventListener('change', ()=>{
    let preview = document.querySelector('#sub_pre');
    let preview_fade = document.querySelector('#sub_pre_fade');
    let value = subbg_select.value;
    preview.classList.toggle('fade');
    if(isSlideShow(value)){
        preview_fade.setAttribute("src", "static/asset/submonitor_bg/subbg_" + zeroPad(value, 4) + "_01.png");
    }else{
        preview_fade.setAttribute("src", "static/asset/submonitor_bg/subbg_" + zeroPad(value, 4) + ".png");
    }
    preview_fade.classList.toggle('fade');
    clearInterval(interval);
    cnt = 1;
    
    setTimeout(()=>{
        preview.classList.toggle('fade');
        preview_fade.classList.toggle('fade');
        if(isSlideShow(value)){
            preview.setAttribute("src", "static/asset/submonitor_bg/subbg_" + zeroPad(value, 4) + "_01.png");
        }else{
            preview.setAttribute("src", "static/asset/submonitor_bg/subbg_" + zeroPad(value, 4) + ".png");
        }
    },500);

    if(isSlideShow(value)){ 
        interval = setInterval(()=>{
            if(cnt == 1){
                preview.classList.toggle('fade');
                preview_fade.setAttribute("src", "static/asset/submonitor_bg/subbg_" + zeroPad(value, 4) + "_02.png");
                preview_fade.classList.toggle('fade');
                setTimeout(()=>{
                    preview.classList.toggle('fade');
                    preview_fade.classList.toggle('fade');
                    preview.setAttribute("src", "static/asset/submonitor_bg/subbg_" + zeroPad(value, 4) + "_02.png");
                },500);
                cnt = 2;
            }else if(cnt == 2){
                preview.classList.toggle('fade');
                preview_fade.setAttribute("src", "static/asset/submonitor_bg/subbg_" + zeroPad(value, 4) + "_03.png");
                preview_fade.classList.toggle('fade');
                setTimeout(()=>{
                    preview.setAttribute("src", "static/asset/submonitor_bg/subbg_" + zeroPad(value, 4) + "_03.png");
                    preview.classList.toggle('fade');
                    preview_fade.classList.toggle('fade');
                    
                },500);
                cnt = 3;
            }else{
                preview.classList.toggle('fade');
                preview_fade.setAttribute("src", "static/asset/submonitor_bg/subbg_" + zeroPad(value, 4) + "_01.png");
                preview_fade.classList.toggle('fade');
                setTimeout(()=>{
                    preview.setAttribute("src", "static/asset/submonitor_bg/subbg_" + zeroPad(value, 4) + "_01.png");
                    preview.classList.toggle('fade');
                    preview_fade.classList.toggle('fade');
                },500);
                cnt = 1;
            }
        }, 1000);
    }else if(isVideo(value)){
        preview.setAttribute("style", "display: none;")
        preview_fade.setAttribute("style", "display: none;")
        let video = document.querySelector('#sub_video_pre');
        video.setAttribute("style", "display: block;")
        video.setAttribute("src", "static/asset/submonitor_bg/subbg_" + zeroPad(value, 4) + ".mp4");
        video.setAttribute("autoplay", "");
        video.setAttribute("loop", "");
    }else{
        clearInterval(interval);
        let video = document.querySelector('#sub_video_pre');
        video.setAttribute("style", "display: none;")
        video.pause();
        preview.setAttribute("style", "")
        preview_fade.setAttribute("style", "")
    }
});

let audioContext = new AudioContext();
let play = audioContext.createBufferSource();
let gain = audioContext.createGain();

play.connect(gain);
gain.connect(audioContext.destination);
gain.gain.value = 0.5;


$('[name="bgm"]').change(function() {
    // $('#custom_0').attr("src", "static/asset/audio/custom_" + zeroPad($('[name="bgm"]').val(), 2) + "/0.mp3");
    $('#custom_1').attr("src", "static/asset/audio/custom_" + zeroPad($('[name="bgm"]').val(), 2) + "/1.mp3");
    if ($('[name="bgm"]').val() == 99) {
        // $('#custom_0').attr("src", "static/asset/audio/special_00/0.m4a");
        $('#custom_1').attr("src", "static/asset/audio/custom_00/1.m4a");
    }
    // $('#custom_0').prop("volume", 0.5);
    $('#custom_1').prop("volume", 0.2);

    $('#play_sel').animate({ 'opacity': 0 }, 200, function() {
        $(this).text('Play').animate({ 'opacity': 1 }, 200);
    });
    play_sel = false;
    if(play.state == "running"){
        play.stop();
    }
    fetch("static/asset/audio/custom_" + zeroPad($('[name="bgm"]').val(), 2) + (typeof database["bgm"][$('[name="bgm"]').val()].file === 'undefined' ? "/0.mp3":database["bgm"][$('[name="bgm"]').val()].file))
        .then(res => res.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
            play.buffer = null;
            play = audioContext.createBufferSource();
            gain = audioContext.createGain();
            play.connect(gain);
            gain.connect(audioContext.destination);
            gain.gain.value = 0.2;
            play.buffer = audioBuffer;
            play.loop = true;
            // play.loopStart = 1.2;
            // play.loopEnd = 22.7;
            play.loopStart = database["bgm"][$('[name="bgm"]').val()].loopStart ?? 0;
            play.loopEnd = database["bgm"][$('[name="bgm"]').val()].loopEnd ?? 30;
            $('#play_bgm').prop("disabled", false);
        });
    //disable play button
    $('#play_bgm').prop("disabled", true);
    $('#play_bgm').animate({ 'opacity': 0 }, 200, function() {
        $(this).text('Play').animate({ 'opacity': 1 }, 200);
    });
    audioContext.suspend()

    play_bgm = false;
    first = true;
});

let testcurrent = 2.8;

async function test(){
    let audioContext = new AudioContext();
    let play = audioContext.createBufferSource();
    let gain = audioContext.createGain();
    
    play.connect(gain);
    gain.connect(audioContext.destination);
    gain.gain.value = 0.5;

    let res = await fetch("static/asset/audio/custom_23/0.mp3");
    let arrayBuffer = await res.arrayBuffer();
    let audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    play.buffer = audioBuffer;
    play.loop = true;
    play.loopStart = 4.6;
    play.loopEnd = 20;
    play.start(audioContext.currentTime, 0);
}


$('[name="stampA"]').change(function() {
    $('#a_pre').fadeOut(200, () => {
        let stamp = $('[name="stampA"]').val();
        if (stamp == 0) {
            $('#a_pre').attr("src", "static/asset/nostamp.png");
        } else {
            let group = Math.trunc((stamp - 1) / 4 + 1);
            let item = stamp % 4;
            if (item == 0) item = 4;
            $('#a_pre').attr("src", "static/asset/chat_stamp/stamp_" + zeroPad(group, 4) + "/stamp_" + zeroPad(group, 4) + "_" + zeroPad(item, 2) + ".png");
        }
    });
    $('#a_pre').fadeIn(200);
});



$('[name="stampB"]').change(function() {
    $('#b_pre').fadeOut(200, () => {
        let stamp = $('[name="stampB"]').val();
        if (stamp == 0) {
            $('#b_pre').attr("src", "static/asset/nostamp.png");
        } else {
            let group = Math.trunc((stamp - 1) / 4 + 1);
            let item = stamp % 4;
            if (item == 0) item = 4;
            $('#b_pre').attr("src", "static/asset/chat_stamp/stamp_" + zeroPad(group, 4) + "/stamp_" + zeroPad(group, 4) + "_" + zeroPad(item, 2) + ".png");
        }
    });
    $('#b_pre').fadeIn(200);
});

$('[name="stampC"]').change(function() {
    $('#c_pre').fadeOut(200, () => {
        let stamp = $('[name="stampC"]').val();
        if (stamp == 0) {
            $('#c_pre').attr("src", "static/asset/nostamp.png");
        } else {
            let group = Math.trunc((stamp - 1) / 4 + 1);
            let item = stamp % 4;
            if (item == 0) item = 4;
            $('#c_pre').attr("src", "static/asset/chat_stamp/stamp_" + zeroPad(group, 4) + "/stamp_" + zeroPad(group, 4) + "_" + zeroPad(item, 2) + ".png");
        }
    });
    $('#c_pre').fadeIn(200);
});

$('[name="stampD"]').change(function() {
    $('#d_pre').fadeOut(200, () => {
        let stamp = $('[name="stampD"]').val();
        if (stamp == 0) {
            $('#d_pre').attr("src", "static/asset/nostamp.png");
        } else {
            let group = Math.trunc((stamp - 1) / 4 + 1);
            let item = stamp % 4;
            if (item == 0) item = 4;
            $('#d_pre').attr("src", "static/asset/chat_stamp/stamp_" + zeroPad(group, 4) + "/stamp_" + zeroPad(group, 4) + "_" + zeroPad(item, 2) + ".png");
        }
    });
    $('#d_pre').fadeIn(200);
});

$('[name="stampA_R"]').change(function() {
    $('#ar_pre').fadeOut(200, () => {
        let stamp = $('[name="stampA_R"]').val();
        if (stamp == 0) {
            $('#ar_pre').attr("src", "static/asset/nostamp.png");
        } else {
            let group = Math.trunc((stamp - 1) / 4 + 1);
            let item = stamp % 4;
            if (item == 0) item = 4;
            $('#ar_pre').attr("src", "static/asset/chat_stamp/stamp_" + zeroPad(group, 4) + "/stamp_" + zeroPad(group, 4) + "_" + zeroPad(item, 2) + ".png");
        }
    });
    $('#ar_pre').fadeIn(200);
});

$('[name="stampB_R"]').change(function() {
    $('#br_pre').fadeOut(200, () => {
        let stamp = $('[name="stampB_R"]').val();
        if (stamp == 0) {
            $('#br_pre').attr("src", "static/asset/nostamp.png");
        } else {
            let group = Math.trunc((stamp - 1) / 4 + 1);
            let item = stamp % 4;
            if (item == 0) item = 4;
            $('#br_pre').attr("src", "static/asset/chat_stamp/stamp_" + zeroPad(group, 4) + "/stamp_" + zeroPad(group, 4) + "_" + zeroPad(item, 2) + ".png");
        }
    });
    $('#br_pre').fadeIn(200);
});

$('[name="stampC_R"]').change(function() {
    $('#cr_pre').fadeOut(200, () => {
        let stamp = $('[name="stampC_R"]').val();
        if (stamp == 0) {
            $('#cr_pre').attr("src", "static/asset/nostamp.png");
        } else {
            let group = Math.trunc((stamp - 1) / 4 + 1);
            let item = stamp % 4;
            if (item == 0) item = 4;
            $('#cr_pre').attr("src", "static/asset/chat_stamp/stamp_" + zeroPad(group, 4) + "/stamp_" + zeroPad(group, 4) + "_" + zeroPad(item, 2) + ".png");
        }
    });
    $('#cr_pre').fadeIn(200);
});

$('[name="stampD_R"]').change(function() {
    $('#dr_pre').fadeOut(200, () => {
        let stamp = $('[name="stampD_R"]').val();
        if (stamp == 0) {
            $('#dr_pre').attr("src", "static/asset/nostamp.png");
        } else {
            let group = Math.trunc((stamp - 1) / 4 + 1);
            let item = stamp % 4;
            if (item == 0) item = 4;
            $('#dr_pre').attr("src", "static/asset/chat_stamp/stamp_" + zeroPad(group, 4) + "/stamp_" + zeroPad(group, 4) + "_" + zeroPad(item, 2) + ".png");
        }
    });
    $('#dr_pre').fadeIn(200);
});

let disable_bg = false;

$('[name="mainbg"]').change(function() {
    let filestr = ""
    disable_bg = false;
    document.querySelector('.card').style["background-color"] = "#0a0a0a99";
    switch($('[name="mainbg"]').val()){
        case "0":
            filestr = ""
            disable_bg = true;
            document.querySelector('.card').style["background-color"] = "#0a0a0a";
            break;
        case "1":
            filestr = "booth"
            break;
        case "2":
            filestr = "ii"
            break;
        case "3":
            filestr = "iii"
            break;
    }

    let video = document.querySelector('#mainbg_video_pre');
    // video.setAttribute("style", "")
    video.setAttribute("src", 'static/asset/video/'+filestr+'.mp4');
    video.setAttribute("autoplay", "");
    video.setAttribute("loop", "");
});


// $('#custom_0').on('ended', function() {
//     $('#custom_0').currentTime = 0;
//     $('#play_bgm').animate({ 'opacity': 0 }, 200, function() {
//         $(this).text('Play').animate({ 'opacity': 1 }, 200);
//     });

//     play_bgm = false;
// });

$('#custom_1').on('ended', function() {
    $('#custom_1').currentTime = 0;
    $('#play_sel').animate({ 'opacity': 0 }, 200, function() {
        $(this).text('Play').animate({ 'opacity': 1 }, 200);
    });
    play_sel = false;
});

let profile_data, database;
let play_bgm = false;
let play_sel = false;
let first = true;

let bg_opacity = false;

document.addEventListener('DOMContentLoaded', function() {
    profile_data = JSON.parse(document.getElementById("data-pass").innerText);
    document.querySelector('.card').style["background-color"] = "#0a0a0a99";
    fetch("static/asset/json/data.json")
        .then(res => {return res.json()})
        .then(json => {
            database = json;

            let nemsys = document.querySelector('#nemsys_select');
            let nemsys_option = ""
            json["nemsys"].forEach(x => {
                nemsys_option += `<option value="${x.value}">${x.name}</option>`;
            });
            nemsys.innerHTML = nemsys_option;
            nemsys.value = profile_data["nemsys"];
            nemsys.dispatchEvent(new Event('change'));

            let subbg = document.querySelector('[name="subbg"]');
            let subbg_option = ""
            json["subbg"].forEach(x => {
                subbg_option += `<option value="${x.value}">${x.name}</option>`;
            });
            subbg.innerHTML = subbg_option;
            subbg.value = profile_data["subbg"];
            subbg.dispatchEvent(new Event('change'));

            let bgm = document.querySelector('[name="bgm"]');
            let bgm_option = ""
            json["bgm"].forEach(x => {
                bgm_option += `<option value="${x.value}">${x.name}</option>`;
            });
            bgm.innerHTML = bgm_option;
            bgm.value = profile_data["bgm"];
            bgm.dispatchEvent(new Event('change'));

            let akaname = document.querySelector('[name="akaname"]');
            let akaname_option = ""
            json["akaname"].forEach(x => {
                akaname_option += `<option value="${x.value}">${x.name}</option>`;
            });
            akaname.innerHTML = akaname_option;
            akaname.value = profile_data["akaname"];
            akaname.dispatchEvent(new Event('change'));

            let appeal_frame = document.querySelector('[name="appeal_frame"]');
            appeal_frame.value = profile_data["appeal_frame"];

            let support_team = document.querySelector('[name="support_team"]');
            support_team.value = profile_data["support_team"];

            let stampA = document.querySelector('[name="stampA"]');
            let stampB = document.querySelector('[name="stampB"]');
            let stampC = document.querySelector('[name="stampC"]');
            let stampD = document.querySelector('[name="stampD"]');
            let stampA_R = document.querySelector('[name="stampA_R"]');
            let stampB_R = document.querySelector('[name="stampB_R"]');
            let stampC_R = document.querySelector('[name="stampC_R"]');
            let stampD_R = document.querySelector('[name="stampD_R"]');

            let stampOptions = "";
            json["stamp"].forEach(x => {
                stampOptions += `<option value="${x.value}">${x.name}</option>`;
            });
            stampA.innerHTML = stampOptions;
            stampB.innerHTML = stampOptions;
            stampC.innerHTML = stampOptions;
            stampD.innerHTML = stampOptions;
            stampA_R.innerHTML = stampOptions;
            stampB_R.innerHTML = stampOptions;
            stampC_R.innerHTML = stampOptions;
            stampD_R.innerHTML = stampOptions;
            stampA.value = profile_data["stampA"];
            stampB.value = profile_data["stampB"];
            stampC.value = profile_data["stampC"];
            stampD.value = profile_data["stampD"];
            stampA_R.value = profile_data["stampA_R"];
            stampB_R.value = profile_data["stampB_R"];
            stampC_R.value = profile_data["stampC_R"];
            stampD_R.value = profile_data["stampD_R"];
            stampA.dispatchEvent(new Event('change'));
            stampB.dispatchEvent(new Event('change'));
            stampC.dispatchEvent(new Event('change'));
            stampD.dispatchEvent(new Event('change'));
            stampA_R.dispatchEvent(new Event('change'));
            stampB_R.dispatchEvent(new Event('change'));
            stampC_R.dispatchEvent(new Event('change'));
            stampD_R.dispatchEvent(new Event('change'));

            let mainbg = document.querySelector('[name="mainbg"]');
            let mainbg_option = ""

            json["mainbg"].forEach(x => {
                mainbg_option += `<option value="${x.value}">${x.name}</option>`;
            });
            mainbg.innerHTML = mainbg_option;
            mainbg.value = profile_data["mainbg"];
            mainbg.dispatchEvent(new Event('change'));

            setTimeout(()=>{
                document.querySelector('#mainbg_video_pre').play();
            }, 500)

            document.querySelector('html.has-aside-left.has-aside-mobile-transition.has-navbar-fixed-top.has-aside-expanded body div#app div#main-content.content div.simplebar-wrapper div.simplebar-mask div.simplebar-offset div.simplebar-content-wrapper div.simplebar-content')
                .style["overflow-y"] = "auto";
            // document.querySelector('.uiblocker').style.display = 'none';
            document.querySelector('.uiblocker').classList.toggle('fade');
    });

    // let custom_0 = document.querySelector('#custom_0');
    let custom_1 = document.querySelector('#custom_1');

    // custom_0.volume = 0.5;
    custom_1.volume = 0.2;

    let play_bgm_button = generateElements('<button class="button is-primary" type="button" id="play_bgm"><button>');
    play_bgm_button.append("Play");
    play_bgm_button.addEventListener('click', function() {
        if (play_bgm) {
            // custom_0.pause();
            audioContext.suspend();
            play_bgm_button.innerHTML = "Play";
        } else {
            // custom_0.play();
            if(first){
                play.start()
                first = false
            }
            audioContext.resume()
            play_bgm_button.innerHTML = "Stop";
        }
        play_bgm = !play_bgm;
    });

    let play_bgm_outer_div = generateElements('<div class="buttons" style="border-top:2px solid #333333;padding-top: 10px; margin-right: 20px;"></div>');
    play_bgm_outer_div.append(play_bgm_button);
    document.querySelector('#bgm_pre').append(play_bgm_outer_div);

    let play_sel_button = generateElements('<button class="button is-primary" type="button" id="play_sel"><button>');
    play_sel_button.append("Play");
    play_sel_button.addEventListener('click', function() {
        if (play_sel) {
            custom_1.pause();
            play_sel_button.innerHTML = "Play";
        } else {
            custom_1.play();
            play_sel_button.innerHTML = "Stop";
        }
        play_sel = !play_sel;
    });

    let play_sel_outer_div = generateElements('<div class="buttons" style="border-top:2px solid #333333;padding-top: 10px; margin-right: 20px;"></div>');
    play_sel_outer_div.append(play_sel_button);
    document.querySelector('#sel_pre').append(play_sel_outer_div);


    let play_bg_button = generateElements('<button class="button is-primary" type="button" id="play_bg"><button>');
    play_bg_button.append("BG SHOW");
    play_bg_button.addEventListener('click', function() {
        if(!disable_bg){
            let video = document.querySelector('#mainbg_video_pre');
            video.play();

            let card = document.querySelector('.card');
            card.style["opacity"] = "0";
            card.style["transition"] = "opacity 0.5s";

            let bg_ui_blocker = generateElements('<div id="bguiblocker" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: #000000; opacity: 0; z-index: 9999;"></div>');
            document.querySelector('body').append(bg_ui_blocker);
            document.querySelector('#bguiblocker').addEventListener('click', ()=>{
                let card = document.querySelector('.card');
                card.style["opacity"] = "1";
                document.querySelector('#bguiblocker').remove();
            });
        }
    });

    let play_bg_outer_div = generateElements('<div class="buttons" style="border-top:2px solid #333333;padding-top: 10px; margin-right: 20px;"></div>');
    play_bg_outer_div.append(play_bg_button);
    document.querySelector('#mainbg_pre').append(play_bg_outer_div);
    
})

document.querySelector('#mainbg_video_pre').addEventListener('click', ()=>{
    let card = document.querySelector('.card');
    card.style["opacity"] = "1";
});

