// Global state
let currentUser = null;
let activeChatId = null; // 'admin' or a friend's username

window.addEventListener('DOMContentLoaded', function() {
    currentUser = sessionStorage.getItem('currentUser');

    if (!currentUser) {
        // No user logged in, redirect to login page
        window.location.href = "../index.html";
        return;
    }

    renderChatList();
    renderRequests();
    updateRequestsBadge();
    renderWeekGrid();

    // Close dropdowns when clicking outside of them
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.dropdown')) {
            closeDropdowns();
        }
    });
});

/* ---------- Section switching (Chat / Car Schedule) ---------- */

function switchSection(section) {
    document.getElementById('section-chat').classList.toggle('active', section === 'chat');
    document.getElementById('section-car').classList.toggle('active', section === 'car');
    document.getElementById('section-tab-chat').classList.toggle('active', section === 'chat');
    document.getElementById('section-tab-car').classList.toggle('active', section === 'car');
    document.getElementById('chat-actions').hidden = section !== 'chat';
}

// Navigate back to the correct home page for this user
function goBack() {
    let userType = sessionStorage.getItem('currentUserType');

    if (!userType) {
        const userDatabase = JSON.parse(localStorage.getItem('userDatabase') || '[]');
        const entry = userDatabase.find(([username]) => username === currentUser);
        if (entry) {
            try {
                userType = JSON.parse(entry[1]).type;
            } catch (e) {
                userType = 'guest';
            }
        }
    }

    window.location.href = userType === 'family' ? 'homeFamily.html' : 'homeGuest.html';
}

/* ---------- Storage helpers ---------- */

function getFriends(username) {
    return JSON.parse(localStorage.getItem(`friends_${username}`) || '[]');
}

function saveFriends(username, friends) {
    localStorage.setItem(`friends_${username}`, JSON.stringify(friends));
}

function getFriendRequests(username) {
    return JSON.parse(localStorage.getItem(`friendRequests_${username}`) || '[]');
}

function saveFriendRequests(username, requests) {
    localStorage.setItem(`friendRequests_${username}`, JSON.stringify(requests));
}

function getSentRequests(username) {
    return JSON.parse(localStorage.getItem(`sentRequests_${username}`) || '[]');
}

function saveSentRequests(username, requests) {
    localStorage.setItem(`sentRequests_${username}`, JSON.stringify(requests));
}

function getConversationKey(userA, userB) {
    return 'chatMessages_' + [userA, userB].sort().join('__');
}

function getMessages(key) {
    return JSON.parse(localStorage.getItem(key) || '[]');
}

function saveMessages(key, messages) {
    localStorage.setItem(key, JSON.stringify(messages));
}

function userExists(username) {
    const userDatabase = JSON.parse(localStorage.getItem('userDatabase') || '[]');
    return userDatabase.some(([name]) => name === username);
}

/* ---------- Dropdown handling ---------- */

function toggleAddFriend() {
    const panel = document.getElementById('add-friend-panel');
    const wasOpen = panel.classList.contains('open');
    closeDropdowns();
    if (!wasOpen) {
        panel.classList.add('open');
        document.getElementById('friend-username-input').focus();
    }
}

function toggleRequests() {
    const panel = document.getElementById('requests-panel');
    const wasOpen = panel.classList.contains('open');
    closeDropdowns();
    if (!wasOpen) {
        panel.classList.add('open');
    }
}

function closeDropdowns() {
    document.getElementById('add-friend-panel').classList.remove('open');
    document.getElementById('requests-panel').classList.remove('open');
}

/* ---------- Friend requests ---------- */

function sendFriendRequest() {
    const input = document.getElementById('friend-username-input');
    const msgEl = document.getElementById('add-friend-message');
    const target = input.value.trim();

    msgEl.textContent = '';

    if (!target) {
        msgEl.textContent = 'Please enter a username.';
        return;
    }

    if (target === currentUser) {
        msgEl.textContent = "You can't send a friend request to yourself.";
        return;
    }

    if (!userExists(target)) {
        msgEl.textContent = 'No user found with that username.';
        return;
    }

    if (getFriends(currentUser).includes(target)) {
        msgEl.textContent = 'You are already friends with this user.';
        return;
    }

    if (getSentRequests(currentUser).includes(target)) {
        msgEl.textContent = 'Friend request already sent.';
        return;
    }

    // If they already sent us a request, accept it instead of sending a duplicate
    if (getFriendRequests(currentUser).includes(target)) {
        acceptRequest(target);
        msgEl.textContent = `You are now friends with ${target}!`;
        input.value = '';
        return;
    }

    const theirRequests = getFriendRequests(target);
    theirRequests.push(currentUser);
    saveFriendRequests(target, theirRequests);

    const mySent = getSentRequests(currentUser);
    mySent.push(target);
    saveSentRequests(currentUser, mySent);

    msgEl.textContent = `Friend request sent to ${target}.`;
    input.value = '';
}

function acceptRequest(fromUser) {
    saveFriendRequests(currentUser, getFriendRequests(currentUser).filter(u => u !== fromUser));
    saveSentRequests(fromUser, getSentRequests(fromUser).filter(u => u !== currentUser));

    const myFriends = getFriends(currentUser);
    if (!myFriends.includes(fromUser)) {
        myFriends.push(fromUser);
        saveFriends(currentUser, myFriends);
    }

    const theirFriends = getFriends(fromUser);
    if (!theirFriends.includes(currentUser)) {
        theirFriends.push(currentUser);
        saveFriends(fromUser, theirFriends);
    }

    renderChatList();
    renderRequests();
    updateRequestsBadge();
}

function declineRequest(fromUser) {
    saveFriendRequests(currentUser, getFriendRequests(currentUser).filter(u => u !== fromUser));
    saveSentRequests(fromUser, getSentRequests(fromUser).filter(u => u !== currentUser));

    renderRequests();
    updateRequestsBadge();
}

function updateRequestsBadge() {
    const badge = document.getElementById('requests-badge');
    const count = getFriendRequests(currentUser).length;
    if (count > 0) {
        badge.textContent = count;
        badge.hidden = false;
    } else {
        badge.hidden = true;
    }
}

function renderRequests() {
    const listEl = document.getElementById('requests-list');
    listEl.innerHTML = '';

    const incoming = getFriendRequests(currentUser);

    if (incoming.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'no-requests-msg';
        emptyMsg.textContent = 'No pending friend requests.';
        listEl.appendChild(emptyMsg);
        return;
    }

    incoming.forEach(fromUser => {
        const item = document.createElement('div');
        item.className = 'request-item';

        const name = document.createElement('span');
        name.textContent = fromUser;

        const actions = document.createElement('div');
        actions.className = 'request-actions';

        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'accept-btn';
        acceptBtn.textContent = 'Accept';
        acceptBtn.addEventListener('click', () => acceptRequest(fromUser));

        const declineBtn = document.createElement('button');
        declineBtn.className = 'decline-btn';
        declineBtn.textContent = 'Decline';
        declineBtn.addEventListener('click', () => declineRequest(fromUser));

        actions.appendChild(acceptBtn);
        actions.appendChild(declineBtn);
        item.appendChild(name);
        item.appendChild(actions);
        listEl.appendChild(item);
    });
}

/* ---------- Chat list & conversation ---------- */

function renderChatList() {
    const listEl = document.getElementById('chat-list');
    listEl.innerHTML = '';

    listEl.appendChild(buildChatListItem('admin', 'Admin', true));

    const friends = getFriends(currentUser);

    if (friends.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'no-friends-msg';
        emptyMsg.textContent = 'No friends yet. Send a friend request to start chatting!';
        listEl.appendChild(emptyMsg);
        return;
    }

    friends.forEach(friend => {
        listEl.appendChild(buildChatListItem(friend, friend, false));
    });
}

function buildChatListItem(id, displayName, isAdmin) {
    const item = document.createElement('div');
    item.className = 'chat-list-item' + (activeChatId === id ? ' active' : '');
    item.addEventListener('click', () => selectChat(id, displayName));

    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar' + (isAdmin ? ' admin-avatar' : '');
    avatar.textContent = displayName.charAt(0).toUpperCase();

    const name = document.createElement('div');
    name.className = 'chat-list-item-name';
    name.textContent = displayName;

    item.appendChild(avatar);
    item.appendChild(name);
    return item;
}

function selectChat(id, displayName) {
    activeChatId = id;
    document.getElementById('active-chat-name').textContent = displayName;
    document.getElementById('chat-message-input').disabled = false;
    renderChatList();
    renderMessages();
}

function renderMessages() {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';

    if (!activeChatId) {
        const placeholder = document.createElement('p');
        placeholder.className = 'no-chat-selected';
        placeholder.textContent = 'Select a chat to start messaging.';
        container.appendChild(placeholder);
        return;
    }

    const key = getConversationKey(currentUser, activeChatId);
    let messages = getMessages(key);

    if (activeChatId === 'admin' && messages.length === 0) {
        messages = [{
            from: 'admin',
            text: 'Hi! Welcome to Family Chat. How can we help you today?',
            timestamp: Date.now()
        }];
        saveMessages(key, messages);
    }

    messages.forEach(message => {
        const row = document.createElement('div');
        row.className = 'chat-message ' + (message.from === currentUser ? 'sent' : 'received');

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.textContent = message.text;

        row.appendChild(bubble);
        container.appendChild(row);
    });

    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    if (!activeChatId) return;

    const input = document.getElementById('chat-message-input');
    const text = input.value.trim();
    if (!text) return;

    const key = getConversationKey(currentUser, activeChatId);
    const messages = getMessages(key);
    messages.push({ from: currentUser, text: text, timestamp: Date.now() });
    saveMessages(key, messages);

    input.value = '';
    renderMessages();
}

function handleMessageKeydown(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

/* ---------- Car schedule ---------- */

const CARS = ['TR BMW', 'SC BMW'];
const BOOKING_PURPOSES = ['Gym', 'College', 'City', 'Shopping', 'Doctor', 'Other'];
const MAX_WEEK_OFFSET = 4;
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

let selectedCar = CARS[0];
let weekOffset = 0;

function getBookings() {
    return JSON.parse(localStorage.getItem('carBookings') || '[]');
}

function saveBookings(bookings) {
    localStorage.setItem('carBookings', JSON.stringify(bookings));
}

function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Monday-start week containing (today + weekOffset weeks)
function getWeekDates(offset) {
    const today = new Date();
    const mondayIndex = (today.getDay() + 6) % 7; // 0 = Monday
    const monday = new Date(today);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(today.getDate() - mondayIndex + offset * 7);

    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push(d);
    }
    return dates;
}

function selectCar(car) {
    selectedCar = car;
    document.querySelectorAll('.car-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.car === car);
    });
    renderWeekGrid();
}

function changeWeek(delta) {
    const next = weekOffset + delta;
    if (next < -MAX_WEEK_OFFSET || next > MAX_WEEK_OFFSET) return;
    weekOffset = next;
    renderWeekGrid();
}

function renderWeekGrid() {
    const dates = getWeekDates(weekOffset);
    const todayISO = toISODate(new Date());

    const label = document.getElementById('week-range-label');
    const formatShort = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    label.textContent = `${formatShort(dates[0])} - ${formatShort(dates[6])}, ${dates[6].getFullYear()}`;

    document.getElementById('prev-week-btn').disabled = weekOffset <= -MAX_WEEK_OFFSET;
    document.getElementById('next-week-btn').disabled = weekOffset >= MAX_WEEK_OFFSET;

    const bookings = getBookings().filter(b => b.car === selectedCar);

    const grid = document.getElementById('week-grid');
    grid.innerHTML = '';

    dates.forEach((date, i) => {
        const dayISO = toISODate(date);

        const column = document.createElement('div');
        column.className = 'day-column' + (dayISO === todayISO ? ' today' : '');

        const header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = `${DAY_NAMES[i]} ${date.getDate()}/${date.getMonth() + 1}`;
        column.appendChild(header);

        const dayBookings = bookings.filter(b => dayISO >= b.startDate && dayISO <= b.endDate);

        if (dayBookings.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'no-bookings-msg';
            empty.textContent = 'No bookings';
            column.appendChild(empty);
        } else {
            dayBookings.forEach(booking => {
                column.appendChild(buildBookingChip(booking, dayISO));
            });
        }

        grid.appendChild(column);
    });
}

function buildBookingChip(booking, dayISO) {
    const chip = document.createElement('div');
    chip.className = 'booking-chip';

    const timeEl = document.createElement('span');
    timeEl.className = 'booking-chip-time';
    const isStart = dayISO === booking.startDate;
    const isEnd = dayISO === booking.endDate;
    if (isStart && isEnd) {
        timeEl.textContent = `${booking.startTime}–${booking.endTime}`;
    } else if (isStart) {
        timeEl.textContent = `from ${booking.startTime}`;
    } else if (isEnd) {
        timeEl.textContent = `until ${booking.endTime}`;
    } else {
        timeEl.textContent = 'all day';
    }
    chip.appendChild(timeEl);

    const purposeEl = document.createElement('span');
    purposeEl.className = 'booking-chip-purpose';
    purposeEl.textContent = booking.purpose;
    chip.appendChild(purposeEl);

    const metaEl = document.createElement('span');
    metaEl.className = 'booking-chip-meta';
    metaEl.textContent = `${booking.user} · ${booking.location}`;
    chip.appendChild(metaEl);

    if (booking.user === currentUser) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'booking-chip-delete';
        deleteBtn.textContent = '×';
        deleteBtn.title = 'Delete booking';
        deleteBtn.addEventListener('click', () => deleteBooking(booking.id));
        chip.appendChild(deleteBtn);
    }

    return chip;
}

function deleteBooking(id) {
    if (!confirm('Delete this booking?')) return;
    saveBookings(getBookings().filter(b => b.id !== id));
    renderWeekGrid();
}

function openBookingForm() {
    document.getElementById('booking-modal-car').textContent = selectedCar;
    document.getElementById('booking-purpose').value = BOOKING_PURPOSES[0];

    const todayISO = toISODate(new Date());
    document.getElementById('booking-start-date').value = todayISO;
    document.getElementById('booking-end-date').value = todayISO;
    document.getElementById('booking-start-time').value = '';
    document.getElementById('booking-end-time').value = '';
    document.getElementById('booking-location').value = '';
    document.getElementById('booking-form-message').textContent = '';

    document.getElementById('booking-modal').hidden = false;
}

function closeBookingForm() {
    document.getElementById('booking-modal').hidden = true;
}

function saveBooking() {
    const purpose = document.getElementById('booking-purpose').value;
    const startDate = document.getElementById('booking-start-date').value;
    const startTime = document.getElementById('booking-start-time').value;
    const endDate = document.getElementById('booking-end-date').value;
    const endTime = document.getElementById('booking-end-time').value;
    const location = document.getElementById('booking-location').value.trim();
    const msgEl = document.getElementById('booking-form-message');

    msgEl.textContent = '';

    if (!startDate || !startTime || !endDate || !endTime) {
        msgEl.textContent = 'Please fill in the start and end day/time.';
        return;
    }

    if (!location) {
        msgEl.textContent = 'Please enter a location.';
        return;
    }

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);

    if (end <= start) {
        msgEl.textContent = 'End must be after start.';
        return;
    }

    const overlaps = getBookings().some(b => {
        if (b.car !== selectedCar) return false;
        const bStart = new Date(`${b.startDate}T${b.startTime}`);
        const bEnd = new Date(`${b.endDate}T${b.endTime}`);
        return start < bEnd && end > bStart;
    });

    if (overlaps) {
        msgEl.textContent = `${selectedCar} is already booked during part of that time.`;
        return;
    }

    const bookings = getBookings();
    bookings.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        car: selectedCar,
        user: currentUser,
        purpose: purpose,
        startDate: startDate,
        startTime: startTime,
        endDate: endDate,
        endTime: endTime,
        location: location
    });
    saveBookings(bookings);

    closeBookingForm();
    renderWeekGrid();
}
