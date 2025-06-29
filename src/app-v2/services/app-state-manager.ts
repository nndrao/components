/**
 * App State Manager
 * 
 * Manages global application state flags.
 */

class AppStateManager {
  private static instance: AppStateManager;
  private _isInitialLoadComplete = false;
  private _initialLoadPromise: Promise<void>;
  private _resolveInitialLoad!: () => void;

  private constructor() {
    this._initialLoadPromise = new Promise((resolve) => {
      this._resolveInitialLoad = resolve;
    });
  }

  static getInstance(): AppStateManager {
    if (!AppStateManager.instance) {
      AppStateManager.instance = new AppStateManager();
    }
    return AppStateManager.instance;
  }

  get isInitialLoadComplete(): boolean {
    return this._isInitialLoadComplete;
  }

  setInitialLoadComplete(): void {
    console.log('[AppStateManager] Initial load complete');
    this._isInitialLoadComplete = true;
    this._resolveInitialLoad();
  }

  waitForInitialLoad(): Promise<void> {
    return this._initialLoadPromise;
  }
}

export const appStateManager = AppStateManager.getInstance();