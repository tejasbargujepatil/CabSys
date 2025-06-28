document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const userType = localStorage.getItem('userType');

    if (!token || !username || userType !== 'admin') {
        window.location.href = 'admin-login.html';
        return;
    }

    // Update UI with username
    const userElements = document.querySelectorAll('.font-medium');
    userElements.forEach(el => {
        if (el.textContent === 'Admin') {
            el.textContent = username;
        }
    });

    // Navigation tab switching
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = {
        'dashboard': document.querySelector('main'),
        'ride-requests': createRideRequestsSection(),
        'drivers': createDriversSection(),
        'users': createUsersSection(),
        'analytics': createAnalyticsSection(),
        'live-tracking': createLiveTrackingSection(),
        'settings': createSettingsSection()
    };

    // Hide all sections except dashboard initially
    Object.keys(contentSections).forEach(key => {
        if (key !== 'dashboard') {
            contentSections[key].style.display = 'none';
        }
    });

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.querySelector('span').textContent.toLowerCase().replace(' ', '-');
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Show the corresponding section
            Object.keys(contentSections).forEach(key => {
                contentSections[key].style.display = key === target ? 'block' : 'none';
            });

            // Load data when tab is clicked
            if (target === 'ride-requests') fetchRideRequests();
            if (target === 'drivers') fetchAndDisplayDrivers();
            if (target === 'users') fetchAndDisplayUsers();
            if (target === 'analytics') fetchAnalyticsData();
            if (target === 'live-tracking') fetchLiveTrackingData();
            if (target === 'settings') fetchSystemSettings();
        });
    });

    // Initial fetch for dashboard
    fetchDashboardData();

    // Loading state management
    function showLoading() {
        const loading = document.createElement('div');
        loading.id = 'loading-spinner';
        loading.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        loading.innerHTML = `
            <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div>
        `;
        document.body.appendChild(loading);
    }

    function hideLoading() {
        const loading = document.getElementById('loading-spinner');
        if (loading) loading.remove();
    }

    // Dashboard data fetch
    async function fetchDashboardData() {
        showLoading();
        try {
            const [requestsRes, driversRes, usersRes] = await Promise.all([
                fetch('https://vpmgt267-3000.inc1.devtunnels.ms/api/admin/requests', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('https://vpmgt267-3000.inc1.devtunnels.ms/api/admin/drivers', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('https://vpmgt267-3000.inc1.devtunnels.ms/api/admin/users', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (!requestsRes.ok || !driversRes.ok || !usersRes.ok) {
                if (requestsRes.status === 401 || driversRes.status === 401 || usersRes.status === 401) {
                    localStorage.clear();
                    window.location.href = 'admin-login.html';
                    return;
                }
                throw new Error('Failed to fetch data');
            }

            const [requests, drivers, users] = await Promise.all([
                requestsRes.json(),
                driversRes.json(),
                usersRes.json()
            ]);

            updateDashboardStats(requests.data || [], drivers.data || [], users.data || []);
            renderRecentRequests(requests.data ? requests.data.slice(0, 5) : []);
            renderDriversList(drivers.data || []);
            renderUsersList(users.data || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            showErrorMessage('Failed to load dashboard data. Please try again.');
        } finally {
            hideLoading();
        }
    }

    function updateDashboardStats(requests, drivers, users) {
        const totalRides = document.querySelector('#totalRides');
        const activeDrivers = document.querySelector('#activeDrivers');
        const pendingRequests = document.querySelector('#pendingRequests');
        const revenueAmount = document.querySelector('#revenueAmount');
        const totalUsers = document.querySelector('#totalUsers');
        const totalDrivers = document.querySelector('#totalDrivers');

        if (totalRides) totalRides.textContent = requests.length || 0;
        if (activeDrivers) activeDrivers.textContent = drivers.filter(d => d.available).length || 0;
        if (pendingRequests) pendingRequests.textContent = requests.filter(r => r.status === 'PENDING').length || 0;
        if (totalUsers) totalUsers.textContent = users.length || 0;
        if (totalDrivers) totalDrivers.textContent = drivers.length || 0;
        
        const revenue = requests
            .filter(r => r.status === 'COMPLETED')
            .reduce((sum, r) => sum + (parseFloat(r.fare_amount) || 0), 0);
        if (revenueAmount) revenueAmount.textContent = `$${revenue.toFixed(2)}`;
    }

    function renderRecentRequests(requests) {
        const requestList = document.getElementById('requestList');
        if (!requestList) return;

        requestList.innerHTML = requests.length ? requests.map(req => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#${req.id || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <img src="https://randomuser.me/api/portraits/${req.user_gender || 'men'}/${Math.floor(Math.random() * 100)}.jpg" 
                             class="w-8 h-8 rounded-full mr-2">
                        <span>${req.user_name || 'Unknown'}</span>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${req.pickup_location || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${req.dropoff_location || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${req.driver_name ? `
                        <div class="flex items-center">
                            <img src="https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 100)}.jpg" 
                                 class="w-8 h-8 rounded-full mr-2">
                            <span>${req.driver_name}</span>
                        </div>
                    ` : '<span class="text-gray-400">Not assigned</span>'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full status-${(req.status || 'PENDING').toLowerCase()}">
                        ${req.status || 'PENDING'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${req.status === 'PENDING' ? `
                        <button class="text-blue-600 hover:text-blue-900 mr-3 assign-driver" data-id="${req.id || ''}">
                            Assign
                        </button>
                    ` : `
                        <button class="text-blue-600 hover:text-blue-900 mr-3 track-ride" data-id="${req.id || ''}">
                            Track
                        </button>
                    `}
                    <button class="text-gray-600 hover:text-gray-900 view-details" data-id="${req.id || ''}">
                        Details
                    </button>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">No requests available</td></tr>';

        // Add event listeners for action buttons
        document.querySelectorAll('.assign-driver').forEach(btn => {
            btn.addEventListener('click', () => showAssignDriverModal(btn.dataset.id));
        });
        document.querySelectorAll('.track-ride').forEach(btn => {
            btn.addEventListener('click', () => trackRide(btn.dataset.id));
        });
        document.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', () => viewRequestDetails(btn.dataset.id));
        });
    }

    async function renderDriversList(drivers) {
        const driversList = document.getElementById('driversList');
        if (!driversList) return;

        const driverRequests = await Promise.all(drivers.map(async driver => {
            try {
                const response = await fetch(`https://vpmgt267-3000.inc1.devtunnels.ms/api/admin/drivers/${driver.id}/requests`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to fetch driver requests');
                const { data } = await response.json();
                return { driverId: driver.id, requests: data };
            } catch (error) {
                console.error(`Error fetching requests for driver ${driver.id}:`, error);
                return { driverId: driver.id, requests: [] };
            }
        }));

        driversList.innerHTML = drivers.length ? drivers.map(driver => {
            const assignedRequests = driverRequests.find(dr => dr.driverId === driver.id)?.requests || [];
            
            return `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">${driver.id || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <img src="https://randomuser.me/api/portraits/${driver.gender || 'men'}/${Math.floor(Math.random() * 100)}.jpg" 
                             class="w-8 h-8 rounded-full mr-2">
                        <span>${driver.name || 'Unknown'}</span>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${driver.phone || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div>
                        <div class="font-medium">${driver.vehicle_type || 'N/A'}</div>
                        <div class="text-sm text-gray-500">${driver.vehicle_number || 'N/A'}</div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${driver.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${driver.available ? 'Available' : 'On Trip'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button class="text-blue-600 hover:text-blue-900 mr-3 toggle-availability" data-id="${driver.id}" data-available="${driver.available}">
                        ${driver.available ? 'Mark Busy' : 'Mark Available'}
                    </button>
                    <button class="text-red-600 hover:text-red-900 delete-driver" data-id="${driver.id}">
                        Remove
                    </button>
                </td>
            </tr>
            ${assignedRequests.length > 0 ? `
            <tr>
                <td colspan="6" class="px-6 py-4">
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-700">Assigned Requests:</p>
                        <div class="mt-2 space-y-2">
                            ${assignedRequests.map(req => `
                                <div class="flex items-center space-x-2">
                                    <span class="text-sm text-gray-600">Request #${req.id}</span>
                                    <span class="text-sm text-gray-600">Customer: ${req.user_name || 'N/A'}</span>
                                    <span class="text-sm text-gray-600">Status: ${req.status}</span>
                                    <button class="text-blue-600 hover:text-blue-900 text-sm view-request-details" data-id="${req.id}">
                                        View
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </td>
            </tr>
            ` : ''}
        `}).join('') : '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No drivers available</td></tr>';

        // Add event listeners
        document.querySelectorAll('.toggle-availability').forEach(btn => {
            btn.addEventListener('click', () => toggleDriverAvailability(btn.dataset.id, btn.dataset.available === 'true'));
        });
        document.querySelectorAll('.delete-driver').forEach(btn => {
            btn.addEventListener('click', () => deleteDriver(btn.dataset.id));
        });
        document.querySelectorAll('.view-request-details').forEach(btn => {
            btn.addEventListener('click', () => viewRequestDetails(btn.dataset.id));
        });
    }

    function renderUsersList(users) {
        const usersList = document.getElementById('usersList');
        if (!usersList) return;

        usersList.innerHTML = users.length ? users.map(user => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">${user.id || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <img src="https://randomuser.me/api/portraits/${user.gender || 'men'}/${Math.floor(Math.random() * 100)}.jpg" 
                             class="w-8 h-8 rounded-full mr-2">
                        <span>${user.name || 'Unknown'}</span>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button class="text-red-600 hover:text-red-900 delete-user" data-id="${user.id}">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No users available</td></tr>';

        // Add event listeners for delete user buttons
        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', () => deleteUser(btn.dataset.id));
        });
    }

    async function toggleDriverAvailability(driverId, currentAvailability) {
        showLoading();
        try {
            const response = await fetch(`https://vpmgt267-3000.inc1.devtunnels.ms/api/admin/drivers/${driverId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    available: !currentAvailability
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update driver availability');
            }

            showSuccessMessage(`Driver marked as ${currentAvailability ? 'busy' : 'available'} successfully!`);
            fetchDashboardData();
        } catch (error) {
            console.error('Error toggling driver availability:', error);
            showErrorMessage('Error updating driver availability. Please try again.');
        } finally {
            hideLoading();
        }
    }

    async function deleteDriver(driverId) {
        if (confirm('Are you sure you want to remove this driver? This action cannot be undone.')) {
            showLoading();
            try {
                const response = await fetch(`https://vpmgt267-3000.inc1.devtunnels.ms/api/admin/drivers/${driverId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to delete driver');
                }

                showSuccessMessage('Driver removed successfully!');
                fetchDashboardData();
            } catch (error) {
                console.error('Error deleting driver:', error);
                showErrorMessage('Error removing driver. Please try again.');
            } finally {
                hideLoading();
            }
        }
    }

    async function deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            showLoading();
            try {
                const response = await fetch(`https://vpmgt267-3000.inc1.devtunnels.ms/api/admin/users/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to delete user');
                }

                showSuccessMessage('User deleted successfully!');
                fetchDashboardData();
            } catch (error) {
                console.error('Error deleting user:', error);
                showErrorMessage('Error deleting user. Please try again.');
            } finally {
                hideLoading();
            }
        }
    }

    // Ride Requests Section
    function createRideRequestsSection() {
        const section = document.createElement('div');
        section.className = 'p-6';
        section.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Ride Requests Management</h2>
                <div class="flex space-x-3">
                    <button id="refreshRequests" class="btn-primary text-white py-2 px-4 rounded-lg font-medium">
                        <i class="fas fa-sync-alt mr-2"></i>Refresh
                    </button>
                    <button id="exportRequests" class="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium">
                        <i class="fas fa-download mr-2"></i>Export
                    </button>
                </div>
            </div>
            <div class="bg-white rounded-xl border border-gray-100 p-6">
                <div class="overflow-x-auto">
                    <div id="rideRequestsTable"></div>
                </div>
            </div>
        `;
        document.querySelector('main').parentNode.appendChild(section);
        return section;
    }

    async function fetchRideRequests() {
        showLoading();
        try {
            const response = await fetch('https://vpmgt267-3000.inc1.devtunnels.ms/api/admin/requests', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.clear();
                    window.location.href = 'admin-login.html';
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const { data } = await response.json();
            renderRideRequestsTable(data || []);
        } catch (error) {
            console.error('Error fetching ride requests:', error);
            showErrorMessage('Failed to load ride requests. Please check your connection or try again.');
        } finally {
            hideLoading();
        }
    }

    function renderRideRequestsTable(requests) {
        const table = document.getElementById('rideRequestsTable');
        table.innerHTML = requests.length ? `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pickup</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dropoff</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${requests.map(req => `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap">#${req.id || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <img src="https://randomuser.me/api/portraits/${req.user_gender || 'men'}/${Math.floor(Math.random() * 100)}.jpg" 
                                         class="w-8 h-8 rounded-full mr-2">
                                    <span>${req.user_name || 'Unknown'}</span>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">${req.pickup_location || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap">${req.dropoff_location || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                ${req.driver_name ? `
                                    <div class="flex items-center">
                                        <img src="https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 100)}.jpg" 
                                             class="w-8 h-8 rounded-full mr-2">
                                        <span>${req.driver_name}</span>
                                    </div>
                                ` : '<span class="text-gray-400">Not assigned</span>'}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 py-1 text-xs font-medium rounded-full status-${(req.status || 'PENDING').toLowerCase()}">
                                    ${req.status || 'PENDING'}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap space-x-2">
                                ${req.status === 'PENDING' ? `
                                    <button class="text-blue-600 hover:text-blue-900 assign-driver" data-id="${req.id || ''}">
                                        Assign
                                    </button>
                                ` : `
                                    <button class="text-blue-600 hover:text-blue-900 track-ride" data-id="${req.id || ''}">
                                        Track
                                    </button>
                                `}
                                <button class="text-gray-600 hover:text-gray-900 view-details" data-id="${req.id || ''}">
                                    Details
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<div class="text-center text-gray-500 p-4">No ride requests available</div>';

        // Add event listeners
        document.querySelectorAll('.assign-driver').forEach(btn => {
            btn.addEventListener('click', () => showAssignDriverModal(btn.dataset.id));
        });
        document.querySelectorAll('.track-ride').forEach(btn => {
            btn.addEventListener('click', () => trackRide(btn.dataset.id));
        });
        document.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', () => viewRequestDetails(btn.dataset.id));
        });
    }

    // Drivers Section
    function createDriversSection() {
        const section = document.createElement('div');
        section.className = 'p-6';
        section.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Drivers Management</h2>
                <button id="addDriverBtn" class="btn-primary text-white py-2 px-4 rounded-lg font-medium">
                    <i class="fas fa-plus mr-2"></i>Add Driver
                </button>
            </div>
            <div class="bg-white rounded-xl border border-gray-100 p-6">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="driversList" class="bg-white divide-y divide-gray-200">
                            <!-- Populated dynamically -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.querySelector('main').parentNode.appendChild(section);
        return section;
    }

    async function fetchAndDisplayDrivers() {
        showLoading();
        try {
            const response = await fetch('https://vpmgt267-3000.inc1.devtunnels.ms/api/admin/drivers', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.clear();
                    window.location.href = 'admin-login.html';
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const { data } = await response.json();
            renderDriversList(data || []);
        } catch (error) {
            console.error('Error fetching drivers:', error);
            showErrorMessage('Failed to load drivers. Please check your connection or try again.');
        } finally {
            hideLoading();
        }
    }

    function renderDriversTable(drivers) {
        renderDriversList(drivers);
    }

    // Users Section
    function createUsersSection() {
        const section = document.createElement('div');
        section.className = 'p-6';
        section.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Users Management</h2>
                <div class="flex space-x-3">
                    <button id="refreshUsers" class="btn-primary text-white py-2 px-4 rounded-lg font-medium">
                        <i class="fas fa-sync-alt mr-2"></i>Refresh
                    </button>
                    <button id="exportUsers" class="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium">
                        <i class="fas fa-download mr-2"></i>Export
                    </button>
                </div>
            </div>
            <div class="bg-white rounded-xl border border-gray-100 p-6">
                <div class="overflow-x-auto">
                    <div id="usersTable"></div>
                </div>
            </div>
        `;
        document.querySelector('main').parentNode.appendChild(section);
        return section;
    }

    async function fetchAndDisplayUsers() {
        showLoading();
        try {
            const response = await fetch('https://vpmgt267-3000.inc1.devtunnels.ms/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.clear();
                    window.location.href = 'admin-login.html';
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const { data } = await response.json();
            renderUsersTable(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            showErrorMessage('Failed to load users. Please check your connection or try again.');
        } finally {
            hideLoading();
        }
    }

    function renderUsersTable(users) {
        const table = document.getElementById('usersTable');
        table.innerHTML = users.length ? `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${users.map(user => `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap">${user.id || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <img src="https://randomuser.me/api/portraits/${user.gender || 'men'}/${Math.floor(Math.random() * 100)}.jpg" 
                                         class="w-8 h-8 rounded-full mr-2">
                                    <span>${user.name || 'Unknown'}</span>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">${user.email || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap">${user.phone || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap">${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <button class="text-blue-600 hover:text-blue-900 view-user" data-id="${user.id || ''}">
                                    View
                                </button>
                                <button class="text-red-600 hover:text-red-900 delete-user" data-id="${user.id || ''}">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<div class="text-center text-gray-500 p-4">No users available</div>';

        // Add event listeners
        document.querySelectorAll('.view-user').forEach(btn => {
            btn.addEventListener('click', () => viewUserDetails(btn.dataset.id));
        });
        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', () => deleteUser(btn.dataset.id));
        });
    }

    // Settings Section
    function createSettingsSection() {
        const section = document.createElement('div');
        section.className = 'p-6';
        section.innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold">System Settings</h2>
                <p class="text-gray-500">Manage your application settings</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white rounded-xl border border-gray-100 p-6">
                    <h3 class="text-lg font-semibold mb-4">Pricing</h3>
                    <form id="pricingSettingsForm">
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-1">Base Fare ($)</label>
                            <input type="number" name="baseFare" class="w-full px-3 py-2 border rounded" step="0.01" min="0" required>
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-1">Price per Mile ($)</label>
                            <input type="number" name="pricePerMile" class="w-full px-3 py-2 border rounded" step="0.01" min="0" required>
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-1">Price per Minute ($)</label>
                            <input type="number" name="pricePerMinute" class="w-full px-3 py-2 border rounded" step="0.01" min="0" required>
                        </div>
                        <button type="submit" class="btn-primary text-white py-2 px-4 rounded-lg font-medium">
                            Save Pricing
                        </button>
                    </form>
                </div>
                <div class="bg-white rounded-xl border border-gray-100 p-6">
                    <h3 class="text-lg font-semibold mb-4">System Configuration</h3>
                    <form id="systemSettingsForm">
                        <div class="mb-4 flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium mb-1">Maintenance Mode</label>
                                <p class="text-xs text-gray-500">Disable booking during maintenance</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" name="maintenanceMode" class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div class="mb-4 flex items-center justify-between">
                            <div>
                                <label class="block text-sm font-medium mb-1">Enable Notifications</label>
                                <p class="text-xs text-gray-500">System-wide notifications</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" name="enableNotifications" class="sr-only peer" checked>
                                <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <button type="submit" class="btn-primary text-white py-2 px-4 rounded-lg font-medium">
                            Save Configuration
                        </button>
                    </form>
                    <div class="mt-6">
                        <button id="logoutBtn" class="btn-primary bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium">
                            <i class="fas fa-sign-out-alt mr-2"></i>Logout
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.querySelector('main').parentNode.appendChild(section);

        // Add logout event listener
        section.querySelector('#logoutBtn').addEventListener('click', handleLogout);
        return section;
    }

    // Logout handler
    async function handleLogout() {
        if (!confirm('Are you sure you want to log out?')) return;
        showLoading();
        try {
            const response = await fetch('https://vpmgt267-3000.inc1.devtunnels.ms/api/admin/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to log out');
            }
            localStorage.clear();
            showSuccessMessage('Logged out successfully!');
            setTimeout(() => {
                window.location.href = 'admin-login.html';
            }, 1000);
        } catch (error) {
            console.error('Error logging out:', error);
            showErrorMessage('Failed to log out. Please try again.');
        } finally {
            hideLoading();
        }
    }

    // Analytics Section
    function createAnalyticsSection() {
        const section = document.createElement('div');
        section.className = 'p-6';
        section.innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold">System Analytics</h2>
                <p class="text-gray-500">View insights and metrics</p>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white rounded-xl border border-gray-100 p-6">
                    <h3 class="text-lg font-semibold mb-4">Ride Requests</h3>
                    <div class="chart-container" id="requestsChart"></div>
                </div>
                <div class="bg-white rounded-xl border border-gray-100 p-6">
                    <h3 class="text-lg font-semibold mb-4">Revenue</h3>
                    <div class="chart-container" id="revenueChart"></div>
                </div>
                <div class="bg-white rounded-xl border border-gray-100 p-6 lg:col-span-2">
                    <h3 class="text-lg font-semibold mb-4">Driver Performance</h3>
                    <div class="chart-container" id="performanceChart"></div>
                </div>
            </div>
        `;
        document.querySelector('main').parentNode.appendChild(section);
        return section;
    }

    // Live Tracking Section
    function createLiveTrackingSection() {
        const section = document.createElement('div');
        section.className = 'p-6';
        section.innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold">Live Tracking</h2>
                <p class="text-gray-500">Track ongoing rides in real-time</p>
            </div>
            <div class="bg-white rounded-xl border border-gray-100 p-6">
                <div id="liveTrackingMap" class="h-96"></div>
            </div>
        `;
        document.querySelector('main').parentNode.appendChild(section);
        return section;
    }

    // Modal and form handlers
    function showAddDriverModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                <h2 class="text-xl font-bold mb-4">Add New Driver</h2>
                <form id="addDriverForm">
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Full Name</label>
                        <input type="text" name="name" class="w-full px-3 py-2 border rounded" required>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Email</label>
                        <input type="email" name="email" class="w-full px-3 py-2 border rounded" required>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Phone Number</label>
                        <input type="tel" name="phone" class="w-full px-3 py-2 border rounded" required>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Vehicle Type</label>
                        <select name="vehicleType" class="w-full px-3 py-2 border rounded" required>
                            <option value="">Select Vehicle</option>
                            <option value="Sedan">Sedan</option>
                            <option value="SUV">SUV</option>
                            <option value="Van">Van</option>
                            <option value="Luxury">Luxury</option>
                        </select>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Vehicle Number</label>
                        <input type="text" name="vehicleNumber" class="w-full px-3 py-2 border rounded" required>
                    </div>
                    <div class="flex justify-end space-x-3">
                        <button type="button" class="px-4 py-2 bg-gray-300 rounded-lg close-modal">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg">Add Driver</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            showLoading();
            const formData = new FormData(e.target);
            const driverData = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('https://vpmgt267-3000.inc1.devtunnels.ms/api/admin/drivers', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: driverData.name,
                        email: driverData.email,
                        phone: driverData.phone,
                        vehicle_type: driverData.vehicleType,
                        vehicle_number: driverData.vehicleNumber,
                        available: true
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to add driver');
                }

                showSuccessMessage('Driver added successfully!');
                modal.remove();
                fetchAndDisplayDrivers();
                fetchDashboardData();
            } catch (error) {
                console.error('Error adding driver:', error);
                showErrorMessage(error.message || 'Error adding driver. Please try again.');
            } finally {
                hideLoading();
            }
        });
    }

    function showEditDriverModal(driverId) {
        showLoading();
        fetch(`https://vpmgt267-3000.inc1.devtunnels.ms/api/admin/drivers/${driverId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(({ data }) => {
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                modal.innerHTML = `
                    <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h2 class="text-xl font-bold mb-4">Edit Driver</h2>
                        <form id="editDriverForm">
                            <div class="mb-4">
                                <label class="block text-sm font-medium mb-1">Full Name</label>
                                <input type="text" name="name" class="w-full px-3 py-2 border rounded" value="${data.name || ''}" required>
                            </div>
                            <div class="mb-4">
                                <label class="block text-sm font-medium mb-1">Email</label>
                                <input type="email" name="email" class="w-full px-3 py-2 border rounded" value="${data.email || ''}" required>
                            </div>
                            <div class="mb-4">
                                <label class="block text-sm font-medium mb-1">Phone Number</label>
                                <input type="tel" name="phone" class="w-full px-3 py-2 border rounded" value="${data.phone || ''}" required>
                            </div>
                            <div class="mb-4">
                                <label class="block text-sm font-medium mb-1">Vehicle Type</label>
                                <select name="vehicleType" class="w-full px-3 py-2 border rounded" required>
                                    <option value="">Select Vehicle</option>
                                    <option value="Sedan" ${data.vehicle_type === 'Sedan' ? 'selected' : ''}>Sedan</option>
                                    <option value="SUV" ${data.vehicle_type === 'SUV' ? 'selected' : ''}>SUV</option>
                                    <option value="Van" ${data.vehicle_type === 'Van' ? 'selected' : ''}>Van</option>
                                    <option value="Luxury" ${data.vehicle_type === 'Luxury' ? 'selected' : ''}>Luxury</option>
                                </select>
                            </div>
                            <div class="mb-4">
                                <label class="block text-sm font-medium mb-1">Vehicle Number</label>
                                <input type="text" name="vehicleNumber" class="w-full px-3 py-2 border rounded" value="${data.vehicle_number || ''}" required>
                            </div>
                            <div class="flex justify-end space-x-3">
                                <button type="button" class="px-4 py-2 bg-gray-300 rounded-lg close-modal">Cancel</button>
                                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg">Update Driver</button>
                            </div>
                        </form>
                    </div>
                `;
                document.body.appendChild(modal);

                modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
                modal.querySelector('form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    showLoading();
                    const formData = new FormData(e.target);
                    const driverData = Object.fromEntries(formData.entries());

                    try {
                        const response = await fetch(`hhttps://vpmgt267-3000.inc1.devtunnels.ms/api/admin/drivers/${driverId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                name: driverData.name,
                                email: driverData.email,
                                phone: driverData.phone,
                                vehicle_type: driverData.vehicleType,
                                vehicle_number: driverData.vehicleNumber
                            })
                        });

                        if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.message || 'Failed to update driver');
                        }

                        showSuccessMessage('Driver updated successfully!');
                        modal.remove();
                        fetchAndDisplayDrivers();
                        fetchDashboardData();
                    } catch (error) {
                        console.error('Error updating driver:', error);
                        showErrorMessage(error.message || 'Error updating driver. Please try again.');
                    } finally {
                        hideLoading();
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching driver:', error);
                showErrorMessage('Failed to load driver data.');
            })
            .finally(() => hideLoading());
    }

    function handleDeleteDriver(driverId) {
        if (confirm('Are you sure you want to delete this driver?')) {
            showLoading();
            fetch(`http://localhost:3000/api/admin/drivers/${driverId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(response => {
                    if (!response.ok) throw new Error('Failed to delete driver');
                    showSuccessMessage('Driver deleted successfully!');
                    fetchAndDisplayDrivers();
                    fetchDashboardData();
                })
                .catch(error => {
                    console.error('Error deleting driver:', error);
                    showErrorMessage('Error deleting driver. Please try again.');
                })
                .finally(() => hideLoading());
        }
    }

    function showAssignDriverModal(requestId) {
        showLoading();
        fetch('https://vpmgt267-3000.inc1.devtunnels.ms/api/admin/drivers', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(({ data }) => {
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                modal.innerHTML = `
                    <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h2 class="text-xl font-bold mb-4">Assign Driver</h2>
                        <form id="assignDriverForm">
                            <div class="mb-4">
                                <label class="block text-sm font-medium mb-1">Select Driver</label>
                                <select name="driverId" class="w-full px-3 py-2 border rounded" required>
                                    <option value="">Select Driver</option>
                                    ${data.map(driver => `
                                        <option value="${driver.id}">${driver.name} (${driver.vehicle_type})</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="flex justify-end space-x-3">
                                <button type="button" class="px-4 py-2 bg-gray-300 rounded-lg close-modal">Cancel</button>
                                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg">Assign</button>
                            </div>
                        </form>
                    </div>
                `;
                document.body.appendChild(modal);

                modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
                modal.querySelector('form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    showLoading();
                    const driverId = modal.querySelector('select[name="driverId"]').value;

                    try {
                        const response = await fetch(`https://vpmgt267-3000.inc1.devtunnels.ms/api/admin/requests/${requestId}/assign`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ driver_id: driverId })
                        });

                        if (!response.ok) throw new Error('Failed to assign driver');
                        showSuccessMessage('Driver assigned successfully!');
                        modal.remove();
                        fetchRideRequests();
                        fetchDashboardData();
                    } catch (error) {
                        console.error('Error assigning driver:', error);
                        showErrorMessage('Error assigning driver. Please try again.');
                    } finally {
                        hideLoading();
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching available drivers:', error);
                showErrorMessage('Failed to load available drivers.');
            })
            .finally(() => hideLoading());
    }

    function viewUserDetails(userId) {
        showLoading();
        fetch(`https://vpmgt267-3000.inc1.devtunnels.ms/api/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(({ data }) => {
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                modal.innerHTML = `
                    <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h2 class="text-xl font-bold mb-4">User Details</h2>
                        <div class="mb-4">
                            <div class="flex items-center justify-center mb-4">
                                <img src="https://randomuser.me/api/portraits/${data.gender || 'men'}/${Math.floor(Math.random() * 100)}.jpg" 
                                     class="w-16 h-16 rounded-full">
                            </div>
                            <div class="space-y-2">
                                <div class="flex justify-between border-b pb-2">
                                    <span class="font-medium">Name:</span>
                                    <span>${data.name || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between border-b pb-2">
                                    <span class="font-medium">Email:</span>
                                    <span>${data.email || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between border-b pb-2">
                                    <span class="font-medium">Phone:</span>
                                    <span>${data.phone || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between border-b pb-2">
                                    <span class="font-medium">Joined:</span>
                                    <span>${data.created_at ? new Date(data.created_at).toLocaleDateString() : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex justify-end">
                            <button type="button" class="px-4 py-2 bg-gray-300 rounded-lg close-modal">Close</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
            })
            .catch(error => {
                console.error('Error fetching user:', error);
                showErrorMessage('Failed to load user data.');
            })
            .finally(() => hideLoading());
    }

    function trackRide(requestId) {
        console.log(`Tracking ride: ${requestId}`);
        // Implement tracking logic (e.g., redirect to live tracking or show map)
    }

    function viewRequestDetails(requestId) {
        showLoading();
        fetch(`https://vpmgt267-3000.inc1.devtunnels.ms/api/admin/requests/${requestId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(({ data }) => {
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                modal.innerHTML = `
                    <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h2 class="text-xl font-bold mb-4">Ride Request Details</h2>
                        <div class="mb-4">
                            <div class="space-y-2">
                                <div class="flex justify-between border-b pb-2">
                                    <span class="font-medium">Request ID:</span>
                                    <span>#${data.id || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between border-b pb-2">
                                    <span class="font-medium">User:</span>
                                    <span>${data.user_name || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between border-b pb-2">
                                    <span class="font-medium">Pickup Location:</span>
                                    <span>${data.pickup_location || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between border-b pb-2">
                                    <span class="font-medium">Dropoff Location:</span>
                                    <span>${data.dropoff_location || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between border-b pb-2">
                                    <span class="font-medium">Driver:</span>
                                    <span>${data.driver_name || 'Not assigned'}</span>
                                </div>
                                <div class="flex justify-between border-b pb-2">
                                    <span class="font-medium">Status:</span>
                                    <span>${data.status || 'PENDING'}</span>
                                </div>
                                <div class="flex justify-between border-b pb-2">
                                    <span class="font-medium">Fare:</span>
                                    <span>$${parseFloat(data.fare_amount || 0).toFixed(2)}</span>
                                </div>
                                <div class="flex justify-between border-b pb-2">
                                    <span class="font-medium">Created:</span>
                                    <span>${data.created_at ? new Date(data.created_at).toLocaleString() : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex justify-end">
                            <button type="button" class="px-4 py-2 bg-gray-300 rounded-lg close-modal">Close</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
            })
            .catch(error => {
                console.error('Error fetching request:', error);
                showErrorMessage('Failed to load request details.');
            })
            .finally(() => hideLoading());
    }

    // Placeholder functions for unimplemented features
    function fetchAnalyticsData() {
        console.log('Fetching analytics data...');
        // Implement analytics data fetching and chart rendering
    }

    function fetchLiveTrackingData() {
        console.log('Fetching live tracking data...');
        // Implement live tracking data fetching and map rendering
    }

    function fetchSystemSettings() {
        console.log('Fetching system settings...');
        // Implement system settings fetching and form population
    }

    // Notification functions
    function showErrorMessage(message) {
        const errorContainer = document.getElementById('errorContainer');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.classList.remove('hidden');
            setTimeout(() => errorContainer.classList.add('hidden'), 5000);
        }
    }

    function showSuccessMessage(message) {
        const successContainer = document.createElement('div');
        successContainer.className = 'fixed top-4 right-4 bg-green-100 text-green-700 p-4 rounded-lg shadow-lg';
        successContainer.textContent = message;
        document.body.appendChild(successContainer);
        setTimeout(() => successContainer.remove(), 5000);
    }
});