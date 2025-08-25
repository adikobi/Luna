document.addEventListener('DOMContentLoaded', () => {
    // Firebase services are initialized in index.html
    const auth = firebase.auth();
    const db = firebase.firestore();

    // UI Elements
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const loginFormContainer = document.getElementById('login-form-container');
    const registerFormContainer = document.getElementById('register-form-container');
    const loadingIndicator = document.createElement('div');
    loadingIndicator.textContent = "טוען...";
    loadingIndicator.style.display = 'none';
    authContainer.appendChild(loadingIndicator);

    // --- Authentication Logic ---

    // Toggle between login and register forms
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginFormContainer.style.display = 'none';
        registerFormContainer.style.display = 'block';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerFormContainer.style.display = 'none';
        loginFormContainer.style.display = 'block';
    });

    // Handle Registration
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        loadingIndicator.style.display = 'block';

        auth.createUserWithEmailAndPassword(email, password)
            .catch(error => {
                alert(`ההרשמה נכשלה: ${error.message}`);
                console.error('Registration error:', error);
            })
            .finally(() => {
                loadingIndicator.style.display = 'none';
            });
    });

    // Handle Login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        loadingIndicator.style.display = 'block';

        auth.signInWithEmailAndPassword(email, password)
            .catch(error => {
                alert(`ההתחברות נכשלה: ${error.message}`);
                console.error('Login error:', error);
            })
            .finally(() => {
                loadingIndicator.style.display = 'none';
            });
    });

    // --- Auth State Listener ---
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            startApp(user, db);
        } else {
            // User is signed out
            authContainer.style.display = 'flex';
            appContainer.style.display = 'none';
            appContainer.innerHTML = ''; // Clear the app content
        }
    });
});


// --- Main Application Logic ---
async function startApp(user, db) {
    const appContainer = document.getElementById('app-container');
    let allPeople = [];
    const themeColors = ['#ED64A6', '#F6E05E', '#48BB78', '#63B3ED'];
    const userDocRef = db.collection('users').doc(user.uid);

    const saveData = async (data) => {
        try {
            await userDocRef.set({ people: data });
        } catch (error) {
            console.error("Error saving data: ", error);
            alert("שגיאה בשמירת הנתונים לענן.");
        }
    };

    const loadData = async () => {
        try {
            const doc = await userDocRef.get();
            if (doc.exists && doc.data().people) {
                return doc.data().people;
            } else {
                // New user. Create an empty list.
                const emptyPeopleList = [];
                await saveData(emptyPeopleList); // Save the empty list to establish the document
                return emptyPeopleList;
            }
        } catch (error) {
            console.error("Error loading data: ", error);
            alert("שגיאה בטעינת הנתונים מהענן.");
            return []; // Return empty array on error
        }
    };

    const renderPeopleGrid = (peopleToRender) => {
        const grid = document.getElementById('people-grid');
        if (!grid) return;
        if (peopleToRender.length === 0) {
            grid.innerHTML = `<p class="no-results">לא נמצאו אנשי קשר. לחץ על '+' כדי להוסיף.</p>`;
        } else {
            grid.innerHTML = peopleToRender.map((person, index) => {
                const color = themeColors[index % themeColors.length];
                const avatarHTML = person.image ? `<img src="${person.image}" alt="${person.name}">` : `<div class="default-avatar" style="background-color: ${color};"><i class="fas fa-user"></i></div>`;
                return `<div class="person-card" data-person-id="${person.id}">${avatarHTML}<h3>${person.name}</h3></div>`;
            }).join('');
            document.querySelectorAll('.person-card').forEach(card => card.addEventListener('click', handleCardClick));
        }
    };

    const renderNewPersonForm = () => {
        const main = document.getElementById('app-main');
        if (!main) return;
        main.innerHTML = `<div class="form-container"><h2>הוספת איש קשר חדש</h2><form id="new-person-form"><label for="name">שם:</label><input type="text" id="name" required><label for="image">קישור לתמונה (אופציונלי):</label><input type="url" id="image" placeholder="השאר ריק לאייקון צבעוני"><div class="form-buttons"><button type="submit">שמור</button><button type="button" id="cancel-btn">ביטול</button></div></form></div>`;
        document.getElementById('new-person-form').addEventListener('submit', handleAddPerson);
        document.getElementById('cancel-btn').addEventListener('click', renderAppShell);
    };

    const renderPersonDetail = (personId) => {
        const person = allPeople.find(p => p.id === personId);
        if (!person) { renderAppShell(); return; }
        const color = themeColors[allPeople.findIndex(p => p.id === personId) % themeColors.length];
        const avatarHTML = person.image ? `<img src="${person.image}" alt="${person.name}" class="detail-avatar-img">` : `<div class="default-avatar detail-avatar-icon" style="background-color: ${color}"><i class="fas fa-user"></i></div>`;
        const momentsHTML = (person.moments || []).map((moment, index) => `<li class="moment-item" data-moment-index="${index}"><div class="moment-content"><p class="moment-date">${moment.date}</p><p class="moment-text">${moment.text}</p></div><div class="moment-controls"><button class="edit-moment-btn">ערוך</button><button class="delete-moment-btn">&times;</button></div></li>`).join('');

        appContainer.innerHTML = `<header class="app-header"><button id="back-to-grid" class="back-button">&larr; חזרה</button><h1>${person.name}</h1><button id="delete-person-btn" class="delete-person-button">מחק איש קשר</button></header><main id="app-main"><div class="person-detail-header">${avatarHTML}</div><section class="moments-section"><h2>הוסף רגע חדש</h2><form id="add-moment-form"><textarea id="moment-text-input" placeholder="כתוב כאן משהו..." required></textarea><button type="submit">שמור רגע</button></form><h2>רגעים</h2><ul class="moments-list">${(person.moments || []).length > 0 ? momentsHTML : '<p class="no-results">אין עדיין רגעים.</p>'}</ul></section></main>`;
        addPersonDetailEventListeners(personId);
    };

    const renderAppShell = () => {
        appContainer.innerHTML = `<header class="app-header"><h1>Luna</h1><div class="search-container"><input type="search" id="search-bar" placeholder="חיפוש לפי שם..."></div><button id="logout-btn">התנתק</button></header><main id="app-main"><div id="people-grid" class="people-grid"></div></main><button id="add-person-btn" class="fab" title="הוסף איש קשר חדש">+</button>`;
        renderPeopleGrid(allPeople);
        document.getElementById('add-person-btn').addEventListener('click', renderNewPersonForm);
        document.getElementById('search-bar').addEventListener('input', handleSearch);
        document.getElementById('logout-btn').addEventListener('click', () => firebase.auth().signOut());
    };

    const handleAddPerson = async (event) => {
        event.preventDefault();
        const name = document.getElementById('name').value;
        const image = document.getElementById('image').value;
        allPeople.push({ id: Date.now(), name, image, moments: [] });
        await saveData(allPeople);
        renderAppShell();
    };
    const handleSearch = (event) => { const searchTerm = event.target.value.toLowerCase(); renderPeopleGrid(allPeople.filter(p => p.name.toLowerCase().includes(searchTerm))); };
    const handleCardClick = (event) => { renderPersonDetail(parseInt(event.currentTarget.dataset.personId, 10)); };

    const addPersonDetailEventListeners = (personId) => {
        document.getElementById('back-to-grid').addEventListener('click', renderAppShell);

        document.getElementById('delete-person-btn').addEventListener('click', async () => {
            if (confirm('האם למחוק את איש הקשר וכל הרגעים שלו?')) {
                allPeople = allPeople.filter(p => p.id !== personId);
                await saveData(allPeople);
                renderAppShell();
            }
        });

        document.getElementById('add-moment-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            const momentText = document.getElementById('moment-text-input').value;
            if (!momentText.trim()) return;
            const personIndex = allPeople.findIndex(p => p.id === personId);
            if (personIndex !== -1) {
                allPeople[personIndex].moments.unshift({ date: new Date().toLocaleDateString('en-CA'), text: momentText });
                await saveData(allPeople);
                renderPersonDetail(personId);
            }
        });

        const momentsList = document.querySelector('.moments-list');
        if (momentsList) {
            momentsList.addEventListener('click', async (event) => {
                const personIndex = allPeople.findIndex(p => p.id === personId);
                if (personIndex === -1) return;
                const target = event.target;
                const momentItem = target.closest('.moment-item');
                if (!momentItem) return;
                const momentIndex = parseInt(momentItem.dataset.momentIndex, 10);

                if (target.classList.contains('delete-moment-btn')) {
                    if (confirm('האם למחוק את הרגע?')) {
                        allPeople[personIndex].moments.splice(momentIndex, 1);
                        await saveData(allPeople);
                        renderPersonDetail(personId);
                    }
                } else if (target.classList.contains('edit-moment-btn')) {
                    const momentContent = momentItem.querySelector('.moment-content');
                    const currentText = momentContent.querySelector('.moment-text').textContent;
                    momentContent.innerHTML = `<textarea class="moment-edit-textarea">${currentText}</textarea>`;
                    target.textContent = 'שמור';
                    target.classList.replace('edit-moment-btn', 'save-moment-btn');
                } else if (target.classList.contains('save-moment-btn')) {
                    const newText = momentItem.querySelector('.moment-edit-textarea').value;
                    allPeople[personIndex].moments[momentIndex].text = newText;
                    await saveData(allPeople);
                    renderPersonDetail(personId);
                }
            });
        }
    };

    // Initial loading sequence
    appContainer.innerHTML = `<header class="app-header"><h1>Luna</h1></header><main id="app-main"><p class="loading-text">טוען נתונים...</p></main>`;
    allPeople = await loadData();
    renderAppShell();
}
