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
  const [darkUI,setDarkUI]=useState(true)
  
  const shouldReconnectRef=useRef(true)
  const reconnectTimerRef=useRef(null)
  const reconnectDelayRef=useRef(1000)
  const joinedRef=useRef(false)
  const socketRef=useRef(null)
  const usernameRef=useRef("")
  const messageEndRef=useRef(null)
  const sessionIdRef=useRef(null)

  useEffect(()=>{

    shouldReconnectRef.current = true;
    const closeSocket=connectWebSocket();

    return ()=>{
      shouldReconnectRef.current=false
      closeSocket()
      clearTimeout(reconnectTimerRef.current)
    }

  },[])

  function connectWebSocket(){

    const socket=new WebSocket("wss://websocket-chat-server-65e8.onrender.com")
    socketRef.current=socket
    let intentionalClose=false

    function closeSocket(){
      intentionalClose=true
      socket.close()
    }

    socket.onopen=()=>{
      console.log("WebSocket Connected!")
      setConnected(true)
      reconnectDelayRef.current=1000

      //send joinMessage if client already joined before reconnection
      if(joinedRef.current){socket.send(JSON.stringify({type:"join",username:usernameRef.current,sessionId:sessionIdRef.current}))}
    }
    socket.onclose=()=>{
      console.log("WebSocket Disconnected!")
      setConnected(false)
      if(intentionalClose){return}
      if(shouldReconnectRef.current){
        reconnectTimerRef.current=
        setTimeout(()=>{
          console.log(`trying to reconnect... next trial in ${Math.min(reconnectDelayRef.current,10000)/1000} s`);
          connectWebSocket()
        },reconnectDelayRef.current)
        reconnectDelayRef.current=Math.min(reconnectDelayRef.current*2,10000)
      }
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
        setJoined(false)
        joinedRef.current=false
        setNotifications((prevNoti)=>[...prevNoti,message.message])
        socket.send(JSON.stringify({type:"leave",username:username}))
        setUsername("")
      }

      else if(message.type==="joinSuccess"){console.log("join success");setJoined(true);
        setNotifications((p)=>[...p,`You've joined as: ${message.username}`]);
        joinedRef.current=true;
        usernameRef.current=message.username;
        sessionIdRef.current=message.sessionId
      }
      //else if(message.type==="rejoin"){setNotifications((p)=>[...p,`${message.username} has rejoined!`]);}
    }
    return closeSocket;
  }

  //implement auto scroll
  useEffect(()=>{autoScroll&&messageEndRef.current?.scrollIntoView();},[messages])

  //implement dark UI
  useEffect(() => {document.documentElement.dataset.theme = darkUI?"dark":"light"}, [darkUI]);

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
      username:username,
      sessionId:sessionIdRef.current
    }
    socketRef.current.send(JSON.stringify(joinMessage))

  }

  return(
    <>
      <div className="chat-app">
        <h1>chat room</h1>
        <div className='status-tab'>
          <div className={connected? 'status-c':'status-d'}><p>Status: {connected? "Connected":"Disconnected"}</p>
          </div>
          <div><p>(if disconnected, wait for 10s!)</p></div>
        </div>
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
            <h2>Online Users: {joined? users.length:'Join to see'}</h2>
            {users.map((user)=>(<p key={user}>{user}</p>))}
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
        <button onClick={()=>{setAutoScroll(!autoScroll)}}>
          Auto Scroll: {autoScroll? "on":"off"}
        </button>
        <button onClick={()=>{setDarkUI(!darkUI)}}>
          UI: {darkUI?"Dark":"light"}
        </button>
      </div>
    </>
  )
}

export default App