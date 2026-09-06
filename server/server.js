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
const crypto=require("crypto");

const users=new Map();
const sessionIds=new Map();
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
  let joined=false;
  socket.isAlive=true;
  console.log("There is a connection!");

  socket.on("pong",()=>{socket.isAlive=true});

//monitor message
  socket.on("message",async (message)=>{

    console.log("recieved:",message.toString());

    try{const chatMessage=JSON.parse(message.toString());
    

    //send error message(no type), will disjoin the user
    if(!chatMessage.type){
      socket.send(JSON.stringify({
        type:"error",
        message:"No messagetype"
      }));return}

  //handle join message
  //all errors will disjoin the user
    if(chatMessage.type==="join"){

      //send error message (already joined for this socket), will disjoin this client
      if(joined){socket.send(JSON.stringify({type:"error",message:"muitiple join not allowed for one socket"}));return;}

      //send error message (no username), will disjoin this client
      if(!chatMessage.username||chatMessage.username.trim()===""){
        socket.send(JSON.stringify({
          type:"error",
          message:"No username!"
        }));
        return}

      username=chatMessage.username
      const userList=Array.from(users.values());

      //send error message (username already exist)
      if(userList.includes(username)){

        console.log(`checking sockets with same usernames and comparing sessionIds`);

        const oldSocket = [...users.entries()].find(([, name]) => name === username)[0];
        
        if(chatMessage.sessionId && chatMessage.sessionId === sessionIds.get(oldSocket)){
          console.log(`${username} continue session, deleting oldsocket`);
          sessionIds.delete(oldSocket);users.delete(oldSocket);oldSocket.terminate();
        }
        else if(await checkAlive(oldSocket)){
          console.log(`an alive socket with same username found at ${users.get(oldSocket)}, oldSocket.readyState: ${oldSocket.readyState}`)
          socket.send(JSON.stringify({type:"error",message:"Username already exist!"}));
          username="";
          return;}
          else{console.log(`deleting oldsocket`);sessionIds.delete(oldSocket);users.delete(oldSocket);oldSocket.terminate();}
      }
      
      const sessionId=chatMessage.sessionId||crypto.randomUUID();
      users.set(socket,username);
      sessionIds.set(socket, sessionId);
      joined=true;
      console.log(username,"has joined");
      console.log("user list:", Array.from(users.values()));
      console.log(`${username} gets sessionId: ${sessionId}`);

      //send success message
      socket.send(JSON.stringify({
        type:"joinSuccess",
        username:username,
        sessionId:sessionId
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
        sessionId:null
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

  //handle leave message
    else if(chatMessage.type==="leave"){
      users.delete(socket)
      sessionIds.delete(socket)
      joined=false
    }

  //handle other message
    else{

      //send error message (will disjoin this client)
      socket.send(JSON.stringify({type:"error",message:"Unsupported message type!"}))
    }
  }catch(error){socket.send(JSON.stringify({type: "error",message: "Invalid JSON"}));}
  });
  
  //monitor leave
  socket.on("close",()=>{
    console.log("there is a disconnection")
    sessionIds.delete(socket)
    if(username===""||!joined){console.log("disconnection:no username or not joined");return}

    if(!users.get(socket)){
      console.log("disconnection:not stored in users[]");
      // const userList=Array.from(users.values);
      // if(userList.includes(username)){
      //   broadcast({type:"rejoin",username:username},
      //     [...users.entries()].find(([, name]) => name === username)[0]);}
      return;
    }
    users.delete(socket);
    console.log(username,"has left!")
    console.log("user list:", Array.from(users.values()));

    //send user list
    const userListMessage={
      type:"userList",
      users:Array.from(users.values())
    };
    broadcast(userListMessage);

    //send leave message
    const messageToSend={
      type:"leave",
      username:username
    };
    broadcast(messageToSend);
  });
});

server.on("close",()=>{clearInterval(heartbeat)});