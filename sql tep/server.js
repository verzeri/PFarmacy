const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();
const app = express();
const port = 3000;

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
            "sessionAuth": []
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
      }
    },
    "securitySchemes": {
      "sessionAuth": {
        "type": "apiKey",
        "in": "cookie",
        "name": "connect.sid",
        "description": "Autenticazione basata su sessione"
      }
    }
  }
};

// Usa direttamente il documento JSON per Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurazione avanzata delle sessioni
app.use(session({
    secret: process.env.SESSION_SECRET || 'yourSecretKey', // Usa env variable se disponibile
    resave: false,
    saveUninitialized: false, // Cambiato a false per rispettare GDPR
    cookie: { 
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 giorni
        secure: process.env.NODE_ENV === 'production', // true in produzione
        httpOnly: true // Protezione contro XSS
    }
}));

// **Configurazione Handlebars come view engine**
const hbs = require('hbs');
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'public')); // Assicurati che le tue pagine .hbs siano nella cartella 'public'

// Registra l'helper eq per le comparazioni in Handlebars
hbs.registerHelper('eq', function(a, b) {
    return a === b;
});

// Servire i file statici dalla cartella 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Inizializza Passport e sessioni
app.use(passport.initialize());
app.use(passport.session());

// Configurazione per il login tramite Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
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

// Serializzazione migliorata - salva solo l'id
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserializzazione migliorata - cerca l'utente nel database
passport.deserializeUser((id, done) => {
    // Cerca l'utente completo nel database usando l'id
    // In questo esempio stiamo passando l'intero oggetto utente, 
    // ma in una implementazione reale cercheresti l'utente nel DB
    const user = db.getUserById(id);
    if (!user) {
        return done(new Error('User not found'), null);
    }
    
    done(null, user);
});

// Middleware migliorato per verificare se l'utente è autenticato
function ensureAuthenticated(req, res, next) {
    // Prima verifica l'autenticazione tramite Passport
    if (req.isAuthenticated()) {
        return next();
    }
    
    // Verifica secondaria tramite sessione come backup
    if (req.session && req.session.user) {
        console.log('Utente autenticato via sessione:', req.session.user.nome);
        
        // Se abbiamo dati di sessione ma Passport non li riconosce,
        // ripristiniamo la sessione Passport
        req.login(req.session.user, err => {
            if (err) {
                console.error('Errore nel ripristino della sessione:', err);
                return res.redirect('/');
            }
            return next();
        });
    } else {
        console.log('Utente non autenticato, reindirizzamento a /');
        res.redirect('/');
    }
}

// Middleware migliorato per verificare se l'utente è admin
function ensureAdmin(req, res, next) {
    // Prima verifica l'autenticazione base
    if (!req.isAuthenticated() && !(req.session && req.session.user)) {
        console.log('Utente non autenticato');
        return res.redirect('/');
    }
    
    // Poi verifica se l'utente è admin
    const userRole = req.user?.ruolo || req.session.user?.ruolo;
    
    if (userRole === 'admin') {
        console.log('Utente admin autenticato');
        return next();
    }
    
    console.log('Accesso admin negato');
    res.status(403).json({ error: 'Accesso negato' });
}

// Rotte per il login tramite Google
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/'
}), (req, res) => {
    // Migliore gestione della sessione - standardizza tra tutti i metodi di login
    req.session.loggedin = true;
    req.session.user = req.user;
    req.session.role = req.user.ruolo;
    
    console.log('Login Google completato per:', req.user.email);
    
    // Forza il salvataggio della sessione per garantire la persistenza
    req.session.save(err => {
        if (err) {
            console.error('Errore nel salvataggio della sessione:', err);
        }
        
        // Reindirizza in base al ruolo
        const redirectPage = req.user.ruolo === 'admin' ? '/admin' : '/paziente';
        res.redirect(redirectPage);
    });
});

// Route principale (login page)
app.get('/', (req, res) => {
    // Verifica se l'utente è già autenticato
    if (req.isAuthenticated() || (req.session && req.session.loggedin)) {
        // Reindirizza l'utente già autenticato alla pagina appropriata
        const redirectPage = (req.user?.ruolo || req.session.user?.ruolo) === 'admin' ? '/admin' : '/paziente';
        return res.redirect(redirectPage);
    }
    
    // Serve la pagina index.html per gli utenti non autenticati
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route per la pagina paziente (protetta da autenticazione)
app.get('/paziente', ensureAuthenticated, (req, res) => {
    // Ottieni i dati dell'utente da req.user (Passport) o req.session.user (sessione)
    const user = req.user || req.session.user;
    
    // Renderizza paziente.hbs e passa i dati dell'utente
    res.render('paziente', { patient: { nome: user.nome, cognome: user.cognome } });
});

// Route per la pagina admin (protetta da autenticazione admin)
app.get('/admin', ensureAdmin, (req, res) => {
    // Ottieni i dati dell'utente da req.user (Passport) o req.session.user (sessione)
    const user = req.user || req.session.user;
    
    // Renderizza admin.hbs e passa i dati dell'admin e degli utenti
    res.render('admin', { admin: { nome: user.nome }, users: db.getAllUsers() });
});

// Route per la pagina dati utente (protetta da autenticazione)
app.get('/dati', ensureAuthenticated, (req, res) => {
    // Ottieni i dati dell'utente da req.user (Passport) o req.session.user (sessione)
    const user = req.user || req.session.user;
    console.log('Renderizzazione pagina dati per:', user.nome);
    
    // Renderizza dati.hbs e passa i dati dell'utente
    res.render('dati', { user: user });
});

// API per verificare lo stato di autenticazione dell'utente
app.get('/api/check-auth', (req, res) => {
    // Controllo migliorato che verifica sia Passport che la sessione
    const isAuthenticated = req.isAuthenticated() || (req.session && req.session.loggedin);
    const user = req.user || req.session.user || {};
    
    if (isAuthenticated) {
        res.json({
            isAuthenticated: true,
            role: user.ruolo,
            nome: user.nome
        });
    } else {
        res.json({ isAuthenticated: false });
    }
});

// API per il logout
app.post('/logout', (req, res) => {
    const user = req.user || req.session.user;
    console.log('Logout per utente:', user ? user.nome : 'Sessione non trovata');
    
    // Logout di Passport
    req.logout(function(err) {
        if (err) { 
            console.error('Errore durante il logout Passport:', err);
        }
        
        // Distruggi completamente la sessione
        req.session.destroy(() => {
            // Reindirizza alla route principale
            res.redirect('/');
        });
    });
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

// API per il login di un utente
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const result = db.verifyCredentials(email, password);
    
    if (result.success) {
        // Memorizza l'utente nella sessione e in Passport
        req.session.loggedin = true;
        req.session.user = result.user;
        req.session.role = result.user.ruolo;
        
        // Imposta l'utente in Passport
        req.login(result.user, err => {
            if (err) {
                console.error('Errore durante il login Passport:', err);
                return res.json({
                    success: false,
                    message: 'Errore di sistema durante il login'
                });
            }
            
            // Forza il salvataggio della sessione
            req.session.save(err => {
                if (err) {
                    console.error('Errore nel salvataggio della sessione:', err);
                }
                
                // Controlla per la redirezione in base al ruolo
                const redirectPage = result.user.ruolo === 'admin' ? '/admin' : '/paziente';

                res.json({
                    success: true,
                    redirectPage
                });
            });
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
app.post('/update-password', ensureAuthenticated, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    // Otteniamo l'id utente da Passport o dalla sessione
    const userId = req.user?.id || req.session.user?.id;
    
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

// Route di test per debugging
app.get('/test-paziente', (req, res) => {
    console.log('Accesso alla route di test paziente');
    req.session.loggedin = true;
    req.session.user = {
        id: 999,
        nome: 'Test',
        cognome: 'Utente',
        email: 'test@example.com',
        ruolo: 'user'
    };
    req.session.role = 'user';
    
    // Simula il login di Passport
    req.login(req.session.user, err => {
        if (err) {
            console.error('Errore durante il login di test:', err);
        }
        res.redirect('/paziente');
    });
});

// Avvio del server
app.listen(port, () => {
    console.log(`Server API in esecuzione su http://localhost:${port}`);
    console.log(`Documentazione Swagger disponibile su http://localhost:${port}/api-docs`);
});