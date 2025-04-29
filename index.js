import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";


const app = express();
app.use(cors({
  origin: ["http://localhost:3000", "https://benevolent-tartufo-7b8412.netlify.app"], // adjust to match your actual frontend
  methods: ["GET", "POST"],
}));

app.get("/", (req, res) => {
  res.send("Socket.IO server running");
});

const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://benevolent-tartufo-7b8412.netlify.app"],
    methods: ["GET", "POST"],
  },
});


const rooms = new Map();

// Handle Socket.IO connections
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  let currentRoom = null;
  let currentUser = null;

  socket.on("join", ({ roomId, userName }) => {
    // Handle leaving the current room
    if (currentRoom) {
      socket.leave(currentRoom);
      rooms.get(currentRoom)?.delete(currentUser);
    }

    // Join the new room
    currentRoom = roomId;
    currentUser = userName;

    socket.join(roomId);

    // Initialize room if not exists
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }

    // Add the user to the room
    rooms.get(roomId).add(userName);

    // Emit updated user list to the room
    io.to(roomId).emit("userJoined", Array.from(rooms.get(roomId)));
  });

  // Handle language change
  socket.on("language-change", (lang) => {
    console.log(`Language changed to: ${lang} in room ${currentRoom}`);
    if (currentRoom) {
      io.to(currentRoom).emit("language-change", lang);
    }
  });

  socket.on('codeChange',codeTyped=>{
    console.log("typing someOne in room",codeTyped)
     const {code ,userName}=codeTyped;
    if(currentRoom){
      console.log(currentUser,"current user")
      io.to(currentRoom).emit("codeChange",{code ,userName});
    }
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);

    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(currentUser);

      // Notify others in the room
      io.to(currentRoom).emit("userAvailable", Array.from(rooms.get(currentRoom)));
      io.to(currentRoom).emit("userLeft", currentUser);
    }
  });
});
