let currentSessionId = null;
let activeScenarioId = "deadline_crisis"; 
let currentOptions = {}; 
let selectedArchetype = null;

let currentStageId = "step_1_greeting";
let currentStressVal = 20;
let currentAgreementVal = 30;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('scenario')) {
        activeScenarioId = urlParams.get('scenario');
    }

    localStorage.setItem('confession_clicks_analytics', '0');
    localStorage.setItem('confession_clicks_fighter', '0');
    localStorage.setItem('confession_clicks_diplomat', '0');
    localStorage.setItem('confession_clicks_charismatic', '0');
    localStorage.setItem('confession_stability_score', '100');

    const menuToggleBtn = document.getElementById('menu-toggle-btn') || document.querySelector('.menu-trigger-btn');
    const sideMenuPanel = document.getElementById('side-menu-panel') || document.querySelector('.side-navigation-panel');
    const actionExit = document.querySelector('.btn-exit') || document.getElementById('action-exit') || document.querySelector('.exit-lobby-btn');

    if (menuToggleBtn && sideMenuPanel) {
        menuToggleBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            menuToggleBtn.classList.toggle('menu-open');
            sideMenuPanel.classList.toggle('panel-open');
        });
        document.addEventListener('click', (e) => {
            if (!sideMenuPanel.contains(e.target) && !menuToggleBtn.contains(e.target)) {
                menuToggleBtn.classList.remove('menu-open');
                sideMenuPanel.classList.remove('panel-open');
            }
        });
    }

    if (actionExit) {
        actionExit.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Вы уверены, что хотите выйти в лобби? Прогресс симуляции будет сброшен.')) {
                window.location.href = '/pages/menu.html'; 
            }
        });
    }

    const speechContent = document.getElementById('text-output');
    const speakerTag = document.querySelector('.speaker-tag');
    const tacticsStack = document.querySelector('.tactics-stack');
    const confirmBtn = document.getElementById('confirm-btn');
    
    let bossTypewriterTimeout;

    // ИСПРАВЛЕНО: Ключ терпения жестко синхронизирован с ответом бэкенда (patience)
    function updateMetricsDOM(metrics) {
        const mappings = [
            { key: 'agreement', barId: 'kpi-agree', valId: 'val-agree' },
            { key: 'profit', barId: 'kpi-profit', valId: 'val-profit' },
            { key: 'stress', barId: 'kpi-stress', valId: 'val-stress' },
            { key: 'patience', barId: 'kpi-patience', valId: 'val-patience' }
        ];

        mappings.forEach(m => {
            const barEl = document.getElementById(m.barId);
            const valEl = document.getElementById(m.valId);
            if (barEl) barEl.style.width = `${metrics[m.key]}%`;
            if (valEl) valEl.innerText = `${metrics[m.key]}%`;
        });
    }

    function typeWriterBoss(text, element, speed = 8, callback) {
        if (!element) return;
        element.style.opacity = '0.3'; 
        setTimeout(() => {
            element.innerHTML = text;
            element.style.opacity = '1';
            if (callback) callback();
        }, 150);
    }

    function renderDynamicTactics(options) {
        if (!tacticsStack || !confirmBtn) return;

        tacticsStack.innerHTML = ''; 
        confirmBtn.setAttribute('disabled', 'true');
        confirmBtn.disabled = true;
        selectedArchetype = null;

        const archetypes = [
            { key: "АНАЛИТИК", label: "СТРАТЕГИЯ 01 // АНАЛИТИКА" },
            { key: "БОЕЦ", label: "СТРАТЕГИЯ 02 // ДАВЛЕНИЕ" },
            { key: "ДИПЛОМАТ", label: "СТРАТЕГИЯ 03 // ДИПЛОМАТИЯ" },
            { key: "ХАРИЗМА", label: "СТРАТЕГИЯ 04 // ХАРИЗМА" }
        ];

        archetypes.forEach(arch => {
            const btn = document.createElement('button');
            btn.className = 'tactic-item-btn';
            btn.setAttribute('data-tactic', arch.key);

            const metaSpan = document.createElement('span');
            metaSpan.className = 't-meta';
            metaSpan.textContent = arch.label;
            btn.appendChild(metaSpan);

            const textParagraph = document.createElement('p');
            textParagraph.className = 't-text';
            textParagraph.textContent = options[arch.key] || "Вектор диалога заблокирован системой.";
            btn.appendChild(textParagraph);

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirmBtn.classList.contains('selection-locked')) return;

                confirmBtn.removeAttribute('disabled');
                confirmBtn.disabled = false;

                document.querySelectorAll('.tactic-item-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (speakerTag) speakerTag.textContent = "СТАТУС: ИГРОК ФОРМИРУЕТ ОТВЕТ";
                selectedArchetype = arch.key;
            });

            tacticsStack.appendChild(btn);
        });
    }

    async function makeTurn(isFirstRun = false) {
        if (!confirmBtn || !speechContent) return;

        confirmBtn.setAttribute('disabled', 'true');
        confirmBtn.disabled = true;
        confirmBtn.innerText = isFirstRun ? 'СИНХРОНИЗАЦИЯ ИИ...' : 'СЧИТЫВАНИЕ ДИРЕКТИВЫ...';

        const bodyData = {
            session_id: currentSessionId,
            user_id: parseInt(localStorage.getItem('user_id')) || 0,
            scenario_id: activeScenarioId,
            player_message: isFirstRun ? null : currentOptions[selectedArchetype],
            chosen_archetype: isFirstRun ? null : selectedArchetype,
            current_stage: currentStageId,
            stress: currentStressVal,
            agreement: currentAgreementVal
        };

        try {
            const response = await fetch('/game/chat', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            if (response.ok) {
                const data = await response.json();

                // ИСПРАВЛЕНО: Убираем лоадер только после успешного разбора JSON данных
                const preloader = document.getElementById('app-preloader') || document.querySelector('.preloader-overlay');
                if (preloader) preloader.classList.add('fade-away');
                
                const lockOverlay = document.querySelector('.landscape-lock-overlay') || document.querySelector('.orientation-blocker-overlay');
                if (lockOverlay) {
                    lockOverlay.style.display = 'none';
                    lockOverlay.style.opacity = '0';
                    lockOverlay.style.pointerEvents = 'none';
                }

                currentSessionId = data.session_id;
                currentOptions = data.options;
                currentStageId = data.current_stage || currentStageId;
                currentStressVal = data.new_stress;
                currentAgreementVal = data.new_agreement;

                const currentPatience = 100 - data.new_stress;

                // ИСПРАВЛЕНО: Передаем корректное имя свойства patience
                updateMetricsDOM({
                    agreement: data.new_agreement,
                    stress: data.new_stress,
                    profit: data.radar_metrics?.argumentation || 0,
                    patience: 100 - data.new_stress
                });

                if (!isFirstRun && selectedArchetype) {
                    let storageKey = 'confession_clicks_analytics';
                    if (selectedArchetype === 'БОЕЦ') storageKey = 'confession_clicks_fighter';
                    if (selectedArchetype === 'ДИПЛОМАТ') storageKey = 'confession_clicks_diplomat';
                    if (selectedArchetype === 'ХАРИЗМА') storageKey = 'confession_clicks_charismatic';

                    const currentClicks = parseInt(localStorage.getItem(storageKey) || '0', 10);
                    localStorage.setItem(storageKey, (currentClicks + 1).toString());
                }

                if (data.game_status !== "in_progress") {
                    if (speakerTag) speakerTag.textContent = `ИТОГ КВЕСТА // СЦЕНАРИЙ ЗАВЕРШЕН`;
                    speechContent.textContent = data.client_replica;
                    confirmBtn.classList.add('selection-locked');
                    confirmBtn.innerText = data.game_status === "win" ? "МИССИЯ УСПЕШНА" : "КОНТРАКТ РАЗОРВАН";
                    localStorage.setItem('confession_stability_score', currentPatience.toString());
                    if (tacticsStack) {
                        tacticsStack.innerHTML = `<div style="font-size:1.1rem;color:#a78bfa;text-align:center;width:100%;font-weight:700;padding:20px;">[ АНАЛИЗ РЕЗУЛЬТАТА ]: ${data.feedback}</div>`;
                    }
                    return;
                }

                confirmBtn.innerText = 'ПРИМЕНИТЬ ВЫБРАННУЮ СТРАТЕГИЮ';
                if (speakerTag) speakerTag.textContent = `СТАТУС: ПОСТУПИЛ ЗАПРОС ОТ [ ${data.speaker} ]`;
                
                clearTimeout(bossTypewriterTimeout);
                typeWriterBoss(data.client_replica, speechContent, 8, () => {
                    renderDynamicTactics(data.options); 
                });

            } else {
                speechContent.textContent = "[ КРИТИЧЕСКАЯ ОШИБКА НА СЛУЖЕБНОМ СЛОЕ БЭКЕНДА ]";
            }
        } catch (error) {
            speechContent.textContent = "[ СБОЙ СЕТЕВОГО ИНТЕРФЕЙСА СИМУЛЯЦИИ ]";
            console.error(error);
        }
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (selectedArchetype && !confirmBtn.disabled) {
                makeTurn(false);
            }
        });
    }

    makeTurn(true);
});
