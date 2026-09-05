const WebSocket = require("ws");
const server = new WebSocket.Server({port:8080});

const users=new Map();

//broadcast function
function broadcast(message,excludedSocket){
  server.clients.forEach((client)=>{
    if(client!==excludedSocket){
      client.send(JSON.stringify(message))
    }
  });
};

//monitor connection
server.on("connection", (socket) => {

  let username="";

  console.log("There is a connected!");

//monitor message
  socket.on("message",(message)=>{

    console.log("recieved:",message.toString());
    const chatMessage=JSON.parse(message.toString());

  //handle join message
    if(chatMessage.type==="join"){

      username=chatMessage.username
      const userList=Array.from(users.values());

      //send error message
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

      //send join message
      const messageToSend={
        type:"join",
        username:username,
      };
      broadcast(messageToSend,socket);
    }

  //handle message
    else if(chatMessage.type==="message"){

      //send message
      const messageToSend={
        type:"message",
        username:users.get(socket),
        message:chatMessage.message
      };
      broadcast(messageToSend);
    }

  //handle other message
    else{

      //send error message (will logout the user)
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