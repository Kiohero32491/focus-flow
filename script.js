let tasks = JSON.parse(localStorage.getItem('ai_tasks')) || [];
let hideCompleted = false;
let myChart = null;

if (Notification.permission === 'default') Notification.requestPermission();

// タスク追加
document.getElementById('addBtn').onclick = () => {
    const name = document.getElementById('taskName').value;
    const imp = document.getElementById('imp').value;
    const urg = document.getElementById('urg').value;
    const deadline = document.getElementById('deadline').value;
    const time = document.getElementById('reminderTime').value;
    const category = document.getElementById('taskCategory').value;

    if (!name) return alert("タスク名を入力してください");

    const newTask = {
        id: Date.now(),
        name,
        score: parseInt(imp) * parseInt(urg),
        imp, urg, deadline, reminderTime: time, category,
        completed: false, notified: false, completedAt: null
    };

    tasks.unshift(newTask);
    document.getElementById('taskName').value = '';

    // スコア順ソート
    tasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return b.score - a.score;
    });

    saveAndRender();
};

function toggleTask(id) {
    tasks = tasks.map(t => {
        if (t.id === id) {
            const willComplete = !t.completed;
            if (willComplete) launchConfetti();
            return {
                ...t,
                completed: willComplete,
                completedAt: willComplete ? new Date().toLocaleDateString('ja-JP') : null
            };
        }
        return t;
    });
    saveAndRender();
}

// 削除機能（グローバルに定義）
window.deleteTask = function (id) {
    if (confirm("このデータを完全に削除してもよろしいですか？")) {
        tasks = tasks.filter(t => t.id !== id);
        saveAndRender();
    }
};

function saveAndRender() {
    localStorage.setItem('ai_tasks', JSON.stringify(tasks));
    updateUI();
    render();
}

function updateUI() {
    const done = tasks.filter(t => t.completed).length;
    const lv = Math.floor(done / 5) + 1;
    const exp = (done % 5) * 20;
    document.getElementById('statusBar').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:800; font-size:1.1rem;">LEVEL ${lv}</span>
            <span style="font-size:0.8rem; opacity:0.8;">完了実績: ${done}</span>
        </div>
        <div class="exp-bar-bg"><div id="expBarFill" style="width:${exp}%"></div></div>
    `;

    const active = tasks.filter(t => !t.completed).length;
    const msg = active === 0 ? "全てのミッションをクリアしました！" : `現在${active}件の未完了タスクがあります。`;
    document.getElementById('aiMessage').innerHTML = `<div class="ai-bubble"><i class="fas fa-robot"></i><span>${msg}</span></div>`;

    updateChart();
}

function updateChart() {
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const labels = [], data = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const s = d.toLocaleDateString('ja-JP');
        labels.push(d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }));
        data.push(tasks.filter(t => t.completedAt === s).length);
    }
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ data, backgroundColor: '#4a90e2', borderRadius: 6 }] },
        options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } }
    });
}

function render() {
    const list = document.getElementById('taskList');
    const compSection = document.getElementById('completedSection');
    const compList = document.getElementById('completedList');

    const activeTasks = tasks.filter(t => !t.completed);
    const doneTasks = tasks.filter(t => t.completed);

    // メインリスト描画
    list.innerHTML = activeTasks.map(t => {
        const catLabel = t.category === 'work' ? 'ビジネス' : t.category === 'personal' ? 'プライベート' : 'その他';
        const bgColor = t.score >= 80 ? '#fff5f5' : t.score >= 50 ? '#fffaf0' : '#ffffff';
        return `
        <div class="task-item" data-id="${t.id}" style="background-color: ${bgColor}">
            <div class="drag-handle"><i class="fas fa-grip-vertical"></i></div>
            <div class="check-btn" onclick="toggleTask(${t.id})"></div>
            <div class="task-info">
                <div><span class="category-badge bg-${t.category}">${catLabel}</span></div>
                <div class="task-name">${t.name}</div>
                <div class="task-meta">スコア: ${t.score} ${t.deadline ? ` | ${t.deadline}` : ''}</div>
            </div>
            <button class="btn-del" onclick="deleteTask(${t.id})"><i class="fas fa-trash"></i></button>
        </div>`;
    }).join('') || '<p style="text-align:center; color:#94a3b8; padding:20px;">やるべきことはありません</p>';

    // 完了アーカイブ描画
    if (doneTasks.length > 0 && !hideCompleted) {
        compSection.style.display = 'block';
        compList.innerHTML = doneTasks.map(t => `
            <div class="task-item completed-item">
                <div class="check-btn active" onclick="toggleTask(${t.id})"><i class="fas fa-check"></i></div>
                <div class="task-info">
                    <div class="task-name">${t.name}</div>
                    <div style="font-size:0.65rem; color:#94a3b8; margin-top:2px;">完了: ${t.completedAt}</div>
                </div>
                <button class="btn-del" onclick="deleteTask(${t.id})"><i class="fas fa-trash"></i></button>
            </div>`).join('');
    } else {
        compSection.style.display = 'none';
    }
}

// ドラッグ機能
new Sortable(document.getElementById('taskList'), {
    animation: 150,
    handle: '.drag-handle',
    onEnd: function () {
        const newOrderIds = Array.from(document.querySelectorAll('#taskList .task-item')).map(el => parseInt(el.dataset.id));
        const activeTasks = tasks.filter(t => !t.completed);
        const doneTasks = tasks.filter(t => t.completed);
        const reorderedActive = newOrderIds.map(id => activeTasks.find(t => t.id === id));
        tasks = [...reorderedActive, ...doneTasks];
        localStorage.setItem('ai_tasks', JSON.stringify(tasks));
    }
});

function launchConfetti() {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
}

document.getElementById('hideSwitch').onchange = (e) => {
    hideCompleted = e.target.checked;
    render();
};

saveAndRender();