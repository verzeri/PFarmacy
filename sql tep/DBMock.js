const fs = require('fs');
const path = require('path');

// File per la persistenza dei dati
const STORAGE_DIR = path.join(__dirname, 'data');
const EVENTS_FILE = path.join(STORAGE_DIR, 'calendar_events.json');

// Assicura che la directory esista
if (!fs.existsSync(STORAGE_DIR)) {
    try {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
        console.log('[DBMock] Directory creata:', STORAGE_DIR);
    } catch (error) {
        console.error('[DBMock] Errore nella creazione della directory:', error);
    }
}

// Carica gli eventi dal file o inizializza array vuoto
let _calendarEvents = [];
let _calendarEventCounter = 1;

try {
    if (fs.existsSync(EVENTS_FILE)) {
        const data = fs.readFileSync(EVENTS_FILE, 'utf8');
        _calendarEvents = JSON.parse(data);
        console.log(`[DBMock] Caricati ${_calendarEvents.length} eventi dal file di storage`);
        
        // Determina il prossimo ID da usare
        if (_calendarEvents.length > 0) {
            const maxId = Math.max(..._calendarEvents.map(event => Number(event.id) || 0));
            _calendarEventCounter = maxId + 1;
            console.log(`[DBMock] Counter eventi impostato a ${_calendarEventCounter}`);
        }
    } else {
        console.log(`[DBMock] File di storage non trovato, inizializzato array eventi vuoto`);
        // Crea file con array vuoto
        fs.writeFileSync(EVENTS_FILE, JSON.stringify([]), 'utf8');
    }
} catch (error) {
    console.error(`[DBMock] Errore nel caricamento dati dal file:`, error);
}

// Funzione per salvare gli eventi nel file
function saveEventsToFile() {
    try {
        fs.writeFileSync(EVENTS_FILE, JSON.stringify(_calendarEvents, null, 2), 'utf8');
        console.log(`[DBMock] Salvati ${_calendarEvents.length} eventi nel file`);
        return true;
    } catch (error) {
        console.error(`[DBMock] Errore nel salvataggio eventi:`, error);
        return false;
    }
}

class DBMock {
    constructor() {
        // Inizializza gli utenti
        this.users = [
            {
                id: 1,
                nome: 'Miftar',
                cognome: 'Veliqi',
                email: 'miftar@admin',
                password: '123456',
                sesso: 'M',
                eta: 25,
                ruolo: 'admin'
            },
            {
                id: 2,
                nome: 'Fabrizio',
                cognome: 'Quarti',
                email: 'fabrizio@gmail.com',
                password: 'abcdef',
                sesso: 'M',
                eta: 22,
                ruolo: 'user'
            },
        ];

        this.userCounter = this.users.length ? this.users[this.users.length - 1].id + 1 : 1;
        this.messages = []; // Memorizza tutti i messaggi
        this.onlineUsers = new Map(); // Traccia gli utenti online
    }

    // Gets all calendar events (filtered by user ID if provided)
    getCalendarEvents(userId = null) {
        console.log(`[DBMock] Recupero eventi calendario per utente ${userId}, totale eventi: ${_calendarEvents.length}`);
        
        if (userId) {
            userId = String(userId);
            return _calendarEvents.filter(event => String(event.userId) === userId);
        }
        return _calendarEvents;
    }

    // Get all events for admin view (with user details)
    getCalendarEventsForAdmin() {
        console.log(`[DBMock] Recupero eventi calendario per admin, totale eventi: ${_calendarEvents.length}`);
        
        // Map events with user details
        return _calendarEvents.map(event => {
            const user = this.getUserById(event.userId);
            return {
                ...event,
                userName: user ? `${user.nome} ${user.cognome || ''}` : 'Utente sconosciuto'
            };
        });
    }

    countUserEventsForDate(userId, date) {
        userId = String(userId);

        // Normalizza la data a solo YYYY-MM-DD senza ora
        const dateStr = new Date(date).toISOString().split('T')[0];

        // Debug log
        console.log(`[DBMock] Conteggio eventi per utente ${userId} in data ${dateStr}`);
        console.log(`[DBMock] Eventi totali: ${_calendarEvents.length}`);

        // Conta gli eventi di questo utente per questa data
        const eventsCount = _calendarEvents.filter(event => {
            // Normalizza anche la data dell'evento
            const eventDate = new Date(event.start).toISOString().split('T')[0];

            const matchesUser = String(event.userId) === userId;
            const matchesDate = eventDate === dateStr;

            // Debug per ogni evento
            if (matchesUser) {
                console.log(`[DBMock] Evento trovato: ${event.title}, in data ${eventDate}, match: ${matchesDate}`);
            }

            return matchesUser && matchesDate;
        }).length;

        console.log(`[DBMock] Numero di eventi trovati: ${eventsCount}`);
        return eventsCount;
    }

    // Check if user can add an event on a specific date
    canAddEventOnDate(userId, date) {
        const user = this.getUserById(userId);
        if (!user) return false;

        // Se è un utente normale, non ha limiti
        if (user.ruolo !== 'admin') {
            return true;
        }

        // Per admin, limite di 10 appuntamenti al giorno
        const currentCount = this.countUserEventsForDate(userId, date);
        const maxEvents = 10; // Aumentato da 5 a 10 per admin

        return currentCount < maxEvents;
    }

    isDayFull(date) {
        // Normalizza la data a solo YYYY-MM-DD senza ora
        const dateStr = new Date(date).toISOString().split('T')[0];

        // Conta tutti gli eventi di admin per questa data
        const adminEvents = _calendarEvents.filter(event => {
            const eventDate = new Date(event.start).toISOString().split('T')[0];
            const user = this.getUserById(event.userId);

            // Conta solo eventi admin approvati
            return user && user.ruolo === 'admin' &&
                eventDate === dateStr &&
                event.status === 'approved';
        });

        // Se ci sono 10 o più eventi admin in questo giorno, è pieno
        return adminEvents.length >= 10;
    }

    // Assicurati che il metodo addCalendarEvent imposti sempre lo status
    addCalendarEvent(eventData) {
        const newEvent = {
            ...eventData,
            id: _calendarEventCounter++,
            // Imposta sempre uno stato predefinito (pending per utenti normali)
            status: eventData.status || 'pending',
            createdAt: new Date().toISOString()
        };

        console.log(`[DBMock] Nuovo evento creato: ID=${newEvent.id}, UserId=${newEvent.userId}, Status=${newEvent.status}`);

        // Aggiungi alla variabile globale _calendarEvents
        _calendarEvents.push(newEvent);
        
        // IMPORTANTE: Salva su file
        saveEventsToFile();
        
        console.log(`[DBMock] Evento aggiunto. Totale eventi: ${_calendarEvents.length}`);
        
        return newEvent;
    }

    // Assicurati che questo metodo funzioni correttamente
    updateEventStatus(eventId, status) {
        eventId = Number(eventId);
        console.log(`[DBMock] Tentativo di aggiornare evento ${eventId} a stato ${status}`);

        const index = _calendarEvents.findIndex(event => Number(event.id) === eventId);

        if (index !== -1) {
            _calendarEvents[index].status = status;
            console.log(`[DBMock] Evento ${eventId} aggiornato a stato ${status}`);
            
            // IMPORTANTE: Salva su file
            saveEventsToFile();
            
            return _calendarEvents[index];
        }

        console.log(`[DBMock] Evento ${eventId} non trovato!`);
        return null;
    }

    // Metodo di debug per stampare tutti gli eventi
    logAllEvents() {
        console.log("[DBMock] --- TUTTI GLI EVENTI ---");
        _calendarEvents.forEach((event, index) => {
            const user = this.getUserById(event.userId);
            const userName = user ? `${user.nome} ${user.cognome}` : 'Sconosciuto';
            console.log(`[${index}] ID=${event.id}, Utente=${userName} (${event.userId}), Stato=${event.status}, Data=${event.start}`);
        });
        console.log("[DBMock] --- FINE EVENTI ---");
    }

    // Get calendar events by status
    getCalendarEventsByStatus(status) {
        return _calendarEvents.filter(event => event.status === status);
    }

    // Metodo per ottenere un evento del calendario per ID
    getCalendarEventById(eventId) {
        eventId = String(eventId);
        return _calendarEvents.find(event => String(event.id) === eventId);
    }

    // Metodo per aggiornare un evento del calendario
    updateCalendarEvent(eventId, eventData) {
        eventId = String(eventId);
        const index = _calendarEvents.findIndex(event => String(event.id) === eventId);

        if (index !== -1) {
            const updatedEvent = {
                ..._calendarEvents[index],
                ...eventData,
                updatedAt: new Date().toISOString()
            };

            _calendarEvents[index] = updatedEvent;
            
            // IMPORTANTE: Salva su file
            saveEventsToFile();
            
            console.log(`[DBMock] Aggiornato evento calendario ${eventId}`);
            return updatedEvent;
        }

        return null;
    }

    // Metodo per eliminare un evento del calendario
    deleteCalendarEvent(eventId) {
        eventId = String(eventId);
        const initialLength = _calendarEvents.length;
        const filteredEvents = _calendarEvents.filter(event => String(event.id) !== eventId);

        const success = filteredEvents.length < initialLength;
        if (success) {
            // Svuota l'array originale e ricarica tutti gli eventi filtrati
            _calendarEvents.length = 0;
            filteredEvents.forEach(event => _calendarEvents.push(event));

            // IMPORTANTE: Salva su file
            saveEventsToFile();
            
            console.log(`[DBMock] Eliminato evento calendario ${eventId}`);
        }
        return success;
    }

    // Ottieni tutti gli utenti
    getAllUsers() {
        return this.users.map(user => ({ ...user, password: undefined })); // Escludi la password
    }

    // Ottieni un utente per ID
    getUserById(id) {
        // Assicura che l'ID sia un numero per la ricerca
        id = typeof id === 'string' ? parseInt(id, 10) : id;

        const user = this.users.find(user => user.id === id);
        if (user) {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        }
        return null;
    }

    // Altri metodi per utenti, chat, ecc. rimangono invariati
    createUser({ nome, cognome, email, password, sesso, eta }) {
        const newUser = {
            id: this.userCounter++,
            nome,
            cognome,
            email,
            password,
            sesso,
            eta,
            ruolo: email.endsWith('@admin') ? 'admin' : 'user'
        };
        this.users.push(newUser);
        return newUser;
    }

    getUserByEmail(email) {
        return this.users.find(user => user.email === email);
    }

    verifyCredentials(email, password) {
        const user = this.getUserByEmail(email);
        if (!user) {
            return { success: false, message: 'Email o password errati' };
        }

        if (user.password === password) {
            // Determina la pagina di reindirizzamento in base al ruolo (ora usando le route)
            const redirectPage = user.ruolo === 'admin' ? '/admin' : '/paziente';
            return {
                success: true,
                user: { ...user, password: undefined },
                redirectPage
            };
        }

        return { success: false, message: 'Email o password errati' };
    }

    updateUser(id, updates) {
        const userIndex = this.users.findIndex(user => user.id === id);
        if (userIndex === -1) {
            return null;
        }

        // Aggiorna i campi forniti
        this.users[userIndex] = { ...this.users[userIndex], ...updates };

        // Controlla se l'email è stata aggiornata per aggiornare il ruolo
        if (updates.email) {
            this.users[userIndex].ruolo = updates.email.endsWith('@admin') ? 'admin' : 'user';
        }

        return { ...this.users[userIndex], password: undefined };
    }

    deleteUser(id) {
        const userIndex = this.users.findIndex(user => user.id === id);
        if (userIndex === -1) {
            return false;
        }
        this.users.splice(userIndex, 1);
        return true;
    }

    // === FUNZIONALITÀ DI CHAT ===
    addMessage(senderId, recipientId, content) {
        // Assicura che gli ID siano stringhe per confronti coerenti
        senderId = String(senderId);
        recipientId = String(recipientId);

        const message = {
            id: this.messages.length + 1,
            senderId,
            recipientId,
            content,
            timestamp: new Date().toISOString()
        };

        console.log(`[DBMock] Salvataggio messaggio: ${senderId} -> ${recipientId}: "${content}"`);
        this.messages.push(message);
        return message;
    }

    getMessagesBetweenUsers(userId1, userId2) {
        userId1 = String(userId1);
        userId2 = String(userId2);

        console.log(`[DBMock] Recupero messaggi tra ${userId1} e ${userId2}`);

        const messages = this.messages.filter(message =>
            (message.senderId === userId1 && message.recipientId === userId2) ||
            (message.senderId === userId2 && message.recipientId === userId1)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        console.log(`[DBMock] Trovati ${messages.length} messaggi`);
        return messages;
    }

    setUserOnlineStatus(userId, isOnline) {
        userId = String(userId);
        console.log(`[DBMock] Impostazione stato utente ${userId}: ${isOnline ? 'online' : 'offline'}`);
        this.onlineUsers.set(userId, isOnline);
    }

    getUserOnlineStatus(userId) {
        userId = String(userId);
        return this.onlineUsers.get(userId) || false;
    }

    getOnlineUsers() {
        const result = [];
        this.onlineUsers.forEach((isOnline, userId) => {
            if (isOnline) {
                result.push(userId);
            }
        });
        return result;
    }

    getAllUsersStatus() {
        const result = [];
        this.onlineUsers.forEach((isOnline, userId) => {
            result.push({ userId, online: isOnline });
        });
        return result;
    }

    getChatUsers(userRole, userId) {
        console.log(`[DBMock] Ottenendo utenti chat per ${userRole} con ID ${userId}`);

        if (userRole === 'admin') {
            // Admin vede tutti gli utenti normali
            const users = this.users
                .filter(user => user.ruolo === 'user')
                .map(user => ({
                    id: String(user.id),
                    nome: user.nome,
                    cognome: user.cognome || '',
                    connected: false
                }));
            console.log(`[DBMock] Trovati ${users.length} utenti per admin`);
            return users;
        } else {
            // Utente normale vede solo gli admin
            const admins = this.users
                .filter(user => user.ruolo === 'admin')
                .map(user => ({
                    id: String(user.id),
                    nome: user.nome,
                    cognome: user.cognome || '',
                    connected: false
                }));
            console.log(`[DBMock] Trovati ${admins.length} admin per utente`);
            return admins;
        }
    }
}

module.exports = DBMock;