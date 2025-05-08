const express = require('express');
const path = require('path');
// Rimuove express-session e aggiunge JWT
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const app = express();
const port = 3000;

// Socket.IO setup
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// Chiave segreta per JWT - dovrebbe essere in variabili d'ambiente
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Importa DBMock anziché SQLite
const DBMock = require('./DBMock');
const db = new DBMock();


const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

//dipendenze swagger
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');

// Configura Swagger con il file JSON
const swaggerDocument = {
  "openapi": "3.0.0",
  "info": {
    "title": "API di PFarmacy",
    "version": "1.0.0",
    "description": "Documentazione API per l'app di gestione utenti e farmacia"
  },
  "servers": [
    {
      "url": `http://localhost:${port}`,
      "description": "Server di sviluppo"
    }
  ],
  "tags": [
    {
      "name": "Autenticazione",
      "description": "Operazioni relative all'autenticazione"
    },
    {
      "name": "Utenti",
      "description": "Operazioni di gestione utenti"
    },
    {
      "name": "Eventi",
      "description": "Operazioni relative agli eventi del calendario"
    },
    {
      "name": "Chat",
      "description": "Operazioni relative alla chat tra utenti e admin"
    }
  ],
  "paths": {
    "/api/check-auth": {
      "get": {
        "summary": "Verifica l'autenticazione dell'utente",
        "tags": ["Autenticazione"],
        "responses": {
          "200": {
            "description": "Stato di autenticazione dell'utente",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "isAuthenticated": {
                      "type": "boolean",
                      "description": "Indica se l'utente è autenticato"
                    },
                    "role": {
                      "type": "string",
                      "description": "Ruolo dell'utente autenticato (solo se autenticato)",
                      "enum": ["admin", "user"]
                    },
                    "nome": {
                      "type": "string",
                      "description": "Nome dell'utente autenticato (solo se autenticato)"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/logout": {
      "post": {
        "summary": "Effettua il logout dell'utente",
        "tags": ["Autenticazione"],
        "responses": {
          "200": {
            "description": "Logout effettuato con successo, reindirizza alla pagina principale"
          }
        }
      }
    },
    "/login": {
      "post": {
        "summary": "Effettua il login di un utente",
        "tags": ["Autenticazione"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["email", "password"],
                "properties": {
                  "email": {
                    "type": "string",
                    "format": "email",
                    "example": "utente@example.com"
                  },
                  "password": {
                    "type": "string",
                    "format": "password",
                    "example": "password123"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Risposta alla richiesta di login",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "token": {
                      "type": "string",
                      "description": "JWT token per l'autenticazione"
                    },
                    "redirectPage": {
                      "type": "string",
                      "description": "URL di reindirizzamento in caso di successo"
                    },
                    "message": {
                      "type": "string",
                      "description": "Messaggio di errore in caso di fallimento"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/auth/google": {
      "get": {
        "summary": "Inizia il processo di autenticazione tramite Google",
        "tags": ["Autenticazione"],
        "responses": {
          "302": {
            "description": "Reindirizza alla pagina di autorizzazione di Google"
          }
        }
      }
    },
    "/auth/google/callback": {
      "get": {
        "summary": "Callback per l'autenticazione Google",
        "tags": ["Autenticazione"],
        "parameters": [
          {
            "name": "code",
            "in": "query",
            "description": "Codice di autorizzazione da Google",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "302": {
            "description": "Reindirizza alla pagina appropriata in base al ruolo dell'utente"
          }
        }
      }
    },
    "/update-password": {
      "post": {
        "summary": "Aggiorna la password dell'utente",
        "tags": ["Utenti"],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["currentPassword", "newPassword"],
                "properties": {
                  "currentPassword": {
                    "type": "string",
                    "description": "Password attuale dell'utente",
                    "example": "password123"
                  },
                  "newPassword": {
                    "type": "string",
                    "description": "Nuova password dell'utente",
                    "example": "nuovaPassword456"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Password aggiornata con successo",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "message": {
                      "type": "string",
                      "example": "Password aggiornata con successo."
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Password attuale non corretta",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": false
                    },
                    "message": {
                      "type": "string",
                      "example": "La password attuale non è corretta."
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Utente non trovato",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": false
                    },
                    "message": {
                      "type": "string",
                      "example": "Utente non trovato."
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/utentii": {
      "get": {
        "summary": "Ottieni la lista degli utenti con filtri opzionali",
        "tags": ["Utenti"],
        "parameters": [
          {
            "name": "eta",
            "in": "query",
            "description": "Filtra gli utenti in base all'età",
            "schema": {
              "type": "string",
              "enum": ["max20", "min21"]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Lista degli utenti",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "users": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/User"
                      }
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Errore del server"
          }
        }
      },
      "post": {
        "summary": "Registra un nuovo utente",
        "tags": ["Utenti"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/NewUser"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Utente registrato con successo",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string",
                      "example": "Registrazione avvenuta con successo"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Richiesta non valida",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Tutti i campi sono obbligatori"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Errore del server",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Errore durante la registrazione"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/utentii/{id}": {
      "get": {
        "summary": "Ottiene un utente specifico per ID",
        "tags": ["Utenti"],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "ID dell'utente",
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Dettagli dell'utente",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/User"
                }
              }
            }
          },
          "404": {
            "description": "Utente non trovato",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Utente non trovato"
                    }
                  }
                }
              }
            }
          }
        }
      },
      "put": {
        "summary": "Aggiorna un utente esistente",
        "tags": ["Utenti"],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "ID dell'utente da aggiornare",
            "schema": {
              "type": "integer"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UserUpdate"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Utente aggiornato con successo",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "user": {
                      "$ref": "#/components/schemas/User"
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Utente non trovato",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Utente non trovato"
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "summary": "Elimina un utente",
        "tags": ["Utenti"],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "ID dell'utente da eliminare",
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Utente eliminato con successo",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Utente non trovato",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Utente non trovato"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/events": {
      "get": {
        "summary": "Ottiene gli eventi del calendario",
        "tags": ["Eventi"],
        "responses": {
          "200": {
            "description": "Lista degli eventi",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/Event"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/chat/messages/{userId}": {
      "get": {
        "summary": "Ottiene i messaggi tra l'utente corrente e un altro utente",
        "tags": ["Chat"],
        "parameters": [
          {
            "name": "userId",
            "in": "path",
            "required": true,
            "description": "ID dell'utente con cui recuperare i messaggi",
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Lista dei messaggi",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/Message"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/chat/users": {
      "get": {
        "summary": "Ottiene la lista degli utenti disponibili per la chat",
        "tags": ["Chat"],
        "responses": {
          "200": {
            "description": "Lista degli utenti disponibili",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/ChatUser"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/chat": {
      "get": {
        "summary": "Pagina di chat dell'applicazione",
        "tags": ["Chat"],
        "responses": {
          "200": {
            "description": "Pagina HTML della chat"
          },
          "302": {
            "description": "Reindirizzamento alla pagina di login se non autenticato"
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "description": "ID univoco dell'utente"
          },
          "nome": {
            "type": "string",
            "description": "Nome dell'utente"
          },
          "cognome": {
            "type": "string",
            "description": "Cognome dell'utente"
          },
          "email": {
            "type": "string",
            "format": "email",
            "description": "Email dell'utente"
          },
          "ruolo": {
            "type": "string",
            "enum": ["admin", "user"],
            "description": "Ruolo dell'utente nel sistema"
          },
          "sesso": {
            "type": "string",
            "enum": ["M", "F"],
            "description": "Genere dell'utente"
          },
          "eta": {
            "type": "integer",
            "description": "Età dell'utente"
          }
        }
      },
      "NewUser": {
        "type": "object",
        "required": ["nome", "cognome", "email", "password", "sesso", "eta"],
        "properties": {
          "nome": {
            "type": "string",
            "description": "Nome dell'utente",
            "example": "Mario"
          },
          "cognome": {
            "type": "string",
            "description": "Cognome dell'utente",
            "example": "Rossi"
          },
          "email": {
            "type": "string",
            "format": "email",
            "description": "Email dell'utente",
            "example": "mario.rossi@example.com"
          },
          "password": {
            "type": "string",
            "description": "Password dell'utente",
            "example": "password123"
          },
          "sesso": {
            "type": "string",
            "enum": ["M", "F"],
            "description": "Genere dell'utente",
            "example": "M"
          },
          "eta": {
            "type": "integer",
            "description": "Età dell'utente",
            "example": 35
          }
        }
      },
      "UserUpdate": {
        "type": "object",
        "properties": {
          "nome": {
            "type": "string",
            "description": "Nome dell'utente"
          },
          "cognome": {
            "type": "string",
            "description": "Cognome dell'utente"
          },
          "email": {
            "type": "string",
            "format": "email",
            "description": "Email dell'utente"
          },
          "password": {
            "type": "string",
            "description": "Password dell'utente"
          },
          "sesso": {
            "type": "string",
            "enum": ["M", "F"],
            "description": "Genere dell'utente"
          },
          "eta": {
            "type": "integer",
            "description": "Età dell'utente"
          }
        }
      },
      "Event": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string",
            "description": "Titolo dell'evento",
            "example": "Visita Medica"
          },
          "start": {
            "type": "string",
            "format": "date-time",
            "description": "Data e ora di inizio dell'evento",
            "example": "2024-12-14T10:00:00"
          },
          "end": {
            "type": "string",
            "format": "date-time",
            "description": "Data e ora di fine dell'evento",
            "example": "2024-12-14T11:00:00"
          },
          "description": {
            "type": "string",
            "description": "Descrizione dell'evento",
            "example": "Visita di controllo generale"
          }
        }
      },
      "Message": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "description": "ID univoco del messaggio"
          },
          "senderId": {
            "type": "string",
            "description": "ID dell'utente che ha inviato il messaggio"
          },
          "recipientId": {
            "type": "string",
            "description": "ID dell'utente che ha ricevuto il messaggio"
          },
          "content": {
            "type": "string",
            "description": "Contenuto del messaggio"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time",
            "description": "Data e ora di invio del messaggio"
          }
        }
      },
      "ChatUser": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "ID univoco dell'utente"
          },
          "nome": {
            "type": "string",
            "description": "Nome dell'utente"
          },
          "cognome": {
            "type": "string",
            "description": "Cognome dell'utente"
          },
          "connected": {
            "type": "boolean",
            "description": "Indica se l'utente è attualmente online"
          }
        }
      }
    },
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Autenticazione basata su JWT"
      }
    }
  }
};

// Usa direttamente il documento JSON per Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Aggiungiamo il middleware cookie-parser

// **Configurazione Handlebars come view engine**
const hbs = require('hbs');
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'public')); // Assicurati che le tue pagine .hbs siano nella cartella 'public'

// Registra l'helper eq per le comparazioni in Handlebars
hbs.registerHelper('eq', function (a, b) {
  return a === b;
});

// Aggiungi questa importazione all'inizio del file
const session = require('express-session');

// Aggiungi questo PRIMA di passport.initialize()
app.use(session({
  secret: process.env.SESSION_SECRET || 'temporary-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60000 // breve durata, solo per il processo di autenticazione
  }
}));

// Poi inizializza Passport (lascia queste righe così come sono)
app.use(passport.initialize());

// Servire i file statici dalla cartella 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Mappa delle connessioni socket attive
const socketConnections = new Map();

// Setup Socket.IO con autenticazione basata su JWT
// Replace the Socket.IO setup section in server.js with this improved version

// Socket.IO setup with better authentication
// Modifica questa parte nel server.js
io.use((socket, next) => {
  try {
    // Ottieni il token dal cookie o dall'auth
    let token = null;
    
    // Prova a ottenere il token dall'auth
    if (socket.handshake.auth && socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
      console.log("Token trovato in auth");
    } 
    // Prova a ottenere il token dai cookie
    else if (socket.handshake.headers.cookie) {
      const cookies = socket.handshake.headers.cookie.split(';');
      const jwtCookie = cookies.find(c => c.trim().startsWith('jwt='));
      if (jwtCookie) {
        token = jwtCookie.split('=')[1];
        console.log("Token trovato nei cookie");
      }
    }
    
    if (!token) {
      console.log("Socket auth fallita: Nessun token");
      // Passa comunque alla prossima fase per debugging
      socket.user = { id: 'anonymous', nome: 'Anonimo', ruolo: 'guest' };
      console.log("Utente anonimo creato per debugging");
      return next();
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    console.log(`Socket autenticato per l'utente: ${decoded.id} (${decoded.nome})`);
    next();
  } catch (err) {
    console.log("Socket auth fallita:", err.message);
    // Per debugging, procedere comunque
    socket.user = { id: 'error', nome: 'Error', ruolo: 'guest' };
    console.log("Utente error creato per debugging");
    next();
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.id} (${socket.user.nome} - ${socket.user.ruolo})`);
  
  // Store socket connection with consistent string ID
  const userId = String(socket.user.id);
  socketConnections.set(userId, socket);
  
  // Set user as online
  db.setUserOnlineStatus(userId, true);
  
  // Broadcast user status to all clients - CORREGGI QUI
  io.emit('users_status', db.getAllUsersStatus());
  
  // Handle private messages
  socket.on('send_message', (message) => {
    // Ensure IDs are strings for consistency
    const senderId = String(socket.user.id);
    const recipientId = String(message.recipientId);
    
    console.log(`Message from ${senderId} (${socket.user.nome}) to ${recipientId}: ${message.content}`);
    
    // Save message to database
    const savedMessage = db.addMessage(
      senderId, 
      recipientId, 
      message.content
    );
    
    // Add sender info to message
    const messageToSend = {
      ...savedMessage,
      senderName: `${socket.user.nome} ${socket.user.cognome || ''}`
    };
    
    // Send confirmation to sender
    socket.emit('private_message', savedMessage);
    
    // Find recipient socket
    const recipientSocket = socketConnections.get(recipientId);
    
    // Send to recipient if online
    if (recipientSocket) {
      console.log(`Delivering message to recipient ${recipientId}`);
      recipientSocket.emit('private_message', messageToSend);
    } else {
      console.log(`Recipient ${recipientId} is offline, message saved in DB only`);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    const userId = String(socket.user.id);
    console.log(`User disconnected: ${userId} (${socket.user.nome})`);
    
    // Remove socket connection
    socketConnections.delete(userId);
    
    // Set user as offline
    db.setUserOnlineStatus(userId, false);
    
    // Broadcast updated user status - CORREGGI QUI
    io.emit('users_status', db.getAllUsersStatus());
  });
});

app.get('/api/test/socket', (req, res) => {
  try {
    const socketStatus = {
      serverRunning: true,
      socketConnectionsCount: socketConnections.size,
      socketConnectionsIds: Array.from(socketConnections.keys()),
      dbImplemented: {
        setUserOnlineStatus: typeof db.setUserOnlineStatus === 'function',
        getAllUsersStatus: typeof db.getAllUsersStatus === 'function',
        addMessage: typeof db.addMessage === 'function',
        getMessagesBetweenUsers: typeof db.getMessagesBetweenUsers === 'function',
        getUserOnlineStatus: typeof db.getUserOnlineStatus === 'function',
        getChatUsers: typeof db.getChatUsers === 'function'
      }
    };
    
    // Prova a vedere cosa restituisce getChatUsers per admin e user
    try {
      socketStatus.chatUsersForAdmin = db.getChatUsers ? db.getChatUsers('admin', 1) : "function not implemented";
      socketStatus.chatUsersForUser = db.getChatUsers ? db.getChatUsers('user', 2) : "function not implemented";
    } catch (e) {
      socketStatus.chatUsersFunctionError = e.message;
    }
    
    res.json({
      success: true,
      status: socketStatus
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Mantieni solo questo handler socket.io:
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.id} (${socket.user.nome} - ${socket.user.ruolo})`);
  
  // Store socket connection with consistent string ID
  const userId = String(socket.user.id);
  socketConnections.set(userId, socket);
  
  // Set user as online
  db.setUserOnlineStatus(userId, true);
  
  // Broadcast user status to all clients
  io.emit('users_status', db.getAllUsersStatus());
  
  // Handle private messages
  socket.on('send_message', (message) => {
    // Ensure IDs are strings for consistency
    const senderId = String(socket.user.id);
    const recipientId = String(message.recipientId);
    
    console.log(`Message from ${senderId} (${socket.user.nome}) to ${recipientId}: ${message.content}`);
    
    // Save message to database
    const savedMessage = db.addMessage(
      senderId, 
      recipientId, 
      message.content
    );
    
    // Add sender info to message
    const messageToSend = {
      ...savedMessage,
      senderName: `${socket.user.nome} ${socket.user.cognome || ''}`
    };
    
    // Send confirmation to sender
    socket.emit('private_message', savedMessage);
    
    // Find recipient socket
    const recipientSocket = socketConnections.get(recipientId);
    
    // Send to recipient if online
    if (recipientSocket) {
      console.log(`Delivering message to recipient ${recipientId}`);
      recipientSocket.emit('private_message', messageToSend);
    } else {
      console.log(`Recipient ${recipientId} is offline, message saved in DB only`);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    const userId = String(socket.user.id);
    console.log(`User disconnected: ${userId} (${socket.user.nome})`);
    
    // Remove socket connection
    socketConnections.delete(userId);
    
    // Set user as offline
    db.setUserOnlineStatus(userId, false);
    
    // Broadcast updated user status
    io.emit('users_status', db.getAllUsersStatus());
  });
});

// Funzione di utilità per generare il token JWT
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      ruolo: user.ruolo,
      nome: user.nome,
      cognome: user.cognome
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Il token scade dopo 7 giorni
  );
}

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/google/callback' // URL assoluto
}, (accessToken, refreshToken, profile, done) => {
  // Il resto del codice rimane invariato
  try {
    // Crea un utente di base dal profilo Google
    const user = {
      id: profile.id,
      nome: profile.name.givenName || profile.displayName,
      cognome: profile.name.familyName || '',
      email: profile.emails[0].value,
      ruolo: profile.emails[0].value.endsWith('@admin') ? 'admin' : 'user'
    };
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Manteniamo queste funzioni per compatibilità con Passport Google
// Assicurati che questi metodi siano presenti
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = db.getUserById(id) || { id }; // Fallback se l'utente non è nel DB
  done(null, user);
});

// Nuovo middleware per verificare il token JWT
function verifyToken(req, res, next) {
  // Ottieni il token dall'header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato Bearer TOKEN

  // Controlla anche se il token è nei cookie
  const cookieToken = req.cookies?.jwt;

  // Usa il token dall'header o dal cookie
  const finalToken = token || cookieToken;

  if (!finalToken) {
    if (req.path === '/api/check-auth') {
      // Per le richieste API, restituisci uno stato 401 invece di reindirizzare
      return res.status(401).json({ isAuthenticated: false });
    }
    // Per le pagine web, reindirizza alla homepage
    return res.redirect('/');
  }

  jwt.verify(finalToken, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('Verifica del token fallita:', err.message);
      if (req.path === '/api/check-auth') {
        // Per le richieste API, restituisci uno stato 401 invece di reindirizzare
        return res.status(401).json({ isAuthenticated: false });
      }
      // Per le pagine web, reindirizza alla homepage
      return res.redirect('/');
    }

    // Imposta l'utente nella richiesta
    req.user = decoded;
    next();
  });
}

// Middleware per verificare se l'utente è admin
function ensureAdmin(req, res, next) {
  if (!req.user) {
    console.log('Utente non autenticato');
    return res.redirect('/');
  }

  if (req.user.ruolo === 'admin') {
    console.log('Utente admin autenticato');
    return next();
  }

  console.log('Accesso admin negato');
  res.status(403).json({ error: 'Accesso negato' });
}

// Utility per ottenere le iniziali da un nome
function getInitials(name) {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

// Rotte per il login tramite Google
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/'
}), (req, res) => {
  // Genera un token JWT per l'utente autenticato
  const token = generateToken(req.user);

  // Imposta il token in un cookie HTTP-only per sicurezza
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 giorni
  });

  console.log('Login Google completato per:', req.user.email);

  // Reindirizza in base al ruolo
  const redirectPage = req.user.ruolo === 'admin' ? '/admin' : '/paziente';
  res.redirect(redirectPage);
});

// Route principale (login page)
app.get('/', (req, res) => {
  // Verifica se l'utente ha un token JWT valido
  const token = req.cookies?.jwt;

  if (token) {
    // Verifica il token
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err) {
        // Token valido, reindirizza in base al ruolo
        const redirectPage = decoded.ruolo === 'admin' ? '/admin' : '/paziente';
        return res.redirect(redirectPage);
      }
      // Se la verifica del token fallisce, serve la pagina di login
    });
  }

  // Serve la pagina di login per gli utenti non autenticati
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route per la pagina paziente (protetta)
app.get('/paziente', verifyToken, (req, res) => {
  // Renderizza paziente.hbs con i dati dell'utente
  res.render('paziente', { patient: { nome: req.user.nome, cognome: req.user.cognome || '' } });
});

// Route per la pagina admin (protetta)
app.get('/admin', verifyToken, ensureAdmin, (req, res) => {
  // Renderizza admin.hbs con i dati dell'admin e tutti gli utenti
  res.render('admin', { admin: { nome: req.user.nome }, users: db.getAllUsers() });
});

// Route per la pagina dati utente (protetta)
app.get('/dati', verifyToken, (req, res) => {
  // Ottieni i dati completi dell'utente dal database usando l'ID nel token
  const user = db.getUserById(req.user.id);
  console.log('Renderizzazione pagina dati per:', user.nome);

  // Renderizza dati.hbs con i dati dell'utente
  res.render('dati', { user: user });
});

// Route per la pagina chat (protetta)
app.get('/chat', verifyToken, (req, res) => {
  // Renderizza la pagina di chat con i dati dell'utente
  const isAdmin = req.user.ruolo === 'admin';

  res.render('chat', {
    userId: req.user.id,
    userName: req.user.nome,
    userSurname: req.user.cognome || '',
    userRole: req.user.ruolo,
    userInitials: getInitials(req.user.nome),
    isAdmin: isAdmin
  });
});

// API per controllare l'autenticazione
app.get('/api/check-auth', (req, res) => {
  const token = req.cookies?.jwt || (req.headers['authorization']?.split(' ')[1]);

  if (!token) {
    return res.status(200).json({ isAuthenticated: false });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.status(200).json({
      isAuthenticated: true,
      role: decoded.ruolo,
      nome: decoded.nome
    });
  } catch (err) {
    console.log('Token di autenticazione non valido:', err.message);
    return res.status(200).json({ isAuthenticated: false });
  }
});

// API per il logout
app.post('/logout', (req, res) => {
  // Cancella il cookie JWT
  res.clearCookie('jwt');

  // Reindirizza alla homepage
  res.redirect('/');
});

// Replace the chat API routes in server.js with these improved versions

// Rimuovi questa linea poiché ora la funzionalità è integrata in DBMock
// const DBMockChat = require('./DBMockChat');
// const chatDb = new DBMockChat();

// Poi aggiorna tutte le referenze a chatDb con db:

// Esempio:
// Invece di:
// chatDb.addMessage(senderId, recipientId, content);
// Usa:
// db.addMessage(senderId, recipientId, content);



// API per gli utenti chat - versione di debug avanzata
app.get('/api/chat/users', verifyToken, (req, res) => {
  try {
      console.log('------------------------------------');
      console.log('RICHIESTA UTENTI CHAT');
      console.log('Utente:', req.user.nome, req.user.id, req.user.ruolo);
      
      // Log tutti gli utenti nel database
      const allUsers = db.getAllUsers();
      console.log('Tutti gli utenti nel DB:', allUsers.length);
      allUsers.forEach(u => console.log(`- ${u.id}: ${u.nome} (${u.ruolo})`));
      
      let chatUsers = [];
      
      if (req.user.ruolo === 'admin') {
          // Admin vede tutti gli utenti normali
          chatUsers = db.getAllUsers()
              .filter(user => user.ruolo === 'user')
              .map(user => ({
                  id: String(user.id),
                  nome: user.nome || 'Utente',
                  cognome: user.cognome || '',
                  connected: false
              }));
          console.log(`Admin: restituisco ${chatUsers.length} pazienti`);
      } else {
          // Utente normale vede solo gli admin
          chatUsers = db.getAllUsers()
              .filter(user => user.ruolo === 'admin')
              .map(user => ({
                  id: String(user.id),
                  nome: user.nome || 'Admin',
                  cognome: user.cognome || '',
                  connected: false
              }));
          console.log(`Utente: restituisco ${chatUsers.length} admin`);
      }
      
      console.log('Utenti chat trovati:', chatUsers);
      console.log('------------------------------------');
      
      return res.json(chatUsers);
  } catch (error) {
      console.error('ERRORE API CHAT USERS:', error);
      return res.status(500).json({ error: 'Errore nel recupero degli utenti' });
  }
});
// Aggiorna l'API per i messaggi chat:
app.get('/api/chat/messages/:userId', verifyToken, (req, res) => {
  const currentUserId = String(req.user.id);
  const otherUserId = String(req.params.userId);

  console.log(`Messages requested between ${currentUserId} and ${otherUserId}`);

  // Get messages between the two users
  const messages = db.getMessagesBetweenUsers(currentUserId, otherUserId);

  console.log(`Returning ${messages.length} messages`);
  res.json(messages);
});

// API per ottenere la lista degli utenti con filtri opzionali
app.get('/utentii', (req, res) => {
  const { eta } = req.query;

  // Ottieni tutti gli utenti
  let users = db.getAllUsers();

  // Filtra in base all'età se necessario
  if (eta === 'max20') {
    users = users.filter(user => user.eta <= 20);
  } else if (eta === 'min21') {
    users = users.filter(user => user.eta > 20);
  }

  res.json({ users });
});

// API per ottenere un utente specifico per ID
app.get('/utentii/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = db.getUserById(userId);

  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: 'Utente non trovato' });
  }
});

// API per registrare un nuovo utente
app.post('/utentii', (req, res) => {
  console.log('Dati ricevuti per registrazione:', req.body);
  const { nome, cognome, email, password, sesso, eta } = req.body;

  if (!nome || !cognome || !email || !password || !sesso || !eta) {
    console.error('Errore: campi mancanti');
    return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
  }

  try {
    const newUser = db.createUser({ nome, cognome, email, password, sesso, eta });
    res.status(201).json({ message: 'Registrazione avvenuta con successo' });
  } catch (error) {
    console.error('Errore durante la registrazione:', error);
    res.status(500).json({ error: 'Errore durante la registrazione' });
  }
});

// API per aggiornare un utente esistente
app.put('/utentii/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const updates = req.body;

  const updatedUser = db.updateUser(userId, updates);
  if (updatedUser) {
    res.json({ success: true, user: updatedUser });
  } else {
    res.status(404).json({ error: 'Utente non trovato' });
  }
});

// API per eliminare un utente
app.delete('/utentii/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const success = db.deleteUser(userId);

  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Utente non trovato' });
  }
});

// API per il login di un utente - restituisce JWT
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const result = db.verifyCredentials(email, password);

  if (result.success) {
    // Genera il token JWT
    const token = generateToken(result.user);

    // Imposta il token in un cookie HTTP-only
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 giorni
    });

    // Restituisce anche il token nella risposta per i client API
    const redirectPage = result.user.ruolo === 'admin' ? '/admin' : '/paziente';
    res.json({
      success: true,
      token: token,
      redirectPage
    });
  } else {
    console.log('Login fallito:', result.message);
    res.json({
      success: false,
      message: result.message
    });
  }
});

// API per ottenere gli eventi del calendario
app.get('/events', (req, res) => {
  // Esempio di eventi statici
  const events = [
    {
      title: 'Visita Medica',
      start: '2024-12-14T10:00:00',
      end: '2024-12-14T11:00:00',
      description: 'Visita di controllo generale'
    },
    {
      title: 'Check-up Fisico',
      start: '2024-12-15T09:00:00',
      end: '2024-12-15T10:00:00',
      description: 'Visita di controllo cardiaco'
    }
  ];

  res.json(events);
});

// API per aggiornare la password dell'utente
app.post('/update-password', verifyToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  console.log('Tentativo di aggiornamento password per utente ID:', userId);

  const user = db.getUserById(userId);
  if (!user) {
    console.log('Utente non trovato per ID:', userId);
    return res.status(404).json({ success: false, message: 'Utente non trovato.' });
  }

  if (user.password === currentPassword) { // In un sistema reale, usa l'hashing
    const updatedUser = db.updateUser(userId, { password: newPassword });
    if (updatedUser) {
      console.log('Password aggiornata con successo per:', user.email);
      return res.json({ success: true, message: 'Password aggiornata con successo.' });
    } else {
      console.log('Errore durante l\'aggiornamento della password');
      return res.status(500).json({ success: false, message: 'Errore durante l\'aggiornamento della password.' });
    }
  } else {
    console.log('Password attuale non corretta');
    return res.status(401).json({ success: false, message: 'La password attuale non è corretta.' });
  }
});

// API per gli eventi del calendario - NUOVA IMPLEMENTAZIONE
// Aggiungi questo codice al tuo server.js prima dell'avvio del server

// GET: Ottiene tutti gli eventi del calendario per l'utente corrente
app.get('/api/calendar-events', verifyToken, (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Richiesta eventi calendario per utente ID: ${userId}`);
    
    // Recupera gli eventi dal database per l'utente specificato
    const events = db.getCalendarEvents(userId);
    
    console.log(`Restituiti ${events.length} eventi per l'utente`);
    res.json(events);
  } catch (error) {
    console.error('Errore nel recupero degli eventi calendario:', error);
    res.status(500).json({ error: 'Errore nel recupero degli eventi' });
  }
});

// POST: Crea un nuovo evento calendario
app.post('/api/calendar-events', verifyToken, (req, res) => {
  try {
    const userId = req.user.id;
    const eventData = req.body;
    
    console.log(`Creazione nuovo evento per utente ID: ${userId}`, eventData);
    
    // Assicurati che l'evento contenga i dati minimi necessari
    if (!eventData.title || !eventData.start) {
      return res.status(400).json({ error: 'Titolo e data di inizio sono obbligatori' });
    }
    
    // Aggiungi l'ID utente all'evento
    eventData.userId = userId;
    
    // Salva l'evento nel database
    const savedEvent = db.addCalendarEvent(eventData);
    
    console.log(`Evento salvato con ID: ${savedEvent.id}`);
    res.json(savedEvent);
  } catch (error) {
    console.error('Errore nel salvare l\'evento calendario:', error);
    res.status(500).json({ error: 'Errore nel salvare l\'evento' });
  }
});

// PUT: Aggiorna un evento esistente
app.put('/api/calendar-events/:id', verifyToken, (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    const eventData = req.body;
    
    console.log(`Aggiornamento evento ID: ${eventId} per utente ID: ${userId}`);
    
    // Verifica che l'evento esista e appartenga all'utente
    const event = db.getCalendarEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Evento non trovato' });
    }
    
    if (String(event.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Non hai il permesso di modificare questo evento' });
    }
    
    // Aggiorna l'evento
    const updatedEvent = db.updateCalendarEvent(eventId, eventData);
    
    console.log(`Evento ${eventId} aggiornato con successo`);
    res.json(updatedEvent);
  } catch (error) {
    console.error('Errore nell\'aggiornare l\'evento calendario:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornare l\'evento' });
  }
});

// DELETE: Elimina un evento
app.delete('/api/calendar-events/:id', verifyToken, (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    
    console.log(`Eliminazione evento ID: ${eventId} per utente ID: ${userId}`);
    
    // Verifica che l'evento esista e appartenga all'utente
    const event = db.getCalendarEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Evento non trovato' });
    }
    
    if (String(event.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Non hai il permesso di eliminare questo evento' });
    }
    
    // Elimina l'evento
    const success = db.deleteCalendarEvent(eventId);
    
    if (success) {
      console.log(`Evento ${eventId} eliminato con successo`);
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Errore nell\'eliminare l\'evento' });
    }
  } catch (error) {
    console.error('Errore nell\'eliminare l\'evento calendario:', error);
    res.status(500).json({ error: 'Errore nell\'eliminare l\'evento' });
  }
});

// API per ottenere gli eventi del calendario
app.get('/events', verifyToken, (req, res) => {
  try {
    console.log('Richiesta eventi calendario per utente ID:', req.user.id);
    const events = db.getCalendarEvents(req.user.id);
    res.json(events);
  } catch (error) {
    console.error('Errore nel recupero degli eventi calendario:', error);
    // Fallback agli eventi statici in caso di errore
    const staticEvents = [
      {
        title: 'Visita Medica',
        start: '2024-12-14T10:00:00',
        end: '2024-12-14T11:00:00',
        description: 'Visita di controllo generale'
      },
      {
        title: 'Check-up Fisico',
        start: '2024-12-15T09:00:00',
        end: '2024-12-15T10:00:00',
        description: 'Visita di controllo cardiaco'
      }
    ];
    res.json(staticEvents);
  }
});

// GET: Ottiene tutti gli eventi del calendario per l'utente corrente
app.get('/api/calendar-events', verifyToken, (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Richiesta eventi calendario per utente ID: ${userId}`);
    
    // Recupera gli eventi dal database per l'utente specificato
    const events = db.getCalendarEvents(userId);
    
    console.log(`Restituiti ${events.length} eventi per l'utente`);
    res.json(events);
  } catch (error) {
    console.error('Errore nel recupero degli eventi calendario:', error);
    res.status(500).json({ error: 'Errore nel recupero degli eventi' });
  }
});

// POST: Crea un nuovo evento calendario
app.post('/api/calendar-events', verifyToken, (req, res) => {
  try {
    const userId = req.user.id;
    const eventData = req.body;
    
    console.log(`Creazione nuovo evento per utente ID: ${userId}`, eventData);
    
    // Assicurati che l'evento contenga i dati minimi necessari
    if (!eventData.title || !eventData.start) {
      return res.status(400).json({ error: 'Titolo e data di inizio sono obbligatori' });
    }
    
    // Aggiungi l'ID utente all'evento
    eventData.userId = userId;
    
    // Salva l'evento nel database
    const savedEvent = db.addCalendarEvent(eventData);
    
    console.log(`Evento salvato con ID: ${savedEvent.id}`);
    res.json(savedEvent);
  } catch (error) {
    console.error('Errore nel salvare l\'evento calendario:', error);
    res.status(500).json({ error: 'Errore nel salvare l\'evento' });
  }
});

// PUT: Aggiorna un evento esistente
app.put('/api/calendar-events/:id', verifyToken, (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    const eventData = req.body;
    
    console.log(`Aggiornamento evento ID: ${eventId} per utente ID: ${userId}`);
    
    // Verifica che l'evento esista e appartenga all'utente
    const event = db.getCalendarEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Evento non trovato' });
    }
    
    if (String(event.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Non hai il permesso di modificare questo evento' });
    }
    
    // Aggiorna l'evento
    const updatedEvent = db.updateCalendarEvent(eventId, eventData);
    
    console.log(`Evento ${eventId} aggiornato con successo`);
    res.json(updatedEvent);
  } catch (error) {
    console.error('Errore nell\'aggiornare l\'evento calendario:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornare l\'evento' });
  }
});

// DELETE: Elimina un evento
app.delete('/api/calendar-events/:id', verifyToken, (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    
    console.log(`Eliminazione evento ID: ${eventId} per utente ID: ${userId}`);
    
    // Verifica che l'evento esista e appartenga all'utente
    const event = db.getCalendarEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Evento non trovato' });
    }
    
    if (String(event.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Non hai il permesso di eliminare questo evento' });
    }
    
    // Elimina l'evento
    const success = db.deleteCalendarEvent(eventId);
    
    if (success) {
      console.log(`Evento ${eventId} eliminato con successo`);
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Errore nell\'eliminare l\'evento' });
    }
  } catch (error) {
    console.error('Errore nell\'eliminare l\'evento calendario:', error);
    res.status(500).json({ error: 'Errore nell\'eliminare l\'evento' });
  }
});
// Avvio del server (modificato per usare http.server con socket.io)
server.listen(port, () => {
  console.log(`Server in esecuzione su http://localhost:${port}`);
  console.log(`Documentazione Swagger disponibile su http://localhost:${port}/api-docs`);
});