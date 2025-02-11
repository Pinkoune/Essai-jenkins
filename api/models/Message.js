const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
    sender: String,
    receiver: { type: String, default: null },
    channel: String,
    content: String,
    timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', messageSchema);
