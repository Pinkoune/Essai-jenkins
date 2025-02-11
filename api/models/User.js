const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nickname: {
    type: String,
    required: true,
    unique: true,
  },
  socketId: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model('User', userSchema);