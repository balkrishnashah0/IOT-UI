/**
 * Water Management IoT Dashboard - Interactive JavaScript
 * Mobile-first approach with Flutter-like widget patterns
 */

(function() {
    'use strict';

    // ============================================
    // State Management - Like Flutter's setState
    // ============================================
    const appState = {
        theme: 'system', // 'light', 'dark', or 'system'
        waterLevel: 65,
        isAutoMode: true,
        pumps: [
            { id: 1, name: 'Main Pump', status: 'active', enabled: true, flow: 12.5 },
            { id: 2, name: 'Backup Pump', status: 'inactive', enabled: false, flow: 0 },
            { id: 3, name: 'Booster Pump', status: 'maintenance', enabled: false, flow: 0 }
        ],
        valves: [
            { id: 'main', name: 'Main Valve', open: true, percentage: 100 },
            { id: 'garden', name: 'Garden', open: true, percentage: 75 },
            { id: 'house', name: 'House Supply', open: true, percentage: 100 },
            { id: 'overflow', name: 'Overflow', open: false, percentage: 0 }
        ],
        flowRate: 12.5,
        flowPeak: 18.2,
        flowAvg: 10.3,
        lastUpdate: new Date(),
        alerts: [
            { id: 1, type: 'warning', title: 'Low Water Level', message: 'Tank at 65% - Consider filling soon', time: '10 min ago', dismissed: false },
            { id: 2, type: 'info', title: 'Maintenance Due', message: 'Booster pump service in 3 days', time: '2 hours ago', dismissed: false }
        ]
    };

    // ============================================
    // DOM Elements Cache
    // ============================================
    const elements = {};

    // ============================================
    // Theme Management
    // ============================================
    function initTheme() {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('waterDashboardTheme');
        if (savedTheme) {
            appState.theme = savedTheme;
        }
        
        applyTheme();
        
        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', () => {
            if (appState.theme === 'system') {
                applyTheme();
            }
        });
    }

    function applyTheme() {
        let theme = appState.theme;
        
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        
        // Update theme icon
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'dark' ? 'dark_mode' : 'light_mode';
        }
    }

    function toggleTheme() {
        const themes = ['light', 'dark', 'system'];
        const currentIndex = themes.indexOf(appState.theme);
        appState.theme = themes[(currentIndex + 1) % themes.length];
        
        localStorage.setItem('waterDashboardTheme', appState.theme);
        applyTheme();
        
        let themeMessage = appState.theme === 'light' ? 'Light mode' : 
                          appState.theme === 'dark' ? 'Dark mode' : 'System theme';
        showToast(`Theme: ${themeMessage}`, 'info');
    }

    // ============================================
    // Utility Functions
    // ============================================
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            background: type === 'success' ? '#4CAF50' : 
                        type === 'warning' ? '#FF9800' : 
                        type === 'error' ? '#F44336' : '#2196F3',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: '500',
            zIndex: '1000',
            animation: 'fadeInUp 0.3s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        });
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOutDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function updatePumpState(pumpIndex, enabled) {
        appState.pumps[pumpIndex].enabled = enabled;
        appState.pumps[pumpIndex].status = enabled ? 'active' : 'inactive';
        appState.pumps[pumpIndex].flow = enabled ? (Math.random() * 10 + 8).toFixed(1) : 0;
        
        const pumpCards = document.querySelectorAll('.pump-card');
        const pumpCard = pumpCards[pumpIndex];
        const pumpIconWrapper = pumpCard.querySelector('.pump-icon-wrapper');
        const pumpStatus = pumpCard.querySelector('.pump-status');
        const pumpInfo = pumpCard.querySelector('.pump-info-text');
        
        pumpIconWrapper.className = 'pump-icon-wrapper ' + (enabled ? 'active' : 'inactive');
        pumpStatus.className = 'pump-status ' + (enabled ? 'active' : 'inactive');
        pumpStatus.textContent = enabled ? 'Running' : 'Stopped';
        pumpInfo.textContent = enabled ? `Flow: ${appState.pumps[pumpIndex].flow} L/min` : 'Ready to activate';
        
        showToast(`${appState.pumps[pumpIndex].name} ${enabled ? 'started' : 'stopped'}`, 
                  enabled ? 'success' : 'info');
        
        updateFlowRate();
    }

    function updateValveState(valveId, percentage, open) {
        const valve = appState.valves.find(v => v.id === valveId);
        if (valve) {
            valve.percentage = percentage;
            valve.open = open;
        }
        
        // Update dial buttons
        const dial = document.getElementById(`${valveId}ValveDial`);
        const input = document.getElementById(`${valveId}ValveInput`);
        const toggleBtn = document.getElementById(`${valveId}ValveToggle`);
        const statusBadge = document.getElementById(`${valveId}ValveStatusBadge`);
        
        if (dial) {
            const buttons = dial.querySelectorAll('.dial-step');
            buttons.forEach(btn => {
                const value = parseInt(btn.dataset.value);
                btn.classList.toggle('active', value === percentage);
            });
        }
        
        if (input) input.value = percentage;
        
        if (toggleBtn) {
            toggleBtn.className = `valve-toggle-btn ${open ? 'open' : 'closed'}`;
            toggleBtn.innerHTML = `<span class="material-icons">${open ? 'toggle_on' : 'toggle_off'}</span> ${open ? 'Close Valve' : 'Open Valve'}`;
        }
        
        if (statusBadge) {
            statusBadge.className = `valve-status-badge ${open ? 'open' : 'closed'}`;
            statusBadge.querySelector('span').textContent = open ? 'OPEN' : 'CLOSED';
        }
        
        showToast(`${valve.name} ${open ? 'opened' : 'closed'} to ${percentage}%`, 
                  open ? 'success' : 'warning');
        
        updateFlowRate();
    }

    function handleDialClick(valveId, value) {
        const open = value > 0;
        updateValveState(valveId, value, open);
    }

    function handleInputChange(valveId, value) {
        // Snap to nearest step (0, 25, 50, 75, 100)
        const steps = [0, 25, 50, 75, 100];
        let nearest = steps[0];
        let minDiff = Math.abs(value - nearest);
        
        for (const step of steps) {
            const diff = Math.abs(value - step);
            if (diff < minDiff) {
                minDiff = diff;
                nearest = step;
            }
        }
        
        const open = nearest > 0;
        updateValveState(valveId, nearest, open);
    }

    function handleValveToggle(valveId) {
        const valve = appState.valves.find(v => v.id === valveId);
        if (valve) {
            const newOpen = !valve.open;
            const newPercentage = newOpen ? 100 : 0;
            updateValveState(valveId, newPercentage, newOpen);
        }
    }

    function simulateWaterLevelChange(delta) {
        appState.waterLevel = Math.max(0, Math.min(100, appState.waterLevel + delta));
        
        const waterFill = document.getElementById('waterFill');
        const waterPercentage = document.getElementById('waterPercentage');
        const currentLevel = document.getElementById('currentLevel');
        
        if (waterFill) waterFill.style.height = `${appState.waterLevel}%`;
        if (waterPercentage) waterPercentage.textContent = `${Math.round(appState.waterLevel)}%`;
        if (currentLevel) currentLevel.textContent = `${Math.round(appState.waterLevel * 10)} L`;
        
        // Update estimated fill time
        const estFullTime = document.getElementById('estFullTime');
        if (appState.waterLevel < 100 && appState.pumps[0].enabled) {
            const remaining = 100 - appState.waterLevel;
            const minutes = Math.round(remaining / 1.5); // ~1.5% per minute
            if (estFullTime) estFullTime.textContent = `~${minutes} min`;
        } else if (estFullTime) {
            estFullTime.textContent = appState.waterLevel >= 100 ? 'Full' : '--';
        }
        
        // Show warning if low
        if (appState.waterLevel < 30 && !appState.alerts[0].dismissed) {
            showToast('Warning: Low water level!', 'warning');
        }
    }

    function updateFlowRate() {
        let totalFlow = 0;
        
        appState.pumps.forEach(pump => {
            if (pump.enabled) {
                totalFlow += parseFloat(pump.flow);
            }
        });
        
        // Adjust for open valves
        appState.valves.forEach(valve => {
            if (valve.open && valve.percentage > 0) {
                totalFlow *= (valve.percentage / 100);
            }
        });
        
        appState.flowRate = Math.max(0, totalFlow + (Math.random() - 0.5) * 2);
        
        const flowValue = document.getElementById('flowValue');
        if (flowValue) flowValue.textContent = appState.flowRate.toFixed(1);
        
        // Update peak if needed
        if (appState.flowRate > appState.flowPeak) {
            appState.flowPeak = appState.flowRate;
            const flowPeak = document.getElementById('flowPeak');
            if (flowPeak) flowPeak.textContent = `${appState.flowPeak.toFixed(1)} L/min`;
        }
    }

    function updateLastUpdateTime() {
        const lastUpdateTime = document.getElementById('lastUpdateTime');
        if (lastUpdateTime) {
            const now = new Date();
            const diff = Math.floor((now - appState.lastUpdate) / 1000);
            
            if (diff < 60) {
                lastUpdateTime.textContent = 'Just now';
            } else if (diff < 3600) {
                lastUpdateTime.textContent = `${Math.floor(diff / 60)} min ago`;
            } else {
                lastUpdateTime.textContent = `${Math.floor(diff / 3600)} hours ago`;
            }
        }
    }

    function dismissAlert(alertId) {
        const alert = appState.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.dismissed = true;
            const alertElement = document.getElementById(`alert${alertId}`);
            if (alertElement) {
                alertElement.style.animation = 'fadeOutDown 0.3s ease';
                setTimeout(() => alertElement.remove(), 300);
            }
            showToast('Alert dismissed', 'info');
        }
    }

    // ============================================
    // Event Handlers
    // ============================================
    function initEventHandlers() {
        // Theme Toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }
        
        // Quick Actions
        const fillTankBtn = document.getElementById('fillTankBtn');
        if (fillTankBtn) {
            fillTankBtn.addEventListener('click', () => {
                simulateWaterLevelChange(10);
                showToast('Filling tank...', 'info');
            });
        }
        
        const emptyTankBtn = document.getElementById('emptyTankBtn');
        if (emptyTankBtn) {
            emptyTankBtn.addEventListener('click', () => {
                simulateWaterLevelChange(-10);
                showToast('Draining tank...', 'info');
            });
        }
        
        const autoModeBtn = document.getElementById('autoModeBtn');
        if (autoModeBtn) {
            autoModeBtn.addEventListener('click', () => {
                appState.isAutoMode = !appState.isAutoMode;
                const icon = document.getElementById('autoModeIcon');
                icon.textContent = appState.isAutoMode ? 'auto_awesome' : 'manual_mode';
                showToast(`Auto mode ${appState.isAutoMode ? 'enabled' : 'disabled'}`, 
                          appState.isAutoMode ? 'success' : 'warning');
            });
        }
        
        const emergencyBtn = document.getElementById('emergencyBtn');
        if (emergencyBtn) {
            emergencyBtn.addEventListener('click', () => {
                if (confirm('⚠️ Emergency Stop!\n\nThis will stop all pumps and close all valves. Continue?')) {
                    // Stop all pumps
                    appState.pumps.forEach((pump, index) => {
                        if (pump.id !== 3) {
                            const toggle = document.getElementById(`pump${index + 1}Toggle`);
                            if (toggle) toggle.checked = false;
                            updatePumpState(index, false);
                        }
                    });
                    
                    // Close all valves
                    appState.valves.forEach(valve => {
                        updateValveState(valve.id, 0, false);
                    });
                    
                    showToast('EMERGENCY STOP ACTIVATED', 'error');
                }
            });
        }
        
        // Pump Toggles
        const pump1Toggle = document.getElementById('pump1Toggle');
        if (pump1Toggle) {
            pump1Toggle.addEventListener('change', (e) => updatePumpState(0, e.target.checked));
        }
        
        const pump2Toggle = document.getElementById('pump2Toggle');
        if (pump2Toggle) {
            pump2Toggle.addEventListener('change', (e) => updatePumpState(1, e.target.checked));
        }
        
        // Valve Dial Buttons
        const valveConfigs = [
            { id: 'main', dial: 'mainValveDial', input: 'mainValveInput', toggle: 'mainValveToggle' },
            { id: 'garden', dial: 'gardenValveDial', input: 'gardenValveInput', toggle: 'gardenValveToggle' },
            { id: 'house', dial: 'houseValveDial', input: 'houseValveInput', toggle: 'houseValveToggle' },
            { id: 'overflow', dial: 'overflowValveDial', input: 'overflowValveInput', toggle: 'overflowValveToggle' }
        ];
        
        valveConfigs.forEach(config => {
            // Dial buttons
            const dial = document.getElementById(config.dial);
            if (dial) {
                const buttons = dial.querySelectorAll('.dial-step');
                buttons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const value = parseInt(btn.dataset.value);
                        handleDialClick(config.id, value);
                    });
                });
            }
            
            // Input field
            const input = document.getElementById(config.input);
            if (input) {
                input.addEventListener('change', (e) => {
                    const value = parseInt(e.target.value) || 0;
                    handleInputChange(config.id, value);
                });
                
                input.addEventListener('blur', (e) => {
                    const value = parseInt(e.target.value) || 0;
                    handleInputChange(config.id, value);
                });
            }
            
            // Toggle button
            const toggleBtn = document.getElementById(config.toggle);
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => handleValveToggle(config.id));
            }
        });
        
        // Alert Dismiss Buttons
        const alertDismissBtns = document.querySelectorAll('.alert-dismiss');
        alertDismissBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const alertCard = e.target.closest('.alert-card');
                const alertId = alertCard ? parseInt(alertCard.id.replace('alert', '')) : null;
                if (alertId) dismissAlert(alertId);
            });
        });
        
        // Add Schedule Button
        const addScheduleBtn = document.getElementById('addScheduleBtn');
        if (addScheduleBtn) {
            addScheduleBtn.addEventListener('click', () => {
                showToast('Add schedule feature coming soon!', 'info');
            });
        }
        
        // Bottom Navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach((item) => {
            item.addEventListener('click', () => {
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                const tab = item.dataset.tab;
                const tabNames = { dashboard: 'Dashboard', schedule: 'Schedule', stats: 'Stats', settings: 'Settings' };
                showToast(`Switched to ${tabNames[tab] || 'Dashboard'}`, 'info');
            });
        });
        
        // Tank Settings Button
        const tankSettingsBtn = document.getElementById('tankSettingsBtn');
        if (tankSettingsBtn) {
            tankSettingsBtn.addEventListener('click', () => {
                showToast('Tank settings coming soon!', 'info');
            });
        }
    }

    // ============================================
    // Simulated Real-time Updates
    // ============================================
    function startRealTimeUpdates() {
        // Update flow rate every 5 seconds
        setInterval(updateFlowRate, 5000);
        
        // Update last update time every 30 seconds
        setInterval(updateLastUpdateTime, 30000);
        
        // Simulate water level changes based on flow
        setInterval(() => {
            const mainPump = appState.pumps[0];
            const mainValve = appState.valves.find(v => v.id === 'main');
            
            if (mainPump.enabled && mainValve.open && mainValve.percentage > 0) {
                // Water flowing in
                simulateWaterLevelChange(0.5);
            } else {
                // Small passive drain
                simulateWaterLevelChange(-0.1);
            }
        }, 3000);
    }

    // ============================================
    // Initialize App
    // ============================================
    function init() {
        console.log('🌊 Water Management IoT Dashboard Initialized');
        console.log('📱 Mobile-first design with Flutter-like patterns');
        
        // Add fadeOutDown animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeOutDown {
                from {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
        
        // Initialize theme
        initTheme();
        
        // Initialize event handlers
        initEventHandlers();
        
        // Start simulated updates
        startRealTimeUpdates();
        
        // Show welcome toast
        setTimeout(() => {
            showToast('Dashboard connected ✓', 'success');
        }, 1000);
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
