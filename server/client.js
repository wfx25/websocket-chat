
//For test only, does not run in chatapp.

const WebSocket = require("ws");

const readline = require("readline");

const ws = new WebSocket("ws://localhost:8080");

ws.onopen = () => {
  console.log("connected to server");
  console.log("Enter to send,to quit, type /quit");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on("line", (input) => {
    if (input === "/quit") {
      ws.close();
      rl.close();
      return;
    }

    ws.send(input);
    console.log("→ sent:", input);
  });
};

ws.onmessage = (event) => {
  console.log("← server:", event.data);
};

ws.onerror = (err) => {
  console.error("websocket error:", err);
};

ws.onclose = () => {
  console.log("disconnected");
};