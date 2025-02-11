import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.scss";
import { LogoPicto } from "./components/picto/LogoPicto";
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";

const socket = io("http://localhost:8000");

const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [nickname, setNickname] = useState("");
  const [currentChannel, setCurrentChannel] = useState("general");
  const [channels, setChannels] = useState([]);
  const [users, setUsers] = useState([]);
  const [joinedChannels, setJoinedChannels] = useState(["general"]);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);

  const commandList = [
    { command: "/nick [userName]", description: "Define your username" },
    { command: "/list", description: "List all channels" },
    { command: "/users", description: "List users in the current channel" },
    { command: "/rename [NewUsername]", description: "Change username" },
    { command: "/close", description: "Close channel or users list" },
    { command: "/create [channelName]", description: "Create a new channel" },
    { command: "/delete [channelName]", description: "Delete a channel" },
    { command: "/join [channelName]", description: "Join a channel" },
    { command: "/quit [channelName]", description: "Quit the current channel" },
    {
      command: "/switch [channelName]",
      description: "Switch between channels",
    },
    {
      command: "/update -c [oldChannelName] [NewChannelName]",
      description: "Update user or channel information",
    },
    {
      command: "/msg -u [receiver] -m [Message]",
      description: "Update user or channel information",
    },
  ];

  const [showChannelsList, setShowChannelsList] = useState(false);
  const [showUsersList, setShowUsersList] = useState(false);
  const [showCommandModal, setShowCommandModal] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);

  const isListOpen = showChannelsList || showUsersList;
  const currentUser = nickname || "Anonyme";

  useEffect(() => {
    socket.on("renameChannel", (oldChannelName, newChannelName) => {
      setChannels((prevChannels) =>
        prevChannels.map((channel) =>
          channel === oldChannelName ? newChannelName : channel
        )
      );

      setJoinedChannels((prev) =>
        prev.map((channel) =>
          channel === oldChannelName ? newChannelName : channel
        )
      );

      if (currentChannel === oldChannelName) {
        setCurrentChannel(newChannelName);
        setTimeout(() => {
          socket.emit("loadMessages", { channel: newChannelName });
        }, 100);
      }

      toast.info(
        `Le canal "${oldChannelName}" a été renommé en "${newChannelName}"`
      );
    });

    return () => {
      socket.off("renameChannel");
    };
  }, [currentChannel]);

  useEffect(() => {
    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on("message", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    socket.on("loadChannels", (channels) => {
      setChannels(channels.map((c) => c.name));
    });

    socket.on("loadUsersInChannel", (userList) => {
      setUsers(userList);
    });

    socket.on("loadMessages", ({ channel, messages }) => {
      if (currentChannel === channel) {
        setMessages(messages);
      }
    });

    socket.on("updateUserName", (newUserName, callback) => {
      if (newUserName) {
        users[socket.id].nickname = newUserName;
        callback({ success: true });
        io.emit("userUpdated", {
          oldNickname: users[socket.id].nickname,
          newNickname: newUserName,
        });
      } else {
        callback({ success: false, message: "Pseudo invalide." });
      }
    });

    socket.on("privateMessage", ({ sender, message }) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender, content: `[Privé] ${message}`, private: true },
      ]);
      toast.info(`Message privé de ${sender}`);
    });

    socket.on("userJoined", ({ user, channel }) => {
      toast.info(`${user} a rejoint le canal "${channel}"`);
    });

    socket.on("userLeft", ({ user, channel }) => {
      toast.info(`${user} a quitté le canal "${channel}"`);
    });
    socket.on("renameChannel", (oldChannelName, newChannelName) => {
      setChannels((prevChannels) =>
        prevChannels.map((channel) =>
          channel === oldChannelName ? newChannelName : channel
        )
      );
      toast.info(
        `Le canal "${oldChannelName}" a été mis à jour en "${newChannelName}"`
      );
    });
    socket.on("updateUserName", (newUserName, callback) => {
      if (newUserName && newUserName.trim() !== "") {
        const user = users[socket.id];
        if (user) {
          const oldNickname = user.nickname;

          user.nickname = newUserName;

          updateMessages(oldNickname, newUserName);

          callback({ success: true });

          io.emit("userUpdated", { oldNickname, newNickname: newUserName });
        } else {
          callback({ success: false, message: "Utilisateur non trouvé." });
        }
      } else {
        callback({ success: false, message: "Nom d'utilisateur invalide." });
      }
    });

    socket.on("error", (errorMessage) => {
      toast.error(errorMessage);
    });

    socket.emit("loadMessages", { channel: currentChannel });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("message");
      socket.off("loadChannels");
      socket.off("loadUsersInChannel");
      socket.off("loadMessages");
      socket.off("userJoined");
      socket.off("userLeft");
      socket.off("renameChannel");
      socket.off("updateUserName");
      socket.off("privateMessage");
      socket.off("error");
    };
  }, [currentChannel]);

  useEffect(() => {
    socket.on("privateMessage", ({ sender, content }) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender, content: `[Privé] ${content}`, private: true },
      ]);
      toast.info(`Message privé de ${sender}`);
    });

    return () => {
      socket.off("privateMessage");
    };
  }, [messages]);

  function updateMessages(oldNickname, newNickname) {
    messages.forEach((msg) => {
      if (msg.sender === oldNickname) {
        msg.sender = newNickname;
      }
    });
    io.emit("messagesUpdated", messages);
  }

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 5000);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCommand = (e) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const args = trimmedInput.split(" ");
    const command = args[0].toLowerCase();

    const validateArgs = (requiredArgs, errorMessage) => {
      if (args.length < requiredArgs) {
        toast.error(errorMessage);
        return false;
      }
      return true;
    };

    const emitAndUpdate = (event, ...data) => {
      socket.emit(event, ...data, () => {
        socket.emit("listChannels");
        socket.emit("loadUsersInChannel", currentChannel);
      });
    };

    switch (command) {
      case "/deconnecte":
        socket.emit("disconnectUser");
        setTimeout(() => window.location.reload(), 500);
        break;

      case "/nick":
        if (validateArgs(2, "Le pseudo est requis avec la commande /nick")) {
          const newNick = args[1];
          socket.emit("setNickname", newNick);
          setNickname(newNick);
        }
        break;

      case "/list":
        socket.emit("listChannels");
        setShowChannelsList(true);
        setShowUsersList(false);
        break;

      case "/users":
        socket.emit("listUsersInChannel", currentChannel);
        setShowUsersList(true);
        setShowChannelsList(false);
        break;

      case "/close":
        setShowChannelsList(false);
        setShowUsersList(false);
        break;

      case "/create":
        if (
          validateArgs(2, "Le nom du canal est requis pour la commande /create")
        ) {
          emitAndUpdate("createChannel", args[1]);
        }
        break;
        
        case "/delete":
          if (args[1] && args[1] !== "general") {
            emitAndUpdate("deleteChannel", args[1]);
            setJoinedChannels((prev) =>
              prev.filter((ch) => ch !== args[1])
            );
            setCurrentChannel("general");
            socket.emit("switchChannel", "general");
          } else {
            toast.error('Vous ne pouvez pas supprimer le canal "general".');
          }
          break;
        

      case "/join":
        if (args[1] && !joinedChannels.includes(args[1])) {
          emitAndUpdate("joinChannel", args[1]);
          setJoinedChannels((prev) => [...prev, args[1]]);
          setCurrentChannel(args[1]);
        } else {
          toast.error(
            "Vous êtes déjà membre de ce canal ou le nom du canal est invalide."
          );
        }
        break;

      case "/quit":
        if (currentChannel !== "general") {
          emitAndUpdate("leaveChannel", currentChannel);
          setJoinedChannels((prev) =>
            prev.filter((ch) => ch !== currentChannel)
          );
          setCurrentChannel("general");
          setMessages([]);
        } else {
          toast.error('Vous ne pouvez pas quitter le canal "general".');
        }
        break;

      case "/switch":
        if (args[1] && joinedChannels.includes(args[1])) {
          setCurrentChannel(args[1]);
          setMessages([]);
          socket.emit("switchChannel", args[1]);
        } else {
          toast.error("Vous devez être membre du canal pour y accéder.");
        }
        break;

      case "/rename":
        if (validateArgs(2, "Veuillez entrer un nouveau pseudo.")) {
          const newUserName = args[1];
          if (newUserName !== nickname) {
            socket.emit("updateUserName", newUserName, (response) => {
              if (response.success) {
                setNickname(newUserName);
                setMessages((prevMessages) =>
                  prevMessages.map((msg) =>
                    msg.sender === nickname
                      ? { ...msg, sender: newUserName }
                      : msg
                  )
                );
                toast.success(
                  `Votre pseudo a été mis à jour en "${newUserName}"`
                );
              } else {
                toast.error(
                  response.message || "Erreur lors de la mise à jour du pseudo."
                );
              }
            });
          } else {
            toast.error("Vous avez déjà ce pseudo.");
          }
        }
        break;

      case "/update":
        if (args[1] === "-c" && args[2] && args[3]) {
          const oldChannelName = args[2];
          const newChannelName = args[3];
          if (channels.includes(oldChannelName)) {
            if (channels.includes(newChannelName)) {
              toast.error(`Le canal "${newChannelName}" existe déjà.`);
            } else {
              socket.emit(
                "renameChannel",
                oldChannelName,
                newChannelName,
                (response) => {
                  if (response.success) {
                    setChannels((prev) =>
                      prev.map((channel) =>
                        channel === oldChannelName ? newChannelName : channel
                      )
                    );
                    setJoinedChannels((prev) =>
                      prev.map((channel) =>
                        channel === oldChannelName ? newChannelName : channel
                      )
                    );
                    if (currentChannel === oldChannelName) {
                      setCurrentChannel(newChannelName);
                      setMessages([]);
                      socket.emit("loadMessages", { channel: newChannelName });
                    }
                    socket.emit("switchChannel", newChannelName);
                    toast.success(
                      `Le canal "${oldChannelName}" a été renommé en "${newChannelName}"`
                    );
                  } else {
                    toast.error(
                      response.message || "Erreur lors du renommage."
                    );
                  }
                }
              );
            }
          } else {
            toast.error("Le canal actuel n'existe pas.");
          }
        }
        break;

      case "/msg":
        if (args[1] === "-u" && args[2] && args[3] === "-m" && args[4]) {
          const receiver = args[2];
          const message = args.slice(4).join(" ");
          if (message.trim()) {
            socket.emit("sendPrivateMessage", receiver, message);
            toast.success(`Message envoyé à ${receiver}`);
          } else {
            toast.error("Le message ne peut pas être vide.");
          }
        } else {
          toast.error("La syntaxe correcte est /msg -u receiver -m message");
        }
        break;

      default:
        if (nickname && currentChannel) {
          socket.emit("sendMessage", currentChannel, input);
        } else {
          toast.error(
            "Vous devez définir un pseudo avec /nick avant de discuter."
          );
        }
    }

    setInput("");
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === "p") {
        event.preventDefault();
        setShowCommandModal((prev) => !prev);
      }

      if (suggestions.length > 0) {
        if (event.key === "ArrowDown") {
          setSelectedSuggestion((prev) =>
            prev === suggestions.length - 1 ? prev : prev + 1
          );
        } else if (event.key === "ArrowUp") {
          setSelectedSuggestion((prev) => (prev === 0 ? prev : prev - 1));
        } else if (event.key === "Enter") {
          setInput(suggestions[selectedSuggestion]);
          setSuggestions([]);
          setSelectedSuggestion(-1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [suggestions, selectedSuggestion]);

  if (isLoading) {
    return (
      <div className="loadingScreen">
        <LoadingScreen />
      </div>
    );
  } else {
    return (
      <div className="App">
        {!nickname ? (
          <div className="attentNickname">
            <svg
              width="457"
              height="64"
              viewBox="0 0 457 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M102.565 41.2823L81.7868 8.79004H70.5532V55.1654H80.0981V22.6731L100.877 55.1654H112.11V8.79004H102.565V41.2823Z"
                fill="white"
              />
              <path
                d="M120.018 17.7254H135.51V55.1654H145.422V17.7254H160.914V8.79004H120.018V17.7254Z"
                fill="white"
              />
              <path
                d="M200.46 27.3254H178.727V8.86389H168.815V55.2393H178.727V36.2608H200.46V55.2393H210.372V8.79004H200.46V27.3254Z"
                fill="white"
              />
              <path
                d="M232.406 17.7256H244.594C249.44 17.7256 252.01 19.4979 252.01 22.8948C252.01 26.2917 249.44 28.064 244.594 28.064H232.406V17.7256ZM261.922 22.9686C261.922 14.1809 255.534 8.86401 245.035 8.86401H222.494V55.2394H232.406V37.0732H243.42L253.332 55.2394H264.272L253.332 35.6702C258.838 33.5286 261.922 29.0979 261.922 22.9686Z"
                fill="white"
              />
              <path
                d="M292.209 46.6954C284.426 46.6954 279.654 41.1569 279.654 32.0738C279.654 22.8431 284.426 17.3046 292.209 17.3046C299.918 17.3046 304.617 22.8431 304.617 32.0738C304.617 41.1569 299.918 46.6954 292.209 46.6954ZM292.209 8C278.919 8 269.448 17.9692 269.448 32.0738C269.448 46.0308 278.846 56 292.209 56C305.425 56 314.823 46.0308 314.823 32.0738C314.823 17.9692 305.498 8 292.209 8Z"
                fill="white"
              />
              <path
                d="M346.175 29.3931H333.987V17.7254H346.175C351.021 17.7254 353.59 19.7193 353.59 23.5593C353.59 27.3993 351.094 29.3931 346.175 29.3931ZM346.615 8.79004H324.074V55.1654H333.987V38.4023H346.615C357.115 38.4023 363.502 32.8639 363.502 23.6331C363.502 14.4023 357.115 8.79004 346.615 8.79004Z"
                fill="white"
              />
              <path
                d="M430.501 39.6062C428.812 44.1108 425.361 46.6954 420.662 46.6954C412.879 46.6954 408.107 41.1569 408.107 32.0738C408.107 22.8431 412.879 17.3046 420.662 17.3046C425.361 17.3046 428.738 19.8892 430.501 24.3938H441C438.357 14.4246 430.647 8 420.662 8C407.372 8 397.901 17.9692 397.901 32.0738C397.901 46.0308 407.299 56 420.662 56C430.721 56 438.43 49.5015 441 39.6062H430.501Z"
                fill="white"
              />
              <path
                d="M367.497 8.79004L385.926 55.1654H395.985L377.556 8.79004H367.497Z"
                fill="white"
              />
              <path
                d="M33.4012 36.8516L39.7155 20.5316L46.0299 36.8516H33.4012ZM34.4291 8.79004L16 55.2393H26.2792L30.0237 45.4916H49.2605L53.005 55.2393H63.2842L44.9285 8.79004H34.4291Z"
                fill="white"
              />
            </svg>

            <p>Application for Chat Web (IRC)</p>
            <div className="InputElement">
              <div className="Nickname">
                <strong>~ :</strong>
              </div>
              <form onSubmit={handleCommand}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter your nickname with /nick [userName]..."
                />
              </form>
            </div>
          </div>
        ) : (
          <>
            <header>
              <LogoPicto />
              <div className="joinChannel">
                {joinedChannels.map((channel) => (
                  <button
                    key={channel}
                    onClick={() => {
                      setCurrentChannel(channel);
                      setMessages([]);
                      socket.emit("loadMessages", { channel });
                    }}
                  >
                    <div
                      className="actifBar"
                      style={{
                        borderColor:
                          currentChannel === channel ? "#37F18B" : "",
                      }}
                    ></div>
                    <p
                      style={{
                        color:
                          currentChannel === channel
                            ? "#FAF9F6E6"
                            : "#FAF9F680",
                      }}
                    >
                      {channel}
                    </p>
                  </button>
                ))}
              </div>
            </header>

            <div
              className={`containerMessage ${isListOpen ? "listActive" : ""}`}
            >
              {messages.map((msg, index) => (
                <div
                  className={`message ${
                    msg.sender === currentUser ? "myMessage" : "otherMessage"
                  } ${msg.private ? "privateMessage" : ""}`}
                  key={index}
                >
                  <h2>
                    @{msg.sender}
                    {msg.private && " (Privé)"}
                  </h2>
                  <p>{msg.content}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {showChannelsList && (
              <div className="channelList">
                <h3>Canaux disponibles</h3>
                <ul>
                  {channels.map((channel, index) => (
                    <li
                      key={channel}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {channel}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showUsersList && (
              <div className="userList">
                <h3>Utilisateurs actifs dans {currentChannel}</h3>
                <ul>
                  {users.map((user, index) => (
                    <li
                      key={user}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {user}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showCommandModal && (
              <div className="commandModal">
                <ul>
                  {commandList.map((cmd, index) => (
                    <li
                      key={index}
                      onClick={() => {
                        setInput(cmd.command + " ");
                        setShowCommandModal(false);
                      }}
                    >
                      <strong>{cmd.command}</strong>
                      <p>{cmd.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {suggestions.length > 0 && (
              <ul className="suggestions">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    className={selectedSuggestion === index ? "selected" : ""}
                    onClick={() => setInput(suggestion + " ")}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}

            <div className="InputElement">
              <div className="Nickname">
                <div>
                  <strong>~ :</strong> {nickname}
                </div>
                <div className="commndList">
                  <svg
                    className="commdSvg"
                    width="81"
                    height="27"
                    viewBox="0 0 81 27"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6.444 14.688C6.444 14.008 6.58 13.412 6.852 12.9C7.132 12.38 7.516 11.98 8.004 11.7C8.492 11.42 9.052 11.28 9.684 11.28C10.484 11.28 11.144 11.472 11.664 11.856C12.192 12.232 12.548 12.772 12.732 13.476H11.256C11.136 13.148 10.944 12.892 10.68 12.708C10.416 12.524 10.084 12.432 9.684 12.432C9.124 12.432 8.676 12.632 8.34 13.032C8.012 13.424 7.848 13.976 7.848 14.688C7.848 15.4 8.012 15.956 8.34 16.356C8.676 16.756 9.124 16.956 9.684 16.956C10.476 16.956 11 16.608 11.256 15.912H12.732C12.54 16.584 12.18 17.12 11.652 17.52C11.124 17.912 10.468 18.108 9.684 18.108C9.052 18.108 8.492 17.968 8.004 17.688C7.516 17.4 7.132 17 6.852 16.488C6.58 15.968 6.444 15.368 6.444 14.688ZM15.6913 12.504V16.164C15.6913 16.412 15.7473 16.592 15.8593 16.704C15.9793 16.808 16.1793 16.86 16.4593 16.86H17.2993V18H16.2193C15.6033 18 15.1313 17.856 14.8033 17.568C14.4753 17.28 14.3113 16.812 14.3113 16.164V12.504H13.5313V11.388H14.3113V9.744H15.6913V11.388H17.2993V12.504H15.6913ZM19.9282 12.348C20.1282 12.012 20.3922 11.752 20.7202 11.568C21.0562 11.376 21.4522 11.28 21.9082 11.28V12.696H21.5602C21.0242 12.696 20.6162 12.832 20.3362 13.104C20.0642 13.376 19.9282 13.848 19.9282 14.52V18H18.5602V11.388H19.9282V12.348ZM24.5336 9.12V18H23.1656V9.12H24.5336Z"
                      fill="#AEABD8"
                    />
                    <path
                      d="M43.344 14.244H40.92V16.728H39.648V14.244H37.224V13.092H39.648V10.608H40.92V13.092H43.344V14.244Z"
                      fill="#AEABD8"
                    />
                    <rect
                      x="0.5"
                      y="0.5"
                      width="31"
                      height="26"
                      rx="7.5"
                      stroke="#8C89B4"
                      stroke-opacity="0.5"
                    />
                    <path
                      d="M67.732 12.144C67.732 12.568 67.632 12.968 67.432 13.344C67.232 13.72 66.912 14.028 66.472 14.268C66.032 14.5 65.468 14.616 64.78 14.616H63.268V18H61.9V9.66H64.78C65.42 9.66 65.96 9.772 66.4 9.996C66.848 10.212 67.18 10.508 67.396 10.884C67.62 11.26 67.732 11.68 67.732 12.144ZM64.78 13.5C65.3 13.5 65.688 13.384 65.944 13.152C66.2 12.912 66.328 12.576 66.328 12.144C66.328 11.232 65.812 10.776 64.78 10.776H63.268V13.5H64.78Z"
                      fill="#AEABD8"
                    />
                    <rect
                      x="49.5"
                      y="0.5"
                      width="31"
                      height="26"
                      rx="7.5"
                      stroke="#8C89B4"
                      stroke-opacity="0.5"
                    />
                  </svg>

                  <p>for list commands</p>
                </div>
              </div>
              <form onSubmit={handleCommand}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Entrez une commande ou un message..."
                />
              </form>
            </div>
          </>
        )}

        <ToastContainer />
      </div>
    );
  }
};

export default App;
