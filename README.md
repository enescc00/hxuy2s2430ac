# İsimsiz'in Haritası 🌍

Discord kullanıcısı "isimsiz" için geliştirilmiş interaktif ziyaretçi haritası uygulaması.

## Özellikler

- 🗺️ Gerçek zamanlı dünya haritası üzerinde ziyaretçi konumları
- 🔄 Socket.io ile anlık güncellemeler
- 🎭 Anonim veya kişiselleştirilmiş profiller
- 📱 Responsive tasarım
- 🛡️ Admin paneli ile yönetim
- 🎨 Discord temasına uygun koyu tasarım

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. MongoDB'yi başlatın (local veya cloud)

3. .env dosyasını düzenleyin

4. Uygulamayı başlatın:
```bash
npm run dev
```

## Teknoloji Yığını

- **Backend**: Node.js, Express.js
- **Database**: MongoDB + Mongoose
- **Real-time**: Socket.io
- **Frontend**: Vanilla JS, HTML5, CSS3
- **Maps**: Leaflet.js
- **Geolocation**: ip-api.com

## API Endpoints

- `GET /api/visitors` - Tüm ziyaretçileri getir
- `POST /api/visitors` - Yeni ziyaretçi ekle
- `PUT /api/visitors/:uniqueId` - Ziyaretçi bilgilerini güncelle

## Güvenlik

- Kullanıcı kimlikleri UUID ile yönetilir
- Admin paneli şifre korumalı
- Rate limiting aktif

## Lisans

MIT License
