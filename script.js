document.addEventListener('DOMContentLoaded', () => {
    const people = [
        {
            id: 1,
            name: 'מאיה',
            group: 'חברים קרובים',
            important_thing: 'מתחילה קורס צילום בימי שלישי',
            avatar: 'https://i.pravatar.cc/100?u=maya'
        },
        {
            id: 2,
            name: 'יוסי',
            group: 'משפחה',
            important_thing: 'מחפש עבודה חדשה בתחום ההייטק',
            avatar: 'https://i.pravatar.cc/100?u=yossi'
        },
        {
            id: 3,
            name: 'סבתא דליה',
            group: 'משפחה',
            important_thing: 'תור לרופא ב-28.8',
            avatar: 'https://i.pravatar.cc/100?u=dalya'
        },
        {
            id: 4,
            name: 'אורי',
            group: 'קולגות לעבודה',
            important_thing: 'עובד על פרויקט גדול בעבודה',
            avatar: 'https://i.pravatar.cc/100?u=uri'
        }
    ];

    const mainContent = document.getElementById('main-content');

    function renderPeopleList() {
        if (!mainContent) {
            console.error('Main content area not found!');
            return;
        }

        const peopleListHTML = people.map(person => `
            <article class="person-card">
                <img src="${person.avatar}" alt="Avatar for ${person.name}" class="avatar">
                <div class="person-details">
                    <h2>${person.name}</h2>
                    <p class="group-tag">${person.group}</p>
                    <p class="important-thing"><strong>הדבר החשוב כרגע:</strong> ${person.important_thing}</p>
                </div>
            </article>
        `).join('');

        mainContent.innerHTML = `
            <section class="people-hub">
                ${peopleListHTML}
            </section>
        `;
    }

    renderPeopleList();
});
