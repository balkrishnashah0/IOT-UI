/**
 * Water Management IoT Dashboard - Interactive JavaScript
 * Mobile-first approach with Flutter-like widget patterns
 * Supports multiple water tanks with add functionality
 */

(function() {
    'use strict';

    // ============================================
    // State Management - Like Flutter's setState
    // ============================================
    const appState = {
        theme: 'system', // 'light', 'dark', or 'system'
        isAutoMode: true,
        tanks: [
            { 
                id: 1, 
                name: 'Main Tank', 
                level: 65, 
                capacity: 1000, 
                icon: 'water_drop',
                filling: false,
                draining: false
            },
            { 
                id: 2, 
                name: 'Underground', 
                level: 40, 
                capacity: 5000, 
                icon: 'underground',
                filling: false,
                draining: false
            }
        ],
        nextTankId: 3,
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
            { id: 1, type: 'warning', title: 'Low Water Level', message: 'Main Tank at 65% - Consider filling soon', time: '10 min ago', dismissed: false },
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

    // ============================================
    // Tank Management
    // ============================================
    function calculateEstFullTime(tank) {
        if (tank.level >= 100) return 'Full';
        if (tank.level < 100 && tank.filling) {
            const remaining = 100 - tank.level;
            const minutes = Math.round(remaining / 1.5);
            return `~${minutes} min`;
        }
        if (tank.level < 100 && tank.draining) {
            const minutes = Math.round(tank.level / 2);
            return `~${minutes} min`;
        }
        return '--';
    }

    function updateTankLevel(tankId, delta) {
        const tank = appState.tanks.find(t => t.id === tankId);
        if (!tank) return;
        
        tank.level = Math.max(0, Math.min(100, tank.level + delta));
        
        // Update DOM elements
        const fill = document.getElementById(`tank${tankId}Fill`);
        const percentage = document.getElementById(`tank${tankId}Percentage`);
        const level = document.getElementById(`tank${tankId}Level`);
        const estFull = document.getElementById(`tank${tankId}EstFull`);
        
        if (fill) fill.style.height = `${tank.level}%`;
        if (percentage) percentage.textContent = `${Math.round(tank.level)}%`;
        if (level) level.textContent = `${Math.round((tank.level / 100) * tank.capacity)} L`;
        if (estFull) estFull.textContent = calculateEstFullTime(tank);
        
        // Show warning if low
        if (tank.level < 30 && !appState.alerts[0].dismissed) {
            showToast(`Warning: ${tank.name} is low!`, 'warning');
        }
    }

    function fillTank(tankId) {
        const tank = appState.tanks.find(t => t.id === tankId);
        if (!tank) return;
        
        if (tank.level >= 100) {
            showToast(`${tank.name} is already full!`, 'info');
            return;
        }
        
        tank.filling = !tank.filling;
        
        const fillBtn = document.querySelector(`.tank-action-btn.fill[data-tank-id="${tankId}"]`);
        if (fillBtn) {
            fillBtn.style.background = tank.filling ? 'var(--primary-blue)' : '';
            fillBtn.style.color = tank.filling ? 'white' : '';
        }
        
        showToast(tank.filling ? `Filling ${tank.name}...` : `Stopped filling ${tank.name}`, 
                  tank.filling ? 'success' : 'info');
    }

    function emptyTank(tankId) {
        const tank = appState.tanks.find(t => t.id === tankId);
        if (!tank) return;
        
        if (tank.level <= 0) {
            showToast(`${tank.name} is already empty!`, 'info');
            return;
        }
        
        tank.draining = !tank.draining;
        
        const emptyBtn = document.querySelector(`.tank-action-btn.empty[data-tank-id="${tankId}"]`);
        if (emptyBtn) {
            emptyBtn.style.background = tank.draining ? 'var(--error)' : '';
            emptyBtn.style.color = tank.draining ? 'white' : '';
        }
        
        showToast(tank.draining ? `Draining ${tank.name}...` : `Stopped draining ${tank.name}`, 
                  tank.draining ? 'warning' : 'info');
    }

    function addNewTank(name, capacity) {
        const tankId = appState.nextTankId++;
        const tankName = name || `Tank ${tankId}`;
        const tankCapacity = capacity || 1000;
        
        const newTank = {
            id: tankId,
            name: tankName,
            level: 0,
            capacity: tankCapacity,
            icon: 'water_drop',
            filling: false,
            draining: false
        };
        
        appState.tanks.push(newTank);
        
        // Create and insert new tank card HTML
        const tanksGrid = document.getElementById('tanksGrid');
        if (tanksGrid) {
            const tankCard = document.createElement('div');
            tankCard.className = 'card tank-card';
            tankCard.id = `tank${tankId}`;
            tankCard.innerHTML = `
                <div class="tank-card-header">
                    <div class="tank-info">
                        <h3>${tankName}</h3>
                    </div>
                    <button class="tank-settings-btn" aria-label="Tank Settings" data-tank-id="${tankId}">
                        <span class="material-icons">more_vert</span>
                    </button>
                </div>
                
                <div class="tank-visual">
                    <div class="tank-container">
                        <div class="water-fill" id="tank${tankId}Fill" style="height: 0%;">
                            <span class="water-percentage" id="tank${tankId}Percentage">0%</span>
                        </div>
                    </div>
                </div>
                
                <div class="tank-stats">
                    <div class="stat-item">
                        <span class="stat-label">Level</span>
                        <span class="stat-value" id="tank${tankId}Level">0 L</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Capacity</span>
                        <span class="stat-value">${tankCapacity} L</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Est. Full</span>
                        <span class="stat-value" id="tank${tankId}EstFull">--</span>
                    </div>
                </div>
                
                <div class="tank-actions">
                    <button class="tank-action-btn fill" id="tank${tankId}FillBtn" data-tank-id="${tankId}" aria-label="Fill Tank">
                        <span class="material-icons">water</span>
                    </button>
                    <button class="tank-action-btn empty" id="tank${tankId}EmptyBtn" data-tank-id="${tankId}" aria-label="Empty Tank">
                        <span class="material-icons">remove_circle_outline</span>
                    </button>
                </div>
            `;
            
            // Insert before the add tank card
            const addTankCard = document.getElementById('addTankCard');
            if (addTankCard) {
                tanksGrid.insertBefore(tankCard, addTankCard);
            } else {
                tanksGrid.appendChild(tankCard);
            }
            
            // Re-attach event listeners for new tank buttons
            const fillBtn = tankCard.querySelector('.tank-action-btn.fill');
            if (fillBtn) {
                fillBtn.onclick = () => fillTank(tankId);
            }
            
            const emptyBtn = tankCard.querySelector('.tank-action-btn.empty');
            if (emptyBtn) {
                emptyBtn.onclick = () => emptyTank(tankId);
            }
            
            const settingsBtn = tankCard.querySelector('.tank-settings-btn');
            if (settingsBtn) {
                settingsBtn.onclick = () => showToast('Tank settings coming soon!', 'info');
            }
        }
        
        showToast(`Added ${tankName} (${tankCapacity}L)`, 'success');
        
        // Hide add form
        const addTankCard = document.getElementById('addTankCard');
        if (addTankCard) {
            addTankCard.style.display = 'none';
        }
        
        // Update flow simulation
        updateFlowRate();
    }

    function attachTankEventListeners() {
        // Fill buttons
        document.querySelectorAll('.tank-action-btn.fill').forEach(btn => {
            btn.onclick = () => {
                const tankId = parseInt(btn.dataset.tankId);
                fillTank(tankId);
            };
        });
        
        // Empty buttons
        document.querySelectorAll('.tank-action-btn.empty').forEach(btn => {
            btn.onclick = () => {
                const tankId = parseInt(btn.dataset.tankId);
                emptyTank(tankId);
            };
        });
        
        // Settings buttons
        document.querySelectorAll('.tank-settings-btn').forEach(btn => {
            btn.onclick = () => {
                showToast('Tank settings coming soon!', 'info');
            };
        });
    }

    // ============================================
    // Pump Management
    // ============================================
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

    // ============================================
    // Valve Management
    // ============================================
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

    // ============================================
    // Flow Rate Management
    // ============================================
    function updateFlowRate() {
        let totalFlow = 0;
        
        appState.pumps.forEach(pump => {
            if (pump.enabled) {
                totalFlow += parseFloat(pump.flow);
            }
        });
        
        // Adjust for open valves
        const openValves = appState.valves.filter(v => v.open && v.percentage > 0);
        if (openValves.length > 0) {
            const avgOpen = openValves.reduce((sum, v) => sum + v.percentage, 0) / openValves.length;
            totalFlow *= (avgOpen / 100);
        }
        
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

    // ============================================
    // Alert Management
    // ============================================
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
    // Quick Actions
    // ============================================
    let isFillingAll = false;
    let isEmptyingAll = false;

    function updateQuickActionButtons() {
        const fillAllBtn = document.getElementById('fillAllBtn');
        const emptyAllBtn = document.getElementById('emptyAllBtn');
        
        // Update Fill All button styling
        if (fillAllBtn) {
            if (isFillingAll) {
                fillAllBtn.classList.add('active');
                fillAllBtn.style.background = 'var(--primary-blue)';
                fillAllBtn.style.color = 'white';
                fillAllBtn.style.borderColor = 'var(--primary-blue)';
            } else {
                fillAllBtn.classList.remove('active');
                fillAllBtn.style.background = '';
                fillAllBtn.style.color = '';
                fillAllBtn.style.borderColor = '';
            }
        }
        
        // Update Empty All button styling
        if (emptyAllBtn) {
            if (isEmptyingAll) {
                emptyAllBtn.classList.add('active');
                emptyAllBtn.style.background = 'var(--error)';
                emptyAllBtn.style.color = 'white';
                emptyAllBtn.style.borderColor = 'var(--error)';
            } else {
                emptyAllBtn.classList.remove('active');
                emptyAllBtn.style.background = '';
                emptyAllBtn.style.color = '';
                emptyAllBtn.style.borderColor = '';
            }
        }
    }

    function fillAllTanks() {
        // If already filling, stop; if emptying, stop that first
        if (isFillingAll) {
            isFillingAll = false;
        } else {
            // Stop emptying if active
            if (isEmptyingAll) {
                isEmptyingAll = false;
                // Stop draining on all tanks
                appState.tanks.forEach(tank => {
                    tank.draining = false;
                });
            }
            isFillingAll = true;
        }
        
        appState.tanks.forEach(tank => {
            if (isFillingAll && tank.level < 100) {
                tank.filling = true;
                tank.draining = false;
                const fillBtn = document.querySelector(`.tank-action-btn.fill[data-tank-id="${tank.id}"]`);
                if (fillBtn) {
                    fillBtn.style.background = 'var(--primary-blue)';
                    fillBtn.style.color = 'white';
                }
                // Reset empty button
                const emptyBtn = document.querySelector(`.tank-action-btn.empty[data-tank-id="${tank.id}"]`);
                if (emptyBtn) {
                    emptyBtn.style.background = '';
                    emptyBtn.style.color = '';
                }
            } else {
                tank.filling = false;
                const fillBtn = document.querySelector(`.tank-action-btn.fill[data-tank-id="${tank.id}"]`);
                if (fillBtn) {
                    fillBtn.style.background = '';
                    fillBtn.style.color = '';
                }
            }
        });
        
        updateQuickActionButtons();
        showToast(isFillingAll ? 'Filling all tanks...' : 'Stopped filling all tanks', 
                  isFillingAll ? 'success' : 'info');
    }

    function emptyAllTanks() {
        // If already emptying, stop; if filling, stop that first
        if (isEmptyingAll) {
            isEmptyingAll = false;
        } else {
            // Stop filling if active
            if (isFillingAll) {
                isFillingAll = false;
                // Stop filling on all tanks
                appState.tanks.forEach(tank => {
                    tank.filling = false;
                });
            }
            isEmptyingAll = true;
        }
        
        appState.tanks.forEach(tank => {
            if (isEmptyingAll && tank.level > 0) {
                tank.draining = true;
                tank.filling = false;
                const emptyBtn = document.querySelector(`.tank-action-btn.empty[data-tank-id="${tank.id}"]`);
                if (emptyBtn) {
                    emptyBtn.style.background = 'var(--error)';
                    emptyBtn.style.color = 'white';
                }
                // Reset fill button
                const fillBtn = document.querySelector(`.tank-action-btn.fill[data-tank-id="${tank.id}"]`);
                if (fillBtn) {
                    fillBtn.style.background = '';
                    fillBtn.style.color = '';
                }
            } else {
                tank.draining = false;
                const emptyBtn = document.querySelector(`.tank-action-btn.empty[data-tank-id="${tank.id}"]`);
                if (emptyBtn) {
                    emptyBtn.style.background = '';
                    emptyBtn.style.color = '';
                }
            }
        });
        
        updateQuickActionButtons();
        showToast(isEmptyingAll ? 'Emptying all tanks...' : 'Stopped emptying all tanks', 
                  isEmptyingAll ? 'warning' : 'info');
    }

    function toggleAutoMode() {
        appState.isAutoMode = !appState.isAutoMode;
        const icon = document.getElementById('autoModeIcon');
        const btn = document.getElementById('autoModeBtn');
        if (icon) {
            icon.textContent = appState.isAutoMode ? 'auto_awesome' : 'manual_mode';
        }
        if (btn) {
            const textSpan = btn.querySelector('span:last-child');
            if (textSpan) {
                textSpan.textContent = appState.isAutoMode ? 'Auto Mode' : 'Manual Mode';
            }
        }
        showToast(`Auto mode ${appState.isAutoMode ? 'enabled' : 'disabled'}`, 
                  appState.isAutoMode ? 'success' : 'warning');
    }

    function emergencyStop() {
        if (confirm('⚠️ Emergency Stop!\n\nThis will stop all pumps and close all valves. Continue?')) {
            // Stop all pumps
            appState.pumps.forEach((pump, index) => {
                if (pump.id !== 3) {
                    const toggle = document.getElementById(`pump${index + 1}Toggle`);
                    if (toggle) toggle.checked = false;
                    updatePumpState(index, false);
                }
            });
            
            // Stop all tanks filling/draining
            appState.tanks.forEach(tank => {
                tank.filling = false;
                tank.draining = false;
            });
            
            // Reset quick action states
            isFillingAll = false;
            isEmptyingAll = false;
            updateQuickActionButtons();
            
            // Update all tank buttons
            document.querySelectorAll('.tank-action-btn.fill').forEach(btn => {
                btn.style.background = '';
                btn.style.color = '';
            });
            document.querySelectorAll('.tank-action-btn.empty').forEach(btn => {
                btn.style.background = '';
                btn.style.color = '';
            });
            
            // Close all valves
            appState.valves.forEach(valve => {
                updateValveState(valve.id, 0, false);
            });
            
            showToast('EMERGENCY STOP ACTIVATED', 'error');
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
        const fillAllBtn = document.getElementById('fillAllBtn');
        if (fillAllBtn) {
            fillAllBtn.addEventListener('click', fillAllTanks);
        }
        
        const emptyAllBtn = document.getElementById('emptyAllBtn');
        if (emptyAllBtn) {
            emptyAllBtn.addEventListener('click', emptyAllTanks);
        }
        
        const autoModeBtn = document.getElementById('autoModeBtn');
        if (autoModeBtn) {
            autoModeBtn.addEventListener('click', toggleAutoMode);
        }
        
        const emergencyBtn = document.getElementById('emergencyBtn');
        if (emergencyBtn) {
            emergencyBtn.addEventListener('click', emergencyStop);
        }
        
        // Tank event listeners
        attachTankEventListeners();
        
        // Add Tank Button
        const addTankBtn = document.getElementById('addTankBtn');
        const addTankCard = document.getElementById('addTankCard');
        if (addTankBtn && addTankCard) {
            addTankBtn.addEventListener('click', () => {
                addTankCard.style.display = addTankCard.style.display === 'none' ? 'block' : 'none';
            });
        }
        
        // Cancel Add Tank
        const cancelAddTank = document.getElementById('cancelAddTank');
        if (cancelAddTank) {
            cancelAddTank.addEventListener('click', () => {
                const addTankCard = document.getElementById('addTankCard');
                if (addTankCard) {
                    addTankCard.style.display = 'none';
                }
                // Clear inputs
                document.getElementById('newTankName').value = '';
                document.getElementById('newTankCapacity').value = '';
            });
        }
        
        // Confirm Add Tank
        const confirmAddTank = document.getElementById('confirmAddTank');
        if (confirmAddTank) {
            confirmAddTank.addEventListener('click', () => {
                const name = document.getElementById('newTankName').value.trim();
                const capacity = parseInt(document.getElementById('newTankCapacity').value) || 1000;
                
                if (capacity < 100 || capacity > 100000) {
                    showToast('Capacity must be between 100 and 100,000 liters', 'warning');
                    return;
                }
                
                addNewTank(name, capacity);
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
    }

    // ============================================
    // Simulated Real-time Updates
    // ============================================
    function startRealTimeUpdates() {
        // Update flow rate every 5 seconds
        setInterval(updateFlowRate, 5000);
        
        // Update last update time every 30 seconds
        const updateLastUpdateTime = () => {
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
        };
        setInterval(updateLastUpdateTime, 30000);
        
        // Simulate water level changes for all tanks
        setInterval(() => {
            const mainPump = appState.pumps[0];
            
            appState.tanks.forEach(tank => {
                if (tank.filling && tank.level < 100 && mainPump.enabled) {
                    // Water filling in
                    updateTankLevel(tank.id, 0.5);
                } else if (tank.draining && tank.level > 0) {
                    // Water draining
                    updateTankLevel(tank.id, -0.3);
                } else if (!tank.filling && !tank.draining) {
                    // Small passive drain
                    updateTankLevel(tank.id, -0.05);
                }
                
                // Stop filling/draining when full/empty
                if (tank.filling && tank.level >= 100) {
                    tank.filling = false;
                    const fillBtn = document.querySelector(`.tank-action-btn.fill[data-tank-id="${tank.id}"]`);
                    if (fillBtn) {
                        fillBtn.style.background = '';
                        fillBtn.style.color = '';
                    }
                    showToast(`${tank.name} is full!`, 'success');
                }
                if (tank.draining && tank.level <= 0) {
                    tank.draining = false;
                    const emptyBtn = document.querySelector(`.tank-action-btn.empty[data-tank-id="${tank.id}"]`);
                    if (emptyBtn) {
                        emptyBtn.style.background = '';
                        emptyBtn.style.color = '';
                    }
                    showToast(`${tank.name} is empty!`, 'info');
                }
            });
        }, 3000);
    }

    // ============================================
    // Initialize App
    // ============================================
    function init() {
        console.log('🌊 Water Management IoT Dashboard Initialized');
        console.log('📱 Mobile-first design with Flutter-like patterns');
        console.log('💧 Multiple tank support enabled');
        
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
            showToast(`Connected - ${appState.tanks.length} tanks`, 'success');
        }, 1000);
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
