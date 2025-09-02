const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    visitorId: {
        type: String,
        ref: 'Visitor',
        required: true
    },
    username: {
        type: String,
        required: true,
        default: 'Anonim'
    },
    profilePhoto: {
        type: String,
        default: ''
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Message', messageSchema);
