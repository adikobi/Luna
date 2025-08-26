document.addEventListener('DOMContentLoaded', () => {
    // Firebase services are initialized in index.html
    const auth = firebase.auth();
    const db = firebase.firestore();

    // UI Elements
    const splashScreen = document.getElementById('splash-screen');
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
        setTimeout(() => {
            if (splashScreen) splashScreen.style.display = 'none';

            if (user) {
                appContainer.style.display = 'block';
                startApp(user, db);
            } else {
                authContainer.style.display = 'flex';
            }
        }, 1500);
    });
});


// --- Main Application Logic ---
async function startApp(user, db) {
    const appContainer = document.getElementById('app-container');
    let allPeople = [];
    let newMomentTags = []; // Temp state for tags of a new moment
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

    const renderFilteredMoments = (person, searchTerm = '') => {
        const momentsListUL = document.querySelector('.moments-list');
        if (!momentsListUL) return;

        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const moments = person.moments || [];

        const filteredMoments = moments
            .map((moment, index) => ({ ...moment, originalIndex: index }))
            .filter(moment => moment.text.toLowerCase().includes(lowerCaseSearchTerm));

        if (filteredMoments.length === 0) {
            const message = searchTerm ? 'לא נמצאו רגעים תואמים לחיפוש.' : 'אין עדיין רגעים.';
            momentsListUL.innerHTML = `<p class="no-results">${message}</p>`;
            return;
        }

        const momentsHTML = filteredMoments.map(moment => {
            const date = new Date(moment.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });

            const tagsHTML = (moment.tags && moment.tags.length > 0)
                ? `<div class="moment-tags">${moment.tags.map(tag => `<span class="moment-tag">#${tag}</span>`).join('')}</div>`
                : '';

            return `<li class="moment-item" data-moment-index="${moment.originalIndex}">
                <div class="moment-content">
                    <p class="moment-date">${date}</p>
                    <p class="moment-text">${moment.text}</p>
                    ${tagsHTML}
                </div>
                <div class="moment-controls">
                    <button class="edit-moment-btn">ערוך</button>
                    <button class="delete-moment-btn">&times;</button>
                </div>
            </li>`
        }).join('');

        momentsListUL.innerHTML = momentsHTML;
    };

    const renderPersonDetail = (personId) => {
        const person = allPeople.find(p => p.id === personId);
        if (!person) { renderAppShell(); return; }
        const color = themeColors[allPeople.findIndex(p => p.id === personId) % themeColors.length];
        const avatarHTML = person.image ? `<img src="${person.image}" alt="${person.name}" class="detail-avatar-img">` : `<div class="default-avatar detail-avatar-icon" style="background-color: ${color}"><i class="fas fa-user"></i></div>`;

        appContainer.innerHTML = `<header class="app-header detail-header"><button id="back-to-grid" class="back-button">&larr; חזרה</button><h1>${person.name}</h1><button id="delete-person-btn" class="delete-person-button">מחק איש קשר</button></header><main id="app-main"><div class="person-detail-header">${avatarHTML}</div><section class="moments-section"><h2>הוסף רגע חדש</h2><form id="add-moment-form"><textarea id="moment-text-input" placeholder="כתוב כאן משהו..." required></textarea><div class="floating-form-buttons"><button type="button" id="add-tags-btn" class="form-icon-btn" title="הוסף תגיות"><i class="fas fa-hashtag"></i></button><button type="submit" class="form-icon-btn" title="שמור רגע"><i class="fas fa-check"></i></button></div></form><div id="staged-tags-container"></div><h2>רגעים</h2><div class="moment-search-container"><input type="search" id="moment-search-bar" placeholder="חיפוש ברגעים..."></div><div id="moment-list-container"><ul class="moments-list"></ul></div></section></main>`;

        renderFilteredMoments(person);
        addPersonDetailEventListeners(personId);
    };

    const renderResultsList = (results) => {
        const listUL = document.querySelector('.search-results-list');
        if (!listUL) return;

        if (results.length === 0) {
            listUL.innerHTML = '<p class="no-results">לא נמצאו רגעים תואמים.</p>';
            return;
        }

        listUL.innerHTML = results.map(result => {
            const date = new Date(result.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const tagsHTML = (result.tags && result.tags.length > 0)
                ? `<div class="moment-tags">${result.tags.map(tag => `<span class="moment-tag">#${tag}</span>`).join('')}</div>`
                : '';

            return `
                <li class="search-result-item">
                    <div class="moment-content">
                        <p class="moment-date">${date}</p>
                        <p class="moment-text">${result.text}</p>
                        ${tagsHTML}
                    </div>
                    <div class="result-person-info">
                        <p>מתוך: <a href="#" class="person-link" data-person-id="${result.personId}">${result.personName}</a></p>
                    </div>
                </li>
            `;
        }).join('');
    };

    const renderSearchResultsView = (initialResults) => {
        const headerHTML = `<header class="app-header search-results-header">
                                <button id="back-to-shell" class="back-button">&larr; חזרה</button>
                                <h1>תוצאות</h1>
                                <div class="search-container">
                                    <input type="search" id="results-filter-bar" placeholder="סנן תוצאות...">
                                </div>
                            </header>`;

        appContainer.innerHTML = `${headerHTML}<main id="app-main"><ul class="search-results-list"></ul></main>`;

        renderResultsList(initialResults);

        document.getElementById('back-to-shell').addEventListener('click', renderAppShell);

        document.getElementById('results-filter-bar').addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase();
            const filteredResults = initialResults.filter(result =>
                result.text.toLowerCase().includes(searchTerm) ||
                (result.tags || []).some(tag => tag.toLowerCase().includes(searchTerm))
            );
            renderResultsList(filteredResults);
        });

        const mainContent = document.getElementById('app-main');
        if (mainContent) {
            mainContent.addEventListener('click', (event) => {
                const target = event.target.closest('.person-link');
                if (target) {
                    event.preventDefault();
                    const personId = parseInt(target.dataset.personId, 10);
                    renderPersonDetail(personId);
                }
            });
        }
    };

    const handleGlobalMomentSearch = (event) => {
        const searchTerm = event.target.value.toLowerCase();

        const allMoments = allPeople.flatMap(person =>
            (person.moments || []).map(moment => ({
                ...moment,
                personId: person.id,
                personName: person.name
            }))
        );

        const filteredMoments = allMoments.filter(moment =>
            moment.text.toLowerCase().includes(searchTerm)
        );

        renderSearchResultsView(filteredMoments);
    };

    const openTagFilterModal = () => {
        const allTags = allPeople.flatMap(p => p.moments.flatMap(m => m.tags || []));
        const uniqueTags = [...new Set(allTags)].sort();
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        let tagsHTML = uniqueTags.length > 0 ? uniqueTags.map(tag => `<button class="modal-tag-btn" data-tag="${tag}">#${tag}</button>`).join('') : '<p>לא נמצאו תגיות להצגה.</p>';
        modalOverlay.innerHTML = `<div class="modal-content"><div class="modal-header"><h2>סינון לפי תגית</h2><button class="modal-close-btn">&times;</button></div><div class="modal-body">${tagsHTML}</div></div>`;
        document.body.appendChild(modalOverlay);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close-btn')) modalOverlay.remove();
            if (e.target.classList.contains('modal-tag-btn')) {
                const tag = e.target.dataset.tag;
                const results = allPeople.flatMap(p => p.moments.filter(m => (m.tags || []).includes(tag)).map(m => ({...m, personId: p.id, personName: p.name })));
                renderSearchResultsView(results);
                modalOverlay.remove();
            }
        });
    };
    const openEditMomentModal = (personId, momentIndex) => {
        const person = allPeople.find(p => p.id === personId);
        const moment = person?.moments[momentIndex];
        if (!moment) return;
        newMomentTags = [...(moment.tags || [])];
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `<div class="modal-content"><div class="modal-header"><h2>עריכת רגע</h2><button class="modal-close-btn">&times;</button></div><div class="modal-body"><textarea id="edit-moment-text" class="moment-edit-textarea">${moment.text}</textarea><h4 style="margin-top: 1rem;">תגיות</h4><div class="add-tag-input-container"><input type="text" id="edit-tags-input" placeholder="הקלד תגית..."><button type="button" id="edit-add-tag-btn" class="header-button">הוסף</button></div><div class="new-moment-tags-display"></div></div><div class="modal-footer"><button id="save-changes-btn" class="header-button">שמור שינויים</button></div></div>`;
        document.body.appendChild(modalOverlay);
        renderNewMomentTags();
        const tagsInput = document.getElementById('edit-tags-input');
        const addTag = () => {
            const newTag = tagsInput.value.trim().replace(/#/g, '');
            if (newTag && !newMomentTags.includes(newTag)) { newMomentTags.push(newTag); renderNewMomentTags(); }
            tagsInput.value = ''; tagsInput.focus();
        };
        document.getElementById('edit-add-tag-btn').addEventListener('click', addTag);
        tagsInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } });
        document.getElementById('save-changes-btn').addEventListener('click', async () => {
            const newText = document.getElementById('edit-moment-text').value;
            if (!newText.trim()) return alert("הרגע לא יכול להיות ריק.");
            const personIndex = allPeople.findIndex(p => p.id === personId);
            if (personIndex !== -1) {
                allPeople[personIndex].moments[momentIndex].text = newText;
                allPeople[personIndex].moments[momentIndex].tags = [...newMomentTags];
                await saveData(allPeople);
                modalOverlay.remove();
                newMomentTags = [];
                renderPersonDetail(personId);
                showToast("השינויים נשמרו!");
            }
        });
        modalOverlay.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close-btn')) { modalOverlay.remove(); newMomentTags = []; }
            if (e.target.classList.contains('delete-tag-btn')) { newMomentTags.splice(parseInt(e.target.parentElement.dataset.index, 10), 1); renderNewMomentTags(); }
        });
    };

    const renderAppShell = () => {
        appContainer.innerHTML = `<header class="app-header"><h1>Luna</h1><div class="search-container"><input type="search" id="search-bar" placeholder="חיפוש איש קשר..."></div><button id="global-search-btn" class="header-button">חיפוש רגעים</button><button id="tag-filter-btn" class="header-button">סינון לפי תגית</button><button id="logout-btn">התנתק</button></header><main id="app-main"><div id="people-grid" class="people-grid"></div></main><button id="add-person-btn" class="fab" title="הוסף איש קשר חדש">+</button>`;
        renderPeopleGrid(allPeople);

        document.getElementById('add-person-btn').addEventListener('click', renderNewPersonForm);
        document.getElementById('search-bar').addEventListener('input', handleSearch);
        document.getElementById('global-search-btn').addEventListener('click', () => {
            const allMoments = allPeople.flatMap(person =>
                (person.moments || []).map(moment => ({
                    ...moment,
                    personId: person.id,
                    personName: person.name
                }))
            );
            renderSearchResultsView(allMoments); // Pass all moments to the view
        });
        document.getElementById('tag-filter-btn').addEventListener('click', openTagFilterModal);
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

    const showToast = (message) => {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 2500); // Start fading out after 2.5 seconds
    };

    const renderNewMomentTags = () => {
        const displayDiv = document.querySelector('.new-moment-tags-display');
        if (!displayDiv) return;
        displayDiv.innerHTML = newMomentTags.map((tag, index) => `
            <span class="new-moment-tag" data-index="${index}">
                #${tag}
                <button class="delete-tag-btn">&times;</button>
            </span>
        `).join('');
    };

    const renderStagedTags = () => {
        const container = document.getElementById('staged-tags-container');
        if (!container) return;

        if (newMomentTags.length === 0) {
            container.innerHTML = '';
            return;
        }

        const tagsHTML = newMomentTags.map((tag, index) => `
            <span class="new-moment-tag" data-index="${index}">
                #${tag}
                <button class="delete-tag-btn">&times;</button>
            </span>
        `).join('');

        container.innerHTML = `<div class="moment-tags" style="padding: 1rem; justify-content: flex-start;">${tagsHTML}</div>`;
    };

    const openAddTagsModal = () => {
        // Create the modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay'; // Use the standard class for styling

        // Set the inner HTML for the modal
        modalOverlay.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>הוסף תגיות</h2>
                    <button class="modal-close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="add-tag-input-container">
                        <input type="text" id="new-tags-input" placeholder="הקלד תגית...">
                        <button type="button" class="add-tag-btn header-button">הוסף</button>
                    </div>
                    <div class="new-moment-tags-display"></div>
                </div>
                <div class="modal-footer">
                     <button class="save-tags-btn header-button">סיום</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        renderNewMomentTags(); // Initial render of any existing tags

        // Get references to elements inside the modal
        const tagsInput = modalOverlay.querySelector('#new-tags-input');

        // --- Modal Logic ---
        const closeModal = () => {
            modalOverlay.remove();
            renderStagedTags(); // Update the main form with the selected tags
        };

        const addTag = () => {
            if (!tagsInput) return;
            const newTag = tagsInput.value.trim().replace(/#/g, '');
            if (newTag && !newMomentTags.includes(newTag)) {
                newMomentTags.push(newTag);
                renderNewMomentTags(); // Re-render the tags list inside the modal
            }
            tagsInput.value = '';
            tagsInput.focus();
        };

        // --- Event Listeners using event delegation from the overlay ---
        modalOverlay.addEventListener('click', (event) => {
            // Close modal by clicking outside the content, on a close button, or on the save button
            if (event.target === modalOverlay || event.target.closest('.modal-close-btn') || event.target.closest('.save-tags-btn')) {
                closeModal();
            }
            // Add a new tag
            if (event.target.closest('.add-tag-btn')) {
                addTag();
            }
            // Delete a tag
            if (event.target.classList.contains('delete-tag-btn')) {
                const index = parseInt(event.target.parentElement.dataset.index, 10);
                newMomentTags.splice(index, 1);
                renderNewMomentTags();
            }
        });

        if (tagsInput) {
            tagsInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    addTag();
                }
            });
        }
    };

    const addPersonDetailEventListeners = (personId) => {
        document.getElementById('back-to-grid').addEventListener('click', renderAppShell);

        document.getElementById('add-tags-btn').addEventListener('click', openAddTagsModal);

        const stagedTagsContainer = document.getElementById('staged-tags-container');
        if (stagedTagsContainer) {
            stagedTagsContainer.addEventListener('click', (event) => {
                if (event.target.classList.contains('delete-tag-btn')) {
                    const index = parseInt(event.target.parentElement.dataset.index, 10);
                    newMomentTags.splice(index, 1);
                    renderStagedTags();
                }
            });
        }

        const momentSearchInput = document.getElementById('moment-search-bar');
        if (momentSearchInput) {
            momentSearchInput.addEventListener('input', (event) => {
                const searchTerm = event.target.value;
                const person = allPeople.find(p => p.id === personId);
                if (person) {
                    renderFilteredMoments(person, searchTerm);
                }
            });
        }

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
                const newMoment = {
                    id: Date.now(),
                    date: new Date().toLocaleDateString('en-CA'),
                    text: momentText,
                    tags: [...newMomentTags] // Use the tags from the modal's state
                };
                allPeople[personIndex].moments.unshift(newMoment);
                await saveData(allPeople);

                showToast("הרגע נשמר בהצלחה!");
                newMomentTags = []; // Clear the temporary tags state
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
                    openEditMomentModal(personId, momentIndex);
                }
            });
        }
    };

    // Initial loading sequence
    appContainer.innerHTML = `<header class="app-header"><h1>Luna</h1></header><main id="app-main"><p class="loading-text">טוען נתונים...</p></main>`;
    allPeople = await loadData();
    renderAppShell();
}
