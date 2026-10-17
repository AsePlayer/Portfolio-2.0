import tzLookup from '@photostructure/tz-lookup';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Conservative weekly subset. Holiday, seasonal, solar, and conditional rules stay unknown. */
export function osmOpenNow(hours: string | undefined, latitude: number, longitude: number, now = new Date()): boolean | undefined {
    if (!hours) return undefined;
    if (hours.trim() === '24/7') return true;
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: tzLookup(latitude, longitude), weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        }).formatToParts(now);
        const value = (type: string) => parts.find(p => p.type === type)!.value;
        const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(value('weekday'));
        const minute = Number(value('hour')) * 60 + Number(value('minute'));
        const rules: { days: number[]; ranges: [number, number][] }[] = [];
        for (const raw of hours.split(';')) {
            const match = raw.trim().match(/^(?:(Su|Mo|Tu|We|Th|Fr|Sa)([A-Za-z,\-]*)\s+)?(off|closed|\d{2}:\d{2}-\d{2}:\d{2}(?:\s*,\s*\d{2}:\d{2}-\d{2}:\d{2})*)$/);
            if (!match) return undefined;
            const days: number[] = [];
            if (!match[1]) days.push(0, 1, 2, 3, 4, 5, 6);
            else for (const span of (match[1] + match[2]).split(',')) {
                const ends = span.split('-');
                const start = DAYS.indexOf(ends[0]), end = DAYS.indexOf(ends[1] ?? ends[0]);
                if (start < 0 || end < 0 || ends.length > 2) return undefined;
                for (let d = start; ; d = (d + 1) % 7) { days.push(d); if (d === end) break; }
            }
            const ranges: [number, number][] = [];
            if (!['off', 'closed'].includes(match[3])) for (const range of match[3].split(',')) {
                const [from, to] = range.trim().split('-').map(t => {
                    const [h, m] = t.split(':').map(Number);
                    return h > 24 || m > 59 || (h === 24 && m !== 0) ? NaN : h * 60 + m;
                });
                if (!Number.isFinite(from) || !Number.isFinite(to) || from === to || from >= 1440) return undefined;
                ranges.push([from, to]);
            }
            rules.push({ days, ranges });
        }
        const today = [...rules].reverse().find(r => r.days.includes(day));
        if (today?.ranges.some(([a, b]) => b > a ? minute >= a && minute < b : minute >= a)) return true;
        // Explicit current-day rule overrides the previous day's overnight spill.
        if (!today) {
            const yesterday = [...rules].reverse().find(r => r.days.includes((day + 6) % 7));
            if (yesterday?.ranges.some(([a, b]) => b < a && minute < b)) return true;
        } else if (today.ranges.length) {
            const yesterday = [...rules].reverse().find(r => r.days.includes((day + 6) % 7));
            if (today === yesterday && today.ranges.some(([a, b]) => b < a && minute < b)) return true;
        }
        return false;
    } catch { return undefined; }
}
