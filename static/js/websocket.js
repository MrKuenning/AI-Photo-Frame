// SocketIO connection for real-time updates
document.addEventListener('DOMContentLoaded', () => {
    // Function to show notification banner
    function showNotification(message) {
        let notification = document.getElementById('websocket-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'websocket-notification';
            notification.style.cssText = `
                position: fixed;
                top: 70px;
                right: 20px;
                background: rgba(76, 175, 80, 0.95);
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                z-index: 10000;
                font-size: 14px;
            `;
            document.body.appendChild(notification);
        }
        notification.textContent = message;
        notification.style.display = 'block';
    }

    // Load the Socket.IO client library if not already loaded
    if (typeof io === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.6.0/socket.io.min.js';
        script.integrity = 'sha384-c79GN5VsunZvi+Q/WObgk2in0CbZsHnjEqvFxC5DxHn9lTfNce2WW6h2pH6u/kF+';
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);

        script.onload = initSocketIO;
    } else {
        initSocketIO();
    }

    function initSocketIO() {
        // Connect to the Socket.IO server
        const socket = io();

        // Connection established
        socket.on('connect', () => {
            console.log('Connected to SocketIO server');
        });

        // Listen for new image events
        socket.on('new_image', (data) => {
            console.log('New image detected:', data.path);
            // Show a notification
            showNotification('New media file detected!');
            // Reload the page after a short delay to show the notification
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        });

        // Connection error
        socket.on('connect_error', (error) => {
            console.error('SocketIO connection error:', error);
        });

        // Disconnected
        socket.on('disconnect', (reason) => {
            console.log('Disconnected from SocketIO server:', reason);
        });
    }
});