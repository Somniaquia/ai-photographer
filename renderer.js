//#region Websocket
function connectWebSocket() {
    socket = new WebSocket('ws://localhost:8765'); 
    
    socket.onopen = () => {
        console.log("WebSocket is open now.");
        retryCount = 0;
    };
    
    socket.onclose = (event) => {
        if (event.wasClean) {
            console.log(`Connection closed cleanly, code=${event.code}, reason=${event.reason}`);
        } else {
            console.log('Connection lost, retrying... Retry Cound: ', retryCount);
            retryCount++;
            setTimeout(connectWebSocket, 1000);
        }
    };

    socket.onmessage = (event) => {
        console.log('Message from server: ', event.data);
        let receivedData = JSON.parse(event.data);
        let imageData = receivedData.image_data;
    };    
    
    socket.addEventListener('error', (event) => {
        console.log('Error: ', event);
    });
}

function sendDataToServer(data) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
    } else {
        console.log('WebSocket is NOT open. Data is not sent.');
    }
}

let socket;
let retryCount = 0;

connectWebSocket();
//#endregion

navigator.mediaDevices.getUserMedia({ audio: false, video: true })
    .then(function (stream) {
        let video = document.getElementById("preview_video");
        video.srcObject = stream;
        video.onloadedmetadata = function (e) {
            video.play();
        };
    })
    .catch(function (err) {
        console.log(err);
    });

let clicked = false;

function takePhotoHandler() {
    if (clicked == true) return;
    clicked = true;

    let timer_elem = document.getElementById("timer");
    let main_loop_timer = 0; 
    let main_loop = setInterval(() => {
        if (main_loop_timer != 0 && main_loop_timer % 3 == 0) {
            takePhoto();
        }
        timer_elem.innerText = 3 - (main_loop_timer % 3);
        if (main_loop_timer >= 13) {
            drawResult(img_url_1, img_url_2, img_url_3, img_url_4);
            clearInterval(main_loop);
        }
        main_loop_timer++;
    }, 1000);
}

let photo_index = 1;

function takePhoto() {
    let canvas = document.getElementById("canvas");
    const context = canvas.getContext('2d');

    width = 1280;
    height = 720;

    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    const data = canvas.toDataURL('image/png');
    socket.send(JSON.stringify({ photo_index, data }));

    photo_index++;
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