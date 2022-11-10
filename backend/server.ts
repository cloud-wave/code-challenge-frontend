import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as IOServer} from 'socket.io';
import CONFIG from './config';

const app = express();
const router = express.Router();

const httpServer = http.createServer(http);
const io = new IOServer(httpServer);

app.use(router);
app.use(cors({ origin: '*' }));


//lost on server restart, back with db and message que for permanance out side of scope
//would also use a more concrete data type if users had more info
const uuuidToSocketid: {[uuid: string]: string} = {};

//break the events into a listner setup file/s
io.on('connection', (socket) => {
  const username = socket.handshake.auth.username
  if (!username) {
    //would be overhauled with proper error callbacks on the client side to re login etc but from spec doing it dirty
    console.log("drop connection no username provided");
    return;
  }
  console.log(`new connection from socket ID: ${socket.id} with username: ${username}`);
  if (uuuidToSocketid[username]) {
    console.log('this is a reconnection');
  }

  uuuidToSocketid[username] = socket.id
  socket.on('directMessageConnect',  ({ to }) => {
    console.log(`start new chat with ${uuuidToSocketid[to]}`);
    socket.to(uuuidToSocketid[to]).emit("directMessageConnect", {
      username: username
    });
  });

  //leaving the option for group messaging later
  socket.on('directMessage', ({ content, to }) => {
    //this would not be acceptable in a real app that wants secure direct messages 
    //but the messages would be p2p encypted
    console.log(`message recived from : ${username}, message: ${content}, to: ${to}`)
    socket.to(uuuidToSocketid[to]).emit('directMessage', {
      content,
      from: socket.id,
      username: username
    });
    console.log('message sent')
  });

  socket.on('disconnect', () => {
    //remove user from the users store
    console.log(`user disconected with name ${username}`);
    socket.broadcast.emit('userDisconected' , {
      username: username
    });
  });
  
});

httpServer.listen(CONFIG.PORT, () => {
  console.log(`Server listening on *:${CONFIG.PORT} 🚀`);
});