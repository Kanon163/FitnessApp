class StorageManager {
    constructor() {
        this.keys = {
            history: 'workoutHistory',
            library: 'fitnessActionLibrary',
            settings: 'fitnessAppSettings'
        };
    }

    // --- Private Helper ---
    _getData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error getting data for key ${key}:`, error);
            return null;
        }
    }

    _setData(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Error setting data for key ${key}:`, error);
        }
    }

    // --- Settings ---
    getSettings() {
        const defaultSettings = { 
            defaultUnit: 'kg',
            theme: 'dark' // 'dark' or 'light'
        };
        const settings = this._getData(this.keys.settings);
        return { ...defaultSettings, ...settings };
    }

    saveSettings(settings) {
        this._setData(this.keys.settings, settings);
    }

    // --- Action Library ---
    getLibrary() {
        return this._getData(this.keys.library) || [];
    }

    saveLibrary(library) {
        this._setData(this.keys.library, library);
    }

    // --- Workout History ---
    getHistory() {
        return this._getData(this.keys.history) || {};
    }

    saveHistory(history) {
        this._setData(this.keys.history, history);
    }

    getWorkoutByDate(dateKey) { // dateKey is 'YYYY-MM-DD'
        const history = this.getHistory();
        return history[dateKey] || { log: [], actions: [] };
    }

    saveWorkoutForDate(dateKey, workoutData) {
        const history = this.getHistory();
        history[dateKey] = workoutData;
        this.saveHistory(history);
    }
}

const storage = new StorageManager();