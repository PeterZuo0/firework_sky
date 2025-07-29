/**
 * myVideo.js
 * Interactive p5.js sketch: video + audio-triggered fireworks animation
 */

// ─── Firework color palette for random selection ─────────────────────────────────
const colors = {
    fireworks: [
        '#D94625',
        '#BF4E98',
        '#FFD400'
    ]
};

// ─── Video sources ─────────────────────────────────────────────────────────────
let video;   // Foreground video used for pixel sampling
let video2;  // Background video displayed continuously

// ─── Graphics buffers for pixel analysis ────────────────────────────────────────
let canvas;            // Main p5.js canvas
let pixelGraphics;     // Off-screen graphics for drawing sampled pixels
let pixelBuffer;       // Buffer for intermediate pixel operations

// ─── Asset images ─────────────────────────────────────────────────────────────
let grassPng;          // Static grass overlay
let gifPerson;         // Dynamic GIF overlay (created on start)

// ─── Control flags and states ─────────────────────────────────────────────────
let started = false;            // Indicates if "animation mode" has begun
let soundFireworkEnabled = false; // Enables sound-triggered fireworks

// ─── Audio input ──────────────────────────────────────────────────────────────
let mic;    // p5.AudioIn() for microphone input
let vol = 0; // Current microphone volume level (0.0–1.0)

// ─── Firework system variables ────────────────────────────────────────────────
const g = 0.1;              // Gravity acceleration applied to particles
let particles = [];         // Array holding active Particle instances
let glow = {                // Parameters for central glow effect
    x: -1000,
    y: -1000,
    radius: 0,
    color: null,
    alpha: 0
};

// ─── Pixel analysis parameters ────────────────────────────────────────────────
let nonBlackPixels = [];    // Sampled coords and colors of non-black pixels
let lastUpdateTime = 0;     // Timestamp of last pixel analysis
let updateInterval = 500;   // ms between pixel analysis runs
let isProcessing = false;   // Prevent overlapping analysis calls

// ─── Firework emission timing ────────────────────────────────────────────────
let lastFireworkTime = 0;   // Timestamp of last firework launch
let fireworkInterval = 300; // Minimum ms interval between auto fireworks

// ─── p5.js setup: initialize canvas, load assets, start audio ────────────────
function setup() {
    canvas = createCanvas(windowWidth, windowHeight);
    pixelDensity(1);               // Improve performance on low-power devices
    pixelGraphics = createGraphics(width, height);
    pixelBuffer   = createGraphics(width, height);

    video  = createVideo('assets/n_prople.mov');
    video.hide();
    video.elt.setAttribute('playsinline', '');        // iOS Safari
    video.elt.setAttribute('webkit-playsinline', ''); // 老版 iOS WebKit
    video.elt.muted = true;                           // 必须静音，才能允许自动或内联播放
    video.elt.controls = false;                       // 彻底关闭原生控件

    video2 = createVideo('assets/back1.mp4');   video2.hide();
    grassPng = loadImage('assets/grass.png');
    video2.elt.setAttribute('playsinline', '');
    video2.elt.setAttribute('webkit-playsinline', '');
    video2.elt.muted = true;
    video2.elt.controls = false;

    textAlign(LEFT);
    noStroke();

    glow.radius = max(width, height) * 2.5; // Set glow radius beyond screen

    mic = new p5.AudioIn();
    mic.start();

}

// ─── Handle window resize: update canvas and glow radius ─────────────────────
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    glow.radius = max(width, height) * 2.5;
}

// ─── Main render loop: show start screen or run animation ─────────────────────
function draw() {
    background(0, 0, 0, 80); // Semi-transparent black for motion blur effect

    if (!started) {
        // Start screen: show static background and "Touch to Start" prompt
        if (video2.loadedmetadata) {
            image(video2, 0, 0, width, height);
        }
        push();
        imageMode(CENTER);
        // 在画布中心按 1:1 拉伸填满，可能要保持视频原始宽高比
        image(video2, width/2, height/2, width, height);
        pop();
        push();
        textAlign(CENTER, CENTER);
        textSize(min(width, height) * 0.05);
        fill(255);
        text('Touch to Start', width / 2, height / 2);
        pop();
        return;
    }

    // Update microphone volume
    vol = mic.getLevel();
    let now = millis();
    // console.log(`Mic vol: ${vol}`)
    // Auto-launch fireworks on sound if enabled
    if (soundFireworkEnabled && vol > 0.01 && now - lastFireworkTime > fireworkInterval) {
        if (nonBlackPixels.length > 0) {
            let idx = floor(random(nonBlackPixels.length));
            let p = nonBlackPixels[idx];
            launchFireworkAt(p.x + random(-600,500), p.y + random(-200, 100));
            console.log(`Firework Launch! volume at: ${vol}, position at: ${p.x}, ${p.y}`)
            lastFireworkTime = now;
        }
    }
    if (vol <= 0.005){
        getAudioContext().resume();
    }

    // Draw background video
    image(video2, 0, 0, width, height);

    // Draw glow effect if active
    if (glow.alpha > 0) drawGlow();

    // Draw and update particles
    particles.forEach(p => { p.draw(); p.move(); });
    particles = particles.filter(p => p.active);

    // Periodic pixel sampling for fireworks origin
    if (now - lastUpdateTime > updateInterval && video.loadedmetadata && !isProcessing) {
        isProcessing = true;
        setTimeout(() => {
            updateNonBlackPixels();
            updatePixelGraphics();
            isProcessing = false;
        }, 0);
        lastUpdateTime = now;
    }

    // Draw grass overlay
    image(grassPng, 0, 0, width, height);
}

// ─── Draw radial glow at the last firework location ─────────────────────────
function drawGlow() {
    push();
    let ctx = drawingContext;
    let grad = ctx.createRadialGradient(
        glow.x, glow.y, 0,
        glow.x, glow.y, glow.radius
    );
    let c = color(glow.color);
    grad.addColorStop(0, `rgba(${red(c)},${green(c)},${blue(c)},${glow.alpha * 0.2})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(glow.x, glow.y, glow.radius, 0, TWO_PI);
    ctx.fill();
    glow.alpha *= 0.92;
    if (glow.alpha < 0.01) glow.alpha = 0;
    pop();
}

// 新的粒子类
class Particle {
    constructor(x, y, colorStr, size, vx, vy, life) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color(colorStr);
        this.size = size;
        this.defaultSize = size;
        this.life = life;
        this.defaultLife = life;
    }

    draw() {
        push();
        resetMatrix();
        fill(this.color);
        drawingContext.shadowBlur = 40;
        drawingContext.shadowColor = this.color;
        rect(this.x, this.y, this.size)
        pop();
    }

    move() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += g;
        this.life -= 1;
        if (this.life <= 0) {
            this.active = false;
        }
        this.size = this.defaultSize * this.life / this.defaultLife;
    }
}


// ─── Launch a firework at (x,y): set glow and spawn particles ─────────────
function launchFireworkAt(x, y) {
    glow.x = x; glow.y = y;
    glow.color = random(colors.fireworks);
    glow.alpha = 1;
    for (let i = 0; i < 40; i++) {
        let vec = p5.Vector.random2D().mult(random(2, 5));
        particles.push(new Particle(
            x, y,
            glow.color,
            random(10, 20),
            vec.x, vec.y,
            random(40, 60) * random(0.7, 1.3)
        ));
    }
}

// ─── Start animation: enable sound trigger, loop videos, create GIF ────────
function startAnimationMode() {
    if (started) return;
    started = true;
    soundFireworkEnabled = true;

    // mic.start();

    video.loop();
    video2.loop();
    gifPerson = createImg('assets/透明底.gif','',{
        parent: 'createImgContainer'
    });

    const offsetY = windowHeight * 0.10;
    const cutHeight = windowHeight / 4 * 3
    const halfHeightRatio = cutHeight / 1080
    gifPerson.size(halfHeightRatio*1920, cutHeight);

    // const gw = gifPerson.width;
    // const gh = gifPerson.height;
    // // 保证画布已创建好才能拿到 width/height
    // gifPerson.position(
    //     (windowWidth  - gw) / 2,
    //     ((windowHeight - gh) / 2)
    // );

    // 如果你的 GIF 会动态拿不到宽高，可以用一个定时或 onload：
    gifPerson.elt.onload = () => {
        const gw = gifPerson.width;
        const gh = gifPerson.height;
        gifPerson.position(
            (windowWidth  - gw) / 2,
            (windowHeight - gh) / 2 + offsetY
        );
    };
    // document.documentElement.requestFullscreen();
    // —— 原生全屏调用 ——
    // const fsElem = document.documentElement;  // 整个页面
    // if (fsElem.requestFullscreen) {
    //     fsElem.requestFullscreen();
    // } else if (fsElem.webkitRequestFullscreen) {      // Safari, old iOS
    //     fsElem.webkitRequestFullscreen();
    // } else if (fsElem.mozRequestFullScreen) {          // Firefox
    //     fsElem.mozRequestFullScreen();
    // } else if (fsElem.msRequestFullscreen) {           // IE/Edge
    //     fsElem.msRequestFullscreen();
    // }
}

function keyPressed() {
    if (!started) {
        // mic.start()
        startAnimationMode();
    }

    if (key === ' ') {
        if (nonBlackPixels.length > 0) {
            let randomIndex = floor(random(nonBlackPixels.length));
            let selectedPixel = nonBlackPixels[randomIndex];
            launchFireworkAt(selectedPixel.x + random(-600,500), selectedPixel.y);
            console.log(`烟花发射！位置: (${selectedPixel.x}, ${selectedPixel.y}), 颜色: RGB(${selectedPixel.r}, ${selectedPixel.g}, ${selectedPixel.b})`);
        }
        return false;
    }

    if (key === '6') {
        location.reload();
    }

    if (key === '7') {

        // === 修改：改为调用 startAnimationMode() ===
        startAnimationMode();
    }

}

function touchStarted() {
    // 一定要在同一手势里同步执行下面几步
    getAudioContext().resume();     // 唤醒 AudioContext
    mic.start();

    document.documentElement.requestFullscreen()
        .catch(err => console.warn('全屏失败:', err));

    startAnimationMode();
    launchFireworkAt(mouseX + random(-600,1100), mouseY + random(-60,100));
    return false;
}

function mousePressed() {
    getAudioContext().resume();
    mic.start();
    fullscreen(true);   // 如果桌面也想全屏
    startAnimationMode();
    launchFireworkAt(
        mouseX + random(-600, 1100),
        mouseY + random(-60, 100)
    );
    return false;
}


function updateNonBlackPixels() {
    nonBlackPixels = [];
    video.loadPixels();
    let step = 10;
    let maxPixels = 2000;
    let videoDisplayWidth = width;
    let videoDisplayHeight = height;
    let videoOffsetX = 0;
    let videoOffsetY = -50;
    let scaleX = videoDisplayWidth / video.width;
    let scaleY = videoDisplayHeight / video.height;
    let threshold = 50;

    for (let y = 0; y < video.height && nonBlackPixels.length < maxPixels; y += step) {
        for (let x = 0; x < video.width && nonBlackPixels.length < maxPixels; x += step) {
            let index = (y * video.width + x) * 4;
            if (index >= 0 && index < video.pixels.length) {
                let r = video.pixels[index];
                let g = video.pixels[index + 1];
                let b = video.pixels[index + 2];
                if (r > threshold || g > threshold || b > threshold) {
                    let canvasX = x * scaleX + videoOffsetX;
                    let canvasY = y * scaleY + videoOffsetY;
                    nonBlackPixels.push({ x: canvasX, y: canvasY, r, g, b });
                }
            }
        }
    }
    // console.log(`检测到 ${nonBlackPixels.length} 个非黑色像素 (限制: ${maxPixels})`);
}

function updatePixelGraphics() {
    pixelGraphics.clear();
    pixelGraphics.background(0, 0);
    pixelGraphics.push();
    pixelGraphics.noStroke();
    let colorGroups = {};

    for (let pixel of nonBlackPixels) {
        let key = `${pixel.r},${pixel.g},${pixel.b}`;
        if (!colorGroups[key]) colorGroups[key] = [];
        colorGroups[key].push(pixel);
    }

    for (let colorKey in colorGroups) {
        let [r, g, b] = colorKey.split(',').map(Number);
        pixelGraphics.fill(r, g, b, 180);
        for (let pixel of colorGroups[colorKey]) {
            pixelGraphics.ellipse(pixel.x, pixel.y, 4, 4);
        }
    }

    pixelGraphics.pop();
}

function getPerformanceStats() {
    return {
        fps: Math.round(frameRate()),
        pixelCount: nonBlackPixels.length,
        isProcessing,
        updateInterval,
        particlesCount: particles.length
    };
}

function adjustPerformance() {
    let fps = frameRate();
    if (fps < 30 && updateInterval < 1000) {
        updateInterval += 100;
        console.log(`性能调整: 更新间隔增加到 ${updateInterval}ms`);
    } else if (fps > 50 && updateInterval > 300) {
        updateInterval -= 50;
        console.log(`性能调整: 更新间隔减少到 ${updateInterval}ms`);
    }
}

function pauseVideo() {
    video.time(0);
    video.pause();
}

function startVideo() {
    video.loop();
    video2.loop();
    gifPerson = createImg('assets/透明底.gif');
    gifPerson.position(0, -50);
}


// 每5秒自动调整性能
setInterval(() => {
    if (video.loadedmetadata) {
        adjustPerformance();
    }
}, 5000);
