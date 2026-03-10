import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Global error catcher to display errors on screen
window.addEventListener('error', (event) => {
    document.body.innerHTML += `<div style="position:fixed;top:0;left:0;right:0;background:red;color:white;padding:20px;z-index:9999;"><h3>Caught Error:</h3><pre>${event.error ? event.error.stack : event.message}</pre></div>`;
});
window.addEventListener('unhandledrejection', (event) => {
    document.body.innerHTML += `<div style="position:fixed;top:0;left:0;right:0;background:orange;color:white;padding:20px;z-index:9999;"><h3>Unhandled Promise:</h3><pre>${event.reason ? event.reason.stack : event.reason}</pre></div>`;
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
