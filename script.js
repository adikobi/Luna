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
                showToast(`ההרשמה נכשלה: ${error.message}`);
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
                showToast(`ההתחברות נכשלה: ${error.message}`);
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
    const themeColors = ['#ED64A6', '#F6E05E', '#48BB78', '#63B3ED'];
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

        const buildPasscodeModalHTML = (title) => {
            const keypadButtons = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'נקה', 0, '<i class="fas fa-backspace"></i>']
                .map(key => `<button class="keypad-btn" data-key="${key}">${key}</button>`).join('');

            return `
                <div class="modal-content passcode-modal-content">
                    <div class="modal-header">
                        <h2 id="passcode-title">${title}</h2>
                        <button class="modal-close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p id="passcode-prompt" class="passcode-prompt"></p>
                        <div class="passcode-display">
                            ${Array.from({ length: 4 }).map(() => '<div class="passcode-digit"></div>').join('')}
                        </div>
                        <div class="passcode-keypad">${keypadButtons}</div>
                    </div>
                </div>
            `;
        };

        const hasCode = currentUserData.hiddenAreaCode !== null;
        const title = hasCode ? "הזן קוד כניסה" : "צור קוד חדש";
        modalOverlay.innerHTML = buildPasscodeModalHTML(title);
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

        const validatePasscode = (code) => {
            if (code === currentUserData.hiddenAreaCode) {
                modalOverlay.style.animation = 'unlock 0.3s ease-out forwards';
                setTimeout(() => {
                    modalOverlay.remove();
                    enterHiddenMode();
                }, 300);
            } else {
                promptEl.textContent = "קוד שגוי, נסה שוב.";
                modalOverlay.querySelector('.passcode-display').classList.add('shake');
                setTimeout(() => {
                    modalOverlay.querySelector('.passcode-display').classList.remove('shake');
                    resetInput();
                }, 500);
            }
        };

        const createPasscode = async (code) => {
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
        };

        const handleCodeEntered = async () => {
            const code = enteredCode.join('');
            const hasCode = currentUserData.hiddenAreaCode !== null;
            if (hasCode) {
                validatePasscode(code);
            } else {
                await createPasscode(code);
            }
        };

        const handlePasscodeKeypad = (e) => {
            const keyBtn = e.target.closest('.keypad-btn');
            if (!keyBtn) return;

            // Add visual press effect
            keyBtn.classList.add('active');
            setTimeout(() => keyBtn.classList.remove('active'), 100);

            const key = keyBtn.dataset.key;
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
                    handleCodeEntered();
                }
            }
        };

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay || e.target.closest('.modal-close-btn')) {
                modalOverlay.remove();
                return;
            }
            handlePasscodeKeypad(e);
        });
    };

    const enterHiddenMode = async () => {
        isHiddenMode = true;
        appContainer.innerHTML = `<main id="app-main"><p class="loading-text">...טוען</p></main>`;
        allPeople = await loadData();
        renderAppShell();
    };

    const exitHiddenMode = async () => {
        isHiddenMode = false;
        appContainer.innerHTML = `<main id="app-main"><p class="loading-text">...יוצא</p></main>`;
        allPeople = await loadData();
        renderAppShell();
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

    const renderPeopleGridSkeleton = () => {
        const grid = document.getElementById('people-grid');
        if (!grid) return;
        const skeletonHTML = Array.from({ length: 6 }).map(() => `
            <div class="skeleton-person-card">
                <div class="skeleton skeleton-avatar"></div>
                <div class="skeleton skeleton-text"></div>
            </div>
        `).join('');
        grid.innerHTML = skeletonHTML;
    };

    const renderPeopleGrid = (peopleToRender) => {
        const grid = document.getElementById('people-grid');
        if (!grid) return;
        if (peopleToRender.length === 0) {
            grid.innerHTML = `<p class="no-results">לא נמצאו אנשי קשר. לחץ על '+' כדי להוסיף.</p>`;
        } else {
            grid.innerHTML = peopleToRender.map((person, index) => {
                const color = avatarColor;
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

    const renderMomentsSkeleton = () => {
        const momentsListUL = document.querySelector('.moments-list');
        if (!momentsListUL) return;
        const skeletonHTML = Array.from({ length: 3 }).map(() => `
            <li class="skeleton-moment-item">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
            </li>
        `).join('');
        momentsListUL.innerHTML = skeletonHTML;
    };

    const renderFilteredMoments = (person, searchTerm = '') => {
        const momentsListUL = document.querySelector('.moments-list');
        if (!momentsListUL) return;

        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        // Sort moments by date, descending (newest first).
        const moments = (person.moments || []).slice().sort((a, b) => b.date.localeCompare(a.date));

        const filteredMoments = moments
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

            return `<li class="moment-item" data-moment-id="${moment.id}">
                <div class="moment-content">
                    <p class="moment-date">${date}</p>
                    <p class="moment-text">${linkify(moment.text)}</p>
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
        const color = avatarColor;
        const avatarHTML = person.image ? `<img src="${person.image}" alt="${person.name}" class="detail-avatar-img">` : `<div class="default-avatar detail-avatar-icon" style="background-color: ${color}"><i class="fas fa-user"></i></div>`;

        appContainer.innerHTML = `<header class="app-header detail-header"><button id="back-to-grid" class="back-button">&larr; חזרה</button><h1>${person.name}</h1><button id="delete-person-btn" class="delete-person-button">מחק איש קשר</button></header><main id="app-main"><div class="person-detail-header">${avatarHTML}</div><section class="moments-section"><h2>הוסף רגע חדש</h2><form id="add-moment-form"><textarea id="moment-text-input" placeholder="כתוב כאן משהו..." required></textarea><div id="staged-date-container"></div><div id="staged-tags-container"></div><div class="floating-form-buttons"><button type="button" id="toggle-date-btn" class="form-icon-btn" title="שינוי תאריך"><i class="fas fa-calendar-alt"></i></button><button type="button" id="add-tags-btn" class="form-icon-btn" title="הוסף תגיות"><i class="fas fa-hashtag"></i></button><button type="submit" class="form-icon-btn" title="שמור רגע"><i class="fas fa-check"></i></button></div></form><h2>רגעים</h2><div class="moment-search-container"><input type="search" id="moment-search-bar" placeholder="חיפוש ברגעים..."></div><div id="moment-list-container"><ul class="moments-list"></ul></div></section></main>`;

        renderStagedDate();
        renderMomentsSkeleton();

        // Use a timeout to make the transition smoother and show the skeleton UI
        setTimeout(() => {
            renderFilteredMoments(person);
        }, 250);

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
                        <p class="moment-text">${linkify(result.text)}</p>
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

    const renderStagedDate = () => {
        const container = document.getElementById('staged-date-container');
        const button = document.getElementById('toggle-date-btn');
        if (!container || !button) return;

        if (stagedMomentDate) {
            // Adjust for timezone offset to display the correct date string
            const displayDate = new Date(stagedMomentDate + 'T00:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
            container.innerHTML = `<p class="staged-date-text">תאריך: ${displayDate}</p>`;
            button.classList.add('active');
        } else {
            container.innerHTML = '';
            button.classList.remove('active');
        }
    };

    const openDatePickerModal = () => {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';

        const today = new Date().toLocaleDateString('en-CA');

        modalOverlay.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>בחר תאריך</h2>
                    <button class="modal-close-btn">&times;</button>
                </div>
                <div class="modal-body" style="flex-direction: column; align-items: center;">
                    <input type="date" id="modal-date-input" value="${stagedMomentDate || today}" style="width: 100%; padding: 0.5rem;">
                </div>
                <div class="modal-footer">
                     <button id="confirm-date-btn" class="header-button">אישור</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        const closeModal = () => {
            modalOverlay.remove();
        };

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay || e.target.closest('.modal-close-btn')) {
                closeModal();
            }
        });

        document.getElementById('confirm-date-btn').addEventListener('click', () => {
            const dateInput = document.getElementById('modal-date-input');
            if (dateInput.value) {
                stagedMomentDate = dateInput.value;
            }
            renderStagedDate();
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
        modalOverlay.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>פרופיל משתמש</h2>
                    <button class="modal-close-btn">&times;</button>
                </div>
                <div class="modal-body user-profile-body">
                    <p><strong>אימייל:</strong> ${currentUser.email}</p>
                    <button id="password-reset-btn" class="header-button">אפס סיסמה</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay || e.target.closest('.modal-close-btn')) {
                modalOverlay.remove();
            }

            if (e.target.closest('#password-reset-btn')) {
                firebase.auth().sendPasswordResetEmail(currentUser.email)
                    .then(() => {
                        showToast('נשלח מייל לאיפוס סיסמה.');
                        modalOverlay.remove();
                    })
                    .catch((error) => {
                        console.error('Password reset error:', error);
                        showToast(`שגיאה בשליחת מייל לאיפוס סיסמה: ${error.message}`);
                    });
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
            if (!newText.trim()) return showToast("הרגע לא יכול להיות ריק.");
            const personIndex = allPeople.findIndex(p => p.id === personId);
            if (personIndex !== -1) {
                allPeople[personIndex].moments[momentIndex].text = newText;
                allPeople[personIndex].moments[momentIndex].tags = [...newMomentTags];
                await saveData(isHiddenMode ? 'hiddenPeople' : 'people', allPeople);
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

    const renderAppShell = (isLoading = false) => {
        const lockIconClass = isHiddenMode ? 'fa-lock-open' : 'fa-lock';
        const hiddenButtonTitle = isHiddenMode ? 'צא מאזור נסתר' : 'אזור נסתר';

        // Remove the lock button from the header buttons
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

        if (isLoading) {
            renderPeopleGridSkeleton();
        } else {
            renderPeopleGrid(allPeople);
        }

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
        document.getElementById('hidden-area-btn').addEventListener('click', () => {
            if (isHiddenMode) {
                exitHiddenMode();
            } else {
                showPasscodeModal();
            }
        });
        document.getElementById('logout-btn').addEventListener('click', () => firebase.auth().signOut());
        document.getElementById('luna-title').addEventListener('click', () => renderUserProfileModal(user));
    };

    const handleAddPerson = async (event) => {
        event.preventDefault();
        const name = document.getElementById('name').value;
        const image = document.getElementById('image').value;
        allPeople.push({ id: Date.now(), name, image, moments: [] });
        await saveData(isHiddenMode ? 'hiddenPeople' : 'people', allPeople);
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
        document.getElementById('toggle-date-btn').addEventListener('click', openDatePickerModal);

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
                await saveData(isHiddenMode ? 'hiddenPeople' : 'people', allPeople);
                renderAppShell();
            }
        });

        document.getElementById('add-moment-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            const momentText = document.getElementById('moment-text-input').value;

            if (!momentText.trim()) {
                showToast("הרגע לא יכול להיות ריק.");
                return;
            }

            const personIndex = allPeople.findIndex(p => p.id === personId);
            if (personIndex !== -1) {
                const customDate = stagedMomentDate || new Date().toLocaleDateString('en-CA');

                const newMoment = {
                    id: Date.now(),
                    date: customDate,
                    text: momentText,
                    tags: [...newMomentTags]
                };
                allPeople[personIndex].moments.unshift(newMoment);
                await saveData(isHiddenMode ? 'hiddenPeople' : 'people', allPeople);

                showToast("הרגע נשמר בהצלחה!");
                newMomentTags = [];
                stagedMomentDate = null; // Reset staged date
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
                const momentId = parseInt(momentItem.dataset.momentId, 10);
                const momentIndex = allPeople[personIndex].moments.findIndex(m => m.id === momentId);

                if (momentIndex === -1) {
                    console.error("Could not find moment to delete or edit.");
                    return;
                }

                if (target.classList.contains('delete-moment-btn')) {
                    if (confirm('האם למחוק את הרגע?')) {
                        allPeople[personIndex].moments.splice(momentIndex, 1);
                        await saveData(isHiddenMode ? 'hiddenPeople' : 'people', allPeople);
                        renderPersonDetail(personId);
                    }
                } else if (target.classList.contains('edit-moment-btn')) {
                    openEditMomentModal(personId, momentIndex);
                }
            });
        }
    };

    // Initial loading sequence
    renderAppShell(true); // Render skeleton UI first
    allPeople = await loadData();
    renderAppShell(false); // Render the actual data
}