const request = require('supertest');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const app = require('./index');
const { Server } = require('socket.io');
const User = require('./models/User');
const Channel = require('./models/Channel');
const Message = require('./models/Message');

let server, io, clientSocket;

jest.setTimeout(10000); 

beforeAll(async () => {
  await mongoose.connect('mongodb+srv://teamepitech:iL8Px7yPdsO94BJ5@clusterepitechtjsf.3rgud.mongodb.net/?retryWrites=true&w=majority&appName=ClusterEpitechTJSF', {
  });

  server = http.createServer(app);
  io = new Server(server);
  server.listen(3001, () => {
    console.log("Test server is running on port 3001");
  });

  clientSocket = require('socket.io-client')('http://localhost:3001');
});

afterAll(async () => {
  await mongoose.connection.close();
  if (clientSocket.connected) {
    clientSocket.disconnect();
  }
  server.close();
});

afterEach(() => {
  if (clientSocket.connected) {
    clientSocket.off("disconnect");
    clientSocket.off("message");
    clientSocket.off("loadChannels");
    clientSocket.off("loadUsersInChannel");
    clientSocket.off("loadMessages");
    clientSocket.off("userJoined");
    clientSocket.off("userLeft");
    clientSocket.off("renameChannel");
    clientSocket.off("updateUserName");
    clientSocket.off("privateMessage");
    clientSocket.off("error");
  }
});



describe('Socket.IO - createChannel Event', () => {
  it('should create a channel and join it', async () => {
    const channelName = 'TestChannel';
    const socket = require('socket.io-client')('http://localhost:3001');

    socket.on('connect', () => {
      socket.emit('createChannel', channelName);
    });

    socket.on('channelCreated', (channel) => {
      expect(channel.name).toBe(channelName);
      socket.disconnect();
    });

    setTimeout(() => {
      socket.disconnect();
    }, 10000); 
  });
});

describe('Socket.IO - deleteChannel Event', () => {
    it('should delete a channel and notify users', async () => {
      const channelName = 'TestChannelToDelete';
      const socket = require('socket.io-client')('http://localhost:3001');
  
      socket.on('connect', () => {
        socket.emit('createChannel', channelName);
      });
  
      socket.on('channelCreated', async (channel) => {
        expect(channel.name).toBe(channelName);
          socket.emit('deleteChannel', channelName);
      });
  
      socket.on('error', (message) => {
        if (message.includes('has been deleted')) {
          // Ensure the correct delete notification is received
          expect(message).toBe(`Channel ${channelName} has been deleted.`);
          socket.disconnect();
        }
      });
  
      setTimeout(() => {
        socket.disconnect();
      }, 10000); 
    });
  
    it('should handle the error when trying to delete a non-existing channel', async () => {
      const nonExistentChannelName = 'NonExistentChannel';
      const socket = require('socket.io-client')('http://localhost:3001');
  
      socket.on('connect', () => {
        socket.emit('deleteChannel', nonExistentChannelName);
      });
  
      socket.on('error', (message) => {
        expect(message).toBe(`Channel ${nonExistentChannelName} does not exist.`);
        socket.disconnect();
      });
  
      setTimeout(() => {
        socket.disconnect();
      }, 10000); 
    });
  
    it('should handle the error if nickname is not set', async () => {
      const channelName = 'TestChannelWithoutNickname';
      const socket = require('socket.io-client')('http://localhost:3001');
  
      socket.on('connect', () => {
        socket.emit('deleteChannel', channelName);
      });
  
      socket.on('error', (message) => {
        expect(message).toBe('You must set your nickname first!');
        socket.disconnect();
      });
  
      setTimeout(() => {
        socket.disconnect();
      }, 10000); 
    });
  });
  

describe('Socket.IO - sendMessage Event', () => {
  it('should save and load messages', async () => {
    const message = 'Test Message';
    const channelName = 'TestChannel';
    const socket = require('socket.io-client')('http://localhost:3001');

    socket.on('connect', () => {
      socket.emit('sendMessage', { channel: channelName, message });
    });

    socket.on('messageSent', async (data) => {
      const savedMessage = await Message.findOne({ message: message });
      expect(savedMessage.message).toBe(message);

      const messages = await Message.find({ channel: channelName });
      expect(messages.length).toBeGreaterThan(0);
      socket.disconnect();
    });

    setTimeout(() => {
      socket.disconnect();
    }, 10000);
  });
});

describe('Socket.IO - switchChannel Event', () => {
  it('should switch between channels', async () => {
    const socket = require('socket.io-client')('http://localhost:3001');
    const oldChannelName = 'TestChannel';
    const newChannelName = 'NewTestChannel';

    socket.on('connect', async () => {
      socket.emit('switchChannel', newChannelName);
    });

    socket.on('loadMessages', (data) => {
      expect(data.channel).toBe(newChannelName);
      socket.disconnect();
    });

    setTimeout(() => {
      socket.disconnect();
    }, 10000); 
  });
});

describe('Socket.IO - listUsersInChannel Event', () => {
  it('should list users in a channel', async () => {
    const socket = require('socket.io-client')('http://localhost:3001');
    const channelName = 'TestChannel';

    socket.on('connect', async () => {
      socket.emit('listUsersInChannel', channelName);
    });

    socket.on('loadUsersInChannel', (users) => {
      expect(Array.isArray(users)).toBe(true);
      socket.disconnect();
    });

    setTimeout(() => {
      socket.disconnect();
    }, 10000); 
  });
});