document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const root = document.getElementById('root');

    // --- App State ---
    let people = [];

    // --- Toast Notification ---
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('hide');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    // --- Data Functions ---
    const defaultPeople = [ { id: 1, name: 'מאיה', group: 'חברים קרובים', important_thing: 'מתחילה קורס צילום בימי שלישי. ב-28.08 יש לה מבחן!', avatar: 'https://i.pravatar.cc/100?u=maya', moments: [ { date: '2025-08-20', text: 'סיפרה שהיא מתחילה קורס צילום.' } ] }, { id: 2, name: 'יוסי', group: 'משפחה', important_thing: 'מחפש עבודה חדשה', avatar: 'https://i.pravatar.cc/100?u=yossi', moments: [] }, { id: 3, name: 'סבתא דליה', group: 'משפחה', important_thing: 'תור לרופא ב-28.8', avatar: 'https://i.pravatar.cc/100?u=dalya', moments: [] } ];
    function savePeopleData(updatedPeople) { localStorage.setItem('luna_people', JSON.stringify(updatedPeople)); }
    function getPeopleData() {
        const peopleFromStorage = localStorage.getItem('luna_people');
        if (peopleFromStorage) {
            return JSON.parse(peopleFromStorage);
        } else {
            localStorage.setItem('luna_people', JSON.stringify(defaultPeople));
            return defaultPeople;
        }
    }

    // --- Reminder Engine ---
    function checkReminders() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        people.forEach(person => {
            const allTexts = [person.important_thing, ...person.moments.map(m => m.text)];
            allTexts.forEach(text => {
                const match = text.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?/);
                if (match) {
                    const day = parseInt(match[1], 10), month = parseInt(match[2], 10) - 1, year = match[3] ? parseInt(match[3], 10) : today.getFullYear();
                    const eventDate = new Date(year, month, day);
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);
                    if (eventDate.getTime() === today.getTime() || eventDate.getTime() === tomorrow.getTime()) {
                        showNotification(`תזכורת עבור ${person.name}`, text);
                    }
                }
            });
        });
    }
    async function showNotification(title, body) {
        if (!("Notification" in window)) return;
        if (Notification.permission === "granted") { new Notification(title, { body, icon: 'assets/logo.svg' }); }
        else if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            if (permission === "granted") { new Notification(title, { body, icon: 'assets/logo.svg' }); }
        }
    }

    // --- Render Functions ---
    function renderAppLayout() {
        root.innerHTML = `<div id="app-container"><header><img src="assets/logo.svg" alt="Luna Logo" class="header-logo"><h1>Luna</h1></header><main id="main-content"></main><button id="add-person-btn" class="fab" title="הוסף איש קשר חדש">+</button></div>`;
        document.getElementById('add-person-btn').addEventListener('click', () => renderNewPersonForm(false, null));
    }
    function renderPeopleList() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        if (people.length === 0) {
            mainContent.innerHTML = `<div class="empty-state"><h2>ברוך הבא ל-Luna!</h2><p>עדיין לא הוספת אנשי קשר. הוסף את הראשון כדי להתחיל.</p><button id="add-first-person-btn" class="button-primary">הוסף איש קשר ראשון</button></div>`;
            document.getElementById('add-first-person-btn').addEventListener('click', () => renderNewPersonForm(false, null));
        } else {
            mainContent.innerHTML = `<section class="people-hub"><h2>אנשי הקשר שלי</h2>${people.map(p => `<article class="person-card" data-person-id="${p.id}"><img src="${p.avatar}" alt="Avatar for ${p.name}" class="avatar"><div class="person-details"><h2>${p.name}</h2><p class="group-tag">${p.group}</p><p class="important-thing"><strong>הדבר החשוב כרגע:</strong> ${p.important_thing}</p></div></article>`).join('')}</section>`;
            addPeopleListEventListeners();
        }
    }
    function renderPersonDetail(person) {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        const momentsHTML = person.moments.map((moment, index) => `<li class="moment-item" data-moment-index="${index}"><div class="moment-content"><span class="moment-date">${moment.date}</span><p class="moment-text">${moment.text}</p></div><div class="moment-controls"><button class="edit-moment-btn">ערוך</button><button class="delete-moment-btn">&times;</button></div></li>`).join('');
        mainContent.innerHTML = `<section class="person-detail-view"><div class="detail-view-controls"><button id="back-to-list-btn" class="back-button">&larr; חזרה</button><div><button id="edit-person-btn" class="edit-button">ערוך</button><button id="delete-person-btn" class="delete-button">מחק</button></div></div><div class="person-detail-header"><img src="${person.avatar}" alt="Avatar for ${person.name}" class="avatar-large"><div class="person-title"><h1>${person.name}</h1><p class="group-tag">${person.group}</p></div></div><div class="important-thing-detail"><h3>הדבר החשוב כרגע:</h3><p>${person.important_thing}</p></div><div class="moments-section"><h3>רגעים אחרונים</h3><form id="add-moment-form"><textarea id="moment-text-input" placeholder="הוסף רגע חדש..." required></textarea><button type="submit">שמור רגע</button></form><ul class="moments-list">${momentsHTML || '<li>לא נרשמו רגעים עדיין.</li>'}</ul></div></section>`;
        addPersonDetailEventListeners(person);
    }
    function renderNewPersonForm(isEdit = false, person = null) {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        const title = isEdit ? "עריכת איש קשר" : "הוספת איש קשר חדש";
        mainContent.innerHTML = `<section class="form-view"><h2>${title}</h2><form id="person-form"><label for="name">שם:</label><input type="text" id="name" value="${person ? person.name : ''}" required><label for="group">קבוצה:</label><input type="text" id="group" value="${person ? person.group : ''}" required><label for="important_thing">הדבר החשוב כרגע:</label><textarea id="important_thing" required>${person ? person.important_thing : ''}</textarea><label for="avatar">קישור לתמונה:</label><input type="url" id="avatar" value="${person ? person.avatar : ''}" placeholder="https://example.com/image.png"><div class="form-buttons"><button type="submit">שמור שינויים</button><button type="button" id="cancel-form">ביטול</button></div></form></section>`;
        addPersonFormEventListeners(isEdit, person);
    }
    function renderSplashScreen() {
        root.innerHTML = `<div id="splash-screen"><img src="assets/logo.svg" alt="Luna Logo" class="splash-logo"><h1 class="splash-title">Luna</h1><p class="splash-tagline">Your personal relationship assistant.</p><button id="start-btn">Get Started</button></div>`;
        document.getElementById('start-btn').addEventListener('click', initApp);
    }

    // --- Event Listeners ---
    function addPeopleListEventListeners() { document.querySelectorAll('.person-card').forEach(card => card.addEventListener('click', () => { const person = people.find(p => p.id == card.dataset.personId); if (person) renderPersonDetail(person); })); }
    function addPersonDetailEventListeners(person) {
        document.getElementById('edit-person-btn').addEventListener('click', () => renderNewPersonForm(true, person));
        document.getElementById('back-to-list-btn').addEventListener('click', () => renderPeopleList());
        document.getElementById('delete-person-btn').addEventListener('click', () => { if (confirm(`האם למחוק את ${person.name}?`)) { people = people.filter(p => p.id !== person.id); savePeopleData(people); renderPeopleList(); showToast('איש הקשר נמחק'); } });
        document.getElementById('add-moment-form').addEventListener('submit', event => { event.preventDefault(); const text = document.getElementById('moment-text-input').value; if (!text.trim()) return; const idx = people.findIndex(p => p.id == person.id); if (idx !== -1) { people[idx].moments.unshift({ date: new Date().toISOString().split('T')[0], text }); savePeopleData(people); renderPersonDetail(people[idx]); showToast('רגע חדש נוסף'); } });
        document.querySelector('.moments-list').addEventListener('click', (event) => {
            const personIndex = people.findIndex(p => p.id === person.id); if (personIndex === -1) return;
            const target = event.target, momentItem = target.closest('.moment-item'); if (!momentItem) return;
            const momentIndex = parseInt(momentItem.dataset.momentIndex, 10);
            if (target.classList.contains('delete-moment-btn')) { if (confirm('למחוק את הרגע?')) { people[personIndex].moments.splice(momentIndex, 1); savePeopleData(people); renderPersonDetail(people[personIndex]); showToast('הרגע נמחק'); } }
            if (target.classList.contains('edit-moment-btn')) { momentItem.querySelector('.moment-content').innerHTML = `<textarea class="moment-edit-textarea">${people[personIndex].moments[momentIndex].text}</textarea>`; target.textContent = 'שמור'; target.classList.replace('edit-moment-btn', 'save-moment-btn'); }
            if (target.classList.contains('save-moment-btn')) { const newText = momentItem.querySelector('.moment-edit-textarea').value; people[personIndex].moments[momentIndex].text = newText; savePeopleData(people); renderPersonDetail(people[personIndex]); showToast('הרגע עודכן'); }
        });
    }
    function addPersonFormEventListeners(isEdit, person) {
        document.getElementById('person-form').addEventListener('submit', event => {
            event.preventDefault();
            const name = document.getElementById('name').value, group = document.getElementById('group').value, important = document.getElementById('important_thing').value, avatar = document.getElementById('avatar').value;
            if (isEdit) {
                const idx = people.findIndex(p => p.id === person.id);
                if (idx !== -1) { people[idx] = { ...people[idx], name, group, important_thing: important, avatar: avatar || `https://i.pravatar.cc/100?u=${person.id}` }; savePeopleData(people); renderPersonDetail(people[idx]); showToast('עודכן בהצלחה'); }
            } else {
                people.push({ id: Date.now(), name, group, important_thing: important, avatar: avatar || `https://i.pravatar.cc/100?u=${Date.now()}`, moments: [] });
                savePeopleData(people); renderPeopleList(); showToast('איש קשר חדש נוסף');
            }
        });
        document.getElementById('cancel-form').addEventListener('click', () => isEdit ? renderPersonDetail(person) : renderPeopleList());
    }

    // --- Initialization ---
    function initApp() {
        const addPersonBtn = document.getElementById('add-person-btn');
        if(addPersonBtn) addPersonBtn.addEventListener('click', () => renderNewPersonForm(false, null));
        people = getPeopleData();
        renderPeopleList();
        setTimeout(checkReminders, 2000);
    }
    renderSplashScreen();
});
