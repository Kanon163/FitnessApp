// action-library.js

const defaultActionLibrary = [
    { name: '杠铃卧推', tags: ['胸', '臂'] }, { name: '哑铃飞鸟', tags: ['胸'] },
    { name: '引体向上', tags: ['背', '臂'] }, { name: '杠铃划船', tags: ['背'] },
    { name: '站姿推举', tags: ['肩', '臂'] }, { name: '侧平举', tags: ['肩'] },
    { name: '杠铃深蹲', tags: ['腿'] }, { name: '腿举', tags: ['腿'] },
    { name: '二头弯举', tags: ['臂'] }, { name: '三头下压', tags: ['臂'] },
];

function getActionLibrary() {
    const savedLibrary = localStorage.getItem('fitnessActionLibrary');
    if (savedLibrary) {
        return JSON.parse(savedLibrary);
    } else {
        // 如果本地没有，就使用默认库并保存
        localStorage.setItem('fitnessActionLibrary', JSON.stringify(defaultActionLibrary));
        return defaultActionLibrary;
    }
}

function saveActionLibrary(library) {
    localStorage.setItem('fitnessActionLibrary', JSON.stringify(library));
}

function addToActionLibrary(action) {
    const library = getActionLibrary();
    // 检查动作是否已存在
    if (!library.some(item => item.name === action.name)) {
        library.push(action);
        saveActionLibrary(library);
        return true;
    }
    return false; // 表示已存在
}

function updateActionInLibrary(index, updatedAction) {
    const library = getActionLibrary();
    if (index >= 0 && index < library.length) {
        library[index] = updatedAction;
        saveActionLibrary(library);
        return true;
    }
    return false;
}

function deleteFromActionLibrary(index) {
    const library = getActionLibrary();
    if (index >= 0 && index < library.length) {
        library.splice(index, 1);
        saveActionLibrary(library);
        return true;
    }
    return false;
}

function exportLibraryToCSV() {
    const library = getActionLibrary();
    if (library.length === 0) {
        alert('动作库为空，无法导出。');
        return;
    }
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "name,tags\n"; // 表头

    library.forEach(item => {
        const tags = `"${item.tags.join(',')}"`; // 将标签数组合并为逗号分隔的字符串
        const row = [item.name, tags].join(",");
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "动作库.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function importLibraryFromCSV(csvText) {
    try {
        const rows = csvText.trim().split('\n');
        if (rows.length < 2) {
            alert('CSV文件内容格式不正确或为空。');
            return null;
        }
        // 验证表头
        const header = rows[0].trim().toLowerCase();
        if (header !== 'name,tags') {
            alert('CSV文件表头必须为 "name,tags"');
            return null;
        }

        const newLibrary = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].trim();
            if (row) {
                const [name, tagsStr] = row.split(',');
                const tags = tagsStr.replace(/"/g, '').split(',').map(tag => tag.trim()).filter(Boolean);
                if (name) {
                    newLibrary.push({ name: name.trim(), tags });
                }
            }
        }
        
        if (confirm(`即将导入 ${newLibrary.length} 个新动作，这将覆盖您现有的动作库。确定要继续吗？`)) {
            saveActionLibrary(newLibrary);
            return newLibrary;
        }
        return null; // 用户取消
    } catch (error) {
        alert('解析CSV文件时出错，请检查文件格式。');
        console.error("CSV Import Error:", error);
        return null;
    }
}