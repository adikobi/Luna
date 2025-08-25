// THIS IS THE FINAL, DEFINITIVE, COMPLETE SCRIPT.
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', initializeApp);
    }
});

function initializeApp() {
    let allPeople = [];
    const themeColors = ['#ED64A6', '#F6E05E', '#48BB78', '#63B3ED'];

    const defaultPeople = [
        { id: 1, name: 'מאיה', image: 'https://i.pravatar.cc/150?u=maya', moments: [{date: "2025-08-25", text: "This is a sample moment."}] },
        { id: 2, name: 'יוסי', image: '', moments: [] },
        { id: 3, name: 'סבתא דליה', image: 'https://i.pravatar.cc/150?u=dalya', moments: [] }
    ];
    const saveData = (data) => localStorage.setItem('luna_people', JSON.stringify(data));
    const loadData = () => {
        const data = localStorage.getItem('luna_people');
        if (data && JSON.parse(data).length > 0) {
            return JSON.parse(data);
        } else {
            const initialData = defaultPeople.map(p => ({ ...p, moments: p.moments || [] }));
            saveData(initialData);
            return initialData;
        }
    };

    const renderPeopleGrid = (peopleToRender) => {
        const grid = document.getElementById('people-grid');
        if (!grid) return;
        if (peopleToRender.length === 0) {
            grid.innerHTML = `<p class="no-results">לא נמצאו אנשי קשר.</p>`;
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
        main.innerHTML = `<div class="form-container"><h2>הוספת איש קשר חדש</h2><form id="new-person-form"><label for="name">שם:</label><input type="text" id="name" required><label for="image">קישור לתמונה:</label><input type="url" id="image" placeholder="השאר ריק לאייקון צבעוני"><div class="form-buttons"><button type="submit">שמור</button><button type="button" id="cancel-btn">ביטול</button></div></form></div>`;
        document.getElementById('new-person-form').addEventListener('submit', handleAddPerson);
        document.getElementById('cancel-btn').addEventListener('click', renderAppShell);
    };

    const renderPersonDetail = (personId) => {
        const person = allPeople.find(p => p.id === personId);
        if (!person) { renderAppShell(); return; }
        const color = themeColors[allPeople.indexOf(person) % themeColors.length];
        const avatarHTML = person.image ? `<img src="${person.image}" alt="${person.name}" class="detail-avatar-img">` : `<div class="default-avatar detail-avatar-icon" style="background-color: ${color}"><i class="fas fa-user"></i></div>`;
        const momentsHTML = (person.moments || []).map((moment, index) => `<li class="moment-item" data-moment-index="${index}"><div class="moment-content"><p class="moment-date">${moment.date}</p><p class="moment-text">${moment.text}</p></div><div class="moment-controls"><button class="edit-moment-btn">ערוך</button><button class="delete-moment-btn">&times;</button></div></li>`).join('');
        document.body.innerHTML = `<header class="app-header"><button id="back-to-grid" class="back-button">&larr; חזרה</button><h1>${person.name}</h1><button id="delete-person-btn" class="delete-person-button">מחק</button></header><main id="app-main"><div class="person-detail-header">${avatarHTML}</div><section class="moments-section"><h2>הוסף רגע חדש</h2><form id="add-moment-form"><textarea id="moment-text-input" placeholder="כתוב כאן משהו..." required></textarea><button type="submit">שמור רגע</button></form><h2>רגעים</h2><ul class="moments-list">${(person.moments || []).length > 0 ? momentsHTML : '<p class="no-results">אין עדיין רגעים.</p>'}</ul></section></main>`;
        addPersonDetailEventListeners(personId);
    };

    const renderAppShell = () => {
        document.body.innerHTML = `<header class="app-header"><h1>Luna</h1><div class="search-container"><input type="search" id="search-bar" placeholder="חיפוש לפי שם..."></div></header><main id="app-main"><div id="people-grid" class="people-grid"></div></main><button id="add-person-btn" class="fab" title="הוסף איש קשר חדש">+</button>`;
        allPeople = loadData();
        renderPeopleGrid(allPeople);
        document.getElementById('add-person-btn').addEventListener('click', renderNewPersonForm);
        document.getElementById('search-bar').addEventListener('input', handleSearch);
    };

    const handleAddPerson = (event) => { event.preventDefault(); const name = document.getElementById('name').value; const image = document.getElementById('image').value; allPeople.push({ id: Date.now(), name, image, moments: [] }); saveData(allPeople); renderAppShell(); };
    const handleSearch = (event) => { const searchTerm = event.target.value.toLowerCase(); renderPeopleGrid(allPeople.filter(p => p.name.toLowerCase().includes(searchTerm))); };
    const handleCardClick = (event) => { renderPersonDetail(parseInt(event.currentTarget.dataset.personId, 10)); };

    const addPersonDetailEventListeners = (personId) => {
        document.getElementById('back-to-grid').addEventListener('click', renderAppShell);
        document.getElementById('delete-person-btn').addEventListener('click', () => { if (confirm('האם למחוק את איש הקשר?')) { allPeople = allPeople.filter(p => p.id !== personId); saveData(allPeople); renderAppShell(); } });
        document.getElementById('add-moment-form').addEventListener('submit', (event) => {
            event.preventDefault();
            const momentText = document.getElementById('moment-text-input').value;
            if (!momentText.trim()) return;
            const personIndex = allPeople.findIndex(p => p.id === personId);
            if (personIndex !== -1) {
                allPeople[personIndex].moments.unshift({ date: new Date().toLocaleDateString('en-CA'), text: momentText });
                saveData(allPeople);
                renderPersonDetail(personId);
            }
        });
        const momentsList = document.querySelector('.moments-list');
        if (momentsList) {
            momentsList.addEventListener('click', (event) => {
                const personIndex = allPeople.findIndex(p => p.id === personId);
                if (personIndex === -1) return;
                const target = event.target;
                const momentItem = target.closest('.moment-item');
                if (!momentItem) return;
                const momentIndex = parseInt(momentItem.dataset.momentIndex, 10);
                if (target.classList.contains('delete-moment-btn')) {
                    if (confirm('האם למחוק את הרגע?')) {
                        allPeople[personIndex].moments.splice(momentIndex, 1);
                        saveData(allPeople);
                        renderPersonDetail(personId);
                    }
                }
                if (target.classList.contains('edit-moment-btn')) {
                    const momentContent = momentItem.querySelector('.moment-content');
                    const currentText = momentContent.querySelector('.moment-text').textContent;
                    // Replace the content div with a textarea for editing
                    momentContent.innerHTML = `<textarea class="moment-edit-textarea">${currentText}</textarea>`;
                    target.textContent = 'שמור';
                    target.classList.replace('edit-moment-btn', 'save-moment-btn');
                }
                if (target.classList.contains('save-moment-btn')) {
                    const newText = momentItem.querySelector('.moment-edit-textarea').value;
                    allPeople[personIndex].moments[momentIndex].text = newText;
                    saveData(allPeople);
                    renderPersonDetail(personId);
                }
            });
        }
    };

    renderAppShell();
}

// Attach listener directly, since script is at the end of the body
const startBtnGlobal = document.getElementById('start-btn');
if (startBtnGlobal) {
    startBtnGlobal.addEventListener('click', initializeApp);
}
