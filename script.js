document.addEventListener('DOMContentLoaded', () => {
    // --- 状态和全局变量 ---
    let workoutHistory = {};
    let currentLog = [];
    let selectedDate = new Date();
    let currentFilter = 'all';
    let restTimerInterval;
    let actionLibrary = getActionLibrary(); // 从新文件中加载

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
    // 动作库模态框
    const manageLibraryBtn = document.getElementById('manage-library-btn');
    const libraryModal = document.getElementById('library-modal');
    const closeLibraryModalBtn = document.getElementById('close-library-modal-btn');
    const libraryListContainer = document.getElementById('library-list-container');
    const exportLibraryBtn = document.getElementById('export-library-btn');
    const csvImportInput = document.getElementById('csv-import-input');
    const newActionNameInput = document.getElementById('new-action-name');
    const newActionTagsInput = document.getElementById('new-action-tags');
    const addNewActionBtn = document.getElementById('add-new-action-btn');

    // --- 主流程 ---
    function init() {
        loadData();
        updateDateDisplay();
        renderTable();
        renderFilterButtons();
        setupEventListeners();
    }

    // --- 事件监听器 ---
    function setupEventListeners() {
        addWorkoutBtn.addEventListener('click', () => { renderActionList(); actionModal.style.display = 'flex'; });
        closeActionModalBtn.addEventListener('click', () => actionModal.style.display = 'none');
        exportBtn.addEventListener('click', () => exportToCSV([selectedDate.toISOString().slice(0, 10)]));
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
        // 动作库事件
        manageLibraryBtn.addEventListener('click', showLibraryModal);
        closeLibraryModalBtn.addEventListener('click', () => libraryModal.style.display = 'none');
        exportLibraryBtn.addEventListener('click', exportLibraryToCSV);
        csvImportInput.addEventListener('change', handleCSVImport);
        addNewActionBtn.addEventListener('click', handleAddNewAction);
        libraryListContainer.addEventListener('click', handleLibraryActions);
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
        currentDateElem.textContent = `${dateKey}${dateKey === todayKey ? ' (今天)' : ''}`;
    }

    // --- 渲染和核心逻辑 ---
    function renderTable() {
        workoutBody.innerHTML = '';
        if (currentLog.length === 0) {
            workoutBody.innerHTML = `<tr><td colspan="9">点击右下角 "+" 为该日添加训练</td></tr>`;
            return;
        }

        const groupedByAction = currentLog.reduce((acc, item) => {
            if (!acc[item.name]) acc[item.name] = [];
            acc[item.name].push(item);
            return acc;
        }, {});

        Object.keys(groupedByAction).forEach(actionName => {
            const sets = groupedByAction[actionName];
            const records = findPerformanceRecords(actionName);
            
            // 插入提示行
            if (records.best) insertHintRow('历史最佳', records.best);
            if (records.last) insertHintRow('上一次', records.last);

            // 渲染正式组
            sets.forEach(item => {
                const index = currentLog.indexOf(item);
                const row = document.createElement('tr');
                row.dataset.index = index;
                const capacity = (item.weight && item.reps) ? (parseFloat(item.weight) * parseInt(item.reps.split(',')[0])) : 0;
                row.innerHTML = `
                    <td>${item.name}</td>
                    <td class="set-cell">${item.set}</td>
                    <td><input type="number" class="weight-input" value="${item.weight || ''}"></td>
                    <td><input type="text" class="reps-input" value="${item.reps || ''}"></td>
                    <td class="capacity-cell">${capacity.toFixed(1)}</td>
                    <td><input type="number" class="rpe-input" step="0.1" value="${item.rpe || ''}"></td>
                    <td><input type="text" class="notes-input" value="${item.notes || ''}"></td>
                    <td class="rest-cell"></td>
                    <td class="action-cell"><i class="fas fa-trash-alt delete-btn"></i></td>
                `;
                updateRestCell(row.querySelector('.rest-cell'), item);
                workoutBody.appendChild(row);
            });
        });
        saveData();
    }
    
    function insertHintRow(label, record) {
        if (!record) return;
        const row = document.createElement('tr');
        row.className = 'hint-row';
        const capacity = (record.weight && record.reps) ? (parseFloat(record.weight) * parseInt(record.reps.split(',')[0])) : 0;
        row.innerHTML = `
            <td class="hint-label">${label} (${record.date})</td>
            <td>-</td>
            <td>${record.weight || ''}</td>
            <td>${record.reps || ''}</td>
            <td>${capacity.toFixed(1)}</td>
            <td>${record.rpe || ''}</td>
            <td>${record.notes || ''}</td>
            <td>-</td>
            <td class="action-cell"><i class="fas fa-times hide-hint-btn"></i></td>
        `;
        workoutBody.appendChild(row);
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
            name: actionName, set: options.set || 1, weight: options.weight || '',
            reps: options.reps || '', rpe: options.rpe || '', notes: options.notes || '',
            restTime: 0, isResting: false
        });
        renderTable();
    }

    // --- 事件处理 ---
    function handleTableClick(e) {
        const target = e.target;
        const row = target.closest('tr');
        if (!row) return;

        if (target.classList.contains('hide-hint-btn')) {
            row.remove();
            return;
        }
        
        if (!row.dataset.index) return;
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
            restTimerInterval = setInterval(() => { item.restTime++; renderTable(); }, 1000);
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
        if (key) { item[key] = target.value; }
        // 实时更新容量
        if (key === 'weight' || key === 'reps') {
            renderTable();
        }
        saveData();
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

    // --- 智能提示逻辑 ---
    function findPerformanceRecords(actionName) {
        let best = null;
        let last = null;
        let bestCapacity = 0;

        const sortedDates = Object.keys(workoutHistory).sort().reverse();

        for (const date of sortedDates) {
            // 排除当前正在编辑的日期
            if (date === selectedDate.toISOString().slice(0, 10)) continue;

            const dayLog = workoutHistory[date].log;
            for (const item of dayLog) {
                if (item.name === actionName) {
                    const capacity = (item.weight && item.reps) ? parseFloat(item.weight) * parseInt(item.reps.split(',')[0]) : 0;
                    if (!last) {
                        last = { ...item, date }; // 找到的第一个就是最近的
                    }
                    if (capacity > bestCapacity) {
                        bestCapacity = capacity;
                        best = { ...item, date };
                    }
                }
            }
        }
        return { best, last };
    }

    // --- 日志功能 ---
    function showLogModal() { renderLogList(); logModal.style.display = 'flex'; }
    function renderLogList() { /* V5代码无变化 */ }
    function handleLogItemClick(e) { /* V5代码无变化 */ }
    function exportSelectedLogs() { /* V5代码无变化 */ }

    // --- 动作库功能 ---
    function showLibraryModal() {
        renderLibraryList();
        libraryModal.style.display = 'flex';
    }

    function renderLibraryList() {
        libraryListContainer.innerHTML = '';
        actionLibrary.forEach((action, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'library-item';
            itemDiv.dataset.index = index;
            itemDiv.innerHTML = `
                <div class="library-item-details">
                    <span class="library-item-name">${action.name}</span>
                    <span class="library-item-tags">标签: ${action.tags.join(', ') || '无'}</span>
                </div>
                <div class="library-item-actions">
                    <button class="edit-btn"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            libraryListContainer.appendChild(itemDiv);
        });
    }

    function handleAddNewAction() {
        const name = newActionNameInput.value.trim();
        const tags = newActionTagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
        if (!name) {
            alert('动作名称不能为空！');
            return;
        }
        if (addToActionLibrary({ name, tags })) {
            actionLibrary = getActionLibrary();
            newActionNameInput.value = '';
            newActionTagsInput.value = '';
            renderLibraryList();
        } else {
            alert('该动作已存在！');
        }
    }

    function handleLibraryActions(e) {
        const target = e.target.closest('button');
        if (!target) return;
        const itemDiv = target.closest('.library-item');
        const index = parseInt(itemDiv.dataset.index);

        if (target.classList.contains('delete-btn')) {
            if (confirm(`确定要删除动作 "${actionLibrary[index].name}" 吗？`)) {
                deleteFromActionLibrary(index);
                actionLibrary = getActionLibrary();
                renderLibraryList();
            }
        } else if (target.classList.contains('edit-btn')) {
            const action = actionLibrary[index];
            const newName = prompt('输入新的动作名称:', action.name);
            if (newName === null) return; // 用户取消
            const newTags = prompt('输入新的标签 (用逗号分隔):', action.tags.join(','));
            if (newTags === null) return;

            updateActionInLibrary(index, {
                name: newName.trim(),
                tags: newTags.split(',').map(t => t.trim()).filter(Boolean)
            });
            actionLibrary = getActionLibrary();
            renderLibraryList();
        }
    }
    
    function handleCSVImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const newLibrary = importLibraryFromCSV(e.target.result);
            if (newLibrary) {
                actionLibrary = newLibrary;
                renderLibraryList();
                alert('动作库导入成功！');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // 清空input，以便下次还能触发change事件
    }

    // --- 数据导入导出 ---
    function exportToCSV(dates) { /* V5代码无变化, 但表头需更新 */ }

    // --- 渲染和通用函数 ---
    function renderFilterButtons() { /* V5代码无变化 */ }
    function renderActionList() {
        actionList.innerHTML = '';
        // 从最新的库中渲染
        getActionLibrary().filter(action => currentFilter === 'all' || action.tags.includes(currentFilter))
        .forEach(action => {
            const div = document.createElement('div');
            div.className = 'action-item';
            div.textContent = action.name;
            actionList.appendChild(div);
        });
    }

    // --- 本地存储 ---
    function saveData() { localStorage.setItem('fitnessAppHistory', JSON.stringify(workoutHistory)); }
    function loadData() {
        const savedHistory = localStorage.getItem('fitnessAppHistory');
        if (savedHistory) workoutHistory = JSON.parse(savedHistory);
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
    
    // --- 重新实现V5中无变化的函数 ---
    function showLogModal() { renderLogList(); logModal.style.display = 'flex'; }
    function renderLogList() {
        logList.innerHTML = '';
        const dates = Object.keys(workoutHistory).sort().reverse();
        if (dates.length === 0) { logList.innerHTML = '<p>没有历史记录。</p>'; return; }
        dates.forEach(date => {
            const dayData = workoutHistory[date];
            if (dayData.log && dayData.log.length > 0) {
                const item = document.createElement('div');
                item.className = 'log-item';
                item.dataset.date = date;
                item.innerHTML = `<input type="checkbox" data-date="${date}" onclick="event.stopPropagation()"><div class="log-item-info"><span class="date">${date}</span><span class="focus">重点: ${dayData.focus || '未填写'}</span></div>`;
                logList.appendChild(item);
            }
        });
    }
    function handleLogItemClick(e) {
        const target = e.target;
        if (target.closest('.log-item') && !target.matches('input[type="checkbox"]')) {
            const dateStr = target.closest('.log-item').dataset.date;
            selectedDate = new Date(dateStr + 'T12:00:00');
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
        csvContent += "日期,训练重点,动作,组数,重量(kg),次数,容量(kg),RPE,备注,休息时间(s)\n";
        allLogs.forEach(item => {
            const capacity = (item.weight && item.reps) ? (parseFloat(item.weight) * parseInt(item.reps.split(',')[0])) : 0;
            const rowData = [ item.date, item.focus, item.name, item.set, item.weight, `"${item.reps}"`, capacity.toFixed(1), item.rpe, `"${item.notes}"`, item.restTime ].join(",");
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
    }

    init();
});