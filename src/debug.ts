// Debug functions for continuous API call issue
// Run these functions in the browser console to debug the issue

// Add this to your browser console to access debug functions:
// (window as any).debugAuth = {
//   checkTokenStatus: () => {
//     const authService = (window as any).ng?.getInjector?.()?.get?.('AuthService');
//     return authService?.getTokenInfo?.();
//   },
//   stopRefreshTimer: () => {
//     const authService = (window as any).ng?.getInjector?.()?.get?.('AuthService');
//     authService?.manualClearRefreshTimer?.();
//     console.log('Refresh timer stopped');
//   },
//   checkTimerStatus: () => {
//     const authService = (window as any).ng?.getInjector?.()?.get?.('AuthService');
//     return authService?.getRefreshTimerStatus?.();
//   }
// };

// Console commands to run:
// 1. Check token status: debugAuth.checkTokenStatus()
// 2. Stop refresh timer: debugAuth.stopRefreshTimer()
// 3. Check if timer is running: debugAuth.checkTimerStatus()

export const debugCommands = {
  // Function to add debug helpers to window
  addToWindow: () => {
    (window as any).debugAuth = {
      checkTokenStatus: () => {
        console.log('Use: ng.getInjector().get(AuthService).getTokenInfo()');
      },
      stopRefreshTimer: () => {
        console.log('Use: ng.getInjector().get(AuthService).manualClearRefreshTimer()');
      },
      checkTimerStatus: () => {
        console.log('Use: ng.getInjector().get(AuthService).getRefreshTimerStatus()');
      }
    };
  }
};

// Manual commands to run in console:
// ng.getInjector().get(AuthService).getTokenInfo()
// ng.getInjector().get(AuthService).manualClearRefreshTimer()
// ng.getInjector().get(AuthService).getRefreshTimerStatus()

