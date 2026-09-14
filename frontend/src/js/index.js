// === 1. АВТОНОМНЫЙ 3D РЕНДЕРЕР (КИНЕСКОП НА CANVAS 2D) ===
const canvas = document.getElementById('retro-canvas');
if (canvas) {
    const ctx = canvas.getContext('2d');

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    let mx = 0, my = 0;
    
    // Отслеживание курсора мыши
    window.addEventListener('mousemove', (e) => {
        mx = (e.clientX - w / 2) * 0.08;
        my = (e.clientY - h / 2) * 0.08;
    });

    window.addEventListener('resize', () => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    });

    // 3D вершины кубического ретро-монитора
    const nodes = [
        {x: -140, y: -110, z: -90},  {x: 140, y: -110, z: -90},
        {x: 140, y: 110, z: -90},   {x: -140, y: 110, z: -90},
        {x: -160, y: -130, z: 90},   {x: 160, y: -130, z: 90},
        {x: 160, y: 130, z: 90},    {x: -160, y: 130, z: 90}
    ];

    // Индексы вершин для сборки объемных граней корпуса
    const polygons = [, // Задняя стенка, // Передняя рамка, // Верх, // Низ, // Лево
        [1, 2, 6, 5]  // Право
    ];

    let rotY = 0, rotX = 0;

    function run3D() {
        ctx.fillStyle = '#04010a';
        ctx.fillRect(0, 0, w, h);

        const now = Date.now() * 0.001;

        // Следование за мышью с инерцией + легкое авто-покачивание
        rotY += ((mx * 0.006 + Math.sin(now * 0.4) * 0.15) - rotY) * 0.1;
        rotX += ((my * 0.006 + Math.cos(now * 0.4) * 0.08) - rotX) * 0.1;

        // Расчет мигания неонового света ламп (эффект неисправной вывески)
        let flash = Math.sin(now * 14) * Math.cos(now * 8);
        let lightActive = flash > -0.15 || Math.random() > 0.4;
        let neonStr = lightActive ? `rgba(255, 0, 255, ${0.4 + Math.random() * 0.4})` : 'rgba(50, 5, 50, 0.2)';

        // Матрица проекции точек 3D на 2D плоскость
        let pts = nodes.map(n => {
            // Вращение по оси Y
            let cy = Math.cos(rotY), sy = Math.sin(rotY);
            let x1 = n.x * cy - n.z * sy;
            let z1 = n.x * sy + n.z * cy;
            // Вращение по оси X
            let cx = Math.cos(rotX), sx = Math.sin(rotX);
            let y2 = n.y * cx - z1 * sx;
            let z2 = n.y * sx + z1 * cx;
            // Перспектива
            let fov = 450 / (450 + z2 + 100);
            return {
                x: x1 * fov * 1.4 + w / 2,
                y: (y2 + 30) * fov * 1.4 + h / 2 // Сдвиг модели на 30px вниз
            };
        });

        // 1. Падающий мигающий свет на фоне
        if (lightActive) {
            let grad = ctx.createRadialGradient(w/2 - 150, h/2 - 80, 10, w/2 - 80, h/2, 380);
            grad.addColorStop(0, 'rgba(255, 0, 255, 0.18)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }

        // 2. Отрисовка объемных полигонов монитора
        ctx.strokeStyle = neonStr;
        ctx.lineWidth = 2;
        polygons.forEach(p => {
            ctx.beginPath();
            ctx.moveTo(pts[p[0]].x, pts[p[0]].y);
            for(let i = 1; i < p.length; i++) ctx.lineTo(pts[p[i]].x, pts[p[i]].y);
            ctx.closePath();
            ctx.fillStyle = 'rgba(12, 4, 24, 0.85)';
            ctx.fill();
            ctx.stroke();
        });

        // 3. Рисуем светящийся экран (внутренняя часть передней панели)
        ctx.beginPath();
        ctx.moveTo(pts[4].x + (pts[5].x - pts[4].x) * 0.08, pts[4].y + (pts[7].y - pts[4].y) * 0.08);
        ctx.lineTo(pts[5].x - (pts[5].x - pts[4].x) * 0.08, pts[5].y + (pts[6].y - pts[5].y) * 0.08);
        ctx.lineTo(pts[6].x - (pts[6].x - pts[7].x) * 0.08, pts[6].y - (pts[6].y - pts[5].y) * 0.08);
        ctx.lineTo(pts[7].x + (pts[6].x - pts[7].x) * 0.08, pts[7].y - (pts[7].y - pts[4].y) * 0.08);
        ctx.closePath();
        
        let glow = Math.sin(now * 50) * 0.08 + 0.4;
        ctx.fillStyle = `rgba(0, 255, 204, ${glow})`;
        ctx.fill();
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 4. Эффект развертки скан-линий на экране
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        for(let y = 0; y < h; y += 5) {
            ctx.beginPath(); 
            ctx.moveTo(0, y); 
            ctx.lineTo(w, y); 
            ctx.stroke();
        }
        ctx.restore();

        requestAnimationFrame(run3D);
    }

    // Запуск цикла анимации
    run3D();
}
