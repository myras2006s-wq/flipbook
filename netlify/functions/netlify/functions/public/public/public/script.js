// public/script.js

const form = document.getElementById('generate-form');
const statusArea = document.getElementById('status-area');
const resultArea = document.getElementById('result-area');
const errorArea = document.getElementById('error-area');
const frameNumberEl = document.getElementById('frame-number');
const statusTextEl = document.getElementById('status-text');
const generateBtn = document.getElementById('generate-btn');
const resultVideo = document.getElementById('result-video');
const downloadLink = document.getElementById('download-link');
const resetBtn = document.getElementById('reset-btn');

let pollTimer = null;
let frameTimer = null;
let frameCount = 0;

const STYLE_PROMPTS = {
  '2d': '2D animated cartoon style, flat colors, clean bold outlines',
  pixar: '3D Pixar-style animation, soft lighting, expressive character design',
  anime: 'Japanese anime style, cel-shaded, vibrant colors',
  watercolor: 'watercolor animation style, painterly textures, soft edges',
  clay: 'stop-motion claymation style, handcrafted clay textures',
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hide(errorArea);
  hide(resultArea);

  const prompt = document.getElementById('prompt').value.trim();
  const style = document.getElementById('style').value;
  const ratio = document.getElementById('ratio').value;
  const duration = Number(document.getElementById('duration').value);
  const fullPrompt = `${prompt}, ${STYLE_PROMPTS[style]}`;

  setGenerating(true);
  show(statusArea);
  startFrameCounter();
  setStatusText('Sending your scene to the studio…');

  try {
    const res = await fetch('/.netlify/functions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: fullPrompt, ratio, duration }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'The studio could not start this take.');
    pollStatus(data.taskId);
  } catch (err) {
    stopFrameCounter();
    hide(statusArea);
    showError(err.message);
    setGenerating(false);
  }
});

function pollStatus(taskId) {
  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`/.netlify/functions/status?taskId=${encodeURIComponent(taskId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lost contact with the studio.');

      if (data.status === 'SUCCEEDED') {
        clearInterval(pollTimer);
        stopFrameCounter();
        hide(statusArea);
        const videoUrl = data.output && data.output[0];
        resultVideo.src = videoUrl;
        downloadLink.href = videoUrl;
        show(resultArea);
        setGenerating(false);
      } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
        clearInterval(pollTimer);
        stopFrameCounter();
        hide(statusArea);
        showError('This take did not render. Try simplifying the scene, then generate again.');
        setGenerating(false);
      } else {
        setStatusText(describeStatus(data.status));
      }
    } catch (err) {
      clearInterval(pollTimer);
      stopFrameCounter();
      hide(statusArea);
      showError(err.message);
      setGenerating(false);
    }
  }, 4000);
}

function describeStatus(status) {
  switch (status) {
    case 'PENDING':
    case 'QUEUED':
      return 'Queued at the studio…';
    case 'RUNNING':
    case 'THROTTLED':
      return 'Drawing your frames…';
    default:
      return 'Working on your scene…';
  }
}

function startFrameCounter() {
  frameCount = 0;
  frameNumberEl.textContent = pad(frameCount);
  frameTimer = setInterval(() => {
    frameCount += 24;
    frameNumberEl.textContent = pad(frameCount);
  }, 1000);
}

function stopFrameCounter() {
  clearInterval(frameTimer);
}

function pad(n) {
  return String(n).padStart(5, '0');
}

function setStatusText(text) {
  statusTextEl.textContent = text;
}

function showError(message) {
  errorArea.textContent = message;
  show(errorArea);
}

function setGenerating(isGenerating) {
  generateBtn.disabled = isGenerating;
  generateBtn.textContent = isGenerating ? 'Generating…' : 'Generate';
}

resetBtn.addEventListener('click', () => {
  hide(resultArea);
  form.reset();
});

function show(el) {
  el.hidden = false;
}

function hide(el) {
  el.hidden = true;
}
