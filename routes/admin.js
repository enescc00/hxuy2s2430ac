const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');
const Log = require('../models/Log');

// Basit HTTP Basic Authentication middleware
const authenticate = (req, res, next) => {
    const auth = req.headers.authorization;
    
    if (!auth || !auth.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
        return res.status(401).send('Yetkilendirme gerekli');
    }

    const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    if (username !== 'admin' || password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).send('Geçersiz kimlik bilgileri');
    }

    next();
};

// Admin paneli ana sayfası
router.get('/', authenticate, (req, res) => {
    res.sendFile('admin.html', { root: './public' });
});

// Tüm ziyaretçi verilerini admin için getir (IP adresleri dahil)
router.get('/visitors', authenticate, async (req, res) => {
    try {
        const visitors = await Visitor.find({}).sort({ createdAt: -1 });
        
        // IP adreslerini daha okunabilir hale getir
        const processedVisitors = visitors.map(visitor => {
            let displayIP = visitor.ipAddress;
            
            // IPv6 localhost'u "Localhost" olarak göster
            if (displayIP === '::1' || displayIP === '127.0.0.1' || displayIP === 'localhost') {
                displayIP = 'Localhost (Yerel)';
            }
            
            return {
                ...visitor.toObject(),
                displayIP: displayIP
            };
        });
        
        res.json(processedVisitors);
    } catch (error) {
        console.error('Admin ziyaretçi listesi hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Tüm logları getir
router.get('/logs', authenticate, async (req, res) => {
    try {
        const logs = await Log.find({}).sort({ timestamp: -1 }).limit(100);
        res.json(logs);
    } catch (error) {
        console.error('Log listesi hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// İstatistikleri getir
router.get('/stats', authenticate, async (req, res) => {
    try {
        const totalVisitors = await Visitor.countDocuments();
        const totalLogs = await Log.countDocuments();
        
        // Ülkelere göre ziyaretçi sayısı
        const countryStats = await Visitor.aggregate([
            { $group: { _id: '$location.country', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Şehirlere göre ziyaretçi sayısı
        const cityStats = await Visitor.aggregate([
            { $group: { _id: { city: '$location.city', country: '$location.country' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Son 24 saatteki aktivite
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentActivity = await Log.countDocuments({ timestamp: { $gte: oneDayAgo } });

        res.json({
            totalVisitors,
            totalLogs,
            recentActivity,
            countryStats,
            cityStats
        });
    } catch (error) {
        console.error('İstatistik hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Ziyaretçi sil
router.delete('/visitors/:uniqueId', authenticate, async (req, res) => {
    try {
        const { uniqueId } = req.params;
        
        const deletedVisitor = await Visitor.findOneAndDelete({ uniqueId });
        if (!deletedVisitor) {
            return res.status(404).json({ error: 'Ziyaretçi bulunamadı' });
        }

        // İlgili logları da sil
        await Log.deleteMany({ visitorId: uniqueId });

        // Socket.io ile silme işlemini bildir
        global.io.emit('visitor-deleted', uniqueId);

        res.json({ message: 'Ziyaretçi başarıyla silindi' });
    } catch (error) {
        console.error('Ziyaretçi silinirken hata:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Tüm logları temizle
router.delete('/logs', authenticate, async (req, res) => {
    try {
        await Log.deleteMany({});
        res.json({ message: 'Tüm loglar başarıyla temizlendi' });
    } catch (error) {
        console.error('Log temizleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Tüm verileri temizle (ziyaretçiler + loglar)
router.delete('/clear-all', authenticate, async (req, res) => {
    try {
        await Promise.all([
            Visitor.deleteMany({}),
            Log.deleteMany({})
        ]);
        
        // Socket.io ile tüm istemcilere temizlik işlemini bildir
        global.io.emit('database-cleared');
        
        res.json({ message: 'Tüm veriler başarıyla temizlendi' });
    } catch (error) {
        console.error('Veritabanı temizleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

module.exports = router;
