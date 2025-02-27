import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import "./App.css";

function App() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [userName, setUserName] = useState("");
  const [userNameInput, setUserNameInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [newRoomInput, setNewRoomInput] = useState("");
  const [roomUsers, setRoomUsers] = useState([]);

  const messagesEndRef = useRef(null);

  // Kullanıcı adı girişi ve bağlantı kurma
  const handleConnect = () => {
    if (!userNameInput.trim()) return;

    const newSocket = io("http://localhost:3001", {
      query: { userName: userNameInput },
    });

    setSocket(newSocket);
    setUserName(userNameInput);
    setIsConnected(true);

    return () => {
      newSocket.disconnect();
    };
  };

  // Socket bağlantısı kurulduktan sonra event dinleyicileri
  //Burada socket ile ilgili eventleri dinliyoruz
  useEffect(() => {
    if (!socket) return;

    socket.on("newMessage", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("previousMessages", (prevMessages) => {
      setMessages(prevMessages);
    });

    socket.on("availableRooms", (availableRooms) => {
      setRooms(availableRooms);
    });

    socket.on("roomCreated", (room) => {
      setRooms((prev) => [...prev, room]);
    });

    socket.on("userJoined", (data) => {
      // Kullanıcı katıldı bildirimi
      const systemMessage = {
        message: `${data.userName} odaya katıldı`,
        userName: "Sistem",
        room: data.room,
        timestamp: new Date().toISOString(),
        isSystem: true,
      };
      setMessages((prev) => [...prev, systemMessage]);
    });

    socket.on("userLeft", (data) => {
      // Kullanıcı ayrıldı bildirimi
      const systemMessage = {
        message: `${data.userName} odadan ayrıldı`,
        userName: "Sistem",
        room: data.room,
        timestamp: new Date().toISOString(),
        isSystem: true,
      };
      setMessages((prev) => [...prev, systemMessage]);
    });

    socket.on("roomUsers", (users) => {
      setRoomUsers(users);
    });

    // Başlangıçta odaları al
    socket.emit("getRooms");

    return () => {
      socket.off("newMessage");
      socket.off("previousMessages");
      socket.off("availableRooms");
      socket.off("roomCreated");
      socket.off("userJoined");
      socket.off("userLeft");
      socket.off("roomUsers");
    };
  }, [socket]);

  // Mesajları otomatik kaydırma
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mesaj gönderme
  const sendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentRoom) return;

    socket.emit("sendMessage", {
      message: messageInput,
      room: currentRoom.id,
    });

    setMessageInput("");
  };

  // Oda oluşturma
  const createRoom = (e) => {
    e.preventDefault();
    if (!newRoomInput.trim()) return;

    socket.emit("createRoom", newRoomInput);
    setNewRoomInput("");
  };

  // Odaya katılma
  const joinRoom = (room) => {
    socket.emit("joinRoom", room.id);
    setCurrentRoom(room);
    setMessages([]);
  };

  // Tarih formatı
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString();
  };

  if (!isConnected) {
    return (
      <div className="login-container">
        <h1>Sohbet Uygulaması</h1>
        <div className="login-form">
          <input
            type="text"
            value={userNameInput}
            onChange={(e) => setUserNameInput(e.target.value)}
            placeholder="Kullanıcı adınızı girin"
          />
          <button onClick={handleConnect}>Bağlan</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="sidebar">
        <div className="user-info">
          <h3>{userName}</h3>
        </div>

        <div className="create-room">
          <form onSubmit={createRoom}>
            <input
              type="text"
              value={newRoomInput}
              onChange={(e) => setNewRoomInput(e.target.value)}
              placeholder="Yeni oda adı"
            />
            <button type="submit">Oda Oluştur</button>
          </form>
        </div>

        <div className="room-list">
          <h3>Odalar</h3>
          <ul>
            {rooms.map((room) => (
              <li
                key={room.id}
                className={
                  currentRoom && currentRoom.id === room.id ? "active" : ""
                }
                onClick={() => joinRoom(room)}
              >
                {room.name}
              </li>
            ))}
          </ul>
        </div>

        {currentRoom && (
          <div className="room-users">
            <h3>Odadaki Kullanıcılar</h3>
            <ul>
              {roomUsers.map((user) => (
                <li key={user.id}>{user.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="chat-area">
        {currentRoom ? (
          <>
            <div className="chat-header">
              <h2>{currentRoom.name}</h2>
            </div>

            <div className="messages">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message ${
                    msg.userName === userName ? "own-message" : ""
                  } ${msg.isSystem ? "system-message" : ""}`}
                >
                  <div className="message-header">
                    <span className="username">{msg.userName}</span>
                    <span className="timestamp">
                      {formatDate(msg.timestamp)}
                    </span>
                  </div>
                  <div className="message-content">{msg.message}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className="message-form" onSubmit={sendMessage}>
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Mesajınızı yazın..."
              />
              <button type="submit">Gönder</button>
            </form>
          </>
        ) : (
          <div className="select-room-message">
            <h2>Sohbet etmek için bir oda seçin</h2>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
