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
                email: 'fabrizio@example.com',
                password: 'abcdef',
                sesso: 'M',
                eta: 22,
                ruolo: 'user'
            },
        ];

        this.userCounter = this.users.length ? this.users[this.users.length - 1].id + 1 : 1;
    }
   
    // Ottieni tutti gli utenti
    getAllUsers() {
        return this.users.map(user => ({ ...user, password: undefined })); // Escludi la password
    }

    // Ottieni un utente per ID
    getUserById(id) {
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
            // Determina la pagina di reindirizzamento in base al ruolo
            const redirectPage = user.ruolo === 'admin' ? 'admin.html' : 'paziente.html';
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
}

module.exports = DBMock;
