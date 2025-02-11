const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const Channel = require('./models/Channel');
const User = require('./models/User');
const Message = require('./models/Message');
const multer = require('multer');


const app = express();
const server = http.createServer(app);
app.use('/uploads', express.static('uploads'));
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); 
  }
});

const upload = multer({ storage: storage });


mongoose.connect('mongodb+srv://teamepitech:iL8Px7yPdsO94BJ5@clusterepitechtjsf.3rgud.mongodb.net/?retryWrites=true&w=majority&appName=ClusterEpitechTJSF', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

const activeUsers = {};
const activeChannels = {};

app.use(express.json());
app.use(cors());


const messageChangeStream = Message.watch([], { fullDocument: 'updateLookup' });

messageChangeStream.on('change', async (change) => {
  if (change.operationType === 'insert') {
    const message = change.fullDocument;
    const channelName = message.channel;

    io.to(channelName).emit('message', {
      type: 'chat',
      sender: message.sender,
      content: message.content
    });
  }
});


io.on('connection', (socket) => {
  let currentUser = null;

  socket.on('setNickname', async (nickname) => {
    if (!nickname) {
      socket.emit('error', `Nickname cannot be empty!`);    
      return;
    }

    try {
      const existingUser = await User.findOne({ nickname });
      if (existingUser) {
        socket.emit('error', `This nickname is already taken.!`);    
        return;
      }

      currentUser = new User({ nickname, socketId: socket.id });
      await currentUser.save();
      activeUsers[socket.id] = currentUser;

      const channelName = 'general';
      let channel = await Channel.findOne({ name: channelName });

      if (!channel) {
        channel = new Channel({ name: channelName });
        await channel.save();
      }

      socket.join(channelName);

      if (!activeChannels[channelName]) {
        activeChannels[channelName] = [];
      }
      activeChannels[channelName].push(currentUser.nickname);

      const messages = await Message.find({ channel: channelName });
      socket.emit('loadMessages', { channel: channelName, messages });

      socket.emit('error', `${nickname} has joined the chat.`);    
      socket.emit('nicknameSet', currentUser);
    } catch (error) {
      console.error('Error setting nickname:', error);
      socket.emit('error', 'Failed to set nickname. Please try again.');    
    }
  });

  socket.on('createChannel', async (channelName) => {
    if (!currentUser) {

      socket.emit('error', 'You must set your nickname first!');   
      return;
    }

    try {
      const existingChannel = await Channel.findOne({ name: channelName });

      if (existingChannel) {
        socket.emit('error', `Le canal ${channelName} existe déjà.`);    
            return;
      }

      const channel = new Channel({ name: channelName });
      await channel.save();

      socket.join(channelName);
      activeChannels[channelName] = activeChannels[channelName] || [];
      activeChannels[channelName].push(currentUser.nickname);

      const messages = await Message.find({ channel: channelName });
      socket.emit('loadMessages', { channel: channelName, messages });

      io.to(channelName).emit('message', { type: 'notification', content: `${currentUser.nickname} has created the channel ${channelName}.` });
      socket.emit('error', `${currentUser.nickname} has created the channel ${channelName}.` );   
    } catch (error) {
      console.error('Erreur lors de la création du canal:', error);
      socket.emit('message', { type: 'error', content: 'Échec de la création du canal. Veuillez réessayer.' });
    }
  });

  socket.on('sendMediaMessage', async (channelName, file, type) => {
    if (!currentUser) {
      socket.emit('error', 'You must set your nickname first!');   
      return;
    }

    try {
      const message = new Message({
        sender: currentUser.nickname,
        channel: channelName,
        content: file.filename,  
        type: type,
      });
      await message.save();

      io.to(channelName).emit('mediaMessage', { 
        sender: currentUser.nickname, 
        content: file.filename, 
        type: type, 
        url: `/uploads/${file.filename}`  
      });
    } catch (error) {
      console.error('Error sending media message:', error);
      socket.emit('error', 'Failed to send message. Please try again.');   
    }
  });

  app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }
    res.status(200).send({ filename: req.file.filename });
  });


  socket.on('switchChannel', async (channelName) => {
    if (!currentUser) {
      socket.emit('error', 'You must set your nickname first!' );   
      return;
    }

    socket.leave(currentUser.channel);

   socket.join(channelName);
    currentUser.channel = channelName; 

    if (!activeChannels[channelName]) {
      activeChannels[channelName] = [];
    }
    if (!activeChannels[channelName].includes(currentUser.nickname)) {
      activeChannels[channelName].push(currentUser.nickname);
    }

    const messages = await Message.find({ channel: channelName });
    socket.emit('loadMessages', { channel: channelName, messages });

  });

  socket.on('listUsersInChannel', (channelName) => {
    const usersInChannel = activeChannels[channelName] || [];
    socket.emit('loadUsersInChannel', usersInChannel);
  });

  socket.on('joinChannel', async (channelName) => {
    if (!currentUser) {

      socket.emit('error', 'You must set your nickname first!' );   
      return;
    }

    try {
      let channel = await Channel.findOne({ name: channelName });

      if (!channel) {
        const existingChannel = await Channel.findOne({ name: channelName });
        if (existingChannel) {
          socket.emit('error', 'A channel with this name already exists. Please choose another name.' );   

          return;
        }

        channel = new Channel({ name: channelName });
        await channel.save();
      }

      socket.join(channelName);

      if (!activeChannels[channelName]) {
        activeChannels[channelName] = [];
      }
      if (!activeChannels[channelName].includes(currentUser.nickname)) {
        activeChannels[channelName].push(currentUser.nickname);
      }

      const messages = await Message.find({ channel: channelName });
      socket.emit('loadMessages', { channel: channelName, messages });

      socket.emit('error', `${currentUser.nickname} has joined the channel ${channelName}.` );   

    } catch (error) {
      console.error('Error joining channel:', error);
      socket.emit('error', 'Failed to join channel. Please try again.' );   

    }
  });

  socket.on('leaveChannel', (channelName) => {
    if (!currentUser) {
      socket.emit('error', 'You must set your nickname first!' );   
      return;
    }

    socket.leave(channelName);

    if (activeChannels[channelName]) {
      activeChannels[channelName] = activeChannels[channelName].filter(user => user !== currentUser.nickname);
    }

    socket.emit('error', `${currentUser.nickname} has left the channel ${channelName}.` );   

  });

  socket.on('sendMessage', async (channelName, messageContent) => {
    if (!currentUser) {
      socket.emit('error', 'You must set your nickname first!' );   
      return;
    }

    try {
      const message = new Message({ sender: currentUser.nickname, channel: channelName, content: messageContent });
      await message.save();

      //io.to(channelName).emit('message', { type: 'chat', sender: currentUser.nickname, content: messageContent });
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', 'Failed to send message. Please try again.'  );   

    }
  });

  socket.on('listChannels', async () => {
    try {
      const channels = await Channel.find();
      socket.emit('loadChannels', channels);
    } catch (error) {
      console.error('Error retrieving channels:', error);
      socket.emit('error',  'Error retrieving channels'   );   
    }
  });

  socket.on('renameChannel', (oldChannelName, newChannelName, callback) => {
    if (!oldChannelName || !newChannelName) {
      return callback({ success: false, message: 'Les noms de canaux doivent être fournis.' });
    }
  
    Channel.findOne({ name: newChannelName })
      .then(existingChannel => {
        if (existingChannel) {
          return callback({ success: false, message: 'Ce nom de canal existe déjà.' });
        }
  
        Channel.findOne({ name: oldChannelName })
          .then(channel => {
            if (!channel) {
              return callback({ success: false, message: `Le canal "${oldChannelName}" n'existe pas.` });
            }
  
            channel.name = newChannelName;
            channel.save()
              .then(() => {
                Message.updateMany({ channel: oldChannelName }, { $set: { channel: newChannelName } })
                  .then(() => {
                    io.emit('channelRenamed', oldChannelName, newChannelName);
                    callback({ success: true });
                  })
                  .catch(err => {
                    console.error('Erreur lors de la mise à jour des messages:', err);
                    callback({ success: false, message: 'Erreur lors de la mise à jour des messages.' });
                  });
              })
              .catch(err => {
                console.error(err);
                callback({ success: false, message: 'Erreur lors de la mise à jour du canal.' });
              });
          })
          .catch(err => {
            console.error(err);
            callback({ success: false, message: 'Erreur lors de la recherche du canal.' });
          });
      })
      .catch(err => {
        console.error(err);
        callback({ success: false, message: 'Erreur lors de la vérification du nouveau nom de canal.' });
      });
  });
  socket.on('updateUserName', async (newUserName, callback) => {
    if (!currentUser) {
      socket.emit('error', 'You must set your nickname first!');
      return;
    }
  
    try {
      const existingUser = await User.findOne({ nickname: newUserName });
      if (existingUser) {
        socket.emit('error', `Le pseudo "${newUserName}" est déjà pris.`);
        return;
      }
  
      currentUser.nickname = newUserName;
      await currentUser.save();
  
      await Message.updateMany({ sender: currentUser.nickname }, { $set: { sender: newUserName } });
  
      activeUsers[socket.id].nickname = newUserName;
  
      io.emit('error', `${currentUser.nickname} a changé son pseudo pour "${newUserName}"`);
  
      callback({ success: true, message: `Votre pseudo a été mis à jour en "${newUserName}"` });
  
    } catch (error) {
      console.error('Erreur lors de la mise à jour du pseudo:', error);
      socket.emit('error', 'Erreur lors de la mise à jour du pseudo.');
      callback({ success: false, message: 'Erreur lors de la mise à jour du pseudo.' });
    }
  });
  
  

  socket.on('deleteChannel', async (channelName) => {
    if (!currentUser) {
      socket.emit('error',  'You must set your nickname first!'   );   

      return;
    }

    try {
      const channel = await Channel.findOneAndDelete({ name: channelName });

      if (!channel) {
        socket.emit('error',  `Channel ${channelName} does not exist.`   );   

        return;
      }

      if (activeChannels[channelName]) {
        activeChannels[channelName].forEach((nickname) => {
          socket.emit('error',  `${nickname} has been removed from the channel.`    );   

        });
        delete activeChannels[channelName];
      }

      socket.emit('error',  `Channel ${channelName} has been deleted.`    );   

      const channels = await Channel.find();
      io.emit('loadChannels', channels);
    } catch (error) {
      console.error('Error deleting channel:', error);
      socket.emit('error',  `Failed to delete channel ${channelName}.`   );   

    }
  });

  socket.on('sendPrivateMessage', async (receiverNickname, messageContent) => {
    if (!currentUser) {
      socket.emit('error', 'You must set your nickname first!');
      return;
    }
  
    if (!receiverNickname) {
      socket.emit('error', 'You must specify a receiver for the private message!');
      return;
    }
  
    try {
      const receiver = await User.findOne({ nickname: receiverNickname });
  
      if (!receiver) {
        socket.emit('error', `User with nickname ${receiverNickname} does not exist!`);
        return;
      }
  
      const message = new Message({
        sender: currentUser.nickname,
        receiver: receiverNickname, 
        content: messageContent,
        channel: null, 
        timestamp: new Date(),
      });
  
      await message.save();
  
      if (receiver.socketId) {
        // If the receiver is online, send the message immediately
        io.to(receiver.socketId).emit('privateMessage', {
          sender: currentUser.nickname,
          content: messageContent,
          private: true,
        });
      } else {
        // Optionally, store the message in a "pending" collection if receiver is offline
        // For now, we'll send a notification
        socket.emit('messageSent', {
          type: 'private',
          content: `Your private message to ${receiverNickname} has been sent (but the user is offline).`,
        });
      }
  
      socket.emit('privateMessage', {
        sender: currentUser.nickname,
        content: messageContent,
        private: true,
      });
  
    } catch (error) {
      console.error('Error sending private message:', error);
      socket.emit('error', 'Failed to send private message. Please try again.');
    }
  });
  




  socket.on('disconnectUser', async () => {
    if (!currentUser) {
      socket.emit('message', { type: 'error', content: 'You must set your nickname first!' });
      return;
    }

    try {
      await User.deleteOne({ nickname: currentUser.nickname });

      socket.emit('error',  `${currentUser.nickname} has disconnected.`  );   

      for (const channelName of Object.keys(activeChannels)) {
        activeChannels[channelName] = activeChannels[channelName].filter(user => user !== currentUser.nickname);
      }

      delete activeUsers[socket.id];

      socket.disconnect();
    } catch (error) {
      console.error('Error disconnecting user:', error);
      socket.emit('error',  'Failed to disconnect. Please try again.'  );  
    }
  });
  
});

server.listen(8000, () => console.log('Server running on http://localhost:8000'));

