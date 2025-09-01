const axios = require('axios');

/**
 * IP adresinden coğrafi konum bilgisi alır
 * @param {string} ip - IP adresi
 * @returns {Object|null} Konum bilgisi veya null
 */
async function getLocationFromIP(ip) {
    try {
        // Localhost veya özel IP adresleri için varsayılan İstanbul koordinatları
        if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            return {
                lat: 41.0082,
                lon: 28.9784,
                city: 'İstanbul',
                country: 'Turkey',
                regionName: 'İstanbul'
            };
        }

        const response = await axios.get(`${process.env.GEOLOCATION_API_URL}${ip}`, {
            timeout: 5000
        });

        const data = response.data;
        
        if (data.status === 'success') {
            return {
                lat: data.lat,
                lon: data.lon,
                city: data.city,
                country: data.country,
                regionName: data.regionName
            };
        } else {
            console.warn('Geolocation API hatası:', data.message);
            return null;
        }
        
    } catch (error) {
        console.error('IP geolocation hatası:', error.message);
        // Hata durumunda varsayılan konum döndür
        return {
            lat: 41.0082,
            lon: 28.9784,
            city: 'İstanbul',
            country: 'Turkey',
            regionName: 'İstanbul'
        };
    }
}

module.exports = {
    getLocationFromIP
};
