const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    ipAddress: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['visit', 'update_profile', 'create_visitor']
    },
    userAgent: String,
    location: {
        city: String,
        country: String,
        region: String
    },
    visitorId: {
        type: String,
        ref: 'Visitor'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Log', logSchema);
