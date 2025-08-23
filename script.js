document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const splashScreen = document.getElementById('splash-screen');
    const appContainer = document.getElementById('app-container');
    const startBtn = document.getElementById('start-btn');
    const mainContent = document.getElementById('main-content');
    const addPersonBtn = document.getElementById('add-person-btn');

    // --- App State ---
    let people = [];

    // --- Data Functions ---
    const defaultPeople = [ { id: 1, name: 'מאיה', group: 'חברים קרובים', important_thing: 'מתחילה קורס צילום בימי שלישי', avatar: 'https://i.pravatar.cc/100?u=maya', moments: [ { date: '2025-08-20', text: 'סיפרה שהיא מתחילה קורס צילום.' }, { date: '2025-08-15', text: 'דיברנו על סרטים חדשים.' } ] }, { id: 2, name: 'יוסי', group: 'משפחה', important_thing: 'מחפש עבודה חדשה בתחום ההייטק', avatar: 'https://i.pravatar.cc/100?u=yossi', moments: [] }, { id: 3, name: 'סבתא דליה', group: 'משפחה', important_thing: 'תור לרופא ב-28.8', avatar: 'https://i.pravatar.cc/100?u=dalya', moments: [] }, { id: 4, name: 'אורי', group: 'קולגות לעבודה', important_thing: 'עובד על פרויקט גדול בעבודה', avatar: 'https://i.pravatar.cc/100?u=uri', moments: [] } ];

    function savePeopleData(updatedPeople) {
        localStorage.setItem('luna_people', JSON.stringify(updatedPeople));
    }

    function getPeopleData() {
        const peopleFromStorage = localStorage.getItem('luna_people');
        if (peopleFromStorage) {
            return JSON.parse(peopleFromStorage);
        } else {
            localStorage.setItem('luna_people', JSON.stringify(defaultPeople));
            return defaultPeople;
        }
    }

    // --- Render Functions ---
    function renderPeopleList() {
        addPersonBtn.classList.remove('hidden');
        const peopleListHTML = people.map(person => `
            <article class="person-card" data-person-id="${person.id}">
                <img src="${person.avatar}" alt="Avatar for ${person.name}" class="avatar">
                <div class="person-details"><h2>${person.name}</h2><p class="group-tag">${person.group}</p><p class="important-thing"><strong>הדבר החשוב כרגע:</strong> ${person.important_thing}</p></div>
            </article>
        `).join('');
        mainContent.innerHTML = `<section class="people-hub"><h2>אנשי הקשר שלי</h2>${peopleListHTML}</section>`;
        addPeopleListEventListeners();
    }

    function renderPersonDetail(person) {
        addPersonBtn.classList.add('hidden');
        const momentsHTML = person.moments.map((moment, index) => `
            <li class="moment-item">
                <div>
                    <span class="moment-date">${moment.date}</span>
                    <p class="moment-text">${moment.text}</p>
                </div>
                <button class="delete-moment-btn" data-moment-index="${index}">&times;</button>
            </li>
        `).join('');
        const detailHTML = `
            <section class="person-detail-view">
                <div class="detail-view-controls">
                    <button id="back-to-list-btn" class="back-button">&larr; חזרה</button>
                    <button id="delete-person-btn" class="delete-button">מחק איש קשר</button>
                </div>
                <div class="person-detail-header">
                    <img src="${person.avatar}" alt="Avatar for ${person.name}" class="avatar-large">
                    <div class="person-title"><h1>${person.name}</h1><p class="group-tag">${person.group}</p></div>
                </div>
                <div class="important-thing-detail"><h3>הדבר החשוב כרגע:</h3><p>${person.important_thing}</p></div>
                <div class="moments-section">
                    <h3>רגעים אחרונים</h3>
                    <form id="add-moment-form"><textarea id="moment-text-input" placeholder="הוסף רגע חדש..." required></textarea><button type="submit">שמור רגע</button></form>
                    <ul class="moments-list">${momentsHTML || '<li>לא נרשמו רגעים עדיין.</li>'}</ul>
                </div>
            </section>`;
        mainContent.innerHTML = detailHTML;
        addPersonDetailEventListeners(person);
    }

    function renderNewPersonForm() {
        addPersonBtn.classList.add('hidden');
        const formHTML = `
            <section class="form-view">
                <h2>הוספת איש קשר חדש</h2>
                <form id="new-person-form">
                    <label for="name">שם:</label><input type="text" id="name" required>
                    <label for="group">קבוצה:</label><input type="text" id="group" required>
                    <label for="important_thing">הדבר החשוב כרגע:</label><textarea id="important_thing" required></textarea>
                    <label for="avatar">קישור לתמונה:</label><input type="url" id="avatar" placeholder="https://example.com/image.png">
                    <div class="form-buttons"><button type="submit">שמור</button><button type="button" id="cancel-add-person">ביטול</button></div>
                </form>
            </section>`;
        mainContent.innerHTML = formHTML;
        addNewPersonFormEventListeners();
    }

    // --- Event Listeners ---
    function addPeopleListEventListeners() {
        document.querySelectorAll('.person-card').forEach(card => {
            card.addEventListener('click', () => {
                const person = people.find(p => p.id == card.dataset.personId);
                if (person) renderPersonDetail(person);
            });
        });
    }

    function addPersonDetailEventListeners(person) {
        document.getElementById('add-moment-form').addEventListener('submit', event => {
            event.preventDefault();
            const momentText = document.getElementById('moment-text-input').value;
            if (!momentText.trim()) return;
            const personIndex = people.findIndex(p => p.id == person.id);
            if (personIndex !== -1) {
                people[personIndex].moments.unshift({ date: new Date().toISOString().split('T')[0], text: momentText });
                savePeopleData(people);
                renderPersonDetail(people[personIndex]);
            }
        });

        document.getElementById('delete-person-btn').addEventListener('click', () => {
            if (confirm(`האם אתה בטוח שברצונך למחוק את ${person.name}?`)) {
                people = people.filter(p => p.id !== person.id);
                savePeopleData(people);
                renderPeopleList();
            }
        });

        document.querySelector('.moments-list').addEventListener('click', (event) => {
            if (event.target.classList.contains('delete-moment-btn')) {
                const momentIndex = parseInt(event.target.dataset.momentIndex, 10);
                if (confirm('האם אתה בטוח שברצונך למחוק את הרגע הזה?')) {
                    const personIndex = people.findIndex(p => p.id === person.id);
                    if (personIndex !== -1) {
                        people[personIndex].moments.splice(momentIndex, 1);
                        savePeopleData(people);
                        renderPersonDetail(people[personIndex]);
                    }
                }
            }
        });

        document.getElementById('back-to-list-btn').addEventListener('click', () => renderPeopleList());
    }

    function addNewPersonFormEventListeners() {
        document.getElementById('new-person-form').addEventListener('submit', event => {
            event.preventDefault();
            people.push({
                id: Date.now(),
                name: document.getElementById('name').value,
                group: document.getElementById('group').value,
                important_thing: document.getElementById('important_thing').value,
                avatar: document.getElementById('avatar').value || `https://i.pravatar.cc/100?u=${Date.now()}`,
                moments: []
            });
            savePeopleData(people);
            renderPeopleList();
        });
        document.getElementById('cancel-add-person').addEventListener('click', () => renderPeopleList());
    }

    // --- Initialization ---
    function init() {
        people = getPeopleData();
        renderPeopleList();
        addPersonBtn.addEventListener('click', renderNewPersonForm);
    }

    startBtn.addEventListener('click', () => {
        splashScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
        init();
    });
});
