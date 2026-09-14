const canvas = document.getElementById('lctCanvas');
const ctx = canvas.getContext('2d');

const circuitTracks = [];   
const microchipsSymbols = []; 
const dataStreams = [];

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
});

const countLong = 45; 
const countLat = 25;  
const baseRadius = 260; 
let time = 0;

window.clearCircuitBoard = function() {
  circuitTracks.length = 0;
  microchipsSymbols.length = 0;
};

window.triggerNodeElectricity = function(card) {
  const rect = card.getBoundingClientRect();
  clearCircuitBoard();

  const numTracks = 8;
  for (let i = 0; i < numTracks; i++) {
    let startX, startY;
    const side = i % 4;
    
    if (side === 0) { startX = rect.left + Math.random() * rect.width; startY = rect.top; } 
    else if (side === 1) { startX = rect.right; startY = rect.top + Math.random() * rect.height; } 
    else if (side === 2) { startX = rect.left + Math.random() * rect.width; startY = rect.bottom; } 
    else { startX = rect.left; startY = rect.top + Math.random() * rect.height; }

    const cardCenterX = rect.left + rect.width / 2;
    const cardCenterY = rect.top + rect.height / 2;
    const dirX = startX > cardCenterX ? 1 : -1;
    const dirY = startY > cardCenterY ? 1 : -1;

    const len1 = Math.random() * 40 + 20;
    const len2 = Math.random() * 50 + 30;
    const p1 = { x: startX, y: startY };
    
    let p2;
    if (Math.random() > 0.5) { p2 = { x: startX + len1 * dirX, y: startY }; } 
    else { p2 = { x: startX, y: startY + len1 * dirY }; }

    const p3 = { x: p2.x + len2 * dirX, y: p2.y + len2 * dirY };
    const d1 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const d2 = Math.hypot(p3.x - p2.x, p3.y - p2.y);

    circuitTracks.push({
      p1, p2, p3, d1, d2,
      totalLength: d1 + d2,
      currentLength: 0,
      opacity: 1,
      chipSpawned: false
    });
  }
};

function spawnMicrochip(x, y) {
  const chipTypes = ['quad', 'dip', 'logic'];
  const randomType = chipTypes[Math.floor(Math.random() * chipTypes.length)];
  microchipsSymbols.push({
    x: x, y: y, type: randomType,
    sizeW: Math.random() * 12 + 16, sizeH: Math.random() * 10 + 12,
    opacity: 0, targetOpacity: 0.85, pulseTime: Math.random() * 10
  });
}

window.renderDetroitFlowchart = function(nodeIndex) {
  const nodesContainer = document.getElementById('flowchartNodes');
  const svgCanvas = document.getElementById('flowchartLines');
  nodesContainer.innerHTML = '';
  svgCanvas.innerHTML = '';

  const storylines = [
    [
      { label: "Подключение к сети", status: "completed", x: 50, y: 150 },
      { label: "Сканирование портов ядра", status: "completed", x: 260, y: 150 },
      { label: "Обход защиты ИИ системы", status: "current", x: 470, y: 80 },
      { label: "Протокол заблокирован", status: "locked", x: 470, y: 220 }
    ],
    [
      { label: "Инициализация ландшафта", status: "completed", x: 50, y: 150 },
      { label: "Пакет данных поврежден", status: "completed", x: 260, y: 80 },
      { label: "Успешная пересборка", status: "current", x: 470, y: 80 },
      { label: "Критическая ошибка ядра", status: "locked", x: 260, y: 220 }
    ],
    [
      { label: "Вход в Умный Город", status: "completed", x: 50, y: 150 },
      { label: "Перехват управления ИТ", status: "current", x: 260, y: 150 },
      { label: "Сигнал полностью отслежен", status: "locked", x: 470, y: 80 },
      { label: "Безопасный отход в тень", status: "locked", x: 470, y: 220 }
    ]
  ];

  const activeStory = storylines[nodeIndex % storylines.length];

  activeStory.forEach((node, index) => {
    const nodeEl = document.createElement('div');
    nodeEl.className = `detroit-node ${node.status}`;
    nodeEl.style.left = `${node.x}px`; nodeEl.style.top = `${node.y}px`;
    nodeEl.innerHTML = `<strong>Шаг 0${index+1}</strong><br>${node.label}`;
    nodeEl.style.animationDelay = `${index * 0.15}s`;
    nodesContainer.appendChild(nodeEl);
  });

  for (let i = 0; i < activeStory.length; i++) {
    for (let j = i + 1; j < activeStory.length; j++) {
      if (activeStory[j].x === activeStory[i].x + 210 || (activeStory[i].x === 260 && activeStory[j].x === 470)) {
        const path = document.createElementNS("http://w3.org", "path");
        const x1 = activeStory[i].x + 160; const y1 = activeStory[i].y;
        const x2 = activeStory[j].x;       const y2 = activeStory[j].y;
        const midX = x1 + 25;
        const dStr = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
        path.setAttribute("d", dStr);
        const isLineCompleted = activeStory[i].status === "completed" && activeStory[j].status !== "locked";
        path.setAttribute("class", `flow-line ${isLineCompleted ? 'completed' : 'locked'}`);
        svgCanvas.appendChild(path);
      }
    }
  }
};

function createStream() {
  if (dataStreams.length >= 25) return;
  dataStreams.push({
    x: -50, y: Math.random() * height,
    length: Math.random() * 80 + 40,
    speed: Math.random() * 3 + 1.5,
    opacity: Math.random() * 0.25 + 0.05
  });
}

function renderLctBackground() {
  ctx.clearRect(0, 0, width, height);
  
  if (Math.random() < 0.08) createStream();
  for (let s = dataStreams.length - 1; s >= 0; s--) {
    const stream = dataStreams[s]; stream.x += stream.speed;
    ctx.beginPath();
    const grad = ctx.createLinearGradient(stream.x, stream.y, stream.x + stream.length, stream.y);
    grad.addColorStop(0, `rgba(138, 43, 226, 0)`); grad.addColorStop(1, `rgba(0, 255, 255, ${stream.opacity})`);
    ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.moveTo(stream.x, stream.y); ctx.lineTo(stream.x + stream.length, stream.y); ctx.stroke();
    if (stream.x > width * 0.7) dataStreams.splice(s, 1);
  }

  for (let w = circuitTracks.length - 1; w >= 0; w--) {
    const track = circuitTracks[w];
    if (track.currentLength < track.totalLength) track.currentLength += 4;
    else if (!track.chipSpawned) { spawnMicrochip(track.p3.x, track.p3.y); track.chipSpawned = true; }

    ctx.save(); ctx.beginPath();
    ctx.strokeStyle = `rgba(0, 255, 255, ${track.opacity})`; ctx.lineWidth = 1.8; ctx.shadowBlur = 6; ctx.shadowColor = "#00ffff";
    ctx.moveTo(track.p1.x, track.p1.y);
    if (track.currentLength <= track.d1) {
      const ratio = track.currentLength / track.d1;
      ctx.lineTo(track.p1.x + (track.p2.x - track.p1.x) * ratio, track.p1.y + (track.p2.y - track.p1.y) * ratio);
    } else {
      ctx.lineTo(track.p2.x, track.p2.y);
      const ratio = Math.min(1, (track.currentLength - track.d1) / track.d2);
      ctx.lineTo(track.p2.x + (track.p3.x - track.p2.x) * ratio, track.p2.y + (track.p3.y - track.p2.y) * ratio);
    }
    ctx.stroke(); ctx.restore();
  }

  for (let m = 0; m < microchipsSymbols.length; m++) {
    const mc = microchipsSymbols[m]; if (mc.opacity < mc.targetOpacity) mc.opacity += 0.05;
    mc.pulseTime += 0.05; const pulseOpacity = mc.opacity * (0.5 + Math.sin(mc.pulseTime * 2.5) * 0.5);
    ctx.save(); ctx.translate(mc.x, mc.y);
    ctx.strokeStyle = `rgba(0, 255, 255, ${mc.opacity})`; ctx.lineWidth = 1.2; ctx.shadowBlur = 4; ctx.shadowColor = "#00ffff";
    if (mc.type === 'quad') {
      ctx.strokeRect(-mc.sizeW/2, -mc.sizeW/2, mc.sizeW, mc.sizeW); ctx.fillStyle = `rgba(255, 255, 255, ${pulseOpacity})`;
      for (let o = -mc.sizeW/2 + 3; o < mc.sizeW/2; o += 5) { ctx.fillRect(o, -mc.sizeW/2 - 2, 1.5, 2); ctx.fillRect(o, mc.sizeW/2, 1.5, 2); }
    } else if (mc.type === 'dip') {
      ctx.strokeRect(-mc.sizeW/2, -mc.sizeH/2, mc.sizeW, mc.sizeH); ctx.fillStyle = `rgba(255, 255, 255, ${pulseOpacity})`;
      for (let o = -mc.sizeW/2 + 3; o < mc.sizeW/2; o += 4) { ctx.fillRect(o, -mc.sizeH/2 - 2, 1.5, 2); ctx.fillRect(o, mc.sizeH/2, 1.5, 2); }
    } else {
      ctx.beginPath(); ctx.moveTo(0, -mc.sizeH); ctx.lineTo(mc.sizeW/1.4, 0); ctx.lineTo(0, mc.sizeH); ctx.lineTo(-mc.sizeW/1.4, 0); ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.shadowBlur = 0;

  const sphereCenterX = width * 0.75; const sphereCenterY = height / 2;
  const fov = 500; time += 0.005;   

  for (let i = 0; i < countLong; i++) {
    const u = (i / countLong) * Math.PI * 2 + time; 
    for (let j = 0; j < countLat; j++) {
      const v = (j / countLat) * Math.PI;
      const wave = Math.sin(i * 0.4 + time * 3) * Math.cos(j * 0.3 + time * 2) * 20;
      const r = baseRadius + wave;
      const rawX = r * Math.sin(v) * Math.cos(u); const rawY = r * Math.cos(v); const rawZ = r * Math.sin(v) * Math.sin(u) + 100;
      const scale = fov / (fov + rawZ); const screenX = sphereCenterX + (rawX * scale); const screenY = sphereCenterY + (rawY * scale);
      if (screenX >= 0 && screenX <= width && screenY >= 0 && screenY <= height) {
        const size = Math.max(0.6, 3 * scale); const opacity = Math.max(0.01, 0.45 * scale);
        ctx.beginPath(); ctx.arc(screenX, screenY, size, 0, Math.PI * 2, true);
        if ((i + j) % 9 === 0) ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 1.4})`; 
        else ctx.fillStyle = `rgba(0, 255, 255, ${opacity * 0.8})`; 
        ctx.fill();
      }
    }
  }
  requestAnimationFrame(renderLctBackground);
}

renderLctBackground();
