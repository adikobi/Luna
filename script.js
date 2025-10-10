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
                authContainer.style.display = 'none';
                appContainer.style.display = 'block';
                startApp(user, db);
            } else {
                appContainer.style.display = 'none';
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
    let stagedMomentDate = null; // Temp state for a new moment's date
    let isHiddenMode = false; // App state: normal or hidden
    let currentUserData = {}; // Holds all data for the logged-in user
    const avatarColor = '#E5BEB5';
    const userDocRef = db.collection('users').doc(user.uid);

    const linkify = (text) => {
        const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        return text.replace(urlRegex, (url) => {
            let href = url;
            if (!href.startsWith('http')) {
                href = 'https://' + href;
            }
            return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-green); text-decoration: underline;">${url}</a>`;
        });
    };

    const showPasscodeModal = () => {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';

        const hasCode = currentUserData.hiddenAreaCode !== null;
        const title = hasCode ? "הזן קוד כניסה" : "צור קוד חדש";

        modalOverlay.innerHTML = `
            <div class="modal-content passcode-modal-content">
                <div class="modal-header">
                    <h2 id="passcode-title">${title}</h2>
                    <button class="modal-close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <p id="passcode-prompt" class="passcode-prompt"></p>
                    <div class="passcode-display">
                        <div class="passcode-digit"></div>
                        <div class="passcode-digit"></div>
                        <div class="passcode-digit"></div>
                        <div class="passcode-digit"></div>
                    </div>
                    <div class="passcode-keypad">
                        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'נקה', 0, '<i class="fas fa-backspace"></i>'].map(key =>
                            `<button class="keypad-btn" data-key="${key}">${key}</button>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        const promptEl = modalOverlay.querySelector('#passcode-prompt');
        const digitEls = modalOverlay.querySelectorAll('.passcode-digit');

        let enteredCode = [];
        let isConfirming = false;
        let tempCode = null;

        const updateDisplay = () => {
            digitEls.forEach((digitEl, index) => {
                digitEl.classList.toggle('filled', index < enteredCode.length);
            });
        };

        const resetInput = (promptText = "") => {
            enteredCode = [];
            promptEl.textContent = promptText;
            updateDisplay();
        };

        const handleCodeEntered = async () => {
            const code = enteredCode.join('');
            const hasCode = currentUserData.hiddenAreaCode !== null;

            if (hasCode) { // We are in "Enter" mode
                if (code === currentUserData.hiddenAreaCode) {
                    modalOverlay.remove();
                    enterHiddenMode();
                } else {
                    promptEl.textContent = "קוד שגוי, נסה שוב.";
                    modalOverlay.querySelector('.passcode-display').classList.add('shake');
                    setTimeout(() => {
                        modalOverlay.querySelector('.passcode-display').classList.remove('shake');
                        resetInput();
                    }, 500);
                }
            } else { // We are in "Create" mode
                if (!isConfirming) {
                    tempCode = code;
                    isConfirming = true;
                    resetInput("הזן את הקוד שוב לאישור.");
                } else {
                    if (code === tempCode) {
                        await saveData('hiddenAreaCode', code);
                        showToast("הקוד נוצר בהצלחה!");
                        modalOverlay.remove();
                    } else {
                        isConfirming = false;
                        tempCode = null;
                        promptEl.textContent = "הקודים לא תואמים. נסה שוב.";
                        setTimeout(() => resetInput("צור קוד חדש."), 1500);
                    }
                }
            }
        };

        modalOverlay.addEventListener('click', (e) => {
            const target = e.target;
            if (target === modalOverlay || target.closest('.modal-close-btn')) {
                modalOverlay.remove();
                return;
            }

            const keyBtn = target.closest('.keypad-btn');
            if (keyBtn) {
                const key = keyBtn.dataset.key;
                keyBtn.classList.add('active');
                setTimeout(() => keyBtn.classList.remove('active'), 100);
                if (key === 'נקה') {
                    resetInput();
                } else if (key.includes('backspace')) {
                    if (enteredCode.length > 0) {
                        enteredCode.pop();
                        updateDisplay();
                    }
                } else if (enteredCode.length < 4) {
                    enteredCode.push(key);
                    updateDisplay();
                    if (enteredCode.length === 4) {
                        setTimeout(handleCodeEntered, 100);
                    }
                }
            }
        });
    };

    const enterHiddenMode = async () => {
        isHiddenMode = true;
        await renderAppShell();
    };

    const exitHiddenMode = async () => {
        isHiddenMode = false;
        await renderAppShell();
    };

    const saveData = async (key, value) => {
        try {
            await userDocRef.set({ [key]: value }, { merge: true });
            // Keep local data in sync
            currentUserData[key] = value;
        } catch (error) {
            console.error("Error saving data: ", error);
            showToast("שגיאה בשמירת הנתונים לענן.");
        }
    };

    const loadData = async () => {
        try {
            const doc = await userDocRef.get();
            if (doc.exists) {
                currentUserData = doc.data();
                // Ensure default fields exist if loading from an older data structure
                if (!currentUserData.people) currentUserData.people = [];
                if (!currentUserData.hiddenPeople) currentUserData.hiddenPeople = [];
                if (currentUserData.hiddenAreaCode === undefined) currentUserData.hiddenAreaCode = null;
            } else {
                // New user, create the full data structure
                currentUserData = { people: [], hiddenPeople: [], hiddenAreaCode: null };
                await userDocRef.set(currentUserData);
            }
            return isHiddenMode ? currentUserData.hiddenPeople : currentUserData.people;
        } catch (error) {
            console.error("Error loading data: ", error);
            showToast("שגיאה בטעינת הנתונים מהענן.");
            return []; // Return empty array on error
        }
    };

    const renderSkeletonGrid = (container, count) => {
        const template = document.getElementById('skeleton-person-card-template');
        if (!container || !template) return;
        let skeletons = '';
        for (let i = 0; i < count; i++) {
            skeletons += template.innerHTML;
        }
        container.innerHTML = skeletons;
    };

    const renderSkeletonMoments = (container, count) => {
        const template = document.getElementById('skeleton-moment-card-template');
        if (!container || !template) return;
        let skeletons = '';
        for (let i = 0; i < count; i++) {
            skeletons += template.innerHTML;
        }
        container.innerHTML = skeletons;
    };

    const renderPeopleGrid = (peopleToRender) => {
        const grid = document.getElementById('people-grid');
        if (!grid) return;

        if (peopleToRender.length === 0) {
            grid.innerHTML = `<p class="no-results">לא נמצאו אנשי קשר. לחץ על '+' כדי להוסיף.</p>`;
        } else {
            grid.innerHTML = peopleToRender.map(person => renderPersonCard(person)).join('');
            document.querySelectorAll('.person-card').forEach(card => {
                card.addEventListener('click', handleCardClick);
            });
        }
    };

    const renderPersonCard = (person) => {
        const color = avatarColor;
        const avatarHTML = person.image ? `<img src="${person.image}" alt="${person.name}">` : `<div class="default-avatar" style="background-color: ${color};"><i class="fas fa-user"></i></div>`;
        return `
            <div class="person-card" data-person-id="${person.id}">
                ${avatarHTML}
                <h3>${person.name}</h3>
            </div>`;
    };

    const renderNewPersonForm = (personToEdit = null) => {
        const isEditing = personToEdit !== null;
        const title = isEditing ? 'עריכת איש קשר' : 'הוספת איש קשר חדש';
        const nameValue = isEditing ? `value="${personToEdit.name}"` : '';
        const imageValue = isEditing && personToEdit.image ? `value="${personToEdit.image}"` : '';

        const main = document.getElementById('app-main');
        if (!main) return;
        main.innerHTML = `
            <div class="form-container">
                <h2>${title}</h2>
                <form id="person-form">
                    <label for="name">שם:</label>
                    <input type="text" id="name" required ${nameValue}>
                    <label for="image">קישור לתמונה (אופציונלי):</label>
                    <input type="url" id="image" placeholder="השאר ריק לאייקון ברירת מחדל" ${imageValue}>
                    <div class="form-buttons">
                        <button type="submit">שמור</button>
                        <button type="button" id="cancel-btn">ביטול</button>
                    </div>
                </form>
            </div>`;

        document.getElementById('person-form').addEventListener('submit', (e) => handleAddOrEditPerson(e, personToEdit ? personToEdit.id : null));
        document.getElementById('cancel-btn').addEventListener('click', renderAppShell);
    };

    const renderEditPersonForm = (personId) => {
        const person = allPeople.find(p => p.id === personId);
        if (person) {
            renderNewPersonForm(person);
        }
    };

    const handleAddOrEditPerson = async (event, personId) => {
        event.preventDefault();
        const name = document.getElementById('name').value;
        const image = document.getElementById('image').value;

        if (personId) { // Editing existing person
            const personIndex = allPeople.findIndex(p => p.id === personId);
            if (personIndex !== -1) {
                allPeople[personIndex].name = name;
                allPeople[personIndex].image = image;
            }
        } else { // Adding new person
            allPeople.push({ id: Date.now(), name, image, moments: [], pinned: false });
        }

        await saveData(isHiddenMode ? 'hiddenPeople' : 'people', allPeople);
        await renderAppShell();
    };

    const renderFilteredMoments = (person, searchTerm = '') => {
        const momentsListUL = document.querySelector('.moments-list');
        if (!momentsListUL) return;

        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const moments = (person.moments || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));

        const filteredMoments = moments.filter(moment =>
            moment.text.toLowerCase().includes(lowerCaseSearchTerm) ||
            (moment.tags || []).some(tag => tag.toLowerCase().includes(lowerCaseSearchTerm))
        );

        if (filteredMoments.length === 0) {
            const message = searchTerm ? 'לא נמצאו רגעים תואמים לחיפוש.' : 'אין עדיין רגעים.';
            momentsListUL.innerHTML = `<p class="no-results">${message}</p>`;
            return;
        }

        let momentsHTML = '';
        let currentMonthYear = '';

        const monthFormatter = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });
        const dateFormatter = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long' });

        filteredMoments.forEach(moment => {
            const momentDate = new Date(moment.date + 'T00:00:00');
            const monthYear = monthFormatter.format(momentDate);

            if (monthYear !== currentMonthYear) {
                currentMonthYear = monthYear;
                momentsHTML += `<h2 class="month-header">${currentMonthYear}</h2>`;
            }

            const dayAndMonth = dateFormatter.format(momentDate);
            const weekDay = new Intl.DateTimeFormat('he-IL', { weekday: 'long' }).format(momentDate);
            const fullDateString = `${weekDay}, ${dayAndMonth}`;

            const truncatedText = moment.text.length > 150 ? moment.text.substring(0, 150) + '...' : moment.text;

            momentsHTML += `
                <li class="journal-moment-card" data-moment-id="${moment.id}">
                    <div class="moment-card-content">
                        <p class="moment-card-text">${linkify(truncatedText)}</p>
                        <p class="moment-card-date">${fullDateString}</p>
                    </div>
                </li>
            `;
        });

        momentsListUL.innerHTML = momentsHTML;
    };

    const renderPersonDetail = async (personId) => {
        const person = allPeople.find(p => p.id === personId);
        if (!person) { await renderAppShell(); return; }

        appContainer.innerHTML = `
            <div class="floating-nav">
                <button id="back-to-grid" class="floating-btn back-btn">&gt;</button>
                <button id="toggle-search-btn" class="floating-btn search-btn"><i class="fas fa-search"></i></button>
            </div>
            <main id="app-main" class="detail-main">
                <div id="moment-search-container" class="moment-search-container" style="display: none;">
                    <input type="search" id="moment-search-bar" placeholder="חיפוש ברגעים...">
                </div>
                <div id="moment-list-container"><ul class="moments-list"></ul></div>
            </main>
            <div class="fab-container">
                <button id="show-add-moment-modal" class="fab" title="הוסף רגע חדש">+</button>
            </div>`;

        const momentsListUL = appContainer.querySelector('.moments-list');
        renderSkeletonMoments(momentsListUL, 5);

        setTimeout(() => {
            renderFilteredMoments(person);
        }, 50);

        addPersonDetailEventListeners(personId);
    };

    const renderSearchResultsView = (initialResults) => {
        const headerHTML = `<header class="app-header search-results-header"><button id="back-to-shell" class="back-button">&larr; חזרה</button><h1>תוצאות</h1><div class="search-container"><input type="search" id="results-filter-bar" placeholder="סנן תוצאות..."></div></header>`;
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
        document.getElementById('app-main').addEventListener('click', (event) => {
            const target = event.target.closest('.person-link');
            if (target) {
                event.preventDefault();
                renderPersonDetail(parseInt(target.dataset.personId, 10));
            }
        });
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
            const tagsHTML = (result.tags && result.tags.length > 0) ? `<div class="moment-tags">${result.tags.map(tag => `<span class="moment-tag">#${tag}</span>`).join('')}</div>` : '';
            return `<li class="search-result-item"><div class="moment-content"><p class="moment-date">${date}</p><p class="moment-text">${linkify(result.text)}</p>${tagsHTML}</div><div class="result-person-info"><p>מתוך: <a href="#" class="person-link" data-person-id="${result.personId}">${result.personName}</a></p></div></li>`;
        }).join('');
    };

    const renderMomentMeta = () => {
        const container = document.getElementById('moment-meta-bar');
        if (!container) return;

        const date = stagedMomentDate ? new Date(stagedMomentDate + 'T00:00:00') : new Date();
        const displayDate = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });

        const tagsText = newMomentTags.length > 0 ? `#${newMomentTags.join(' #')}` : 'הוסף תגיות';

        container.innerHTML = `
            <div class="meta-item" id="toggle-date-btn">
                <i class="fas fa-calendar-alt"></i>
                <span>${displayDate}</span>
            </div>
            <div class="meta-item" id="add-tags-btn">
                <i class="fas fa-hashtag"></i>
                <span class="tags-display">${tagsText}</span>
            </div>
        `;

        container.querySelector('#toggle-date-btn').addEventListener('click', openDatePickerModal);
        container.querySelector('#add-tags-btn').addEventListener('click', openAddTagsModal);
    };

    const openDatePickerModal = () => {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        const today = new Date().toLocaleDateString('en-CA');
        modalOverlay.innerHTML = `<div class="modal-content"><div class="modal-header"><h2>בחר תאריך</h2><button class="modal-close-btn">&times;</button></div><div class="modal-body" style="flex-direction: column; align-items: center;"><input type="date" id="modal-date-input" value="${stagedMomentDate || today}" style="width: 100%; padding: 0.5rem;"></div><div class="modal-footer"><button id="confirm-date-btn" class="header-button">אישור</button></div></div>`;
        document.body.appendChild(modalOverlay);
        const closeModal = () => modalOverlay.remove();
        modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay || e.target.closest('.modal-close-btn')) closeModal(); });
        document.getElementById('confirm-date-btn').addEventListener('click', () => {
            const dateInput = document.getElementById('modal-date-input');
            if (dateInput.value) stagedMomentDate = dateInput.value;
            renderMomentMeta();
            closeModal();
        });
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

    const renderUserProfileModal = (currentUser) => {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `<div class="modal-content"><div class="modal-header"><h2>פרופיל משתמש</h2><button class="modal-close-btn">&times;</button></div><div class="modal-body user-profile-body"><p><strong>אימייל:</strong> ${currentUser.email}</p><button id="password-reset-btn" class="header-button">אפס סיסמה</button></div></div>`;
        document.body.appendChild(modalOverlay);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay || e.target.closest('.modal-close-btn')) modalOverlay.remove();
            if (e.target.closest('#password-reset-btn')) {
                firebase.auth().sendPasswordResetEmail(currentUser.email)
                    .then(() => { showToast('נשלח מייל לאיפוס סיסמה.'); modalOverlay.remove(); })
                    .catch((error) => { console.error('Password reset error:', error); showToast(`שגיאה: ${error.message}`); });
            }
        });
    };

    const openEditMomentModal = (personId, momentId) => {
        const personIndex = allPeople.findIndex(p => p.id === personId);
        const momentIndex = allPeople[personIndex].moments.findIndex(m => m.id === momentId);
        const moment = allPeople[personIndex]?.moments[momentIndex];
        if (!moment) return;

        newMomentTags = [...(moment.tags || [])];
        stagedMomentDate = moment.date;

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'journal-modal-overlay'; // Use a unique class to avoid conflicts

        const closeModal = () => { modalOverlay.remove(); newMomentTags = []; stagedMomentDate = null; };

        const handleDelete = async () => {
            if (confirm('האם למחוק את הרגע?')) {
                allPeople[personIndex].moments.splice(momentIndex, 1);
                await saveData(isHiddenMode ? 'hiddenPeople' : 'people', allPeople);
                closeModal();
                renderPersonDetail(personId);
                showToast("הרגע נמחק.");
            }
        };

        const handleSave = async () => {
            const newText = modalOverlay.querySelector('#moment-text-input').value;
            if (!newText.trim()) { showToast("הרגע לא יכול להיות ריק."); return; }
            allPeople[personIndex].moments[momentIndex].text = newText;
            allPeople[personIndex].moments[momentIndex].tags = [...newMomentTags];
            allPeople[personIndex].moments[momentIndex].date = stagedMomentDate || new Date().toLocaleDateString('en-CA');
            await saveData(isHiddenMode ? 'hiddenPeople' : 'people', allPeople);
            closeModal();
            renderPersonDetail(personId);
            showToast("השינויים נשמרו!");
        };

        modalOverlay.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <div class="header-side left"><button class="modal-close-btn">&times;</button></div>
                    <h2 class="modal-title-center">עריכת רגע</h2>
                    <div class="header-side right">
                        <button id="delete-moment-btn" class="header-button danger-icon"><i class="fas fa-trash-alt"></i></button>
                        <button id="save-changes-btn" class="header-button save-icon"><i class="fas fa-check"></i></button>
                    </div>
                </div>
                <div id="moment-meta-bar" class="moment-meta-bar"></div>
                <div class="modal-body"><form id="add-moment-form-modal"><textarea id="moment-text-input" required>${moment.text}</textarea></form></div>
            </div>`;

        document.body.appendChild(modalOverlay);
        modalOverlay.querySelector('.modal-close-btn').addEventListener('click', closeModal);
        modalOverlay.querySelector('#delete-moment-btn').addEventListener('click', handleDelete);
        modalOverlay.querySelector('#save-changes-btn').addEventListener('click', handleSave);

        renderMomentMeta();
    };

    const openAddMomentModal = (personId) => {
        newMomentTags = [];
        stagedMomentDate = null;
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'journal-modal-overlay'; // Use a unique class to avoid conflicts

        const closeModal = () => modalOverlay.remove();

        modalOverlay.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <div class="header-side left"><button class="modal-close-btn">&times;</button></div>
                    <h2 class="modal-title-center">רגע חדש</h2>
                    <div class="header-side right">
                        <button id="save-moment-btn" class="header-button save-icon"><i class="fas fa-check"></i></button>
                    </div>
                </div>
                <div id="moment-meta-bar" class="moment-meta-bar"></div>
                <div class="modal-body"><form id="add-moment-form-modal"><textarea id="moment-text-input" placeholder="כתוב כאן משהו..." required></textarea></form></div>
            </div>`;

        document.body.appendChild(modalOverlay);
        modalOverlay.querySelector('.modal-close-btn').addEventListener('click', closeModal);

        modalOverlay.querySelector('#save-moment-btn').addEventListener('click', async () => {
            const momentText = modalOverlay.querySelector('#moment-text-input').value;
            if (!momentText.trim()) { showToast("הרגע לא יכול להיות ריק."); return; }
            const personIndex = allPeople.findIndex(p => p.id === personId);
            if (personIndex !== -1) {
                const customDate = stagedMomentDate || new Date().toLocaleDateString('en-CA');
                const newMoment = { id: Date.now(), date: customDate, text: momentText, tags: [...newMomentTags] };
                if (!allPeople[personIndex].moments) allPeople[personIndex].moments = [];
                allPeople[personIndex].moments.unshift(newMoment);
                await saveData(isHiddenMode ? 'hiddenPeople' : 'people', allPeople);
                showToast("הרגע נשמר בהצלחה!");
                closeModal();
                renderPersonDetail(personId);
            }
        });

        renderMomentMeta();
    };

    const renderNewMomentTags = () => {
        const displayDiv = document.querySelector('.new-moment-tags-display');
        if (!displayDiv) return;
        displayDiv.innerHTML = newMomentTags.map((tag, index) => `<span class="new-moment-tag" data-index="${index}">#${tag}<button class="delete-tag-btn">&times;</button></span>`).join('');
    };

    const addPersonDetailEventListeners = (personId) => {
        document.getElementById('back-to-grid').addEventListener('click', renderAppShell);
        document.getElementById('show-add-moment-modal').addEventListener('click', () => openAddMomentModal(personId));

        const searchContainer = document.getElementById('moment-search-container');
        const searchInput = document.getElementById('moment-search-bar');
        const toggleSearchBtn = document.getElementById('toggle-search-btn');

        toggleSearchBtn.addEventListener('click', () => {
            const isVisible = searchContainer.style.display !== 'none';
            searchContainer.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                searchInput.focus();
            }
        });

        searchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value;
            const person = allPeople.find(p => p.id === personId);
            if (person) renderFilteredMoments(person, searchTerm);
        });

        const momentsList = document.querySelector('.moments-list');
        if (momentsList) {
            momentsList.addEventListener('click', async (event) => {
                const momentCard = event.target.closest('.journal-moment-card');
                if (!momentCard) return;
                const momentId = parseInt(momentCard.dataset.momentId, 10);
                openEditMomentModal(personId, momentId);
            });
        }
    };

    const renderAppShell = async () => {
        const lockIconClass = isHiddenMode ? 'fa-lock-open' : 'fa-lock';
        const hiddenButtonTitle = isHiddenMode ? 'צא מאזור נסתר' : 'אזור נסתר';

        appContainer.innerHTML = `
            <header class="app-header">
                <h1 id="luna-title" style="cursor: pointer;">Luna</h1>
                <div class="search-container"><input type="search" id="search-bar" placeholder="חיפוש איש קשר..."></div>
                <div class="header-actions-container">
                    <button id="global-search-btn" class="header-button">חיפוש רגעים</button>
                    <button id="tag-filter-btn" class="header-button">סינון לפי תגית</button>
                    <button id="logout-btn">התנתק</button>
                </div>
            </header>
            <main id="app-main">
                <div id="people-grid" class="people-grid"></div>
            </main>
            <div class="fab-container">
                <button id="add-person-btn" class="fab" title="הוסף איש קשר חדש">+</button>
                <button id="hidden-area-btn" class="fab fab-secondary" title="${hiddenButtonTitle}"><i class="fas ${lockIconClass}"></i></button>
            </div>
        `;

        appContainer.classList.toggle('hidden-mode', isHiddenMode);

        const peopleGrid = document.getElementById('people-grid');
        renderSkeletonGrid(peopleGrid, 8);


        document.getElementById('add-person-btn').addEventListener('click', () => renderNewPersonForm());
        document.getElementById('search-bar').addEventListener('input', handleSearch);
        document.getElementById('global-search-btn').addEventListener('click', () => {
            const allMoments = allPeople.flatMap(person => (person.moments || []).map(moment => ({ ...moment, personId: person.id, personName: person.name })));
            renderSearchResultsView(allMoments);
        });
        document.getElementById('tag-filter-btn').addEventListener('click', openTagFilterModal);
        document.getElementById('hidden-area-btn').addEventListener('click', () => {
            if (isHiddenMode) exitHiddenMode();
            else showPasscodeModal();
        });
        document.getElementById('logout-btn').addEventListener('click', () => firebase.auth().signOut());
        document.getElementById('luna-title').addEventListener('click', () => renderUserProfileModal(user));

        allPeople = await loadData();
        renderPeopleGrid(allPeople);
    };

    const handleSearch = (event) => { const searchTerm = event.target.value.toLowerCase(); renderPeopleGrid(allPeople.filter(p => p.name.toLowerCase().includes(searchTerm))); };
    const handleCardClick = (event) => {
        const personId = parseInt(event.currentTarget.dataset.personId, 10);
        if (event.target.closest('.pinned-icon')) { // Don't navigate if clicking the pin icon
             return;
        }
        renderPersonDetail(personId);
    };

    const showToast = (message) => {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 2500);
    };

    const openAddTagsModal = () => {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `<div class="modal-content"><div class="modal-header"><h2>הוסף תגיות</h2><button class="modal-close-btn">&times;</button></div><div class="modal-body"><div class="add-tag-input-container"><input type="text" id="new-tags-input" placeholder="הקלד תגית..."><button type="button" class="add-tag-btn header-button">הוסף</button></div><div class="new-moment-tags-display"></div></div><div class="modal-footer"><button class="save-tags-btn header-button">סיום</button></div></div>`;
        document.body.appendChild(modalOverlay);
        renderNewMomentTags();
        const tagsInput = modalOverlay.querySelector('#new-tags-input');
        const closeModal = () => { modalOverlay.remove(); renderMomentMeta(); };
        const addTag = () => {
            if (!tagsInput) return;
            const newTag = tagsInput.value.trim().replace(/#/g, '');
            if (newTag && !newMomentTags.includes(newTag)) {
                newMomentTags.push(newTag);
                renderNewMomentTags();
            }
            tagsInput.value = '';
            tagsInput.focus();
        };
        modalOverlay.addEventListener('click', (event) => {
            if (event.target === modalOverlay || event.target.closest('.modal-close-btn') || event.target.closest('.save-tags-btn')) closeModal();
            if (event.target.closest('.add-tag-btn')) addTag();
            if (event.target.classList.contains('delete-tag-btn')) {
                const index = parseInt(event.target.parentElement.dataset.index, 10);
                newMomentTags.splice(index, 1);
                renderNewMomentTags();
            }
        });
        if (tagsInput) {
            tagsInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); addTag(); } });
        }
    };

    // Initial loading sequence
    await renderAppShell();
}