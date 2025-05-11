const express = require('express');
const path = require('path');
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
const crypto = require('crypto');

// Generate a unique server instance ID on startup
const SERVER_INSTANCE_ID = crypto.randomBytes(16).toString('hex');

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

// Configura Swagger con il file JSON aggiornato
const swaggerDocument = {
  "openapi": "3.0.0",
  "info": {
    "title": "PFarmacy API",
    "version": "1.1.0",
    "description": "API per la gestione di utenti, appuntamenti e chat nella piattaforma PFarmacy"
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
      "description": "Operazioni relative all'autenticazione e gestione sessioni"
    },
    {
      "name": "Utenti",
      "description": "Operazioni di gestione utenti"
    },
    {
      "name": "Eventi",
      "description": "Operazioni relative agli eventi del calendario e promemoria"
    },
    {
      "name": "Chat",
      "description": "Operazioni relative alla chat tra utenti e admin"
    },
    {
      "name": "Sistema",
      "description": "Operazioni di sistema e diagnostica"
    }
  ],
  "paths": {
    "/": {
      "get": {
        "summary": "Pagina principale dell'applicazione",
        "tags": ["Sistema"],
        "description": "Reindirizza alla pagina appropriata in base al ruolo dell'utente autenticato, o mostra la pagina di login se non autenticato",
        "responses": {
          "200": {
            "description": "Pagina di login"
          },
          "302": {
            "description": "Reindirizzamento alla pagina appropriata se l'utente è già autenticato"
          }
        }
      }
    },
    "/paziente": {
      "get": {
        "summary": "Pagina paziente",
        "tags": ["Sistema"],
        "description": "Pagina principale per gli utenti con ruolo paziente",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": {
            "description": "Pagina paziente"
          },
          "302": {
            "description": "Reindirizzamento alla pagina di login se non autenticato"
          }
        }
      }
    },
    "/admin": {
      "get": {
        "summary": "Pagina amministratore",
        "tags": ["Sistema"],
        "description": "Pagina principale per gli utenti con ruolo admin",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": {
            "description": "Pagina amministratore"
          },
          "302": {
            "description": "Reindirizzamento alla pagina di login se non autenticato"
          },
          "403": {
            "description": "Accesso negato se l'utente non è un amministratore"
          }
        }
      }
    },
    "/dati": {
      "get": {
        "summary": "Pagina dati utente",
        "tags": ["Sistema"],
        "description": "Pagina per visualizzare i dati personali dell'utente",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": {
            "description": "Pagina dati utente"
          },
          "302": {
            "description": "Reindirizzamento alla pagina di login se non autenticato"
          }
        }
      }
    },
    "/chat": {
      "get": {
        "summary": "Pagina di chat dell'applicazione",
        "tags": ["Chat"],
        "description": "Interfaccia per la chat tra utenti e amministratori",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": {
            "description": "Pagina HTML della chat"
          },
          "302": {
            "description": "Reindirizzamento alla pagina di login se non autenticato"
          }
        }
      }
    },
    "/api/server-status": {
      "get": {
        "summary": "Stato del server",
        "tags": ["Sistema"],
        "description": "Verifica lo stato del server e ottiene l'ID dell'istanza corrente",
        "responses": {
          "200": {
            "description": "Informazioni sullo stato del server",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": {
                      "type": "string",
                      "example": "ok"
                    },
                    "instanceId": {
                      "type": "string",
                      "example": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
                    },
                    "startTime": {
                      "type": "string",
                      "format": "date-time",
                      "example": "2023-05-11T10:00:00Z"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/check-auth": {
      "get": {
        "summary": "Verifica l'autenticazione dell'utente",
        "tags": ["Autenticazione"],
        "description": "Verifica se l'utente è autenticato e ottiene informazioni sulla sessione corrente",
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
                    },
                    "serverRestarted": {
                      "type": "boolean",
                      "description": "Indica se il server è stato riavviato dall'ultima autenticazione"
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
        "description": "Cancella il cookie JWT e termina la sessione corrente",
        "responses": {
          "302": {
            "description": "Reindirizza alla pagina principale dopo il logout"
          }
        }
      }
    },
    "/login": {
      "post": {
        "summary": "Effettua il login di un utente",
        "tags": ["Autenticazione"],
        "description": "Autentica un utente utilizzando email e password",
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
        "description": "Reindirizza l'utente alla pagina di autorizzazione Google OAuth2",
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
        "description": "Endpoint che gestisce il callback di Google OAuth2 dopo l'autorizzazione",
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
        "description": "Permette a un utente autenticato di modificare la propria password",
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
        "description": "Recupera l'elenco degli utenti, eventualmente filtrato per età",
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
        "description": "Crea un nuovo utente nel sistema",
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
        "description": "Recupera i dettagli di un utente specifico tramite il suo ID",
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
        "description": "Modifica i dati di un utente esistente",
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
        "description": "Rimuove un utente dal sistema",
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
    "/api/calendar-events": {
      "get": {
        "summary": "Ottiene gli eventi del calendario per l'utente autenticato",
        "tags": ["Eventi"],
        "description": "Recupera la lista degli eventi calendario dell'utente corrente",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": {
            "description": "Lista degli eventi del calendario",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/CalendarEvent"
                  }
                }
              }
            }
          },
          "500": {
            "description": "Errore nel recupero degli eventi",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Errore nel recupero degli eventi"
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Crea un nuovo evento nel calendario",
        "tags": ["Eventi"],
        "description": "Aggiunge un nuovo evento al calendario dell'utente autenticato",
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/NewCalendarEvent"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Evento creato con successo",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CalendarEvent"
                }
              }
            }
          },
          "400": {
            "description": "Richiesta non valida o limite eventi raggiunto",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Titolo e data di inizio sono obbligatori"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Errore nel salvare l'evento",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Errore nel salvare l'evento"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/calendar-events/{id}": {
      "put": {
        "summary": "Aggiorna un evento del calendario",
        "tags": ["Eventi"],
        "description": "Modifica un evento esistente del calendario",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "ID dell'evento da aggiornare",
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
                "$ref": "#/components/schemas/CalendarEventUpdate"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Evento aggiornato con successo",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CalendarEvent"
                }
              }
            }
          },
          "403": {
            "description": "Permesso negato",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Non hai il permesso di modificare questo evento"
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Evento non trovato",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Evento non trovato"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Errore nell'aggiornare l'evento",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Errore nell'aggiornare l'evento"
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "summary": "Elimina un evento del calendario",
        "tags": ["Eventi"],
        "description": "Rimuove un evento esistente dal calendario",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "ID dell'evento da eliminare",
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Evento eliminato con successo",
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
          "403": {
            "description": "Permesso negato",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Non hai il permesso di eliminare questo evento"
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Evento non trovato",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Evento non trovato"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/calendar-availability/{date}": {
      "get": {
        "summary": "Verifica la disponibilità di un giorno per nuovi eventi",
        "tags": ["Eventi"],
        "description": "Controlla se sono ancora disponibili slot per appuntamenti in una determinata data",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          {
            "name": "date",
            "in": "path",
            "required": true,
            "description": "Data da verificare (formato: YYYY-MM-DD)",
            "schema": {
              "type": "string",
              "format": "date"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Informazioni sulla disponibilità",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "date": {
                      "type": "string",
                      "format": "date",
                      "example": "2023-05-10"
                    },
                    "available": {
                      "type": "boolean",
                      "example": true
                    },
                    "message": {
                      "type": "string",
                      "example": "Posti disponibili"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Formato data non valido",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Data non valida"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Errore nel verificare la disponibilità",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Errore nel verificare la disponibilità"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/admin/calendar-events": {
      "get": {
        "summary": "Ottiene tutti gli eventi del calendario (solo admin)",
        "tags": ["Eventi"],
        "description": "Recupera tutti gli eventi del calendario di tutti gli utenti (richiede ruolo admin)",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": {
            "description": "Lista completa degli eventi calendario",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/AdminCalendarEvent"
                  }
                }
              }
            }
          },
          "403": {
            "description": "Accesso negato",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Accesso negato"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Errore nel recupero degli eventi",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Errore nel recupero degli eventi"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/admin/calendar-events/{id}/status": {
      "put": {
        "summary": "Aggiorna lo stato di un evento (solo admin)",
        "tags": ["Eventi"],
        "description": "Modifica lo stato di un evento del calendario (approved, rejected, pending)",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "ID dell'evento da aggiornare",
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
                "type": "object",
                "required": ["status"],
                "properties": {
                  "status": {
                    "type": "string",
                    "enum": ["approved", "rejected", "pending"],
                    "example": "approved"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Evento aggiornato con successo",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AdminCalendarEvent"
                }
              }
            }
          },
          "400": {
            "description": "Parametri non validi",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Lo stato deve essere approved, rejected o pending"
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Evento non trovato",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Evento non trovato"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/debug/calendar-events": {
      "get": {
        "summary": "Informazioni di debug sugli eventi del calendario",
        "tags": ["Sistema"],
        "description": "Ottiene informazioni di diagnostica sugli eventi del calendario",
        "responses": {
          "200": {
            "description": "Statistiche degli eventi del calendario",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "totalEvents": {
                      "type": "integer",
                      "example": 42
                    },
                    "pendingEvents": {
                      "type": "integer",
                      "example": 10
                    },
                    "approvedEvents": {
                      "type": "integer",
                      "example": 25
                    },
                    "rejectedEvents": {
                      "type": "integer",
                      "example": 7
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/test/socket": {
      "get": {
        "summary": "Test dello stato delle connessioni socket",
        "tags": ["Sistema"],
        "description": "Verifica lo stato delle connessioni Socket.IO e la configurazione correlata",
        "responses": {
          "200": {
            "description": "Informazioni sulle connessioni socket",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "status": {
                      "type": "object",
                      "properties": {
                        "serverRunning": {
                          "type": "boolean",
                          "example": true
                        },
                        "socketConnectionsCount": {
                          "type": "integer",
                          "example": 3
                        },
                        "socketConnectionsIds": {
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Errore nel test socket",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": false
                    },
                    "error": {
                      "type": "string"
                    }
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
        "description": "Recupera l'elenco degli utenti con cui l'utente corrente può chattare",
        "security": [{ "bearerAuth": [] }],
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
          },
          "500": {
            "description": "Errore nel recupero degli utenti",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Errore nel recupero degli utenti"
                    }
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
        "description": "Recupera la cronologia dei messaggi tra l'utente autenticato e un altro utente specifico",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          {
            "name": "userId",
            "in": "path",
            "required": true,
            "description": "ID dell'utente con cui recuperare i messaggi",
            "schema": {
              "type": "string"
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
          },
          "500": {
            "description": "Errore nel recupero dei messaggi"
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
          },
          "ruolo": {
            "type": "string",
            "enum": ["admin", "user"],
            "description": "Ruolo dell'utente nel sistema"
          }
        }
      },
      "CalendarEvent": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "description": "ID univoco dell'evento"
          },
          "title": {
            "type": "string",
            "description": "Titolo o descrizione dell'evento",
            "example": "Visita Medica"
          },
          "start": {
            "type": "string",
            "format": "date-time",
            "description": "Data e ora di inizio dell'evento",
            "example": "2023-05-14T10:00:00"
          },
          "end": {
            "type": "string",
            "format": "date-time",
            "description": "Data e ora di fine dell'evento (opzionale)"
          },
          "userId": {
            "type": "integer",
            "description": "ID dell'utente proprietario dell'evento"
          },
          "status": {
            "type": "string",
            "enum": ["pending", "approved", "rejected"],
            "description": "Stato dell'evento",
            "default": "pending"
          },
          "createdAt": {
            "type": "string",
            "format": "date-time",
            "description": "Data di creazione dell'evento"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time",
            "description": "Data di ultimo aggiornamento dell'evento"
          }
        }
      },
      "AdminCalendarEvent": {
        "allOf": [
          { "$ref": "#/components/schemas/CalendarEvent" },
          {
            "type": "object",
            "properties": {
              "userName": {
                "type": "string",
                "description": "Nome dell'utente proprietario dell'evento"
              },
              "userEmail": {
                "type": "string",
                "format": "email",
                "description": "Email dell'utente proprietario dell'evento"
              }
            }
          }
        ]
      },
      "NewCalendarEvent": {
        "type": "object",
        "required": ["title", "start"],
        "properties": {
          "title": {
            "type": "string",
            "description": "Titolo o descrizione dell'evento",
            "example": "Visita Medica"
          },
          "start": {
            "type": "string",
            "format": "date-time",
            "description": "Data e ora di inizio dell'evento",
            "example": "2023-05-14T10:00:00"
          },
          "end": {
            "type": "string",
            "format": "date-time",
            "description": "Data e ora di fine dell'evento (opzionale)"
          },
          "status": {
            "type": "string",
            "enum": ["pending", "approved", "rejected"],
            "description": "Stato dell'evento",
            "default": "pending"
          }
        }
      },
      "CalendarEventUpdate": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string",
            "description": "Titolo o descrizione dell'evento"
          },
          "start": {
            "type": "string",
            "format": "date-time",
            "description": "Data e ora di inizio dell'evento"
          },
          "end": {
            "type": "string",
            "format": "date-time",
            "description": "Data e ora di fine dell'evento"
          },
          "status": {
            "type": "string",
            "enum": ["pending", "approved", "rejected"],
            "description": "Stato dell'evento"
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
          },
          "senderName": {
            "type": "string",
            "description": "Nome dell'utente che ha inviato il messaggio (opzionale)"
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
app.use(cookieParser());

// **Configurazione Handlebars come view engine**
const hbs = require('hbs');
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'public'));

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

// Socket.IO setup con autenticazione
io.use((socket, next) => {
  try {
    // Ottieni il token dal cookie o dall'auth
    let token = null;

    if (socket.handshake.auth && socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    }
    else if (socket.handshake.headers.cookie) {
      const cookies = socket.handshake.headers.cookie.split(';');
      const jwtCookie = cookies.find(c => c.trim().startsWith('jwt='));
      if (jwtCookie) {
        token = jwtCookie.split('=')[1];
      }
    }

    if (!token) {
      socket.user = { id: 'anonymous', nome: 'Anonimo', ruolo: 'guest' };
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    socket.user = { id: 'error', nome: 'Error', ruolo: 'guest' };
    next();
  }
});

io.on('connection', (socket) => {
  const userId = String(socket.user.id);
  socketConnections.set(userId, socket);

  // Set user as online
  db.setUserOnlineStatus(userId, true);

  // Broadcast user status to all clients
  io.emit('users_status', db.getAllUsersStatus());

  // Handle private messages
  socket.on('send_message', (message) => {
    const senderId = String(socket.user.id);
    const recipientId = String(message.recipientId);

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
      recipientSocket.emit('private_message', messageToSend);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const userId = String(socket.user.id);

    // Remove socket connection
    socketConnections.delete(userId);

    // Set user as offline
    db.setUserOnlineStatus(userId, false);

    // Broadcast updated user status
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

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      ruolo: user.ruolo,
      nome: user.nome,
      cognome: user.cognome,
      // Include the server instance ID in the token
      instanceId: SERVER_INSTANCE_ID
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
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
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = db.getUserById(id) || { id };
  done(null, user);
});

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const cookieToken = req.cookies?.jwt;
  const finalToken = token || cookieToken;

  if (!finalToken) {
    if (req.path === '/api/check-auth') {
      return res.status(401).json({ isAuthenticated: false });
    }
    return res.redirect('/');
  }

  jwt.verify(finalToken, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (req.path === '/api/check-auth') {
        return res.status(401).json({ isAuthenticated: false });
      }
      return res.redirect('/');
    }

    if (decoded.instanceId !== SERVER_INSTANCE_ID) {
      if (req.path === '/api/check-auth') {
        return res.status(401).json({ 
          isAuthenticated: false, 
          serverRestarted: true 
        });
      }
      return res.redirect('/');
    }

    req.user = decoded;
    next();
  });
}

app.get('/api/server-status', (req, res) => {
  res.json({
    status: 'ok',
    instanceId: SERVER_INSTANCE_ID,
    startTime: new Date().toISOString()
  });
});

function ensureAdmin(req, res, next) {
  if (!req.user) {
    return res.redirect('/');
  }

  if (req.user.ruolo === 'admin') {
    return next();
  }

  res.status(403).json({ error: 'Accesso negato' });
}

function getInitials(name) {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

// Rotte per il login tramite Google
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/'
}), (req, res) => {
  const token = generateToken(req.user);

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 giorni
  });

  const redirectPage = req.user.ruolo === 'admin' ? '/admin' : '/paziente';
  res.redirect(redirectPage);
});

// Route principale (login page)
app.get('/', (req, res) => {
  const token = req.cookies?.jwt;

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err) {
        const redirectPage = decoded.ruolo === 'admin' ? '/admin' : '/paziente';
        return res.redirect(redirectPage);
      }
    });
  }

  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route per la pagina paziente (protetta)
app.get('/paziente', verifyToken, (req, res) => {
  res.render('paziente', { patient: { nome: req.user.nome, cognome: req.user.cognome || '' } });
});

// Route per la pagina admin (protetta)
app.get('/admin', verifyToken, ensureAdmin, (req, res) => {
  res.render('admin', { admin: { nome: req.user.nome }, users: db.getAllUsers() });
});

// Route per la pagina dati utente (protetta)
app.get('/dati', verifyToken, (req, res) => {
  const user = db.getUserById(req.user.id);
  res.render('dati', { user: user });
});

// Route per la pagina chat (protetta)
app.get('/chat', verifyToken, (req, res) => {
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
    
    if (decoded.instanceId !== SERVER_INSTANCE_ID) {
      return res.status(200).json({ 
        isAuthenticated: false,
        serverRestarted: true 
      });
    }
    
    return res.status(200).json({
      isAuthenticated: true,
      role: decoded.ruolo,
      nome: decoded.nome
    });
  } catch (err) {
    return res.status(200).json({ isAuthenticated: false });
  }
});

// API per il logout
app.post('/logout', (req, res) => {
  res.clearCookie('jwt');
  res.redirect('/');
});

// API per gli utenti chat
app.get('/api/chat/users', verifyToken, (req, res) => {
  try {
    const allUsers = db.getAllUsers();
    let chatUsers = [];

    if (req.user.ruolo === 'admin') {
      chatUsers = db.getAllUsers()
        .filter(user => user.ruolo === 'user')
        .map(user => ({
          id: String(user.id),
          nome: user.nome || 'Utente',
          cognome: user.cognome || '',
          connected: false
        }));
    } else {
      chatUsers = db.getAllUsers()
        .filter(user => user.ruolo === 'admin')
        .map(user => ({
          id: String(user.id),
          nome: user.nome || 'Admin',
          cognome: user.cognome || '',
          connected: false
        }));
    }

    return res.json(chatUsers);
  } catch (error) {
    return res.status(500).json({ error: 'Errore nel recupero degli utenti' });
  }
});

// API per i messaggi chat
app.get('/api/chat/messages/:userId', verifyToken, (req, res) => {
  const currentUserId = String(req.user.id);
  const otherUserId = String(req.params.userId);

  const messages = db.getMessagesBetweenUsers(currentUserId, otherUserId);

  res.json(messages);
});

// API per ottenere la lista degli utenti con filtri opzionali
app.get('/utentii', (req, res) => {
  const { eta } = req.query;
  let users = db.getAllUsers();

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
  const { nome, cognome, email, password, sesso, eta } = req.body;

  if (!nome || !cognome || !email || !password || !sesso || !eta) {
    return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
  }

  try {
    const newUser = db.createUser({ nome, cognome, email, password, sesso, eta });
    res.status(201).json({ message: 'Registrazione avvenuta con successo' });
  } catch (error) {
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

  const user = db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Utente non trovato.' });
  }

  if (user.password === currentPassword) { // In un sistema reale, usa l'hashing
    const updatedUser = db.updateUser(userId, { password: newPassword });
    if (updatedUser) {
      return res.json({ success: true, message: 'Password aggiornata con successo.' });
    } else {
      return res.status(500).json({ success: false, message: 'Errore durante l\'aggiornamento della password.' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'La password attuale non è corretta.' });
  }
});

// API per gli eventi del calendario - NUOVA IMPLEMENTAZIONE

// GET: Ottiene tutti gli eventi del calendario per l'utente corrente
app.get('/api/calendar-events', verifyToken, (req, res) => {
  try {
    const userId = req.user.id;
    const events = db.getCalendarEvents(userId);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero degli eventi' });
  }
});

// Modifica l'API POST per calendar-events
app.post('/api/calendar-events', verifyToken, (req, res) => {
  try {
    const userId = req.user.id;
    const eventData = req.body;
    const user = db.getUserById(userId);

    // Controlla i campi richiesti
    if (!eventData.title || !eventData.start) {
      return res.status(400).json({ error: 'Titolo e data di inizio sono obbligatori' });
    }

    const eventDate = new Date(eventData.start);

    // Se è un admin, verifica il limite di 10 al giorno
    if (user.ruolo === 'admin') {
      if (!db.canAddEventOnDate(userId, eventDate)) {
        return res.status(400).json({ error: 'Hai raggiunto il limite massimo di 10 appuntamenti per questa giornata' });
      }
    }
    // Se è un utente normale, verifica se ci sono posti disponibili
    else {
      if (db.isDayFull(eventDate)) {
        return res.status(400).json({ error: 'Non ci sono più posti disponibili per questa data. Scegli un altro giorno.' });
      }
    }

    // Aggiungi l'ID utente all'evento
    eventData.userId = userId;

    // Salva l'evento nel database
    const savedEvent = db.addCalendarEvent(eventData);
    res.json(savedEvent);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Errore nel salvare l\'evento' });
  }
});

// Nuovo endpoint per verificare la disponibilità del giorno
app.get('/api/calendar-availability/:date', verifyToken, (req, res) => {
  try {
    const dateStr = req.params.date;
    const date = new Date(dateStr);

    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Data non valida' });
    }

    const isDayFull = db.isDayFull(date);

    res.json({
      date: dateStr,
      available: !isDayFull,
      message: isDayFull ? 'Non ci sono più posti disponibili per questa data' : 'Posti disponibili'
    });
  } catch (error) {
    res.status(500).json({ error: 'Errore nel verificare la disponibilità' });
  }
});

// PUT: Aggiorna un evento esistente
app.put('/api/calendar-events/:id', verifyToken, (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    const eventData = req.body;

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
    res.json(updatedEvent);
  } catch (error) {
    res.status(500).json({ error: 'Errore nell\'aggiornare l\'evento' });
  }
});

// DELETE: Elimina un evento
app.delete('/api/calendar-events/:id', verifyToken, (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;

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
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Errore nell\'eliminare l\'evento' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Errore nell\'eliminare l\'evento' });
  }
});

// API per ottenere gli eventi del calendario
app.get('/events', verifyToken, (req, res) => {
  try {
    const events = db.getCalendarEvents(req.user.id);
    res.json(events);
  } catch (error) {
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

// Endpoint per ottenere tutti gli appuntamenti per l'admin
app.get('/api/admin/calendar-events', verifyToken, ensureAdmin, (req, res) => {
    try {
        // Ottieni tutti gli eventi calendario con informazioni utente
        const enrichedEvents = db.getCalendarEventsForAdmin();
        res.json(enrichedEvents);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero degli eventi' });
    }
});

// Aggiorna lo stato di un evento (solo admin)
app.put('/api/admin/calendar-events/:id/status', verifyToken, ensureAdmin, (req, res) => {
    try {
        const eventId = req.params.id;
        const { status } = req.body;
        
        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Lo stato deve essere approved, rejected o pending' });
        }
        
        // Assicurati che eventId sia un numero
        const updatedEvent = db.updateEventStatus(Number(eventId), status);
        
        if (updatedEvent) {
            res.json(updatedEvent);
        } else {
            res.status(404).json({ error: 'Evento non trovato' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Errore nell\'aggiornare lo stato' });
    }
});

// Endpoint di debug per gli eventi del calendario
app.get('/api/debug/calendar-events', (req, res) => {
  db.logAllEvents();

  res.json({
    success: true,
    totalEvents: db.getCalendarEvents().length,
    pendingEvents: db.getCalendarEventsByStatus('pending').length,
    approvedEvents: db.getCalendarEventsByStatus('approved').length,
    rejectedEvents: db.getCalendarEventsByStatus('rejected').length
  });
});

// Avvio del server (modificato per usare http.server con socket.io)
server.listen(port, () => {
  console.log(`Server in esecuzione su http://localhost:${port}`);
  console.log(`Documentazione Swagger disponibile su http://localhost:${port}/api-docs`);
});