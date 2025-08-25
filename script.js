// This is the combined, fully functional script.
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', initializeApp);
    }
});

function initializeApp() {
    // --- App State ---
    let allPeople = [];
    const themeColors = ['#ED64A6', '#F6E05E', '#48BB78', '#63B3ED'];

    // --- DATA FUNCTIONS ---
    const defaultPeople = [
        { id: 1, name: 'מאיה', image: 'https://i.pravatar.cc/150?u=maya' },
        { id: 2, name: 'יוסי', image: '' },
        { id: 3, name: 'סבתא דליה', image: 'https://i.pravatar.cc/150?u=dalya' }
    ];
    const saveData = (data) => localStorage.setItem('luna_people', JSON.stringify(data));
    const loadData = () => {
        const data = localStorage.getItem('luna_people');
        if (data && data.length > 2) {
            return JSON.parse(data);
        } else {
            saveData(defaultPeople);
            return defaultPeople;
        }
    };

    // --- RENDER FUNCTIONS ---
    const renderPeopleGrid = (peopleToRender) => {
        const grid = document.getElementById('people-grid');
        if (!grid) return;
        if (peopleToRender.length === 0) {
            const searchTerm = document.getElementById('search-bar')?.value || '';
            grid.innerHTML = `<p class="no-results">${searchTerm ? 'לא נמצאו תוצאות.' : 'אין אנשי קשר. הוסף אחד!'}</p>`;
            return;
        }
        grid.innerHTML = peopleToRender.map((person, index) => {
            let avatarHTML;
            if (person.image) {
                avatarHTML = `<img src="${person.image}" alt="${person.name}">`;
            } else {
                const color = themeColors[index % themeColors.length];
                avatarHTML = `<div class="default-avatar" style="background-color: ${color};"><i class="fas fa-user"></i></div>`;
            }
            return `
                <div class="person-card" data-person-id="${person.id}">
                    ${avatarHTML}
                    <h3>${person.name}</h3>
                </div>
            `;
        }).join('');
        document.querySelectorAll('.person-card').forEach(card => card.addEventListener('click', handleCardClick));
    };

    const renderNewPersonForm = () => {
        const main = document.getElementById('app-main');
        if (!main) return;
        main.innerHTML = `
            <div class="form-container">
                <h2>הוספת איש קשר חדש</h2>
                <form id="new-person-form">
                    <label for="name">שם:</label>
                    <input type="text" id="name" required>
                    <label for="image">קישור לתמונה:</label>
                    <input type="url" id="image" placeholder="השאר ריק לאייקון צבעוני">
                    <div class="form-buttons">
                        <button type="submit">שמור</button>
                        <button type="button" id="cancel-btn">ביטול</button>
                    </div>
                </form>
            </div>
        `;
        document.getElementById('new-person-form').addEventListener('submit', handleAddPerson);
        document.getElementById('cancel-btn').addEventListener('click', renderAppShell);
    };

    const renderAppShell = () => {
        document.body.innerHTML = `
            <header class="app-header"><h1>Luna</h1><div class="search-container"><input type="search" id="search-bar" placeholder="חיפוש לפי שם..."></div></header>
            <main id="app-main"><div id="people-grid" class="people-grid"></div></main>
            <button id="add-person-btn" class="fab" title="הוסף איש קשר חדש">+</button>
        `;
        allPeople = loadData();
        renderPeopleGrid(allPeople);
        document.getElementById('add-person-btn').addEventListener('click', renderNewPersonForm);
        document.getElementById('search-bar').addEventListener('input', handleSearch);
    };

    // --- EVENT HANDLERS ---
    const handleAddPerson = (event) => {
        event.preventDefault();
        const name = document.getElementById('name').value;
        const image = document.getElementById('image').value;
        const newPerson = { id: Date.now(), name, image };
        allPeople.push(newPerson);
        saveData(allPeople);
        renderAppShell();
    };

    const handleSearch = (event) => {
        const searchTerm = event.target.value.toLowerCase();
        const filteredPeople = allPeople.filter(person => person.name.toLowerCase().includes(searchTerm));
        renderPeopleGrid(filteredPeople);
    };

    const handleCardClick = (event) => {
        const personId = parseInt(event.currentTarget.dataset.personId, 10);
        if (confirm('האם למחוק את איש הקשר?')) {
            allPeople = allPeople.filter(p => p.id !== personId);
            saveData(allPeople);
            renderPeopleGrid(allPeople);
        }
    };

    // --- INITIALIZATION of the main app ---
    renderAppShell();
}
