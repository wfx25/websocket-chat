const WebSocket = require("ws");
const server = new WebSocket.Server({
  host: "0.0.0.0",
  port: process.env.PORT || 8080
});
const heartbeat=setInterval(()=>{
  server.clients.forEach((socket)=>{
    if(!socket.isAlive){socket.terminate();return;}
    socket.isAlive=false;
    socket.ping();
  });
  console.log("heartbeat tick, current users:", Array.from(users.values()));
},10000);

const users=new Map();
const messages=[];

//broadcast function
function broadcast(message,excludedSocket){
  server.clients.forEach((client)=>{
    if(client!==excludedSocket&&users.has(client)){
      client.send(JSON.stringify(message))
    }
  });
};

// quick-ping function
function checkAlive(socket){
  return new Promise((resolve)=>{
    if (socket.readyState !== socket.OPEN) return resolve(false);
    const timer = setTimeout(() => {
      socket.removeListener("pong", onPong);
      resolve(false);
    }, 2000);
    function onPong(){
      clearTimeout(timer);
      resolve(true);
    }
    socket.once("pong",onPong);
    socket.ping();
  });
}

//monitor connection
server.on("connection", (socket) => {

  let username="";
  socket.isAlive=true;
  console.log("There is a connection!");

  socket.on("pong",()=>{socket.isAlive=true});

//monitor message
  socket.on("message",async (message)=>{

    console.log("recieved:",message.toString());
    const chatMessage=JSON.parse(message.toString());

    //send error message(no type), will disjoin the user
    if(!chatMessage.type){
      socket.send(JSON.stringify({
        type:"error",
        message:"No messagetype"
      }));return}

  //handle join message
    if(chatMessage.type==="join"){

      //send error message (no username), will disjoin this client
      if(!chatMessage.username||chatMessage.username===""){
        socket.send(JSON.stringify({
          type:"error",
          message:"No username!"
        }));
        return}

      username=chatMessage.username
      const userList=Array.from(users.values());

      //send error message (username already exist)
      if(userList.includes(username)){
        console.log(`checking sockets with same usernames`);
        const oldSocket = [...users.entries()].find(([, name]) => name === username)[0];
        const stillAlive=await checkAlive(oldSocket);
        if(stillAlive){
          console.log(`an alive socket with same username found at ${users.get(oldSocket)}, oldSocket.readyState: ${oldSocket.readyState}`)
          const illegalUserName={
          type:"error",
          message:"Username already exist!"
        };
        socket.send(JSON.stringify(illegalUserName));
        return;}
        else{console.log(`deleting oldsocket`);users.delete(oldSocket);oldSocket.terminate();}
      }

      users.set(socket,username);
      console.log(username,"has joined");
      console.log("user list:", Array.from(users.values()));

      //send success message
      socket.send(JSON.stringify({
        type:"joinSuccess",
        username:username
      }))

      //send user list
      const userListMessage={
        type:"userList",
        users: Array.from(users.values())
      };
      broadcast(userListMessage);

      //send history message
      const messageHistory={type:"messageHistory",messages:messages}
      socket.send(JSON.stringify(messageHistory));

      //send join message
      const messageToSend={
        type:"join",
        username:username,
      };
      broadcast(messageToSend,socket);
    }

  //handle message
    else if(chatMessage.type==="message"){

      if(!users.has(socket)){return}

      //send message
      const messageToSend={
        type:"message",
        username:users.get(socket),
        message:chatMessage.message
      };
      messages.push(messageToSend);
      broadcast(messageToSend);
    }

  //handle other message
    else{

      //send error message (will disjoin this client)
      socket.send(JSON.stringify({type:"error",message:"Unsupported message type!"}))
    }
  });
  
  //monitor leave
  socket.on("close",()=>{
    
    if(username===""){return}

    users.delete(socket);
    console.log(username,"has left!")

    //send user list
    const userListMessage={
      type:"userList",
      users:Array.from(users.values())
    };

    //send leave message
    broadcast(userListMessage);
    const messageToSend={
      type:"leave",
      username:username
    };
    broadcast(messageToSend);
  });
});

server.on("close",()=>{clearInterval(heartbeat)});