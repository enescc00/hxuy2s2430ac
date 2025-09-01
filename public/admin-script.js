// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.visitors = [];
        this.logs = [];
        this.stats = {};
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.updateSystemInfo();
        
        // Otomatik yenileme (30 saniyede bir)
        setInterval(() => {
            this.loadData();
        }, 30000);
    }

    async loadData() {
        try {
            await Promise.all([
                this.loadVisitors(),
                this.loadLogs(),
                this.loadStats()
            ]);
        } catch (error) {
            console.error('Veri yükleme hatası:', error);
        }
    }

    async loadVisitors() {
        try {
            const response = await fetch('/admin/visitors');
            this.visitors = await response.json();
            this.renderVisitors();
        } catch (error) {
            console.error('Ziyaretçi verisi yüklenemedi:', error);
        }
    }

    async loadLogs() {
        try {
            const response = await fetch('/admin/logs');
            this.logs = await response.json();
            this.renderLogs();
        } catch (error) {
            console.error('Log verisi yüklenemedi:', error);
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/admin/stats');
            this.stats = await response.json();
            this.renderStats();
        } catch (error) {
            console.error('İstatistik verisi yüklenemedi:', error);
        }
    }

    renderStats() {
        document.getElementById('total-visitors').textContent = this.stats.totalVisitors || 0;
        document.getElementById('recent-activity').textContent = this.stats.recentActivity || 0;
        document.getElementById('total-countries').textContent = this.stats.countryStats?.length || 0;
        document.getElementById('total-cities').textContent = this.stats.cityStats?.length || 0;

        // Ülke istatistiklerini render et
        this.renderChart('country-chart', this.stats.countryStats || []);
        this.renderChart('city-chart', this.stats.cityStats || []);
    }

    renderChart(elementId, data) {
        const container = document.getElementById(elementId);
        container.innerHTML = '';

        if (!data.length) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Henüz veri yok</p>';
            return;
        }

        data.forEach((item, index) => {
            const chartItem = document.createElement('div');
            chartItem.className = 'chart-item';
            
            const label = elementId === 'city-chart' 
                ? `${item._id.city}, ${item._id.country}`
                : item._id;
            
            chartItem.innerHTML = `
                <span style="color: var(--text-primary)">${label || 'Bilinmiyor'}</span>
                <span style="color: var(--discord-blue); font-weight: 600">${item.count}</span>
            `;
            
            container.appendChild(chartItem);
        });
    }

    renderVisitors() {
        const tbody = document.getElementById('visitors-tbody');
        tbody.innerHTML = '';

        if (!this.visitors.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 20px;">Henüz ziyaretçi yok</td></tr>';
            return;
        }

        this.visitors.forEach(visitor => {
            const row = document.createElement('tr');
            const displayIP = visitor.displayIP || visitor.ipAddress;
            row.innerHTML = `
                <td style="font-family: monospace; font-size: 12px;">${displayIP}</td>
                <td>${visitor.profile?.username || '<span style="color: var(--text-secondary);">Anonim</span>'}</td>
                <td>${visitor.location?.city || 'Bilinmiyor'}</td>
                <td>${visitor.location?.country || 'Bilinmiyor'}</td>
                <td>${new Date(visitor.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                <td>${new Date(visitor.lastUpdated).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                <td>
                    <button onclick="adminPanel.deleteVisitor('${visitor.uniqueId}')" class="btn btn-danger btn-small action-btn">🗑️ Sil</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderLogs() {
        const tbody = document.getElementById('logs-tbody');
        tbody.innerHTML = '';

        if (!this.logs.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 20px;">Henüz log kaydı yok</td></tr>';
            return;
        }

        this.logs.forEach(log => {
            const row = document.createElement('tr');
            const actionText = this.getActionText(log.action);
            const locationText = log.location ? `${log.location.city}, ${log.location.country}` : 'Bilinmiyor';
            
            row.innerHTML = `
                <td>${new Date(log.timestamp).toLocaleString('tr-TR')}</td>
                <td style="font-family: monospace; font-size: 12px;">${log.ipAddress}</td>
                <td><span class="action-badge action-${log.action}">${actionText}</span></td>
                <td>${locationText}</td>
                <td style="font-size: 12px; color: var(--text-secondary);">${JSON.stringify(log.metadata || {})}</td>
            `;
            tbody.appendChild(row);
        });
    }

    getActionText(action) {
        const actions = {
            'visit': 'Ziyaret',
            'create_visitor': 'Yeni Kayıt',
            'update_profile': 'Profil Güncellemesi'
        };
        return actions[action] || action;
    }

    async deleteVisitor(uniqueId) {
        if (!confirm('Bu ziyaretçiyi silmek istediğinizden emin misiniz?')) {
            return;
        }

        try {
            const response = await fetch(`/admin/visitors/${uniqueId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showNotification('Ziyaretçi başarıyla silindi', 'success');
                await this.loadData();
            } else {
                throw new Error('Silme işlemi başarısız');
            }
        } catch (error) {
            console.error('Silme hatası:', error);
            this.showNotification('Silme işlemi sırasında hata oluştu', 'error');
        }
    }

    setupEventListeners() {
        // Arama fonksiyonu
        document.getElementById('visitor-search').addEventListener('input', (e) => {
            this.filterVisitors(e.target.value);
        });

        // Log filtresi
        document.getElementById('log-filter').addEventListener('change', (e) => {
            this.filterLogs(e.target.value);
        });
    }

    filterVisitors(searchTerm) {
        const rows = document.querySelectorAll('#visitors-tbody tr');
        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    }

    filterLogs(actionType) {
        const rows = document.querySelectorAll('#logs-tbody tr');

        rows.forEach(row => {
            if (!actionType) {
                row.style.display = '';
                return;
            }

            const actionCell = row.cells[2];
            if (actionCell) {
                const hasAction = actionCell.querySelector(`.action-${actionType}`);
                row.style.display = hasAction ? '' : 'none';
            }
        });
    }

    updateSystemInfo() {
        // Basit sistem bilgileri
        document.getElementById('node-version').textContent = 'Node.js aktif';
        document.getElementById('uptime').textContent = this.formatUptime();
        document.getElementById('memory-usage').textContent = 'Aktif';

        // Her dakika güncelle
        setInterval(() => {
            document.getElementById('uptime').textContent = this.formatUptime();
        }, 60000);
    }

    formatUptime() {
        const now = new Date();
        const startTime = localStorage.getItem('app-start-time') || now.toISOString();
        if (!localStorage.getItem('app-start-time')) {
            localStorage.setItem('app-start-time', startTime);
        }

        const uptime = Math.floor((now - new Date(startTime)) / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        
        return `${hours}s ${minutes}d`;
    }

    showNotification(message, type = 'info') {
        // Toast notification oluştur
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--discord-green)' : 'var(--discord-red)'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 3000;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
            animation: slideInRight 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Global Functions
function showTab(tabName) {
    // Tüm tab'ları gizle
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Tüm nav button'ları inactive yap
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Seçilen tab'ı göster
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // İlgili button'ı active yap
    event.target.classList.add('active');
}

function refreshData() {
    if (window.adminPanel) {
        window.adminPanel.loadData();
        window.adminPanel.showNotification('Veriler yenilendi', 'success');
    }
}

function goToMainSite() {
    window.open('/', '_blank');
}

function exportVisitors() {
    if (!window.adminPanel || !window.adminPanel.visitors.length) {
        alert('Dışa aktarılacak veri yok');
        return;
    }

    const csvContent = this.generateCSV(window.adminPanel.visitors);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitors-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function generateCSV(visitors) {
    const headers = ['IP Adresi', 'Kullanıcı Adı', 'Şehir', 'Ülke', 'Enlem', 'Boylam', 'Katılma Tarihi'];
    const csvRows = [headers.join(',')];
    
    visitors.forEach(visitor => {
        const row = [
            visitor.ipAddress,
            visitor.profile?.username || 'Anonim',
            visitor.location?.city || '',
            visitor.location?.country || '',
            visitor.location?.latitude || '',
            visitor.location?.longitude || '',
            new Date(visitor.createdAt).toISOString()
        ];
        csvRows.push(row.map(field => `"${field}"`).join(','));
    });
    
    return csvRows.join('\n');
}

async function clearLogs() {
    if (!confirm('Tüm logları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
        return;
    }

    try {
        const response = await fetch('/admin/logs', { method: 'DELETE' });
        if (response.ok) {
            window.adminPanel.showNotification('Loglar temizlendi', 'success');
            window.adminPanel.loadLogs();
        }
    } catch (error) {
        console.error('Log temizleme hatası:', error);
        window.adminPanel.showNotification('Log temizleme hatası', 'error');
    }
}

async function clearDatabase() {
    const confirmation = prompt('TÜM VERİLERİ SİLMEK İÇİN "SIFIRLA" yazın:');
    if (confirmation !== 'SIFIRLA') {
        return;
    }

    try {
        const response = await fetch('/admin/clear-all', { method: 'DELETE' });
        if (response.ok) {
            window.adminPanel.showNotification('Tüm veriler silindi', 'success');
            window.adminPanel.loadData();
        }
    } catch (error) {
        console.error('Veritabanı temizleme hatası:', error);
        window.adminPanel.showNotification('Veritabanı temizleme hatası', 'error');
    }
}

function backupDatabase() {
    if (window.adminPanel && window.adminPanel.visitors.length) {
        const backupData = {
            visitors: window.adminPanel.visitors,
            logs: window.adminPanel.logs,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `isimsizin-haritasi-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        window.adminPanel.showNotification('Yedek başarıyla indirildi', 'success');
    } else {
        alert('Yedeklenecek veri yok');
    }
}

// CSS animasyonları ekle
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .action-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .action-visit {
        background: var(--discord-blue);
        color: white;
    }
    
    .action-create_visitor {
        background: var(--discord-green);
        color: white;
    }
    
    .action-update_profile {
        background: var(--discord-yellow);
        color: var(--discord-darker);
    }
`;
document.head.appendChild(style);

// Admin panel'i başlat
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});
