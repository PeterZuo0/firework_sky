// 按6重载网页 加载麦克风
// 按7播放动画 并开启声音触发烟花模式

// 新的烟花颜色配置
const colors = {
    fireworks: [
        "#D94625",
        "#BF4E98",
        "#FFD400",
    ]
};

let video;
let video2;
let canvas;
let button;
let nonBlackPixels = []; // 存储非黑色像素坐标的数组
let lastUpdateTime = 0; // 记录上次更新时间
let updateInterval = 500; // 更新间隔：0.5秒 = 500毫秒，提高响应速度
let pixelGraphics; // 用于GPU加速的graphics对象
let pixelBuffer; // 像素点缓冲区
let isProcessing = false; // 防止重复处理
let gifPerson;
let grassPng;

let mic;
let vol = 0;

// 新的烟花系统变量
const g = 0.1;
let particles = [];
let glow = {
    x: -1000,
    y: -1000,
    radius: 1000,
    color: null,
    alpha: 0
};

// 播放间隔
let lastFireworkTime = 0;       // 上一次发射的时间
let fireworkInterval = 300;    // 最小间隔时间（单位：毫秒）

// === 新增：声音触发烟花模式开关 ===
let soundFireworkEnabled = false;

function setup() {
    canvas = createCanvas(1920, 1080); // 移除WEBGL模式，使用普通2D模式

    // 创建离屏graphics对象用于绘制像素点
    pixelGraphics = createGraphics(width, height);
    pixelBuffer = createGraphics(width, height);

    video = createVideo('assets/n_prople.mov');
    video.hide();

    video2 = createVideo('assets/back1.mp4');
    video2.hide();

    grassPng = loadImage('assets/grass.png')

    textAlign(LEFT);
    noStroke();

    // 设置为更大的半径（超出全屏）
    glow.radius = max(width, height) * 2.5;

    // 创建音频输入
    mic = new p5.AudioIn();
    mic.start();
}

function draw() {
    // 半透明黑色背景，营造残影效果
    // background(0, 0, 0, 80);

    // 获取麦克风音量（0.0到1.0）
    vol = mic.getLevel();
    let currentTime = millis();

    // === 修改：只有在声音触发模式开启后，才用声音触发烟花 ===
    if (soundFireworkEnabled && vol > 0.01 && currentTime - lastFireworkTime > fireworkInterval) {
        console.log(vol);
        if (nonBlackPixels.length > 0) {
            // 随机选择一个非黑色像素坐标
            let randomIndex = floor(random(nonBlackPixels.length));
            let selectedPixel = nonBlackPixels[randomIndex];

            launchFireworkAt(selectedPixel.x + random(-1100, 1100), selectedPixel.y + random(-200, 100));
            console.log(`烟花发射！位置: (${selectedPixel.x}, ${selectedPixel.y}), 颜色: RGB(${selectedPixel.r}, ${selectedPixel.g}, ${selectedPixel.b})`);
            lastFireworkTime = currentTime; // 更新最后发射时间
        }
    }


    image(video2, 0, 0);

    // 绘制淡化的超大光晕
    if (glow.alpha > 0) {
        push();
        let grad = drawingContext.createRadialGradient(
            glow.x, glow.y, 0,
            glow.x, glow.y, glow.radius
        );
        let c = color(glow.color);
        grad.addColorStop(0, `rgba(${red(c)},${green(c)},${blue(c)},${glow.alpha * 0.2})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        drawingContext.fillStyle = grad;
        drawingContext.beginPath();
        drawingContext.arc(glow.x, glow.y, glow.radius, 0, Math.PI * 2);
        drawingContext.fill();
        glow.alpha *= 0.92;
        if (glow.alpha < 0.01) glow.alpha = 0;
        pop();
    }

    // 🔄 绘制视频（人物层）
    push();
    translate(0, -50);
    tint(255, 255);
    if (video.loadedmetadata) {
        // image(video, 0, 0, width, height);
    }
    pop();

    // 烟花粒子
    push();
    for (const p of particles) {
        p.draw();
        p.move();
    }
    particles = particles.filter(p => p.active);
    pop();

    if (millis() - lastUpdateTime > updateInterval && video.loadedmetadata && !isProcessing) {
        isProcessing = true;
        setTimeout(() => {
            updateNonBlackPixels();
            updatePixelGraphics();
            isProcessing = false;
        }, 0);
        lastUpdateTime = millis();
    }

    image(grassPng, 0, 0);
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

function createFirework() {
    if (nonBlackPixels.length > 0) {
        let randomIndex = floor(random(nonBlackPixels.length));
        let selectedPixel = nonBlackPixels[randomIndex];
        launchFireworkAt(selectedPixel.x, selectedPixel.y);
        console.log(`烟花发射！位置: (${selectedPixel.x}, ${selectedPixel.y}), 颜色: RGB(${selectedPixel.r}, ${selectedPixel.g}, ${selectedPixel.b})`);
    }
}

function launchFireworkAt(x, y) {
    glow.x = x;
    glow.y = y;
    glow.color = random(colors.fireworks);
    glow.alpha = 1;

    for (let i = 0; i < 40; i++) {
        const vec = p5.Vector.random2D().mult(random(2, 5));
        particles.push(new Particle(
            x,
            y,
            glow.color,
            random(10,20),
            vec.x,
            vec.y,
            random(40, 60) * random(0.7, 1.3)
        ));
    }
}

// === 新增：把按7后的逻辑提取到一个函数里 ===
function startAnimationMode() {
    // 开启声音触发烟花模式
    soundFireworkEnabled = true;

    // 播放视频、GIF
    video.loop();
    video2.loop();
    gifPerson = createImg('assets/透明底.gif');
    gifPerson.position(0, -50);

    // 请求全屏
    let fsElement = document.documentElement;
    if (fsElement.requestFullscreen) {
        fsElement.requestFullscreen();
    } else if (fsElement.mozRequestFullScreen) {
        fsElement.mozRequestFullScreen();
    } else if (fsElement.webkitRequestFullscreen) {
        fsElement.webkitRequestFullscreen();
    } else if (fsElement.msRequestFullscreen) {
        fsElement.msRequestFullscreen();
    }
}

function keyPressed() {
    if (key === ' ') {
        if (nonBlackPixels.length > 0) {
            let randomIndex = floor(random(nonBlackPixels.length));
            let selectedPixel = nonBlackPixels[randomIndex];
            launchFireworkAt(selectedPixel.x + random(-600,1100), selectedPixel.y);
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


    if(key === '8'){
        video.loop(); // 播放视频
        video2.loop();
        gifPerson = createImg('assets/透明底.gif');

        gifPerson.position(0,-50);

        let fsElement = document.documentElement; // 获取文档的根元素
        if (fsElement.requestFullscreen) {
            fsElement.requestFullscreen(); // 请求全屏
        } else if (fsElement.mozRequestFullScreen) {
            fsElement.mozRequestFullScreen(); // Firefox
        } else if (fsElement.webkitRequestFullscreen) {
            fsElement.webkitRequestFullscreen(); // Chrome, Safari, and Opera
        } else if (fsElement.msRequestFullscreen) {
            fsElement.msRequestFullscreen(); // IE/Edge
        }


    }
}

// === 新增：在移动端触碰屏幕也触发同样效果 ===
function touchStarted() {
    startAnimationMode();
    return false;  // 阻止默认的滚动/缩放行为
}

function mousePressed() {
    // 保留空实现
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
    console.log(`检测到 ${nonBlackPixels.length} 个非黑色像素 (限制: ${maxPixels})`);
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
    let fsElement = document.documentElement;
    if (fsElement.requestFullscreen) {
        fsElement.requestFullscreen();
    } else if (fsElement.mozRequestFullScreen) {
        fsElement.mozRequestFullScreen();
    } else if (fsElement.webkitRequestFullscreen) {
        fsElement.webkitRequestFullscreen();
    } else if (fsElement.msRequestFullscreen) {
        fsElement.msRequestFullscreen();
    }
}

function getNonBlackPixels() {
    return nonBlackPixels;
}

function setUpdateInterval(interval) {
    updateInterval = interval;
    console.log(`更新间隔设置为: ${interval}ms`);
}

function clearAllFireworks() {
    particles = [];
    glow.alpha = 0;
    console.log('所有烟花效果已清除');
}

function launchFireworkShow(count = 10, interval = 500) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            createFirework();
        }, i * interval);
    }
}

// 每5秒自动调整性能
setInterval(() => {
    if (video.loadedmetadata) {
        adjustPerformance();
    }
}, 5000);
