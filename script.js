document.addEventListener('DOMContentLoaded', () => {
    // This is the only listener active on initial load.
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click',initializeApp);
    }
});

function initializeApp() {
    // --- App State ---
    let allPeople = [];

    // --- DATA FUNCTIONS ---
    const defaultPeople = [
        { id: 1, name: 'מאיה', image: 'https://i.pravatar.cc/150?u=maya' },
        { id: 2, name: 'יוסי', image: 'https://i.pravatar.cc/150?u=yossi' },
        { id: 3, name: 'סבתא דליה', image: 'https://i.pravatar.cc/150?u=dalya' }
    ];
    const saveData = (data) => localStorage.setItem('luna_people', JSON.stringify(data));
    const loadData = () => {
        const data = localStorage.getItem('luna_people');
        if (data && data.length > 2) { // check for empty array '[]'
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
            grid.innerHTML = `<p class="no-results">לא נמצאו תוצאות.</p>`;
            return;
        }
        grid.innerHTML = peopleToRender.map(person => {
            const avatarHTML = person.image
                ? `<img src="${person.image}" alt="${person.name}">`
                : `<div class="default-avatar"><i class="fas fa-user"></i></div>`;

            return `
                <div class="person-card">
                    ${avatarHTML}
                    <h3>${person.name}</h3>
                </div>
            `;
        }).join('');
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
                    <input type="url" id="image" placeholder="השאר ריק לתמונת ברירת מחדל">
                    <div class="form-buttons">
                        <button type="submit">שמור</button>
                        <button type="button" id="cancel-btn">ביטול</button>
                    </div>
                </form>
            </div>
        `;
        document.getElementById('new-person-form').addEventListener('submit', handleAddPerson);
        document.getElementById('cancel-btn').addEventListener('click', () => {
            // Re-render the main shell, which includes the grid
            initializeApp();
        });
    };

    // --- EVENT HANDLERS ---
    const handleAddPerson = (event) => {
        event.preventDefault();
        const name = document.getElementById('name').value;
        const image = document.getElementById('image').value; // Let it be empty if not provided
        const newPerson = { id: Date.now(), name, image };
        allPeople.push(newPerson);
        saveData(allPeople);
        initializeApp(); // Re-initialize the app to show the updated list
    };

    const handleSearch = (event) => {
        const searchTerm = event.target.value.toLowerCase();
        const filteredPeople = allPeople.filter(person =>
            person.name.toLowerCase().includes(searchTerm)
        );
        renderPeopleGrid(filteredPeople);
    };

    // --- App Shell Rendering and Main Logic ---
    document.body.innerHTML = `
        <header class="app-header"><h1>Luna</h1><div class="search-container"><input type="search" id="search-bar" placeholder="חיפוש לפי שם..."></div></header>
        <main id="app-main"><div id="people-grid" class="people-grid"></div></main>
        <button id="add-person-btn" class="fab" title="הוסף איש קשר חדש">+</button>
    `;

    allPeople = loadData();
    renderPeopleGrid(allPeople);

    // Attach listeners for the newly rendered shell
    document.getElementById('add-person-btn').addEventListener('click', renderNewPersonForm);
    document.getElementById('search-bar').addEventListener('input', handleSearch);
}
