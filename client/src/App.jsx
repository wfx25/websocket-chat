import {useState, useEffect, useRef} from 'react';

function App() {

  const [message,setMessage]=useState("")
  const [messages,setMessages]=useState([])
  const [users,setUsers]=useState([])
  const [username,setUsername]=useState("")
  const [connected,setConnected]=useState(false)
  const [joined,setJoined]=useState(false)
  const [notifications,setNotifications]=useState([])
  const [autoScroll, setAutoScroll]=useState(true)
  const socketRef=useRef(null)
  const messageEndRef=useRef(null)

  useEffect(()=>{
    const socket=new WebSocket("ws://localhost:8080")
    socketRef.current=socket

    socket.onopen=()=>{
      console.log("WebSocket Connected!")
      setConnected(true)
    }
    socket.onclose=()=>{
      console.log("WebSocket Disconnected!")
      setConnected(false)
    }

    //monitor messages
    socket.onmessage=(event)=>{

      const message=JSON.parse(event.data)
      console.log("Received:",message)

      //handle messages
      if(message.type==="userList"){setUsers(message.users)}

      else if(message.type==="join"){console.log(message.username,"has joined");
        setNotifications((prevNoti)=>[...prevNoti,`${message.username} has joined the chat.`])}

      else if(message.type==="message"){
        setMessages((previousMessages)=>[...previousMessages,message])}

      else if(message.type==="messageHistory"){
        setMessages(message.messages)}

      else if(message.type==="leave"){console.log(message.username,"has left");
        setNotifications((prevNoti)=>[...prevNoti,`${message.username} has left the chat.`])}

      else if(message.type==="error"){console.log("Get error message:",message.message);
        setJoined(false);
        setNotifications((prevNoti)=>[...prevNoti,message.message])}

      else if(message.type==="joinSuccess"){console.log("join success");setJoined(true);
        setNotifications((p)=>[...p,`You've logged in as: ${message.username}`])
      }

    }
    return ()=>{
      socket.close()
    }
  },[])

  //implement auto scroll
  useEffect(()=>{autoScroll&&messageEndRef.current?.scrollIntoView();},[messages])

  //send message
  function handleClick(){

    if(!joined){return}
    if(message.trim()===""){return}

    const messageToSend={
      type:"message",
      message:message
    }
    socketRef.current.send(JSON.stringify(messageToSend))
    setMessage("")
  }

  //join and send joinMessage
  function handleJoin(){

    if(joined){return}
    if(username.trim()===""){return}

    const joinMessage={
      type:"join",
      username:username
    }
    socketRef.current.send(JSON.stringify(joinMessage))

  }

  return(
    <>
      <div className='chat-app'>

        <h1>chat room</h1>
        <div className={connected? 'status-c':'status-d'}><p>Status: {connected? "Connected":"Disconnected"}</p></div>

        <div className='username-section'>
          <input
            value={username}
            onChange={(event)=>{
              setUsername(event.target.value)
            }}
            onKeyDown={(event)=>{
              if(event.key==="Enter"){
                handleJoin()
              }
            }}
            placeholder='Enter Username'
            disabled={joined}
          />
          <button
            onClick={handleJoin}
            disabled={username.trim()===""||joined||!connected}
          >
            {joined? "joined":"join"}
          </button>
        </div>


        <div className='chat-main'>
          <div className='users-section'>
            <h2>Online Users: {users.length}</h2>
            {users.map((user)=>(<p>{user}</p>))}
          </div>
          <div className='chat-section'>
            {joined && messages.map((message,index)=>(
              <p
                key={index}
                className={message.username===username? "my-message":"other-message"}
              >
                {message.username}: {message.message}
              </p>
              ))
            }
            <div ref={messageEndRef}></div>
          </div>
        </div>

        <div className='message-section'>
          <input
            value={message}
            type="text"
            onChange={(event)=>{
              setMessage(event.target.value)
              }}
            onKeyDown={(event)=>{
              if(event.key==="Enter"){
                //if(event.shiftKey){} for future update
                {handleClick()}
              }
            }}
          />
          <button
            onClick={handleClick}
            disabled={!joined||message.trim()===""||!connected}
          >
            send message
          </button>
        </div>


        <div className='notifications-section'>
          <h2>Notifications</h2>
          {notifications.map((notification,index)=>{
            return(
              <p key={index}>{notification}</p>
            )
          })}
        </div>
      </div>
      <button onClick={()=>{setAutoScroll(autoScroll? false:true)}}>
        Auto Scroll: {autoScroll? "on":"off"}
      </button>
    </>
  )
}

export default App