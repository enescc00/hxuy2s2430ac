const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { storage } = require('../services/cloudinary');
const upload = multer({ storage });
const Visitor = require('../models/Visitor');
const Log = require('../models/Log');
const { getLocationFromIP } = require('../services/geolocation');

// Tüm ziyaretçileri getir
router.get('/', async (req, res) => {
    try {
        const visitors = await Visitor.find({}).select('-ipAddress -userAgent');
        res.json(visitors);
    } catch (error) {
        console.error('Ziyaretçiler getirilirken hata:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Yeni ziyaretçi ekle
router.post('/visitors', async (req, res) => {
    try {
        let clientIP = req.headers['x-forwarded-for'] || 
                      req.connection.remoteAddress || 
                      req.socket.remoteAddress ||
                      (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                      '127.0.0.1';
        
        // IPv6 localhost'u IPv4'e çevir
        if (clientIP === '::1' || clientIP === '::ffff:127.0.0.1') {
            clientIP = '127.0.0.1';
        }
        
        // x-forwarded-for header'ında birden fazla IP varsa ilkini al
        if (clientIP.includes(',')) {
            clientIP = clientIP.split(',')[0].trim();
        }
        
        const userAgent = req.headers['user-agent'];
        
        // Aynı IP'den zaten kayıt var mı kontrol et
        const existingVisitor = await Visitor.findOne({ ipAddress: clientIP });
        if (existingVisitor) {
            return res.json({ 
                uniqueId: existingVisitor.uniqueId,
                visitor: existingVisitor,
                message: 'Zaten kayıtlısınız'
            });
        }

        // IP'den konum bilgisi al
        const locationData = await getLocationFromIP(clientIP);
        
        if (!locationData) {
            return res.status(400).json({ error: 'Konum bilgisi alınamadı' });
        }

        // Yeni ziyaretçi oluştur
        const uniqueId = uuidv4();
        const newVisitor = new Visitor({
            uniqueId,
            ipAddress: clientIP,
            location: {
                latitude: locationData.lat,
                longitude: locationData.lon,
                city: locationData.city,
                country: locationData.country,
                region: locationData.regionName
            },
            userAgent
        });

        await newVisitor.save();

        // Log kaydı oluştur
        const log = new Log({
            ipAddress: clientIP,
            action: 'create_visitor',
            userAgent,
            location: {
                city: locationData.city,
                country: locationData.country,
                region: locationData.regionName
            },
            visitorId: uniqueId
        });
        await log.save();

        // Socket.io ile tüm istemcilere yeni ziyaretçiyi bildir
        global.io.emit('new-visitor', newVisitor);

        res.json({ 
            uniqueId,
            visitor: newVisitor,
            message: 'Başarıyla eklendi'
        });

    } catch (error) {
        console.error('Ziyaretçi eklenirken hata:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Profil bilgilerini güncelle (kullanıcı adı ve profil fotoğrafı)
router.put('/visitors/:uniqueId', upload.single('profilePhoto'), async (req, res) => {
    const { uniqueId } = req.params;
    const { username } = req.body;

    try {
        const visitor = await Visitor.findOne({ uniqueId });

        if (!visitor) {
            return res.status(404).json({ error: 'Ziyaretçi bulunamadı' });
        }

        // Veritabanında güncelle
        visitor.profile.username = username || visitor.profile.username;
        if (req.file) {
            visitor.profile.profilePhoto = req.file.path; // Cloudinary URL'si
        }
        await visitor.save();

        // Log kaydı ve socket bildirimi...
        let clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1';
        if (clientIP === '::1' || clientIP === '::ffff:127.0.0.1') {
            clientIP = '127.0.0.1';
        }
        if (clientIP.includes(',')) {
            clientIP = clientIP.split(',')[0].trim();
        }

        const log = new Log({
            ipAddress: clientIP,
            action: 'update_profile',
            userAgent: req.headers['user-agent'],
            visitorId: uniqueId,
            metadata: { username, profilePhoto: req.file ? req.file.path : visitor.profile.profilePhoto }
        });
        await log.save();

        global.io.emit('visitor-updated', visitor);

        res.json({ message: 'Profil başarıyla güncellendi', visitor });

    } catch (error) {
        console.error('Profil güncellenirken hata:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

module.exports = router;
