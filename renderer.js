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
const { desktopCapturer, remote } = require('electron');
const { ipcRenderer } = require('electron');
const fs = require('fs');

document.getElementById('result_pop_img').addEventListener('click', () => {
    ipcRenderer.send('reload-app');
});

navigator.mediaDevices.getUserMedia({ audio: false, video: { width : 640, height : 416 } })
    .then(function (stream) {
        for (let i = 1; i <= 4; i++) {
            video = document.getElementById(`video_${i}`);
            video.srcObject = stream;
            video.onloadedmetadata = function (e) {
                video.play();
            };
        }
    })
    .catch(function (err) {
        console.log(err);
    });

let clicked = false;

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function takePhotos() {
    try {
        for (let i = 1; i <= 4; i++) {
            await takePhoto(i);
            
            if (fs.existsSync(`processed_image_${i}.png`)) {
                document.getElementById(`video_${i}`).poster = `processed_image_${i}.png`;
            } else {
                console.error(`Image does not exist: ${`processed_image_${i}.png`}`);
            }
        }
        
        setTimeout(() => {
            generateResult();
        }, 2000);
    } catch (error) {
        console.error(`Error:`, error);
    }
}

async function takePhoto(photo_index) {
    let video = document.getElementById("video_4");
    let canvas = document.createElement("canvas");
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    const imgBuffer = Buffer.from(base64Data, 'base64');
    document.getElementById(`video_${photo_index}`).srcObject = null;
    fs.writeFileSync(`image_${photo_index}.png`, imgBuffer);

    document.getElementById(`video_${photo_index}`).poster = `image_${photo_index}.png`;

    return new Promise((resolve, reject) => {
        socket.send(JSON.stringify({ "image_index": photo_index }));
        
        socket.onmessage = function (event) {
            let response = JSON.parse(event.data);
            console.log('Message received:', event.data);

            if (response.success == true) {
                if (response.progress == 20) {
                    resolve();
                    displayProgressBar(0, photo_index);
                } else {
                    displayProgressBar(response.progress, photo_index);
                }
            } else {
                reject(new Error(`Server error for photo ${photo_index}: ${response.error}`));
                
            }
        };
    });
}

function displayProgressBar(progress, photo_index) {
    let progressBar = document.getElementById('progress');

    let position = document.getElementById(`video_${photo_index}`).getBoundingClientRect();
    progressBar.style.top = position.y + 20 + "px";
    progressBar.style.left = position.x + 30 + "px";

    if (progress != 0) {
        progressBar.style.visibility = "visible";
        let bar = document.getElementById('bar');
        bar.style.width = progress * 5 + "%";
    } else {
        progressBar.style.visibility = "hidden";
    }
}

async function drawResult() {
    html2canvas(document.querySelector("body")).then(canvas => {
        document.body.appendChild(canvas);
    });
}

function saveResult() {
    const canvas = document.getElementById("result_canvas");
    
    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    const imgBuffer = Buffer.from(base64Data, 'base64');

    let receiver_address = document.getElementById("email_input_input").value;
    fs.writeFileSync(`outputs/${receiver_address}.png`, imgBuffer);
    // sendEmail(receiver_address)

    for (let i = 1; i <= 4; i++) {
        fs.unlinkSync(`image_${i}.png`)
        fs.unlinkSync(`processed_image_${i}.png`)
    }
}

function showResultOverlay(img_obj_url) {
    document.getElementById("result_overlay").style.display = "block";
    document.getElementById("result_pop_img").src = img_obj_url;
}
//#endregion

window.onload = () => {
    document.getElementById("canvas").addEventListener('click', takePhotos);
};

function generateResult() {
    const canvas = document.getElementById("result_canvas");
    const ctx = canvas.getContext('2d');

    const backgroundImg = new Image();
    backgroundImg.src = "./img/canvas.jpg";
    ctx.drawImage(backgroundImg, 0, 0, 1920, 1080);
    
    // const img1 = document.getElementById("video_1");
    // const img2 = document.getElementById("video_2");
    // const img3 = document.getElementById("video_3");
    // const img4 = document.getElementById("video_4");

    const img1 = new Image();
    img1.src = "./processed_image_1.png";
    const img2 = new Image();
    img2.src = "./processed_image_2.png";
    const img3 = new Image();
    img3.src = "./processed_image_3.png";
    const img4 = new Image();
    img4.src = "./processed_image_4.png";

    const img1f = flip_image(img1);
    const img2f = flip_image(img2);
    const img3f = flip_image(img3);
    const img4f = flip_image(img4);

    drawImageBorder(ctx, 170, 122, 640, 416, 10);
    drawImageBorder(ctx, 865, 122, 640, 416, 10);
    drawImageBorder(ctx, 425, 590, 640, 416, 10);
    drawImageBorder(ctx, 1120, 590, 640, 416, 10);
    roundedImage(ctx, img1f, 170, 122, 640, 416, 10);
    roundedImage(ctx, img2f, 865, 122, 640, 416, 10);
    roundedImage(ctx, img3f, 425, 590, 640, 416, 10);
    roundedImage(ctx, img4f, 1120, 590, 640, 416, 10);

    showResultOverlay(canvas.toDataURL('image/data'));
}

function drawImageBorder(ctx, x, y, width, height, radius) {
    ctx.roundRect(x - 2, y - 2, width + 4, height + 4, radius);
    ctx.fill();
}

function roundedImage(ctx, img, x, y, width, height, radius) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, width, height);
    ctx.restore();
}

function flip_image(img) {
    const new_img = img;

    return new_img;
}