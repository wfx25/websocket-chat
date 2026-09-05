const WebSocket = require("ws");
const server = new WebSocket.Server({
  host: "0.0.0.0",
  port: process.env.PORT || 8080
});

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

//monitor connection
server.on("connection", (socket) => {

  let username="";

  console.log("There is a connection!");

//monitor message
  socket.on("message",(message)=>{

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
        const illegalUserName={
          type:"error",
          message:"Username already exist!"
        };
        socket.send(JSON.stringify(illegalUserName));
        return
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