/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

navigator.mediaDevices.getUserMedia({ audio: false, video: { width: 1920, height: 1080 } })
    .then(function (stream) {
        let video = document.getElementById("preview_video");
        video.srcObject = stream;
        video.onloadedmetadata = function (e) {
            video.play();
        };
    })
    .catch(function (err) {
        console.log(err.name + ": " + err.message);
    });

let clicked = false;

function takePhotoHandler() {
    if (clicked == true) {
        return;
    }
    clicked = true;
    let timer_elem = document.getElementById("timer");
    let main_loop_timer = 0;
    let main_loop = setInterval(() => {
        if (main_loop_timer != 0 && main_loop_timer % 3 == 0) {
            takePhoto();
        }
        timer_elem.innerText = 3 - (main_loop_timer % 3);
        if (main_loop_timer >= 13) {
            // downloadFunc("1.jpg", img_url_1);
            // downloadFunc("2.jpg", img_url_2);
            // downloadFunc("3.jpg", img_url_3);
            // downloadFunc("4.jpg", img_url_4);
            drawResult(img_url_1, img_url_2, img_url_3, img_url_4);
            clearInterval(main_loop);
        }
        main_loop_timer++;
    }, 1000);
}

let img_url_1 = "";
let img_url_2 = "";
let img_url_3 = "";
let img_url_4 = "";

let photo_no = 1;

function takePhoto() {
    let canvas = document.getElementById("canvas");
    let video = document.getElementById("preview_video");
    const img1 = document.getElementById("img_1");
    const img2 = document.getElementById("img_2");
    const img3 = document.getElementById("img_3");
    const img4 = document.getElementById("img_4");
    let timer_elem = document.getElementById("timer");

    const context = canvas.getContext('2d');

    width = 1920;
    height = 1080;

    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    const data = canvas.toDataURL('image/png');

    if (photo_no == 1) {
        img1.setAttribute('src', data);
        img1.style.display = "block";
        img_url_1 = data;
    }
    else if (photo_no == 2) {
        img2.setAttribute('src', data);
        img2.style.display = "block";
        img_url_2 = data;
    }
    else if (photo_no == 3) {
        img3.setAttribute('src', data);
        img3.style.display = "block";
        img_url_3 = data;
    }
    else if (photo_no == 4) {
        img4.setAttribute('src', data);
        img4.style.display = "block";
        timer_elem.style.display = "none";
        img_url_4 = data;
    }

    photo_no++;
}

function downloadFunc(filename, link_obj) {
    let link = document.createElement('a');
    link.href = link_obj;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function drawResult(img_1, img_2, img_3, img_4) {
    const canvas_result = document.getElementById("result_canvas");
    const ctx = canvas_result.getContext("2d");

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 400, 1080);

    let img1 = new Image();
    img1.src = img_1;
    img1.onload = () => {
        ctx.drawImage(img1, 40, 40, 320, 180);
    };

    let img2 = new Image();
    img2.src = img_2;
    img2.onload = () => {
        ctx.drawImage(img2, 40, 260, 320, 180);
    };

    let img3 = new Image();
    img3.src = img_3;
    img3.onload = () => {
        ctx.drawImage(img3, 40, 480, 320, 180);
    };

    let img4 = new Image();
    img4.src = img_4;
    img4.onload = () => {
        ctx.drawImage(img4, 40, 700, 320, 180);
    };

    let img_logo = new Image();
    img_logo.src = "./img/logo.jpeg";
    img_logo.onload = () => {
        ctx.drawImage(img_logo, 50, 902, 300, 95);
    };

    ctx.fillStyle = "#FFFFFF";
    ctx.font = '28px "Fuzzy Bubbles"';
    let date = new Date();
    let text = date.getFullYear() + '. ' + (date.getMonth() + 1) + '. ' + date.getDate();
    ctx.fillText(text, 113, 1030);

    setTimeout(() => {
        showResultOverlay(document.getElementById("result_canvas").toDataURL('image/png'));
    }, 100);
}

function downloadFinalResult() {
    let finalFilename = document.getElementById("email_input_input").value;
    const download_url = document.getElementById("result_canvas").toDataURL('image/png');
    downloadFunc(String(finalFilename) + ".png", download_url);
}

function showResultOverlay(img_obj_url) {
    document.getElementById("result_overlay").style.display = "block";
    document.getElementById("result_pop_img").src = img_obj_url;
}