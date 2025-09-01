const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
    uniqueId: {
        type: String,
        required: true,
        unique: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    location: {
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        },
        city: String,
        country: String,
        region: String
    },
    profile: {
        username: {
            type: String,
            default: null,
            maxlength: 50
        },
        profilePhoto: {
            type: String,
            default: null
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    userAgent: String
});

// Her güncelleme öncesi lastUpdated'i güncelle
visitorSchema.pre('save', function(next) {
    this.lastUpdated = Date.now();
    next();
});

module.exports = mongoose.model('Visitor', visitorSchema);
