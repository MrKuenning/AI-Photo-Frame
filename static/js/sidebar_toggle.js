// Sidebar toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get the sidebar toggle button and sidebar element
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainImageContainer = document.querySelector('.main-image-container');
    
    // Check if the sidebar state is stored in localStorage
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    
    // Function to toggle sidebar visibility
    function toggleSidebar() {
        if (sidebar && mainImageContainer) {
            // Toggle sidebar visibility
            if (sidebar.classList.contains('collapsed')) {
                // Expand sidebar
                sidebar.classList.remove('collapsed');
                mainImageContainer.classList.remove('expanded');
                if (sidebarToggleBtn) {
                    sidebarToggleBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
                    sidebarToggleBtn.setAttribute('title', 'Collapse Sidebar');
                }
                localStorage.setItem('sidebarCollapsed', 'false');
            } else {
                // Collapse sidebar
                sidebar.classList.add('collapsed');
                mainImageContainer.classList.add('expanded');
                if (sidebarToggleBtn) {
                    sidebarToggleBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
                    sidebarToggleBtn.setAttribute('title', 'Expand Sidebar');
                }
                localStorage.setItem('sidebarCollapsed', 'true');
            }
        }
    }
    
    // Set initial state based on localStorage
    if (sidebarCollapsed && sidebar && mainImageContainer) {
        sidebar.classList.add('collapsed');
        mainImageContainer.classList.add('expanded');
        if (sidebarToggleBtn) {
            sidebarToggleBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
            sidebarToggleBtn.setAttribute('title', 'Expand Sidebar');
        }
    } else if (sidebarToggleBtn) {
        sidebarToggleBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
        sidebarToggleBtn.setAttribute('title', 'Collapse Sidebar');
    }
    
    // Add event listener to toggle button
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', toggleSidebar);
    }
});