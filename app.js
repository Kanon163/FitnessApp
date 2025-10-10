// app.js

document.addEventListener('DOMContentLoaded', () => {

    const App = {
        // 状态管理模块
        state: {
            currentDate: new Date(),
            activePage: 'record-page',
            charts: {}, // 存储Chart.js实例
        },

        // 数据层模块 (与 localStorage 交互)
        db: {
            getWorkoutHistory() {
                return JSON.parse(localStorage.getItem('workoutHistory')) || {};
            },
            saveWorkoutHistory(data) {
                localStorage.setItem('workoutHistory', JSON.stringify(data));
            },
            getActionLibrary() {
                return JSON.parse(localStorage.getItem('actionLibrary')) || [];
            },
            saveActionLibrary(data) {
                localStorage.setItem('actionLibrary', JSON.stringify(data));
            },
            getSettings() {
                return JSON.parse(localStorage.getItem('fitnessAppSettings')) || { theme: 'light', actionUnits: {} };
            },
            saveSettings(data) {
                localStorage.setItem('fitnessAppSettings', JSON.stringify(data));
            },
            getDashboard() {
                return JSON.parse(localStorage.getItem('fitnessAppDashboard')) || [];
            },
            saveDashboard(data) {
                localStorage.setItem('fitnessAppDashboard', JSON.stringify(data));
            }
        },

        // 界面渲染模块
        ui: {
            initTheme() {
                const settings = App.db.getSettings();
                this.updateTheme(settings.theme);
            },

            updateTheme(theme) {
                const body = document.body;
                const sunIcon = document.getElementById('theme-icon-sun');
                const moonIcon = document.getElementById('theme-icon-moon');
                const themeText = document.getElementById('theme-text');
                
                if (theme === 'dark') {
                    body.classList.add('dark-mode');
                    sunIcon.style.display = 'none';
                    moonIcon.style.display = 'block';
                    themeText.textContent = '白天';
                } else {
                    body.classList.remove('dark-mode');
                    sunIcon.style.display = 'block';
                    moonIcon.style.display = 'none';
                    themeText.textContent = '黑夜';
                }
                
                if (App.state.activePage === 'analysis-page') {
                   App.ui.renderAnalysisPage();
                }
            },
            
            renderDate() {
                const dateDisplay = document.getElementById('date-display');
                const today = new Date();
                const currentDate = App.state.currentDate;
                
                if (currentDate.toDateString() === today.toDateString()) {
                    dateDisplay.textContent = '今天';
                } else {
                    dateDisplay.textContent = currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
                }
            },
            
            renderRecordPage() {
                const content = document.getElementById('record-page-content');
                content.innerHTML = '';
                const dateKey = App.utils.getDateKey(App.state.currentDate);
                const history = App.db.getWorkoutHistory();
                const dayData = history[dateKey] || [];

                if (dayData.length === 0) {
                    content.innerHTML = '<div class="empty-state">今天还没有训练记录。<br>点击右下角“+”添加第一个动作。</div>';
                } else {
                    dayData.forEach((action, index) => {
                        content.insertAdjacentHTML('beforeend', this.createActionModuleHTML(action, index));
                    });
                }
            },
            
            createActionModuleHTML(actionData, actionIndex) {
                const settings = App.db.getSettings();
                const unit = settings.actionUnits?.[actionData.name] || 'kg';
                const lastLog = actionData.logs[actionData.logs.length - 1] || { weight: '', reps: '' };
                
                const setLogsHTML = actionData.logs.map((log, logIndex) => `
                    <li class="set-log-item" data-action-index="${actionIndex}" data-log-index="${logIndex}">
                        <span>第 ${logIndex + 1} 组: ${log.weight || 0} ${log.unit} × ${log.reps || 0} 次</span>
                        <div class="control-group">
                          <small>RPE: ${log.rpe || '-'}</small>
                          <button class="btn-icon btn-delete-set" title="删除此组">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>
                          </button>
                        </div>
                    </li>
                `).join('');

                const { bestSet, lastWorkout } = App.utils.getHistoricalData(actionData.name);

                return `
                <div class="action-module" data-action-index="${actionIndex}" data-action-name="${actionData.name}">
                    <div class="action-card-header">
                        <span class="action-name">${actionData.name}</span>
                        <div class="control-group">
                            <button class="btn-icon btn-delete-action" title="删除今日该动作">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>
                            </button>
                        </div>
                    </div>

                    <div class="action-card-input-row">
                        <span class="action-set-count">${actionData.logs.length}组</span>
                        <input type="number" class="weight-input" placeholder="重量" value="${lastLog.weight}">
                        <input type="number" class="reps-input" placeholder="次数" value="${lastLog.reps}">
                        <button class="btn btn-secondary unit-toggle" data-action-name="${actionData.name}">${unit}</button>
                    </div>
                    
                    <div class="secondary-inputs">
                        <input type="number" class="rpe-input" placeholder="RPE (选填)">
                        <input type="text" class="notes-input" placeholder="备注 (选填)">
                    </div>

                    <div class="action-card-controls">
                        <div class="control-group">
                             <button class="btn btn-secondary toggle-details">查看历史</button>
                             <button class="btn btn-secondary toggle-secondary">更多信息</button>
                        </div>
                        <button class="btn btn-primary btn-confirm-set">
                           添加第 ${actionData.logs.length + 1} 组
                        </button>
                    </div>

                    <div class="module-details">
                        <div class="past-data">
                            <span>历史最佳: ${bestSet}</span>
                            <span>上次训练: ${lastWorkout}</span>
                        </div>
                        <ul class="set-log-list">${setLogsHTML || '<li>暂无记录</li>'}</ul>
                    </div>
                </div>
                `;
            },

            renderAnalysisPage() {
                const content = document.getElementById('analysis-page-content');
                const dashboardConfig = App.db.getDashboard();
                content.innerHTML = '';
                
                Object.values(App.state.charts).forEach(chart => chart.destroy());
                App.state.charts = {};

                if (dashboardConfig.length === 0) {
                    content.innerHTML = '<div class="empty-state">还没有分析图表。<br>点击右下角“+”创建第一个。</div>';
                    return;
                }

                dashboardConfig.forEach((config, index) => {
                    const cardId = `chart-card-${index}`;
                    content.insertAdjacentHTML('beforeend', `
                        <div class="chart-card" id="${cardId}" data-dashboard-index="${index}">
                            <div class="chart-card-header">
                                <span class="chart-card-title">${config.type === 'action' ? '动作' : '标签'}: ${config.value}</span>
                                <button class="btn-icon btn-delete-chart" title="删除图表">
                                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>
                                </button>
                            </div>
                            <canvas id="chart-${index}"></canvas>
                        </div>
                    `);
                    this.renderChart(index, config);
                });
            },

            renderChart(index, config) {
                const canvas = document.getElementById(`chart-${index}`);
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                const data = App.utils.getChartData(config);
                const settings = App.db.getSettings();
                const isDarkMode = settings.theme === 'dark';
                const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
                const textColor = isDarkMode ? '#c9d1d9' : '#1f2329';
                
                let chartConfig;
                if (config.type === 'action') {
                    chartConfig = {
                        type: 'bar',
                        data: {
                            labels: data.labels,
                            datasets: [
                                {
                                    label: '总容量 (kg)',
                                    data: data.volumes,
                                    backgroundColor: 'rgba(31, 111, 235, 0.6)',
                                    borderColor: 'rgba(31, 111, 235, 1)',
                                    borderWidth: 1,
                                    yAxisID: 'yVolume',
                                },
                                {
                                    label: '最大重量 (kg)',
                                    data: data.maxWeights,
                                    type: 'line',
                                    borderColor: 'rgba(255, 159, 64, 1)',
                                    backgroundColor: 'rgba(255, 159, 64, 0.2)',
                                    tension: 0.1,
                                    yAxisID: 'yWeight',
                                }
                            ]
                        },
                        options: {
                            scales: {
                                x: { type: 'time', time: { unit: 'day' }, grid: { color: gridColor }, ticks: { color: textColor } },
                                yVolume: { type: 'linear', position: 'left', title: { display: true, text: '总容量', color: textColor }, grid: { color: gridColor }, ticks: { color: textColor } },
                                yWeight: { type: 'linear', position: 'right', title: { display: true, text: '最大重量', color: textColor }, grid: { drawOnChartArea: false }, ticks: { color: textColor } }
                            },
                            plugins: { legend: { labels: { color: textColor } } }
                        }
                    };
                } else { // tag
                    chartConfig = {
                        type: 'bar',
                        data: {
                            labels: data.labels,
                            datasets: [{
                                label: `标签'${config.value}'总容量 (kg)`,
                                data: data.volumes,
                                backgroundColor: 'rgba(40, 167, 69, 0.6)',
                                borderColor: 'rgba(40, 167, 69, 1)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            scales: {
                                x: { type: 'time', time: { unit: 'day' }, grid: { color: gridColor }, ticks: { color: textColor } },
                                y: { title: { display: true, text: '总容量 (kg)', color: textColor }, grid: { color: gridColor }, ticks: { color: textColor } }
                            },
                            plugins: { legend: { labels: { color: textColor } } }
                        }
                    };
                }
                
                App.state.charts[index] = new Chart(ctx, chartConfig);
            },

            showModal(id, title, content) {
                const modalContainer = document.getElementById('modal-container');
                modalContainer.innerHTML = `
                    <div id="${id}" class="modal visible">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h2 class="modal-title">${title}</h2>
                                <button class="btn-icon close-modal" title="关闭">
                                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
                                </button>
                            </div>
                            <div class="modal-body">${content}</div>
                        </div>
                    </div>
                `;
            },

            hideModal() {
                const modalContainer = document.getElementById('modal-container');
                modalContainer.innerHTML = '';
            },

            renderActionLibraryModal(isForSelection = false, onSelect) {
                const library = App.db.getActionLibrary();
                const listHTML = library.map((action, index) => `
                    <div class="log-history-item">
                        <span>${action.name} <small style="color:var(--subtext-color)">${action.tags.join(', ')}</small></span>
                        <div>
                            ${isForSelection 
                                ? `<button class="btn btn-secondary select-action-btn" data-action-name="${action.name}">选择</button>`
                                : `<button class="btn-icon edit-action-btn" data-index="${index}"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg></button>`
                            }
                        </div>
                    </div>
                `).join('');

                const title = isForSelection ? '选择一个动作' : '动作库管理';
                const footer = isForSelection ? '' : `
                    <div class="modal-footer">
                        <button id="add-new-action-btn" class="btn btn-primary">新增动作</button>
                        <button id="import-actions-btn" class="btn btn-secondary">导入CSV</button>
                        <button id="export-actions-btn" class="btn btn-secondary">导出CSV</button>
                    </div>`;
                
                this.showModal('action-library-modal', title, `
                    <div>${listHTML || '<div class="empty-state">动作库为空</div>'}</div>
                    ${footer}
                `);

                if (onSelect) {
                    document.querySelectorAll('.select-action-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            onSelect(e.target.dataset.actionName);
                            this.hideModal();
                        });
                    });
                }
            },

            renderActionFormModal(action = { name: '', tags: [] }, index = -1) {
                const title = index === -1 ? '新增动作' : '编辑动作';
                this.showModal('action-form-modal', title, `
                    <div class="form-group">
                        <label for="action-name-input">动作名称</label>
                        <input type="text" id="action-name-input" value="${action.name}" required>
                    </div>
                    <div class="form-group">
                        <label for="action-tags-input">标签 (输入后按回车或逗号)</label>
                        <div class="tag-input-container">
                            <input type="text" id="action-tags-input" placeholder="例如: 胸,推,上肢">
                            <div class="tag-suggestions" style="display:none;"></div>
                        </div>
                        <div class="selected-tags" id="selected-tags-container"></div>
                    </div>
                    <div class="modal-footer">
                        ${index > -1 ? `<button id="delete-action-from-lib-btn" class="btn" style="color:var(--danger-color); float: left;">删除动作</button>`: ''}
                        <button id="save-action-btn" class="btn btn-primary">保存</button>
                    </div>
                `);
                
                const tagsInput = document.getElementById('action-tags-input');
                const selectedTagsContainer = document.getElementById('selected-tags-container');
                let currentTags = [...action.tags];

                const renderTags = () => {
                    selectedTagsContainer.innerHTML = currentTags.map(tag => `
                        <span class="tag-badge">${tag} <span class="remove-tag" data-tag="${tag}">&times;</span></span>
                    `).join('');
                };
                renderTags();

                tagsInput.addEventListener('keyup', (e) => {
                    if (e.key === ',' || e.key === 'Enter') {
                        const newTags = e.target.value.split(',').map(t => t.trim()).filter(t => t && !currentTags.includes(t));
                        if(newTags.length > 0) {
                            currentTags.push(...newTags);
                            renderTags();
                        }
                        e.target.value = '';
                        document.querySelector('.tag-suggestions').style.display = 'none';
                    }
                });

                document.body.addEventListener('click', (e) => {
                     if (e.target.classList.contains('remove-tag')) {
                        currentTags = currentTags.filter(t => t !== e.target.dataset.tag);
                        renderTags();
                    }
                });
                
                document.getElementById('save-action-btn').onclick = () => {
                    const remainingTag = tagsInput.value.trim();
                    if (remainingTag && !currentTags.includes(remainingTag)) {
                        currentTags.push(remainingTag);
                    }
                    const newAction = {
                        name: document.getElementById('action-name-input').value.trim(),
                        tags: currentTags
                    };
                    if (!newAction.name) {
                        alert('动作名称不能为空！');
                        return;
                    }
                    App.events.handleSaveAction(newAction, index, action.name);
                };

                if (index > -1) {
                    document.getElementById('delete-action-from-lib-btn').onclick = () => App.events.handleDeleteActionFromLib(index, action.name);
                }
            },
            
            renderHistoryLogModal() {
                const history = App.db.getWorkoutHistory();
                const sortedDates = Object.keys(history).sort((a, b) => new Date(b) - new Date(a));
                const listHTML = sortedDates.map(dateKey => `
                    <div class="log-history-item">
                        <label style="display: flex; align-items: center; gap: 10px; flex-grow:1; cursor:pointer;">
                            <input type="checkbox" class="history-checkbox" value="${dateKey}">
                            <span class="log-history-item-date" data-date="${dateKey}">${new Date(dateKey).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </label>
                    </div>
                `).join('');

                this.showModal('history-log-modal', '训练日志', `
                    <div>${listHTML || '<div class="empty-state">暂无历史记录</div>'}</div>
                    <div class="modal-footer">
                        <button id="export-selected-logs-btn" class="btn btn-primary">导出选中项为CSV</button>
                    </div>
                `);
            },
            
            renderAddChartModal() {
                const actions = App.db.getActionLibrary().map(a => `<option value="${a.name}">${a.name}</option>`).join('');
                const allTags = [...new Set(App.db.getActionLibrary().flatMap(a => a.tags))];
                const tags = allTags.map(t => `<option value="${t}">${t}</option>`).join('');

                this.showModal('add-chart-modal', '创建新图表', `
                    <div class="form-group">
                        <label for="chart-type-select">图表类型</label>
                        <select id="chart-type-select">
                            <option value="action">按动作追踪</option>
                            <option value="tag">按标签追踪</option>
                        </select>
                    </div>
                    <div id="action-selector-group" class="form-group">
                        <label for="action-select">选择动作</label>
                        <select id="action-select">${actions}</select>
                    </div>
                    <div id="tag-selector-group" class="form-group" style="display:none;">
                        <label for="tag-select">选择标签</label>
                        <select id="tag-select">${tags}</select>
                    </div>
                    <div class="modal-footer">
                        <button id="create-chart-btn" class="btn btn-primary">创建</button>
                    </div>
                `);

                document.getElementById('chart-type-select').addEventListener('change', (e) => {
                    document.getElementById('action-selector-group').style.display = e.target.value === 'action' ? 'block' : 'none';
                    document.getElementById('tag-selector-group').style.display = e.target.value === 'tag' ? 'block' : 'none';
                });
            }
        },

        // 事件处理模块
        events: {
            init() {
                document.querySelector('.app-footer').addEventListener('click', this.handleNavClick);
                document.getElementById('prev-day-btn').addEventListener('click', () => this.handleDateChange(-1));
                document.getElementById('next-day-btn').addEventListener('click', () => this.handleDateChange(1));
                document.getElementById('theme-toggle-btn').addEventListener('click', this.handleThemeToggle);
                document.getElementById('add-action-btn').addEventListener('click', this.handleAddAction);
                document.getElementById('record-page-content').addEventListener('click', this.handleRecordPageClick);
                document.getElementById('add-chart-btn').addEventListener('click', this.handleAddChart);
                document.getElementById('analysis-page-content').addEventListener('click', this.handleAnalysisPageClick);
                document.getElementById('action-library-btn').addEventListener('click', () => App.ui.renderActionLibraryModal());
                document.getElementById('history-log-btn').addEventListener('click', App.ui.renderHistoryLogModal);
                document.getElementById('modal-container').addEventListener('click', this.handleModalClick);
            },

            handleNavClick(e) {
                const navItem = e.target.closest('.nav-item');
                if (!navItem || navItem.id === 'theme-toggle-btn') return;
                
                const pageId = navItem.dataset.page;
                if (pageId && App.state.activePage !== pageId) {
                    App.state.activePage = pageId;
                    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                    document.getElementById(pageId).classList.add('active');

                    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                    navItem.classList.add('active');
                    
                    if (pageId === 'analysis-page') {
                        App.ui.renderAnalysisPage();
                    }
                }
            },
            
            handleDateChange(days) {
                App.state.currentDate.setDate(App.state.currentDate.getDate() + days);
                App.ui.renderDate();
                App.ui.renderRecordPage();
            },
            
            handleThemeToggle() {
                const settings = App.db.getSettings();
                settings.theme = settings.theme === 'light' ? 'dark' : 'light';
                App.db.saveSettings(settings);
                App.ui.updateTheme(settings.theme);
            },

            handleAddAction() {
                App.ui.renderActionLibraryModal(true, (actionName) => {
                    const dateKey = App.utils.getDateKey(App.state.currentDate);
                    const history = App.db.getWorkoutHistory();
                    if (!history[dateKey]) {
                        history[dateKey] = [];
                    }
                    if (history[dateKey].some(a => a.name === actionName)) {
                        alert(`动作 "${actionName}" 在今天已经添加过了。`);
                        return;
                    }
                    history[dateKey].push({ name: actionName, logs: [] });
                    App.db.saveWorkoutHistory(history);
                    App.ui.renderRecordPage();
                });
            },

            handleRecordPageClick(e) {
                const target = e.target;
                const actionModule = target.closest('.action-module');
                if (!actionModule) return;
                
                const actionIndex = parseInt(actionModule.dataset.actionIndex);
                const actionName = actionModule.dataset.actionName;

                if (target.closest('.btn-confirm-set')) {
                    const weight = actionModule.querySelector('.weight-input').value;
                    const reps = actionModule.querySelector('.reps-input').value;
                    if (!weight || !reps) {
                        alert('请输入重量和次数');
                        return;
                    }
                    const dateKey = App.utils.getDateKey(App.state.currentDate);
                    const history = App.db.getWorkoutHistory();
                    history[dateKey][actionIndex].logs.push({
                        weight: parseFloat(weight),
                        reps: parseInt(reps),
                        rpe: actionModule.querySelector('.rpe-input').value,
                        notes: actionModule.querySelector('.notes-input').value,
                        unit: actionModule.querySelector('.unit-toggle').textContent
                    });
                    App.db.saveWorkoutHistory(history);
                    App.ui.renderRecordPage();
                }

                else if (target.classList.contains('unit-toggle')) {
                    const currentUnit = target.textContent;
                    const newUnit = currentUnit === 'kg' ? 'lbs' : 'kg';
                    target.textContent = newUnit;
                    const settings = App.db.getSettings();
                    if (!settings.actionUnits) settings.actionUnits = {};
                    settings.actionUnits[actionName] = newUnit;
                    App.db.saveSettings(settings);
                }
                
                else if (target.classList.contains('toggle-details')) {
                    actionModule.querySelector('.module-details').classList.toggle('visible');
                }
                else if (target.classList.contains('toggle-secondary')) {
                    actionModule.querySelector('.secondary-inputs').classList.toggle('visible');
                }

                else if (target.closest('.btn-delete-set')) {
                    const logIndex = parseInt(target.closest('.set-log-item').dataset.logIndex);
                    if (confirm(`确定要删除第 ${logIndex + 1} 组数据吗？`)) {
                        const dateKey = App.utils.getDateKey(App.state.currentDate);
                        const history = App.db.getWorkoutHistory();
                        history[dateKey][actionIndex].logs.splice(logIndex, 1);
                        App.db.saveWorkoutHistory(history);
                        App.ui.renderRecordPage();
                    }
                }

                else if (target.closest('.btn-delete-action')) {
                     if (confirm(`确定要删除今天的 "${actionName}" 全部记录吗？`)) {
                        const dateKey = App.utils.getDateKey(App.state.currentDate);
                        const history = App.db.getWorkoutHistory();
                        history[dateKey].splice(actionIndex, 1);
                        App.db.saveWorkoutHistory(history);
                        App.ui.renderRecordPage();
                    }
                }

                else if (target.classList.contains('action-name')) {
                    const oldName = actionName;
                    const newName = prompt(`为 "${oldName}" 输入新的名称进行全局重命名：`, oldName);
                    if (newName && newName.trim() !== '' && newName !== oldName) {
                       if (confirm(`确定要将所有记录中的 "${oldName}" 重命名为 "${newName}" 吗？此操作不可撤销。`)) {
                           App.utils.renameActionGlobally(oldName, newName);
                           App.ui.renderRecordPage();
                       }
                    }
                }
            },

            handleModalClick(e) {
                if (e.target.closest('.close-modal') || e.target.classList.contains('modal')) {
                    App.ui.hideModal();
                }
                else if (e.target.id === 'add-new-action-btn') {
                    App.ui.renderActionFormModal();
                }
                else if (e.target.closest('.edit-action-btn')) {
                    const index = parseInt(e.target.closest('.edit-action-btn').dataset.index);
                    const library = App.db.getActionLibrary();
                    App.ui.renderActionFormModal(library[index], index);
                }
                else if(e.target.id === 'export-actions-btn') {
                    const library = App.db.getActionLibrary();
                    const csv = App.utils.jsonToCsv(library.map(a => ({...a, tags: a.tags.join(';')})), ['name', 'tags']);
                    App.utils.downloadCsv(csv, 'action_library.csv');
                }
                else if (e.target.id === 'import-actions-btn') {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.csv';
                    fileInput.onchange = (event) => {
                        const file = event.target.files[0];
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                const jsonData = App.utils.csvToJson(e.target.result);
                                let library = App.db.getActionLibrary();
                                const newActions = jsonData.filter(newItem => !library.some(existingItem => existingItem.name === newItem.name))
                                    .map(item => ({...item, tags: item.tags ? item.tags.split(';').map(t=>t.trim()) : [] }));
                                library.push(...newActions);
                                App.db.saveActionLibrary(library);
                                App.ui.renderActionLibraryModal();
                                alert(`${newActions.length}个新动作已导入！`);
                            } catch (error) { alert('导入失败，请检查CSV文件格式！'); }
                        };
                        reader.readAsText(file);
                    };
                    fileInput.click();
                }
                
                else if (e.target.closest('.log-history-item-date')) {
                    const dateKey = e.target.closest('.log-history-item-date').dataset.date;
                    App.state.currentDate = new Date(new Date(dateKey).toLocaleString("en-US", {timeZone: "UTC"}));
                    App.ui.hideModal();
                    App.ui.renderDate();
                    App.ui.renderRecordPage();
                    document.querySelector('.nav-item[data-page="record-page"]').click();
                }
                else if (e.target.id === 'export-selected-logs-btn') {
                    const checkedBoxes = document.querySelectorAll('.history-checkbox:checked');
                    const dateKeys = Array.from(checkedBoxes).map(cb => cb.value);
                    if (dateKeys.length === 0) { alert('请至少选择一个日期进行导出。'); return; }
                    App.utils.exportWorkoutData(dateKeys);
                }
                
                else if (e.target.id === 'create-chart-btn') {
                    const type = document.getElementById('chart-type-select').value;
                    const value = type === 'action' ? document.getElementById('action-select').value : document.getElementById('tag-select').value;
                    if (!value) { alert('请选择一个有效的动作或标签。'); return; }
                    const dashboard = App.db.getDashboard();
                    dashboard.push({ type, value });
                    App.db.saveDashboard(dashboard);
                    App.ui.hideModal();
                    App.ui.renderAnalysisPage();
                }
            },
            
            handleSaveAction(action, index, oldName) {
                let library = App.db.getActionLibrary();
                if (library.some((a, i) => a.name === action.name && i !== index)) {
                    alert(`动作 "${action.name}" 已存在！`);
                    return;
                }
                if (index === -1) { library.push(action); } 
                else { 
                    library[index] = action;
                    if (oldName && oldName !== action.name) {
                        if (confirm(`动作名称已改变，是否将所有历史记录中的 "${oldName}" 更新为 "${action.name}"？`)) {
                            App.utils.renameActionGlobally(oldName, action.name);
                        }
                    }
                }
                App.db.saveActionLibrary(library);
                App.ui.hideModal();
                App.ui.renderActionLibraryModal();
            },

            handleDeleteActionFromLib(index, name) {
                if (confirm(`确定要从动作库中删除 "${name}" 吗？此操作不会删除已有的训练记录。`)) {
                    let library = App.db.getActionLibrary();
                    library.splice(index, 1);
                    App.db.saveActionLibrary(library);
                    App.ui.hideModal();
                    App.ui.renderActionLibraryModal();
                }
            },
            
            handleAddChart() {
                App.ui.renderAddChartModal();
            },
            
            handleAnalysisPageClick(e) {
                const deleteBtn = e.target.closest('.btn-delete-chart');
                if(deleteBtn) {
                    const card = deleteBtn.closest('.chart-card');
                    const index = parseInt(card.dataset.dashboardIndex);
                    if (confirm('确定要删除这个图表吗？')) {
                        let dashboard = App.db.getDashboard();
                        dashboard.splice(index, 1);
                        App.db.saveDashboard(dashboard);
                        App.ui.renderAnalysisPage();
                    }
                }
            }
        },
        
        // 工具函数模块
        utils: {
            getDateKey(date) {
                return date.toISOString().split('T')[0];
            },
            
            getHistoricalData(actionName) {
                const history = App.db.getWorkoutHistory();
                let bestWeight = 0, bestSetString = '无', lastWorkoutString = '无', lastWorkoutDate = null;
                const sortedDates = Object.keys(history).sort((a,b) => new Date(b) - new Date(a));
                for (const dateKey of sortedDates) {
                    const actionData = history[dateKey].find(a => a.name === actionName);
                    if (actionData && actionData.logs.length > 0) {
                        if (!lastWorkoutDate) {
                            lastWorkoutDate = dateKey;
                            const lastSet = actionData.logs[actionData.logs.length-1];
                            lastWorkoutString = `${lastSet.weight} ${lastSet.unit} × ${lastSet.reps}`;
                        }
                        actionData.logs.forEach(log => {
                            let currentWeight = log.unit === 'lbs' ? log.weight * 0.453592 : log.weight;
                            if (currentWeight > bestWeight) {
                                bestWeight = currentWeight;
                                bestSetString = `${log.weight} ${log.unit} × ${log.reps}`;
                            }
                        });
                    }
                }
                return { bestSet: bestSetString, lastWorkout: lastWorkoutString };
            },

            renameActionGlobally(oldName, newName) {
                let library = App.db.getActionLibrary();
                const actionInLib = library.find(a => a.name === oldName);
                if (actionInLib) actionInLib.name = newName;
                App.db.saveActionLibrary(library);

                let history = App.db.getWorkoutHistory();
                Object.values(history).forEach(day => day.forEach(act => { if (act.name === oldName) act.name = newName; }));
                App.db.saveWorkoutHistory(history);

                let dashboard = App.db.getDashboard();
                dashboard.forEach(conf => { if (conf.type === 'action' && conf.value === oldName) conf.value = newName; });
                App.db.saveDashboard(dashboard);
                
                let settings = App.db.getSettings();
                if(settings.actionUnits && settings.actionUnits[oldName]) {
                    settings.actionUnits[newName] = settings.actionUnits[oldName];
                    delete settings.actionUnits[oldName];
                    App.db.saveSettings(settings);
                }
            },
            
            getChartData(config) {
                const history = App.db.getWorkoutHistory();
                const sortedDates = Object.keys(history).sort((a,b) => new Date(a) - new Date(b));
                const labels = [], volumes = [], maxWeights = [];
                const actionLibrary = App.db.getActionLibrary();
                
                sortedDates.forEach(dateKey => {
                    let dailyVolume = 0, dailyMaxWeight = 0;
                    if (config.type === 'action') {
                        const action = history[dateKey].find(a => a.name === config.value);
                        if (action?.logs.length > 0) {
                            action.logs.forEach(log => {
                                const weightInKg = log.unit === 'lbs' ? log.weight * 0.453592 : log.weight;
                                dailyVolume += weightInKg * log.reps;
                                if (weightInKg > dailyMaxWeight) dailyMaxWeight = weightInKg;
                            });
                        }
                    } else {
                        const actionsWithTag = actionLibrary.filter(a => a.tags.includes(config.value)).map(a => a.name);
                        history[dateKey].forEach(action => {
                            if (actionsWithTag.includes(action.name)) {
                                action.logs.forEach(log => {
                                    const weightInKg = log.unit === 'lbs' ? log.weight * 0.453592 : log.weight;
                                    dailyVolume += weightInKg * log.reps;
                                });
                            }
                        });
                    }
                    if (dailyVolume > 0) {
                        labels.push(dateKey);
                        volumes.push(dailyVolume);
                        if (config.type === 'action') maxWeights.push(dailyMaxWeight);
                    }
                });
                return { labels, volumes, maxWeights };
            },

            jsonToCsv(jsonData, headers) {
                const header = headers || Object.keys(jsonData[0]);
                let csv = jsonData.map(row => header.map(fieldName => JSON.stringify(row[fieldName])).join(','));
                csv.unshift(header.join(','));
                return csv.join('\r\n');
            },

            csvToJson(csvString) {
                const lines = csvString.replace(/\r/g, '').split('\n');
                const result = [];
                const headers = lines[0].split(',').map(h => h.trim());
                for(let i = 1; i < lines.length; i++){
                    if (!lines[i]) continue;
                    const obj = {};
                    const currentline = lines[i].split(',');
                    for(let j = 0; j < headers.length; j++){
                        obj[headers[j]] = currentline[j].replace(/"/g, '').trim();
                    }
                    result.push(obj);
                }
                return result;
            },

            downloadCsv(csvContent, fileName) {
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", fileName);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            },

            exportWorkoutData(dateKeys) {
                const history = App.db.getWorkoutHistory();
                const dataToExport = [];
                dateKeys.forEach(dateKey => {
                    (history[dateKey] || []).forEach(action => {
                        action.logs.forEach((log, index) => {
                            dataToExport.push({ date: dateKey, actionName: action.name, setNumber: index + 1, weight: log.weight, unit: log.unit, reps: log.reps, rpe: log.rpe || '', notes: log.notes || '' });
                        });
                    });
                });
                if (dataToExport.length === 0) { alert('所选日期内没有可导出的数据。'); return; }
                const csv = this.jsonToCsv(dataToExport);
                this.downloadCsv(csv, `workout_log_${new Date().toISOString().split('T')[0]}.csv`);
            }
        },
        
        pwa: {
            register() {
                if ('serviceWorker' in navigator) {
                    window.addEventListener('load', () => {
                        navigator.serviceWorker.register('sw.js')
                            .then(reg => console.log('ServiceWorker registration successful.'))
                            .catch(err => console.log('ServiceWorker registration failed: ', err));
                    });
                }
            }
        },

        // 应用初始化
        init() {
            this.pwa.register();
            this.ui.initTheme();
            this.ui.renderDate();
            this.ui.renderRecordPage();
            this.events.init();
            
            if (!localStorage.getItem('actionLibrary')) {
                App.db.saveActionLibrary([
                    { name: '杠铃卧推', tags: ['胸', '推', '复合动作'] },
                    { name: '杠铃深蹲', tags: ['腿', '推', '复合动作'] },
                    { name: '硬拉', tags: ['背', '腿', '拉', '复合动作'] }
                ]);
            }
        }
    };

    App.init();
});