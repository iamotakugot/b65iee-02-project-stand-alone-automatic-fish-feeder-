// Modal and UI element control settings
export interface UISettings {
  splash: {
    enabled: boolean;
    autoSkipTime: number; // seconds
    showTeam: boolean;
  };
  banners: {
    showFirebaseBanner: boolean;
    showApiStatus: boolean;
    autoDismissTime: number; // seconds, 0 = never
  };
  notifications: {
    enabled: boolean;
    autoHide: boolean;
    hideTime: number; // seconds
  };
  loading: {
    minTime: number; // minimum loading time in ms
    showProgress: boolean;
  };
}

const DEFAULT_SETTINGS: UISettings = {
  splash: {
    enabled: true, // ✅ Show splash by default
    autoSkipTime: 3,
    showTeam: true,
  },
  banners: {
    showFirebaseBanner: false, // Keep banners disabled
    showApiStatus: false, 
    autoDismissTime: 5,
  },
  notifications: {
    enabled: true,
    autoHide: true,
    hideTime: 3,
  },
  loading: {
    minTime: 500,
    showProgress: true,
  },
};

const STORAGE_KEY = 'ui-settings';

export class UISettingsManager {
  private static instance: UISettingsManager;
  private settings: UISettings;

  private constructor() {
    this.settings = this.loadSettings();
  }

  static getInstance(): UISettingsManager {
    if (!UISettingsManager.instance) {
      UISettingsManager.instance = new UISettingsManager();
    }
    return UISettingsManager.instance;
  }

  private loadSettings(): UISettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load UI settings:', error);
    }
    return DEFAULT_SETTINGS;
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save UI settings:', error);
    }
  }

  getSettings(): UISettings {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<UISettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
  }

  // Quick access methods
  isSplashEnabled(): boolean {
    return this.settings.splash.enabled;
  }

  shouldShowFirebaseBanner(): boolean {
    return this.settings.banners.showFirebaseBanner;
  }

  shouldShowApiStatus(): boolean {
    return this.settings.banners.showApiStatus;
  }

  areNotificationsEnabled(): boolean {
    return this.settings.notifications.enabled;
  }

  // Splash screen specific methods
  enableSplash(): void {
    this.settings.splash.enabled = true;
    this.saveSettings();
    localStorage.removeItem('splash-disabled');
    localStorage.removeItem('splash-seen');
  }

  disableSplash(): void {
    this.settings.splash.enabled = false;
    this.saveSettings();
    localStorage.setItem('splash-disabled', 'true');
    localStorage.setItem('splash-seen', 'true');
  }

  resetSplash(): void {
    localStorage.removeItem('splash-disabled');
    localStorage.removeItem('splash-seen');
    this.settings.splash.enabled = true;
    this.saveSettings();
  }

  // Reset to defaults
  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
    localStorage.removeItem('splash-seen');
    localStorage.removeItem('splash-disabled');
  }

  // Quick disable all intrusive elements (except splash)
  disableAll(): void {
    this.settings = {
      ...this.settings,
      banners: { ...this.settings.banners, showFirebaseBanner: false, showApiStatus: false },
    };
    this.saveSettings();
  }

  // Enable minimal UI mode (keep splash, disable others)
  enableMinimalMode(): void {
    this.settings = {
      ...this.settings,
      banners: { ...this.settings.banners, showFirebaseBanner: false, showApiStatus: false },
      notifications: { ...this.settings.notifications, autoHide: true, hideTime: 2 }
    };
    this.saveSettings();
  }
}

// Export singleton instance
export const uiSettings = UISettingsManager.getInstance(); 