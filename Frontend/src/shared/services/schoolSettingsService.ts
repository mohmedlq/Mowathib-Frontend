import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'mowathib_school_settings_v1';
export const DEFAULT_SCHOOL_NAME = 'مدرسة التميز الثانوية للبنين';
const EVENT_NAME = 'mowathib_school_name_changed';

export interface SchoolSettings {
  schoolName: string;
  updatedAt: string;
}

export const schoolSettingsService = {
  getSettings(): SchoolSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.schoolName === 'string' && parsed.schoolName.trim()) {
          return parsed;
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
    return {
      schoolName: DEFAULT_SCHOOL_NAME,
      updatedAt: '',
    };
  },

  getSchoolName(): string {
    return this.getSettings().schoolName;
  },

  setSchoolName(name: string): SchoolSettings {
    const trimmed = name.trim() || DEFAULT_SCHOOL_NAME;
    const settings: SchoolSettings = {
      schoolName: trimmed,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: settings }));
    } catch {
      // Ignore storage errors
    }
    return settings;
  },

  reset(): SchoolSettings {
    return this.setSchoolName(DEFAULT_SCHOOL_NAME);
  },
};

export function useSchoolSettings() {
  const [settings, setSettings] = useState<SchoolSettings>(() => schoolSettingsService.getSettings());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SchoolSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(schoolSettingsService.getSettings());
      }
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const updateSchoolName = useCallback((newName: string) => {
    const updated = schoolSettingsService.setSchoolName(newName);
    setSettings(updated);
  }, []);

  const resetSchoolName = useCallback(() => {
    const reset = schoolSettingsService.reset();
    setSettings(reset);
  }, []);

  const isCustom = settings.schoolName !== DEFAULT_SCHOOL_NAME;

  return {
    schoolName: settings.schoolName,
    updatedAt: settings.updatedAt,
    isCustom,
    updateSchoolName,
    resetSchoolName,
  };
}

