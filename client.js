const WebSocket=require("ws");
const socket=new WebSocket("ws://localhost:8080");

socket.on("open",()=>{
    console.log("connected to server!");
    console.log("enter your name:");
});

let username="";

process.stdin.on("data",(data)=>{

    const input=data.toString().trim();

    if(input===""){
        return;
    }

    if(username===""){
        username=input;
        console.log("username set to:",username);
        const joinMessage={
            type:"join",
            username:username
        };
        socket.send(JSON.stringify(joinMessage))
        return
    };

    const chatMessage={
        type:"message",
        message:input
    };
    socket.send(JSON.stringify(chatMessage))
});

//monitor message
socket.on("message",(message)=>{

    console.log("received:",message.toString());
    const chatMessage=JSON.parse(message.toString());
    
    //error message
    if(chatMessage.type==="error"){
        username="";
        console.log(chatMessage.message);
    }
    //join message
    else if(chatMessage.type==="join"){
        console.log("receive join message:",chatMessage.username)
    }
    //message
    else if(chatMessage.type==="message"){
        console.log(chatMessage.username,":",chatMessage.message);
    }
    //leave message
    else if(chatMessage.type==="leave"){
        console.log("receive leave message:",chatMessage.username);
    }
    //userList message
    else if(chatMessage.type==="userList"){
        console.log("receive userList message",chatMessage.users);
    }
});

