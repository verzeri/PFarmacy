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

        // Inizializza strutture dati per la chat
        this.messages = []; // Memorizza tutti i messaggi
        this.onlineUsers = new Map(); // Traccia gli utenti online

        this.calendarEvents = [];
        this.calendarEventCounter = 1;
    }
// Metodo per ottenere tutti gli eventi del calendario per un utente
getCalendarEvents(userId) {
    userId = String(userId);
    console.log(`Recupero eventi calendario per utente ${userId}`);
    return this.calendarEvents.filter(event => String(event.userId) === userId);
}

// Metodo per aggiungere un evento al calendario
addCalendarEvent(eventData) {
    const newEvent = {
        ...eventData,
        id: this.calendarEventCounter++,
        createdAt: new Date().toISOString()
    };
    
    console.log(`Aggiunto nuovo evento calendario: ${JSON.stringify(newEvent)}`);
    this.calendarEvents.push(newEvent);
    return newEvent;
}

// Metodo per ottenere un evento del calendario per ID
getCalendarEventById(eventId) {
    eventId = String(eventId);
    return this.calendarEvents.find(event => String(event.id) === eventId);
}

// Metodo per aggiornare un evento del calendario
updateCalendarEvent(eventId, eventData) {
    eventId = String(eventId);
    const index = this.calendarEvents.findIndex(event => String(event.id) === eventId);
    
    if (index !== -1) {
        const updatedEvent = {
            ...this.calendarEvents[index],
            ...eventData,
            updatedAt: new Date().toISOString()
        };
        
        this.calendarEvents[index] = updatedEvent;
        console.log(`Aggiornato evento calendario ${eventId}`);
        return updatedEvent;
    }
    
    return null;
}

// Metodo per eliminare un evento del calendario
deleteCalendarEvent(eventId) {
    eventId = String(eventId);
    const initialLength = this.calendarEvents.length;
    this.calendarEvents = this.calendarEvents.filter(event => String(event.id) !== eventId);
    
    const success = this.calendarEvents.length < initialLength;
    if (success) {
        console.log(`Eliminato evento calendario ${eventId}`);
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

    // Crea un nuovo utente
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

    // Ottieni un utente per email
    getUserByEmail(email) {
        return this.users.find(user => user.email === email);
    }

    // Verifica le credenziali dell'utente
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

    // Aggiorna un utente esistente
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

    // Elimina un utente
    deleteUser(id) {
        const userIndex = this.users.findIndex(user => user.id === id);
        if (userIndex === -1) {
            return false;
        }
        this.users.splice(userIndex, 1);
        return true;
    }

    // === FUNZIONALITÀ DI CHAT ===

    // Aggiungi un nuovo messaggio
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

        console.log(`Salvataggio messaggio: ${senderId} -> ${recipientId}: "${content}"`);
        this.messages.push(message);
        return message;
    }

    // Aggiungi questa funzione alla classe DBMock
getCalendarEvents(userId) {
    console.log(`Recupero eventi calendario per utente ${userId}`);
    
    // Eventi base che verranno restituiti per tutti gli utenti
    const baseEvents = [
      {
        id: 1,
        title: 'Visita Medica',
        start: '2024-12-14T10:00:00',
        end: '2024-12-14T11:00:00',
        description: 'Visita di controllo generale'
      },
      {
        id: 2,
        title: 'Check-up Fisico',
        start: '2024-12-15T09:00:00',
        end: '2024-12-15T10:00:00',
        description: 'Visita di controllo cardiaco'
      }
    ];
    
    // Eventi personalizzati basati sull'ID utente (opzionale)
    // Esempio: se l'ID finisce con un numero specifico, aggiungi un evento personalizzato
    const lastDigit = String(userId).slice(-1);
    if (lastDigit === '4') {
      baseEvents.push({
        id: 3,
        title: 'Consulenza Specialistica',
        start: '2024-12-17T14:00:00',
        end: '2024-12-17T15:00:00',
        description: 'Consulenza con cardiologo'
      });
    }
    
    return baseEvents;
  }
    // Ottieni messaggi tra due utenti
    getMessagesBetweenUsers(userId1, userId2) {
        // Assicura che gli ID siano stringhe per confronti coerenti
        userId1 = String(userId1);
        userId2 = String(userId2);

        console.log(`Recupero messaggi tra ${userId1} e ${userId2}`);

        const messages = this.messages.filter(message =>
            (message.senderId === userId1 && message.recipientId === userId2) ||
            (message.senderId === userId2 && message.recipientId === userId1)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        console.log(`Trovati ${messages.length} messaggi`);
        return messages;
    }

    // Imposta lo stato online di un utente
    setUserOnlineStatus(userId, isOnline) {
        userId = String(userId);
        console.log(`Impostazione stato utente ${userId}: ${isOnline ? 'online' : 'offline'}`);
        this.onlineUsers.set(userId, isOnline);
    }

    // Ottieni lo stato online di un utente
    getUserOnlineStatus(userId) {
        userId = String(userId);
        return this.onlineUsers.get(userId) || false;
    }

    // Ottieni tutti gli utenti online
    getOnlineUsers() {
        const result = [];
        this.onlineUsers.forEach((isOnline, userId) => {
            if (isOnline) {
                result.push(userId);
            }
        });
        return result;
    }

    // Ottieni lo stato di tutti gli utenti
    getAllUsersStatus() {
        const result = [];
        this.onlineUsers.forEach((isOnline, userId) => {
            result.push({ userId, online: isOnline });
        });
        return result;
    }

    // Ottieni utenti disponibili per la chat in base al ruolo
    // Ottieni utenti disponibili per la chat in base al ruolo
    getChatUsers(userRole, userId) {
        console.log(`Ottenendo utenti chat per ${userRole} con ID ${userId}`);

        // Versione semplificata che non dipende da getUserOnlineStatus
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
            console.log(`Trovati ${users.length} utenti per admin`);
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
            console.log(`Trovati ${admins.length} admin per utente`);
            return admins;
        }
    }
}

module.exports = DBMock;