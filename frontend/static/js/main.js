document.addEventListener('DOMContentLoaded', () => {
    // Initialize components
    Auth.init();
    Posts.init();
    Messages.init();

    // Global error handling
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        // You can implement a global error notification system here
    });

    // Handle network status
    window.addEventListener('online', () => {
        console.log('Connection restored');
        WebSocketManagerconnect();
        // You can implement a toast notification system here
    });

    window.addEventListener('offline', () => {
        console.log('Connection lost');
        // You can implement a toast notification system here
    });

    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            WebSocketManagerconnect();
        }
    });

    // Handle beforeunload
    window.addEventListener('beforeunload', () => {
        WebSocketManagerdisconnect();
    });
}); 