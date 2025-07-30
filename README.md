
# Firework Sky

---
## 🕹️ Click the link
### > This >> [Play around with this project](https://peterzuo0.github.io/firework_sky/) << This
---
## 🎆 What is this
Emotion-Driven Audio Interaction Design for Game Players – Inspired by Sky: Children of the Light

This project presents an innovative interaction experience where sound becomes the primary medium for emotional engagement. Drawing conceptual inspiration from Sky: Children of the Light, we have designed a pixel-style interactive webpage that transforms user voice input into a dynamic, audiovisual display. When users speak or play music into a microphone, fireworks bloom across the screen at randomized locations—ensuring that each session offers a one-of-a-kind visual spectacle.

The experience is designed to evoke emotion and create a sense of presence through gentle interactivity. A pixelated protagonist and their companion pet accompany the user throughout the journey, reinforcing warmth and emotional connection. The retro aesthetic not only pays homage to classic game visuals but also accentuates the sense of nostalgia and wonder.

By seamlessly blending voice interaction, emotional resonance, and visual storytelling, this project aims to deliver a deeply personal and memorable experience—one that celebrates beautiful moments through sound and light.

---
## 🎯 Project Overview

- **Background Video**: A looping video (`back1.mp4`) fills the canvas as a dynamic backdrop.
- **Foreground Video & GIF**: A second video (`n_prople.mov`) is sampled for non‑black pixels, and a transparent‑background GIF overlay tracks the main subject.
- **Audio Interaction**: Microphone input is analyzed in real time. When sound volume exceeds a threshold, fireworks launch at random bright spots in the video.
- **Touch / Click Controls**:
    - **First touch/click**: Starts videos, activates audio input, and displays the GIF.
    - **Subsequent taps**: Immediately launch fireworks around the tapped location.

---

## 🚀 Features

- **Responsive Canvas**: `createCanvas(windowWidth, windowHeight)` + `windowResized()` ensure full‑screen coverage on desktop and mobile.
- **Pixel Sampling**: Efficiently samples up to 2,000 non‑black pixels every 500ms to determine firework origins.
- **Particle System**: Custom `Particle` class simulates gravity and fading, with colorful glow effects.
- **Performance Tuning**: Automatic interval adjustment based on frame rate to maintain smooth animation.
- **Preloading**: Core assets (`grass.png`, background video) are preloaded to avoid broken placeholders.

---


## ▶️ Usage

1. Allow microphone access when prompted.
2. Tap or click anywhere on the canvas for starting.
3. Make noise (clap, speak) or tap again to trigger fireworks.
---
## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for full details.

---

*Enjoy the interactive fireworks!*
