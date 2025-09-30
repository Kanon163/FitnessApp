document.addEventListener('DOMContentLoaded', () => {
    // --- 状态和全局变量 ---
    let workoutHistory = {};
    let currentLog = []; // 存储当天的所有"组"对象
    let selectedDate = new Date();
    let currentFilter = 'all';
    let restTimerInterval;
    let actionLibrary = getActionLibrary(); // 从 action-library.js 加载
    let weightUnit = localStorage.getItem('fitnessWeightUnit') || 'kg';

    // --- 获取页面元素 ---
    const workoutContainer = document.getElementById('workout-container');
    const currentDateElem = document.getElementById('current-date');
    const focusInput = document.getElementById('focus-input');
    const addWorkoutBtn = document.getElementById('add-workout-btn');
    const prevDayBtn = document.getElementById('prev-day-btn');
    const nextDayBtn = document.getElementById('next-day-btn');
    const unitSwitcher = document.getElementById('unit-switcher');
    
    // 模态框元素
    const actionModal = document.getElementById('action-modal');
    const closeActionModalBtn = document.getElementById('close-action-modal-btn');
    const actionList = document.getElementById('action-list');
    const modalFilterContainer = document.getElementById('modal-filter-container');
    const viewLogBtn = document.getElementById('view-log-btn');
    const logModal = document.getElementById('log-modal');
    const closeLogModalBtn = document.getElementById('close-log-modal-btn');
    const logList = document.getElementById('log-list');
    const exportSelectedBtn = document.getElementById('export-selected-btn');
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
        updateUnitButtons();
        renderWorkoutModules();
        setupEventListeners();
    }

    // --- 事件监听器 ---
    function setupEventListeners() {
        // 主界面
        addWorkoutBtn.addEventListener('click', () => { renderActionList(); actionModal.style.display = 'flex'; });
        prevDayBtn.addEventListener('click', () => changeDate(-1));
        nextDayBtn.addEventListener('click', () => changeDate(1));
        workoutContainer.addEventListener('click', handleModuleClick);
        workoutContainer.addEventListener('change', handleModuleInputChange);
        unitSwitcher.addEventListener('click', handleUnitSwitch);
        focusInput.addEventListener('change', (e) => {
            const dateKey = selectedDate.toISOString().slice(0, 10);
            if(workoutHistory[dateKey]) {
                workoutHistory[dateKey].focus = e.target.value;
                saveData();
            }
        });
        
        // 动作选择模态框
        closeActionModalBtn.addEventListener('click', () => actionModal.style.display = 'none');
        actionList.addEventListener('click', handleActionSelect);
        modalFilterContainer.addEventListener('click', handleFilterClick);

        // 日志模态框
        viewLogBtn.addEventListener('click', showLogModal);
        closeLogModalBtn.addEventListener('click', () => logModal.style.display = 'none');
        logList.addEventListener('click', handleLogItemClick);
        exportSelectedBtn.addEventListener('click', exportSelectedLogs);
        
        // 动作库模态框
        manageLibraryBtn.addEventListener('click', showLibraryModal);
        closeLibraryModalBtn.addEventListener('click', () => libraryModal.style.display = 'none');
        exportLibraryBtn.addEventListener('click', exportLibraryToCSV);
        csvImportInput.addEventListener('change', handleCSVImport);
        addNewActionBtn.addEventListener('click', handleAddNewAction);
        libraryListContainer.addEventListener('click', handleLibraryActions);
    }

    // --- V7 核心：模块化渲染 ---
    function renderWorkoutModules() {
        workoutContainer.innerHTML = '';

        const actionGroups = currentLog.reduce((acc, set) => {
            if (!acc[set.name]) {
                acc[set.name] = [];
            }
            acc[set.name].push(set);
            return acc;
        }, {});

        if (Object.keys(actionGroups).length === 0) {
            workoutContainer.innerHTML = '<p class="empty-state">点击右下角 "+" 开始添加训练</p>';
            return;
        }

        for (const actionName in actionGroups) {
            const sets = actionGroups[actionName];
            // 确保所有组共享同一个UI状态对象
            const uiState = sets[0].uiState || { isVExpanded: false, isHExpanded: false, currentSetIndex: sets.length - 1 };
            sets.forEach(s => s.uiState = uiState);

            const currentSetIndex = uiState.currentSetIndex;
            const currentSet = sets[currentSetIndex];

            const module = document.createElement('div');
            module.className = 'workout-module';
            module.dataset.actionName = actionName;

            module.innerHTML = `
                <div class="focus-row-wrapper ${uiState.isHExpanded ? 'expanded' : ''}">
                    <div class="focus-row">
                        <span class="action-name">${actionName}</span>
                        <span class="set-info">第 ${currentSet.set} 组</span>
                        <input type="text" class="reps-input" placeholder="次数" value="${currentSet.reps || ''}">
                        <button class="confirm-set-btn" title="确认并开始下一组"><i class="fas fa-check-circle"></i></button>
                        <button class="expand-btn vertical" title="查看历史组"><i class="fas fa-chevron-down ${uiState.isVExpanded ? 'expanded' : ''}"></i></button>
                        <button class="expand-btn horizontal" title="展开详细信息"><i class="fas fa-arrow-right"></i></button>
                    </div>
                    <div class="details-row">
                        <button class="expand-btn horizontal" title="收起详细信息"><i class="fas fa-arrow-left"></i></button>
                        <input type="number" class="weight-input" placeholder="重量" value="${currentSet.weight || ''}">
                        <input type="number" class="rpe-input" step="0.1" placeholder="RPE" value="${currentSet.rpe || ''}">
                        <input type="text" class="notes-input" placeholder="备注" value="${currentSet.notes || ''}">
                        <button class="rest-timer-btn" title="休息计时"><i class="fas fa-clock"></i></button>
                        <button class="delete-set-btn" title="删除本组"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                <div class="sets-history-container ${uiState.isVExpanded ? 'expanded' : ''}">
                    <div class="history-list"></div>
                </div>
            `;
            workoutContainer.appendChild(module);
            
            if (uiState.isVExpanded) {
                const historyList = module.querySelector('.history-list');
                const records = findPerformanceRecords(actionName);
                if (records.best) historyList.appendChild(createHintItem('历史最佳', records.best));
                if (records.last) historyList.appendChild(createHintItem('上一次', records.last));
                sets.forEach(set => historyList.appendChild(createHistoryItem(set)));
            }
        }
        saveData();
    }

    function createHistoryItem(set) {
        const item = document.createElement('div');
        item.className = 'history-item';
        const capacity = (set.weight && set.reps) ? (parseFloat(set.weight) * parseInt(set.reps.split(',')[0])).toFixed(1) : '-';
        item.innerHTML = `
            <span class="history-item-label">第 ${set.set} 组:</span>
            <span>${set.weight || '-'} ${weightUnit} × ${set.reps || '-'} reps</span>
            <span>容量: ${capacity}</span>
            <span>RPE: ${set.rpe || '-'}</span>
        `;
        return item;
    }
    
    function createHintItem(label, record) {
        const item = document.createElement('div');
        item.className = 'hint-item';
        const capacity = (record.weight && record.reps) ? (parseFloat(record.weight) * parseInt(record.reps.split(',')[0])).toFixed(1) : '-';
        item.innerHTML = `
            <span class="history-item-label">${label} (${record.date}):</span>
            <span>${record.weight || '-'} ${weightUnit} × ${record.reps || '-'} reps</span>
            <span>容量: ${capacity}</span>
            <span>RPE: ${record.rpe || '-'}</span>
        `;
        return item;
    }

    // --- V7 事件处理 ---
    function handleModuleClick(e) {
        const module = e.target.closest('.workout-module');
        if (!module) return;
        const actionName = module.dataset.actionName;
        const groupData = findGroupData(actionName);
        if (!groupData) return;

        if (e.target.closest('.expand-btn.vertical')) {
            groupData.uiState.isVExpanded = !groupData.uiState.isVExpanded;
        } else if (e.target.closest('.expand-btn.horizontal')) {
            groupData.uiState.isHExpanded = !groupData.uiState.isHExpanded;
        } else if (e.target.closest('.confirm-set-btn')) {
            const lastSetNumber = groupData.sets.reduce((max, set) => Math.max(max, set.set), 0);
            addSet(actionName, { set: lastSetNumber + 1 });
            const newGroupData = findGroupData(actionName);
            newGroupData.uiState.currentSetIndex = newGroupData.sets.length - 1;
        } else if (e.target.closest('.delete-set-btn')) {
            const setToDelete = groupData.sets[groupData.uiState.currentSetIndex];
            if (confirm(`确定要删除“${actionName}”的第 ${setToDelete.set} 组吗？`)) {
                const logIndex = currentLog.indexOf(setToDelete);
                if (logIndex > -1) currentLog.splice(logIndex, 1);
                
                const newGroupData = findGroupData(actionName);
                if (newGroupData) {
                    newGroupData.uiState.currentSetIndex = Math.max(0, newGroupData.sets.length - 1);
                }
            }
        } else if (e.target.closest('.action-name')) {
            const newName = prompt(`输入 "${actionName}" 的新名称：`, actionName);
            if (newName && newName.trim() && newName.trim() !== actionName) {
                if (confirm(`确定要将所有 "${actionName}" 的记录和库项目重命名为 "${newName}" 吗？此操作不可撤销。`)) {
                    globalRenameAction(actionName, newName.trim());
                }
            }
        }

        renderWorkoutModules();
    }
    
    function handleModuleInputChange(e) {
        const module = e.target.closest('.workout-module');
        if (!module) return;
        const actionName = module.dataset.actionName;
        const groupData = findGroupData(actionName);
        if (!groupData) return;
        
        const currentSet = groupData.sets[groupData.uiState.currentSetIndex];
        const classMap = { 'weight-input': 'weight', 'reps-input': 'reps', 'rpe-input': 'rpe', 'notes-input': 'notes' };
        const key = Object.keys(classMap).find(cls => e.target.classList.contains(cls));
        if (key) {
            currentSet[classMap[key]] = e.target.value;
            saveData();
        }
    }

    function findGroupData(actionName) {
        const sets = currentLog.filter(item => item.name === actionName);
        if (sets.length === 0) return null;
        return { sets, uiState: sets[0].uiState };
    }

    function addSet(actionName, options = {}) {
        const newSet = { name: actionName, set: options.set || 1, reps: '', weight: '', rpe: '', notes: '' };
        const existingGroup = findGroupData(actionName);
        if (existingGroup) {
            newSet.uiState = existingGroup.uiState;
        } else {
            newSet.uiState = { isVExpanded: false, isHExpanded: false, currentSetIndex: 0 };
        }
        currentLog.push(newSet);
    }
    
    function globalRenameAction(oldName, newName) {
        actionLibrary = getActionLibrary();
        const libraryItem = actionLibrary.find(item => item.name === oldName);
        if(libraryItem) libraryItem.name = newName;
        saveActionLibrary(actionLibrary);

        Object.values(workoutHistory).forEach(dayData => {
            dayData.log.forEach(item => {
                if (item.name === oldName) item.name = newName;
            });
        });
        saveData();
        renderWorkoutModules();
    }
    
    function handleUnitSwitch(e) {
        if (e.target.classList.contains('unit-btn')) {
            weightUnit = e.target.dataset.unit;
            localStorage.setItem('fitnessWeightUnit', weightUnit);
            updateUnitButtons();
            renderWorkoutModules();
        }
    }

    function updateUnitButtons() {
        unitSwitcher.querySelectorAll('.unit-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.unit === weightUnit);
        });
    }

    // --- 日期处理 ---
    function changeDate(days) {
        selectedDate.setDate(selectedDate.getDate() + days);
        loadData();
        updateDateDisplay();
        renderWorkoutModules();
    }

    function updateDateDisplay() {
        const dateKey = selectedDate.toISOString().slice(0, 10);
        const todayKey = new Date().toISOString().slice(0, 10);
        currentDateElem.textContent = `${dateKey}${dateKey === todayKey ? ' (今天)' : ''}`;
    }

    // --- 智能提示 ---
    function findPerformanceRecords(actionName) {
        let best = null, last = null, bestCapacity = 0;
        const sortedDates = Object.keys(workoutHistory).sort().reverse();
        const currentDateKey = selectedDate.toISOString().slice(0, 10);

        for (const date of sortedDates) {
            if (date >= currentDateKey) continue; // 只查找过去的数据
            for (const item of workoutHistory[date].log) {
                if (item.name === actionName) {
                    if (!last) last = { ...item, date };
                    const capacity = (item.weight && item.reps) ? parseFloat(item.weight) * parseInt(item.reps.split(',')[0]) : 0;
                    if (capacity > bestCapacity) {
                        bestCapacity = capacity;
                        best = { ...item, date };
                    }
                }
            }
        }
        return { best, last };
    }

    // --- 模态框逻辑 ---
    function handleActionSelect(e) {
        if (e.target.closest('.action-item')) {
            const actionName = e.target.closest('.action-item').textContent;
            if (!currentLog.some(log => log.name === actionName)) {
                addSet(actionName, { set: 1 });
            }
            renderWorkoutModules();
            actionModal.style.display = 'none';
        }
    }
    
    function handleFilterClick(e) { if (e.target.classList.contains('filter-btn')) { currentFilter = e.target.dataset.part; renderFilterButtons(); } }
    function renderActionList() {
        actionList.innerHTML = '';
        getActionLibrary().filter(action => currentFilter === 'all' || action.tags.includes(currentFilter))
        .forEach(action => {
            const div = document.createElement('div');
            div.className = 'action-item';
            div.textContent = action.name;
            actionList.appendChild(div);
        });
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
            renderWorkoutModules();
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
        csvContent += "日期,训练重点,动作,组数,重量,次数,RPE,备注,休息(s)\n";
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
    
    function showLibraryModal() { renderLibraryList(); libraryModal.style.display = 'flex'; }
    function renderLibraryList() { /* V6 代码 */ }
    function handleAddNewAction() { /* V6 代码 */ }
    function handleLibraryActions(e) { /* V6 代码 */ }
    function handleCSVImport(event) { /* V6 代码 */ }
    
    // --- 粘贴 V6 中未改变的动作库函数 ---
    function renderLibraryList() {
        libraryListContainer.innerHTML = '';
        actionLibrary.forEach((action, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'library-item';
            itemDiv.dataset.index = index;
            itemDiv.innerHTML = `<div class="library-item-details"><span class="library-item-name">${action.name}</span><span class="library-item-tags">标签: ${action.tags.join(', ') || '无'}</span></div><div class="library-item-actions"><button class="edit-btn"><i class="fas fa-edit"></i></button><button class="delete-btn"><i class="fas fa-trash-alt"></i></button></div>`;
            libraryListContainer.appendChild(itemDiv);
        });
    }
    function handleAddNewAction() {
        const name = newActionNameInput.value.trim();
        const tags = newActionTagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
        if (!name) { alert('动作名称不能为空！'); return; }
        if (addToActionLibrary({ name, tags })) {
            actionLibrary = getActionLibrary();
            newActionNameInput.value = '';
            newActionTagsInput.value = '';
            renderLibraryList();
        } else { alert('该动作已存在！'); }
    }
    function handleLibraryActions(e) {
        const target = e.target.closest('button');
        if (!target) return;
        const itemDiv = target.closest('.library-item');
        const index = parseInt(itemDiv.dataset.index);
        if (target.closest('.delete-btn')) {
            if (confirm(`确定要删除动作 "${actionLibrary[index].name}" 吗？`)) {
                deleteFromActionLibrary(index);
                actionLibrary = getActionLibrary();
                renderLibraryList();
            }
        } else if (target.closest('.edit-btn')) {
            const action = actionLibrary[index];
            const newName = prompt('输入新的动作名称:', action.name);
            if (newName === null) return;
            const newTags = prompt('输入新的标签 (用逗号分隔):', action.tags.join(','));
            if (newTags === null) return;
            updateActionInLibrary(index, { name: newName.trim(), tags: newTags.split(',').map(t => t.trim()).filter(Boolean) });
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
            if (newLibrary) { actionLibrary = newLibrary; renderLibraryList(); alert('动作库导入成功！'); }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    // --- 数据存取 ---
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
    
    init();
});