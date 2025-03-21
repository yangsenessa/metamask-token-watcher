/**
 * React Version Resolver
 * 
 * This module helps detect and resolve React version conflicts when
 * using libraries that require specific React versions.
 */

/**
 * Detects installed React version
 * @returns {string|null} React version or null if not detected
 */
export function detectReactVersion() {
    if (!window.React) return null;
    
    // Try to get version from React object
    if (window.React.version) {
        return window.React.version;
    }
    
    // Try to infer from features
    try {
        // React 18+ has useSyncExternalStore
        if (window.React.useSyncExternalStore) {
            return '18+';
        }
        
        // React 17+ has useId
        if (window.React.useId) {
            return '17+';
        }
        
        // React 16.8+ has hooks
        if (window.React.useState) {
            return '16.8+';
        }
        
        // React 16+ has createPortal
        if (window.React.createPortal) {
            return '16+';
        }
        
        return 'unknown';
    } catch (e) {
        console.error('Error detecting React version:', e);
        return 'error';
    }
}

/**
 * Creates a sandbox for loading libraries that may have React compatibility issues
 * @param {Function} loadCallback Function that loads the library
 * @returns {Promise<any>} The loaded library or component
 */
export async function createReactSandbox(loadCallback) {
    // Save current React instance
    const originalReact = window.React;
    const originalReactDOM = window.ReactDOM;
    
    // Remove React from window to prevent conflicts
    window.React = undefined;
    window.ReactDOM = undefined;
    
    try {
        // Execute callback to load library
        const result = await loadCallback();
        return result;
    } finally {
        // Restore original React
        window.React = originalReact;
        window.ReactDOM = originalReactDOM;
    }
}

/**
 * Checks if MetaMask SDK is compatible with current React version
 * @returns {boolean} True if compatible
 */
export function isMetaMaskSDKCompatible() {
    const reactVersion = detectReactVersion();
    
    if (!reactVersion) return true; // No React detected, assume compatible
    
    // MetaMask SDK 0.15+ requires React 19
    // MetaMask SDK 0.12-0.14 works with React 18
    // Earlier versions work with React 17 and below
    
    if (reactVersion === '19+' || reactVersion.startsWith('19.')) {
        return true; // Compatible with all SDK versions
    }
    
    if (reactVersion === '18+' || reactVersion.startsWith('18.')) {
        console.warn('React 18 detected, MetaMask SDK 0.15+ may have compatibility issues');
        return false;
    }
    
    console.warn('React version may not be compatible with newer MetaMask SDK versions');
    return false;
}
