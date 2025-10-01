class UIManager {
    constructor() {
        this.mainContent = document.getElementById('main-content');
        this.modalContainer = document.getElementById('modal-container');
        this.currentDate = new Date();
    }

    // --- 日期格式化 ---
    getFormattedDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // --- 渲染主界面 ---
    renderDateHeader(date) {
        document.getElementById('current-date-display').textContent = this.getFormattedDate(date);
    }
    
    renderActionModule(action, setsToday, nextSetNumber, unit) {
        const module = document.createElement('div');
        module.className = 'action-module';
        module.dataset.actionName = action.name;

        module.innerHTML = `
            <div class="focus-row-wrapper">
                <div class="focus-row-container">
                    <div class="focus-row">
                        <span class="action-name">${action.name}</span>
                        <div class="focus-row-main">
                             <span class="set-counter">第 ${nextSetNumber} 组</span>
                             <input type="number" class="reps-input" placeholder="次数" inputmode="numeric">
                        </div>
                        <div class="action-buttons">
                            <button class="confirm-btn">✓</button>
                            <button class="expand-btn" aria-expanded="false">
                                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            <button class="details-btn">➡</button>
                        </div>
                    </div>
                    <div class="details-area">
                        <button class="back-btn">⬅</button>
                        <input type="number" class="weight-input" placeholder="${unit}" inputmode="decimal">
                        <input type="number" class="rpe-input" placeholder="RPE" inputmode="numeric">
                        <input type="text" class="notes-input" placeholder="备注">
                        <button class="timer-btn">⏱</button>
                        <button class="delete-set-btn">🗑️</button>
                    </div>
                </div>
            </div>
            <div class="history-area">
                <div class="history-tip" data-type="best">历史最佳: 无记录</div>
                <div class="history-tip" data-type="last">上次训练: 无记录</div>
                <h4 class="today-sets-header ${setsToday.length > 0 ? '' : 'hidden'}">今日已完成:</h4>
                <div class="today-set-list">
                    ${setsToday.map((set, index) => this.createSetItemHTML(set, index + 1, unit)).join('')}
                </div>
            </div>
        `;
        this.mainContent.appendChild(module);
        return module;
    }
    
    createSetItemHTML(set, setNumber, unit) {
        return `
            <div class="set-item" data-set-id="${set.id}">
                <span><strong>第${setNumber}组:</strong> ${set.reps} 次 @ ${set.weight || '自重'} ${set.weight ? unit : ''}</span>
                <span>${set.rpe ? `RPE:${set.rpe}` : ''} ${set.notes ? `(${set.notes})` : ''}</span>
            </div>
        `;
    }

    // --- 模态框 (Modal) ---
    showModal(title, contentHTML, footerHTML) {
        this.modalContainer.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>${title}</h2>
                        <button class="modal-close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${contentHTML}
                    </div>
                    ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
                </div>
            </div>
        `;
        document.querySelector('.modal-close-btn').addEventListener('click', () => this.hideModal());
        document.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.hideModal();
        });
    }

    hideModal() {
        this.modalContainer.innerHTML = '';
    }

    // --- 通用确认框 ---
    showConfirm(title, message, onConfirm) {
        const content = `<p>${message}</p>`;
        const footer = `
            <button id="confirm-cancel" class="modal-button secondary-btn">取消</button>
            <button id="confirm-ok" class="modal-button primary-btn">确认</button>
        `;
        this.showModal(title, content, footer);
        document.getElementById('confirm-ok').addEventListener('click', () => {
            onConfirm();
            this.hideModal();
        });
        document.getElementById('confirm-cancel').addEventListener('click', () => this.hideModal());
    }

    // --- 通用输入框 ---
    showPrompt(title, label, defaultValue, onConfirm) {
        const content = `
            <div class="form-group">
                <label for="prompt-input">${label}</label>
                <input type="text" id="prompt-input" value="${defaultValue}">
            </div>
        `;
         const footer = `
            <button id="prompt-cancel" class="modal-button secondary-btn">取消</button>
            <button id="prompt-ok" class="modal-button primary-btn">确认</button>
        `;
        this.showModal(title, content, footer);
        const input = document.getElementById('prompt-input');
        input.focus();
        input.select();
        
        document.getElementById('prompt-ok').addEventListener('click', () => {
            if(input.value.trim()){
                 onConfirm(input.value.trim());
                 this.hideModal();
            }
        });
        document.getElementById('prompt-cancel').addEventListener('click', () => this.hideModal());
    }
}

const ui = new UIManager();