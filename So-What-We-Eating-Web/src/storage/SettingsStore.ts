import type { LocalDatabase, Settings } from './LocalDatabase.ts';
export class SettingsStore {
    private db: LocalDatabase;
    constructor(db: LocalDatabase) { this.db = db; }
    get value() { return this.db.data.settings; }
    update(settings: Partial<Settings>) { Object.assign(this.db.data.settings, settings); this.db.save(); }
}
