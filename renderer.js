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
            setTimeout(connectWebSocket, 5000);
        }
    };

    socket.addEventListener('error', (event) => {
        console.log('Error: ', event);
    });
}

let socket;
let retryCount = 0;

connectWebSocket();
//#endregion

//#region Utility for Sending Emails
var mailer = require('nodemailer');

mailer.SMTP = {
    host: 'gmail.com',
    port: 587,
    use_authentication: true,
    user: 'isdj2023photozone@gmail.com',
    pass: 'SchoolExplodes'
};

function post_mail(receiver, data) {
    mailer.send_mail({
        sender: 'isdj2023photozone@gmail.com',
        to: receiver,
        subject: '체험주간에 찍으신 엽기 AI 사진입니다!',
        body: '정말 괴상하군요!',
        attachments: [{ 'filename': 'attatchment.txt', 'content': data }]
    }), function (err) {
        if (err) {
            console.log("Error while sending the email: ", err)
        }
    }
}
//#endregion

//#region Main Application
const { ipcRenderer } = require('electron');
const fs = require('fs');

document.getElementById('reloadButton').addEventListener('click', () => {
    ipcRenderer.send('reload-app');
});

document.getElementById('result_pop_img').addEventListener('click', () => {
    ipcRenderer.send('reload-app');
});

navigator.mediaDevices.getUserMedia({ audio: false, video: true })
    .then(function (stream) {
        video = document.getElementById("preview_video");
        video.srcObject = stream;
        video.onloadedmetadata = function (e) {
            video.play();
        };
    })
    .catch(function (err) {
        console.log(err);
    });

let clicked = false;

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function takePhotos() {
    try {
        if (clicked) return;
        clicked = true;
        
        let timer_elem = document.getElementById("timer");
        let images = [];

        for (let i = 1; i <= 4; i++) {
            for (let j = 0; j <= 3; j++) {
                timer_elem.innerText = 3 - j;
                await sleep(1000);
            }
            
            await takePhoto(i);
            const imagePath = path.join(`processed_image_${i}.png`);
            
            if (fs.existsSync(imagePath)) {
                document.getElementById(`img_${i}`).src = imagePath;
                document.getElementById(`img_${i}`).style.display = 'block';
            } else {
                console.error(`Image does not exist: ${imagePath}`);
            }
        }
        
        drawResult(img_url_1, img_url_2, img_url_3, img_url_4);
        sendFinalResult();
    } catch (error) {
        console.error(`Error:`, error);
    }
}

async function takePhoto(photo_index) {
    let canvas = document.getElementById("canvas");
    const context = canvas.getContext('2d');

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    const imgBuffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync('image.png', imgBuffer);

    return new Promise((resolve, reject) => {
        socket.send(JSON.stringify({ "image_index": photo_index }));

        socket.onmessage = function (event) {
            let response = JSON.parse(event.data);
            console.log('Message received:', event.data);

            if (response.success == true) {
                resolve();
            } else {
                reject(new Error(`Server error for photo ${photo_index}: ${response.error}`));
            }
        };
    });
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

function sendFinalResult() {
    let receiver_address = document.getElementById("email_input_input").value;
    const data = document.getElementById("result_canvas")
    
    post_mail(receiver_address, data)
}

function showResultOverlay(img_obj_url) {
    document.getElementById("result_overlay").style.display = "block";
    document.getElementById("result_pop_img").src = img_obj_url;
}
//#endregion