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
var nodemailer = require('nodemailer');
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'isdj2023photozone@gmail.com',
        pass: 'SchoolExplodes'
    },
    port: 465,
    secure: true,
    tls: {
        rejectUnauthorized: false
    }
});

async function sendEmail(receiver) {
    try {
        let message = {
            from: 'isdj2023photozone@gmail.com',
            to: receiver,
            subject: '체험주간에 찍으신 엽기 AI 사진입니다!',
        text: '정말 괴상하군요!',
        html: '<p>정말 괴상하군요!</p>',
        attachments: [
            {
                filename: 'image.jpg', // The file name you want the recipient to see
                path: 'final_image.jpg' // Full path to the image file
            }]
        };

        let info = await transporter.sendMail(message);
        console.log('Message sent successfully:', info.messageId);
    } catch (error) {
        console.log(error);
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

navigator.mediaDevices.getUserMedia({ audio: false, video: { width : 1280, height : 720 } })
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
        
        drawResult();
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

function drawResult() {
    const canvas_result = document.getElementById("result_canvas");
    const ctx = canvas_result.getContext("2d");

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 400, 1080);

    for (let i = 0; i < 4; i++) {
        let img = new Image();
        img.src = `processed_image_${i + 1}.png`;
        img.onload = () => {
            ctx.drawImage(img, 40, 40 + (220*i), 320, 180);
        };
    }

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
    const canvas = document.getElementById("result_canvas")
    
    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    const imgBuffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(`final_image_${receiver_address}.png`, imgBuffer);

    // sendEmail(receiver_address)
}

function showResultOverlay(img_obj_url) {
    document.getElementById("result_overlay").style.display = "block";
    document.getElementById("result_pop_img").src = img_obj_url;
}
//#endregion