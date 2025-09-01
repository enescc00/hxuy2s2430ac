// İsimsiz'in Haritası - Frontend JavaScript
class VisitorMap {
    constructor() {
        this.map = null;
        this.socket = null;
        this.userUniqueId = null;
        this.userMarker = null;
        this.visitors = new Map();
        this.onlineCount = 0;
        
        this.init();
    }

    async init() {
        // localStorage'dan kullanıcı ID'sini al
        this.userUniqueId = localStorage.getItem('visitor-unique-id');
        
        // Haritayı başlat
        this.initMap();
        
        // Socket.io bağlantısını başlat
        this.initSocket();
        
        // Event listener'ları ekle
        this.setupEventListeners();
        
        // Loading screen'i gizle
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
        }, 1500);
    }

    initMap() {
        // Leaflet haritasını oluştur
        this.map = L.map('map', {
            center: [39.9334, 32.8597], // Türkiye merkezi
            zoom: 3,
            zoomControl: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            boxZoom: false
        });

        // Canlı renkli tile layer ekle
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(this.map);

        // Harita boyutunu güncelle
        setTimeout(() => {
            this.map.invalidateSize();
        }, 100);
    }

    initSocket() {
        this.socket = io();
        
        // Bağlantı durumu
        this.socket.on('connect', () => {
            console.log('Socket.io bağlantısı kuruldu');
            this.updateConnectionStatus('connected');
            this.onlineCount++;
            this.updateStats();
        });

        this.socket.on('disconnect', () => {
            console.log('Socket.io bağlantısı kesildi');
            this.updateConnectionStatus('disconnected');
            this.onlineCount = Math.max(0, this.onlineCount - 1);
            this.updateStats();
        });

        // Tüm ziyaretçileri al
        this.socket.on('all-visitors', (visitors) => {
            this.loadAllVisitors(visitors);
        });

        // Yeni ziyaretçi eklendi
        this.socket.on('new-visitor', (visitor) => {
            this.addVisitorMarker(visitor, true);
            this.updateStats();
        });

        // Ziyaretçi güncellendi
        this.socket.on('visitor-updated', (visitor) => {
            this.updateVisitorMarker(visitor);
        });

        // Ziyaretçi silindi
        this.socket.on('visitor-deleted', (uniqueId) => {
            this.removeVisitorMarker(uniqueId);
            this.updateStats();
        });
    }

    setupEventListeners() {
        // Profil formu
        document.getElementById('profile-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile();
        });

        // Fotoğraf upload
        document.getElementById('profile-upload').addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });

        // Eğer kullanıcı yeni ziyaretçiyse, otomatik olarak ziyaretçi kaydı oluştur
        if (!this.userUniqueId) {
            this.createVisitor();
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Dosya tipi kontrolü
        if (!file.type.startsWith('image/')) {
            this.showNotification('Sadece resim dosyaları yükleyebilirsiniz ❌', 'error');
            event.target.value = '';
            return;
        }

        // Dosya boyutu kontrolü - 2MB limit (Base64 encoding %33 büyütür)
        if (file.size > 2 * 1024 * 1024) {
            this.showNotification('Fotoğraf boyutu 2MB\'dan küçük olmalı ❌', 'error');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataURL = e.target.result;
            
            // Base64 boyutu kontrolü
            if (dataURL.length > 8 * 1024 * 1024) { // 8MB limit for base64
                this.showNotification('Fotoğraf çok büyük. Lütfen daha küçük bir resim seçin ❌', 'error');
                event.target.value = '';
                return;
            }
            
            document.getElementById('profile-photo').value = dataURL;
            
            // Preview göster
            const preview = document.getElementById('upload-preview');
            preview.innerHTML = `<img src="${dataURL}" alt="Preview">`;
        };
        
        reader.onerror = () => {
            this.showNotification('Dosya okuma hatası ❌', 'error');
            event.target.value = '';
        };
        
        reader.readAsDataURL(file);
    }

    async createVisitor() {
        try {
            const response = await fetch('/api/visitors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (response.ok) {
                this.userUniqueId = data.uniqueId;
                localStorage.setItem('visitor-unique-id', this.userUniqueId);
                
                // Eğer yeni kullanıcıysa hoşgeldin toast'ı göster
                if (data.message === 'Başarıyla eklendi') {
                    this.showWelcomeToast();
                }
            } else {
                console.error('Ziyaretçi oluşturma hatası:', data.error);
            }
        } catch (error) {
            console.error('Ziyaretçi oluşturma hatası:', error);
        }
    }

    loadAllVisitors(visitors) {
        visitors.forEach(visitor => {
            this.addVisitorMarker(visitor, false);
        });
        this.updateStats();
    }

    addVisitorMarker(visitor, isNew = false) {
        const { latitude, longitude } = visitor.location;
        
        // Renkli marker'lar için rastgele renk seç
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
        const markerColor = colors[Math.abs(visitor.uniqueId.charCodeAt(0)) % colors.length];
        
        // Marker icon'u oluştur
        const markerIcon = L.divIcon({
            className: 'visitor-marker-custom',
            html: `<div class="visitor-marker ${isNew ? 'new' : ''}" style="background-color: ${markerColor}; border: 3px solid white; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            popupAnchor: [0, -10]
        });

        // Marker'ı haritaya ekle
        const marker = L.marker([latitude, longitude], { icon: markerIcon }).addTo(this.map);
        
        // Popup içeriği oluştur
        const popupContent = this.createPopupContent(visitor);
        marker.bindPopup(popupContent, {
            maxWidth: 250,
            className: 'custom-popup'
        });

        // Marker'ı saklı tut
        this.visitors.set(visitor.uniqueId, { visitor, marker });

        // Eğer bu kullanıcının kendi marker'ı ise sakla
        if (visitor.uniqueId === this.userUniqueId) {
            this.userMarker = marker;
        }
    }

    updateVisitorMarker(visitor) {
        const visitorData = this.visitors.get(visitor.uniqueId);
        if (visitorData) {
            // Popup içeriğini güncelle
            const popupContent = this.createPopupContent(visitor);
            visitorData.marker.setPopupContent(popupContent);
            
            // Visitor data'yı güncelle
            visitorData.visitor = visitor;
        }
    }

    removeVisitorMarker(uniqueId) {
        const visitorData = this.visitors.get(uniqueId);
        if (visitorData) {
            this.map.removeLayer(visitorData.marker);
            this.visitors.delete(uniqueId);
        }
    }

    createPopupContent(visitor) {
        const { profile, location, createdAt } = visitor;
        const isMyProfile = visitor.uniqueId === this.userUniqueId;
        
        let content = '<div class="popup-content">';
        
        if (profile.profilePhoto) {
            content += `<img src="${profile.profilePhoto}" alt="Profil" class="profile-photo" onerror="this.style.display='none'">`;
        }
        
        if (profile.username) {
            content += `<div class="username">${this.escapeHtml(profile.username)}</div>`;
        } else {
            content += `<div class="username">Anonim Ziyaretçi</div>`;
        }
        
        content += `<div class="location">${location.city}, ${location.country}</div>`;
        content += `<div class="join-date">Katılma: ${new Date(createdAt).toLocaleDateString('tr-TR')}</div>`;
        
        // Eğer kendi profilimse düzenleme butonu ekle
        if (isMyProfile) {
            content += `<div class="popup-actions">`;
            content += `<button onclick="openProfileModal()" class="btn btn-primary btn-small">✏️ Profili Düzenle</button>`;
            content += `</div>`;
        }
        
        content += '</div>';
        
        return content;
    }

    async updateProfile() {
        if (!this.userUniqueId) {
            this.showNotification('Profil güncellenemiyor. Lütfen sayfayı yenileyin. ❌', 'error');
            return;
        }

        const username = document.getElementById('username').value.trim();
        const profilePhoto = document.getElementById('profile-photo').value.trim();

        // Validation
        if (username && username.length > 50) {
            this.showNotification('Kullanıcı adı 50 karakterden kısa olmalı ❌', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/visitors/${this.userUniqueId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    username: username || null, 
                    profilePhoto: profilePhoto || null 
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Sunucu hatası');
            }

            const data = await response.json();
            closeProfileModal();
            this.showNotification('Profil başarıyla güncellendi! ✅', 'success');
            
        } catch (error) {
            console.error('Profil güncelleme hatası:', error);
            this.showNotification(`Profil güncellenirken hata: ${error.message} ❌`, 'error');
        }
    }

    showWelcomeToast() {
        const toast = document.getElementById('welcome-toast');
        toast.style.display = 'block';
        
        // 10 saniye sonra otomatik kapat
        setTimeout(() => {
            this.closeToast();
        }, 10000);
    }

    showNotification(message, type = 'info') {
        // Basit bir notification sistemi
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? 'var(--discord-green)' : 'var(--discord-red)'};
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            z-index: 2000;
            animation: fadeInOut 3s ease-in-out forwards;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    updateConnectionStatus(status) {
        const indicator = document.querySelector('.status-indicator');
        const text = document.querySelector('.status-text');
        
        indicator.className = `status-indicator ${status}`;
        
        switch(status) {
            case 'connected':
                text.textContent = 'Bağlı';
                break;
            case 'disconnected':
                text.textContent = 'Bağlantı Kesildi';
                break;
            default:
                text.textContent = 'Bağlanıyor...';
        }
    }

    updateStats() {
        document.getElementById('visitor-count').textContent = `${this.visitors.size} Ziyaretçi`;
        document.getElementById('online-count').textContent = `${this.onlineCount} Çevrimiçi`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Particles.js konfigürasyonu
function initParticles() {
    particlesJS('particles-js', {
        particles: {
            number: {
                value: 200,
                density: { enable: true, value_area: 800 }
            },
            color: { value: ['#ffffff', '#9B59B6', '#3498DB', '#E8E8E8'] },
            shape: {
                type: 'circle',
                stroke: { width: 0, color: '#000000' }
            },
            opacity: {
                value: 0.8,
                random: true,
                anim: { enable: true, speed: 1, opacity_min: 0.3, sync: false }
            },
            size: {
                value: 3,
                random: true,
                anim: { enable: true, speed: 2, size_min: 0.5, sync: false }
            },
            line_linked: {
                enable: true,
                distance: 150,
                color: '#9B59B6',
                opacity: 0.2,
                width: 1
            },
            move: {
                enable: true,
                speed: 1,
                direction: 'none',
                random: true,
                straight: false,
                out_mode: 'out',
                bounce: false,
                attract: { enable: true, rotateX: 600, rotateY: 1200 }
            }
        },
        interactivity: {
            detect_on: 'canvas',
            events: {
                onhover: { enable: true, mode: 'repulse' },
                onclick: { enable: true, mode: 'push' },
                resize: true
            },
            modes: {
                grab: { distance: 200, line_linked: { opacity: 0.5 } },
                bubble: { distance: 300, size: 8, duration: 2, opacity: 0.8, speed: 3 },
                repulse: { distance: 150, duration: 0.4 },
                push: { particles_nb: 4 },
                remove: { particles_nb: 2 }
            }
        },
        retina_detect: true
    });
}

// Smooth scroll fonksiyonu
function scrollToMap() {
    const mapSection = document.getElementById('map-section');
    mapSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

// Global fonksiyonlar
function openProfileModal() {
    const modal = document.getElementById('profile-modal');
    
    // Mevcut profil bilgilerini doldur
    if (window.visitorMap && window.visitorMap.userUniqueId) {
        const myVisitor = window.visitorMap.visitors.get(window.visitorMap.userUniqueId);
        if (myVisitor) {
            document.getElementById('username').value = myVisitor.visitor.profile.username || '';
            document.getElementById('profile-photo').value = myVisitor.visitor.profile.profilePhoto || '';
            
            // Preview'ı da güncelle
            const preview = document.getElementById('upload-preview');
            if (myVisitor.visitor.profile.profilePhoto) {
                preview.innerHTML = `<img src="${myVisitor.visitor.profile.profilePhoto}" alt="Preview">`;
            } else {
                preview.innerHTML = '';
            }
        }
    }
    
    modal.style.display = 'block';
}

function closeProfileModal() {
    document.getElementById('profile-modal').style.display = 'none';
}

function closeToast() {
    const toast = document.getElementById('welcome-toast');
    toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
    setTimeout(() => {
        toast.style.display = 'none';
        toast.style.animation = '';
    }, 300);
}

// CSS animasyonu ekle
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        20%, 80% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
`;
document.head.appendChild(style);

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    // Particles.js başlat
    initParticles();
    
    // Visitor map başlat
    window.visitorMap = new VisitorMap();
});
