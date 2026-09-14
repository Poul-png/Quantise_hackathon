const circle = document.getElementById('circle');
const wrapper = document.getElementById('carouselWrapper');
const contentTitle = document.getElementById('contentTitle');
const contentDesc = document.getElementById('contentDesc');
const detroitOverlay = document.getElementById('detroitOverlay');
const closeDetroit = document.getElementById('closeDetroit');

const radius = 340; 
const numCards = 5;  
let currentStep = 0; 

// База данных для описаний
const nodeData = [
  { title: "NODE_01 // LCT_PLATFORM", desc: "Глобальная платформа цифровой трансформации. Интеграция передовых ИИ-решений в городские структуры и масштабные хакатоны для лучших разработчиков." },
  { title: "NODE_02 // DATA_LANDSCAPE", desc: "Генерация топографических интерфейсов. Визуализация потоков информации в реальном времени через трехмерные массивы связанных частиц." },
  { title: "NODE_03 // SMART_METROPOLIS", desc: "Концепция умного города. Мониторинг экологических датчиков, оптимизация транспортных развязок и предиктивное обслуживание электросетей." },
  { title: "NODE_04 // NEURAL_ROUTING", desc: "Нейросетевое распределение вычислительных мощностей. Масштабирование систем под экстремальные пиковые нагрузки без потери отклика ядра." },
  { title: "NODE_05 // ARCHIVE_VAULT", desc: "Локальный архив зашифрованных системных журналов. Хранение статических бэкапов и логов завершенных сессий ядра. Доступ ограничен." }
];

// Динамическое создание карточек
for (let i = 0; i < numCards; i++) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerText = 'NODE_0' + (i + 1);
  
  const angleDeg = (360 / numCards) * i;
  const angleRad = (angleDeg + 90) * Math.PI / 180;
  
  const x = Math.sin(angleRad) * radius;
  const y = -Math.cos(angleRad) * radius;
  
  card.dataset.x = x;
  card.dataset.y = y;
  
  card.onclick = () => {
    // Просто выбираем карточку, карусель НЕ крутится на месте
    selectCard(i);
    
    // Активируем полноэкранный интерфейс Detroit сюжета
    detroitOverlay.classList.add('visible');
    
    // Передаем индекс во второй скрипт для перерисовки Flowchart
    if (typeof renderDetroitFlowchart === 'function') {
      renderDetroitFlowchart(i);
    }

    // Запускаем анимацию печатной микросхемы вокруг карточки
    if (typeof triggerNodeElectricity === 'function') {
      triggerNodeElectricity(card);
    }
  };

  circle.appendChild(card);
}

function selectCard(index) {
  const normalizedIndex = (index % numCards + numCards) % numCards;
  
  const cards = circle.querySelectorAll('.card');
  cards.forEach(c => c.classList.remove('selected'));
  
  const targetCard = cards[normalizedIndex];
  if (targetCard) targetCard.classList.add('selected');
  
  contentTitle.innerText = nodeData[normalizedIndex].title;
  contentDesc.innerText = nodeData[normalizedIndex].desc;
}

closeDetroit.onclick = () => {
  detroitOverlay.classList.remove('visible');
};

function updateCarousel(isFirstLoad = false) {
  const stepAngle = 360 / numCards; 
  const totalCircleAngle = currentStep * stepAngle;
  
  circle.style.transform = `rotate(${totalCircleAngle}deg)`;
  
  // СТИРАЕМ старое электричество при начале любого вращения
  if (typeof clearCircuitBoard === 'function') {
    clearCircuitBoard();
  }
  
  const cards = circle.querySelectorAll('.card');
  cards.forEach((card) => {
    const x = card.dataset.x;
    const y = card.dataset.y;
    const compensateAngle = -totalCircleAngle; 
    
    if (isFirstLoad) {
      card.classList.add('active');
      card.style.transform = `translate(${x}px, ${y}px) rotate(${compensateAngle}deg) scale(1)`;
    } else {
      card.style.transitionDelay = '0s';
      card.style.transform = `translate(${x}px, ${y}px) rotate(${compensateAngle}deg) scale(1)`;
    }
  });

  const activeIndex = (-currentStep % numCards + numCards) % numCards;
  selectCard(activeIndex);
}

// Управление кнопками
document.getElementById('rotateLeft').onclick = () => { currentStep--; updateCarousel(); };
document.getElementById('rotateRight').onclick = () => { currentStep++; updateCarousel(); };

// Управление колесиком мыши
let isThrottled = false;
wrapper.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (isThrottled) return; 

  if (e.deltaY > 0) currentStep++; else currentStep--;
  updateCarousel();

  isThrottled = true;
  setTimeout(() => { isThrottled = false; }, 200);
}, { passive: false });

// Стартовый запуск меню
updateCarousel(true);
