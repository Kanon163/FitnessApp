document.addEventListener('DOMContentLoaded', () => {
    // --- 数据库和状态 ---
    const actionLibrary = [
        { name: '杠铃卧推', tags: ['胸', '臂'] }, { name: '哑铃飞鸟', tags: ['胸'] },
        { name: '引体向上', tags: ['背', '臂'] }, { name: '杠铃划船', tags: ['背'] },
        { name: '站姿推举', tags: ['肩', '臂'] }, { name: '侧平举', tags: ['肩'] },
        { name: '杠铃深蹲', tags: ['腿'] }, { name: '腿举', tags: ['腿'] },
        { name: '二头弯举', tags: ['臂'] }, { name: '三头下压', tags: ['臂'] },
    ];
    let workoutHistory = {};
    let currentLog = [];
    let selectedDate = new Date();
    let currentFilter = 'all';
    let restTimerInterval;

    // --- 获取页面元素 ---
    const currentDateElem = document.getElementById('current-date');
    const focusInput = document.getElementById('focus-input');
    const workoutBody = document.getElementById('workout-body');
    const addWorkoutBtn = document.getElementById('add-workout-btn');
    const exportBtn = document.getElementById('export-btn');
    const prevDayBtn = document.getElementById('prev-day-btn');
    const nextDayBtn = document.getElementById('next-day-btn');
    // 模态框
    const actionModal = document.getElementById('action-modal');
    const closeActionModalBtn = document.getElementById('close-action-modal-btn');
    const actionList = document.getElementById('action-list');
    const modalFilterContainer = document.getElementById('modal-filter-container');
    const viewLogBtn = document.getElementById('view-log-btn');
    const logModal = document.getElementById('log-modal');
    const closeLogModalBtn = document.getElementById('close-log-modal-btn');
    const logList = document.getElementById('log-list');
    const exportSelectedBtn = document.getElementById('export-selected-btn');

    // --- 主流程 ---
    function init() {
        loadData();
        updateDateDisplay();
        renderTable();
        renderFilterButtons();
        setupEventListeners();
    }

    // --- 事件监听器设置 ---
    function setupEventListeners() {
        addWorkoutBtn.addEventListener('click', () => actionModal.style.display = 'flex');
        closeActionModalBtn.addEventListener('click', () => actionModal.style.display = 'none');
        const dateKey = selectedDate.toISOString().slice(0, 10);
        exportBtn.addEventListener('click', () => exportToCSV([dateKey]));

        focusInput.addEventListener('change', (e) => {
            const dateKey = selectedDate.toISOString().slice(0, 10);
            workoutHistory[dateKey].focus = e.target.value;
            saveData();
        });

        prevDayBtn.addEventListener('click', () => changeDate(-1));
        nextDayBtn.addEventListener('click', () => changeDate(1));

        modalFilterContainer.addEventListener('click', handleFilterClick);
        actionList.addEventListener('click', handleActionSelect);
        workoutBody.addEventListener('click', handleTableClick);
        workoutBody.addEventListener('change', handleTableInputChange);

        viewLogBtn.addEventListener('click', showLogModal);
        closeLogModalBtn.addEventListener('click', () => logModal.style.display = 'none');
        exportSelectedBtn.addEventListener('click', exportSelectedLogs);
        logList.addEventListener('click', handleLogItemClick);
    }

    // --- 日期处理 ---
    function changeDate(days) {
        selectedDate.setDate(selectedDate.getDate() + days);
        loadData();
        updateDateDisplay();
        renderTable();
    }

    function updateDateDisplay() {
        const dateKey = selectedDate.toISOString().slice(0, 10);
        const todayKey = new Date().toISOString().slice(0, 10);
        let display_text = dateKey;
        if (dateKey === todayKey) {
            display_text += ' (今天)';
        }
        currentDateElem.textContent = display_text;
    }

    // --- 渲染和核心逻辑 ---
    function renderTable() {
        workoutBody.innerHTML = '';
        if (currentLog.length === 0) {
            workoutBody.innerHTML = `<tr><td colspan="8">点击右下角 "+" 为该日添加训练</td></tr>`;
            return;
        }
        currentLog.forEach((item, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            row.innerHTML = `
                <td>${item.name}</td>
                <td class="set-cell">${item.set}</td>
                <td><input type="number" class="weight-input" value="${item.weight || ''}"></td>
                <td><input type="text" class="reps-input" value="${item.reps || ''}"></td>
                <td><input type="number" class="rpe-input" step="0.1" value="${item.rpe || ''}"></td>
                <td><input type="text" class="notes-input" value="${item.notes || ''}"></td>
                <td class="rest-cell"></td>
                <td class="delete-cell"><i class="fas fa-trash-alt delete-btn"></i></td>
            `;
            const restCell = row.querySelector('.rest-cell');
            updateRestCell(restCell, item);
            workoutBody.appendChild(row);
        });
        saveData();
    }

    function updateRestCell(cell, item) {
        if (item.isResting) {
            cell.innerHTML = `<div class="timer-display">${item.restTime}s</div><button class="btn-stop-rest">停止</button>`;
        } else {
            cell.innerHTML = `<span>${item.restTime > 0 ? item.restTime + 's' : '--'}</span><button class="btn-start-rest">计时</button>`;
        }
    }

    function addSet(actionName, options = {}) {
        currentLog.push({
            name: actionName,
            set: options.set || 1,
            weight: options.weight || '',
            reps: options.reps || '',
            rpe: options.rpe || '',
            notes: options.notes || '',
            restTime: 0,
            isResting: false
        });
        renderTable();
    }

    // --- 事件处理函数 ---
    function handleTableClick(e) {
        const target = e.target;
        const row = target.closest('tr');
        if (!row || !row.dataset.index) return;
        
        const index = parseInt(row.dataset.index);
        const item = currentLog[index];

        if (target.classList.contains('set-cell')) {
            addSet(item.name, { set: item.set + 1, weight: item.weight, rpe: item.rpe, notes: item.notes });
        } else if (target.classList.contains('delete-btn')) {
            if (confirm(`确定要删除“${item.name}”的第 ${item.set} 组吗？`)) {
                currentLog.splice(index, 1);
                renderTable();
            }
        } else if (target.classList.contains('btn-start-rest')) {
            clearInterval(restTimerInterval);
            item.isResting = true;
            item.restTime = 0;
            restTimerInterval = setInterval(() => {
                item.restTime++;
                renderTable();
            }, 1000);
            renderTable();
        } else if (target.classList.contains('btn-stop-rest')) {
            clearInterval(restTimerInterval);
            item.isResting = false;
            renderTable();
        }
    }

    function handleTableInputChange(e) {
        const target = e.target;
        const row = target.closest('tr');
        if (!row || !row.dataset.index) return;

        const index = parseInt(row.dataset.index);
        const item = currentLog[index];
        const classMap = { 'weight-input': 'weight', 'reps-input': 'reps', 'rpe-input': 'rpe', 'notes-input': 'notes' };
        const key = classMap[target.className];
        if (key) { item[key] = target.value; saveData(); }
    }
    
    function handleFilterClick(e) {
        if (e.target.classList.contains('filter-btn')) {
            currentFilter = e.target.dataset.part;
            renderFilterButtons();
        }
    }
    
    function handleActionSelect(e) {
        if (e.target.classList.contains('action-item')) {
            addSet(e.target.textContent);
            actionModal.style.display = 'none';
        }
    }

    // --- 日志功能 ---
    function showLogModal() {
        renderLogList();
        logModal.style.display = 'flex';
    }

    function renderLogList() {
        logList.innerHTML = '';
        const dates = Object.keys(workoutHistory).sort().reverse();
        if (dates.length === 0) { logList.innerHTML = '<p>没有历史记录。</p>'; return; }
        
        dates.forEach(date => {
            const dayData = workoutHistory[date];
            if (dayData.log && dayData.log.length > 0) {
                const item = document.createElement('div');
                item.className = 'log-item';
                item.dataset.date = date; // 为整个条目设置日期
                item.innerHTML = `
                    <input type="checkbox" data-date="${date}" onclick="event.stopPropagation()">
                    <div class="log-item-info">
                        <span class="date">${date}</span>
                        <span class="focus">重点: ${dayData.focus || '未填写'}</span>
                    </div>`;
                logList.appendChild(item);
            }
        });
    }

    function handleLogItemClick(e) {
        const target = e.target;
        if (target.closest('.log-item') && !target.matches('input[type="checkbox"]')) {
            const dateStr = target.closest('.log-item').dataset.date;
            selectedDate = new Date(dateStr + 'T12:00:00'); // 设置时间避免时区问题
            loadData();
            updateDateDisplay();
            renderTable();
            logModal.style.display = 'none';
        }
    }

    function exportSelectedLogs() {
        const selectedDates = Array.from(logList.querySelectorAll('input:checked')).map(cb => cb.dataset.date);
        if (selectedDates.length === 0) { alert('请至少选择一个日期进行导出。'); return; }
        exportToCSV(selectedDates);
    }

    // --- 数据导入导出 ---
    function exportToCSV(dates) {
        let allLogs = [];
        dates.forEach(date => {
            const dayData = workoutHistory[date];
            if (dayData && dayData.log) {
                const focus = dayData.focus || '未填写';
                dayData.log.forEach(item => allLogs.push({ ...item, date, focus }));
            }
        });
        if (allLogs.length === 0) { alert('选中的日期没有训练记录可以导出。'); return; }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "日期,训练重点,动作,组数,重量(kg),次数,RPE,备注,休息时间(s)\n";

        allLogs.forEach(item => {
            const rowData = [ item.date, item.focus, item.name, item.set, item.weight, `"${item.reps}"`, item.rpe, `"${item.notes}"`, item.restTime ].join(",");
            csvContent += rowData + "\n";
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const filename = dates.length > 1 ? `健身记录-多日` : `健身记录-${dates[0]}`;
        link.setAttribute("download", `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // --- 渲染和通用函数 ---
    function renderFilterButtons() { /* ... V4代码无变化 ... */ }
    function renderActionList() { /* ... V4代码无变化 ... */ }
    
    function renderFilterButtons() {
        const parts = ['all', '胸', '背', '肩', '腿', '臂'];
        modalFilterContainer.innerHTML = '';
        parts.forEach(part => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.part = part;
            btn.textContent = part === 'all' ? '全部' : part;
            if (currentFilter === part) btn.classList.add('active');
            modalFilterContainer.appendChild(btn);
        });
        renderActionList();
    }

    function renderActionList() {
        actionList.innerHTML = '';
        const filteredActions = actionLibrary.filter(action =>
            currentFilter === 'all' || action.tags.includes(currentFilter)
        );
        filteredActions.forEach(action => {
            const div = document.createElement('div');
            div.className = 'action-item';
            div.textContent = action.name;
            actionList.appendChild(div);
        });
    }

    // --- 本地存储 (关键改动) ---
    function saveData() {
        localStorage.setItem('fitnessAppHistory', JSON.stringify(workoutHistory));
    }

    function loadData() {
        const savedHistory = localStorage.getItem('fitnessAppHistory');
        if (savedHistory) {
            workoutHistory = JSON.parse(savedHistory);
        }
        const dateKey = selectedDate.toISOString().slice(0, 10);
        if (workoutHistory[dateKey]) {
            currentLog = workoutHistory[dateKey].log;
            focusInput.value = workoutHistory[dateKey].focus || '';
        } else {
            workoutHistory[dateKey] = { focus: '', log: [] };
            currentLog = workoutHistory[dateKey].log;
            focusInput.value = '';
        }
    }
    
    init();
});