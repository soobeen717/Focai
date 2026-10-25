import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    deleteDoc,
    collection,
    getDocs,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyCo95gguC63NayF7xF8ZSC30KY82RVGP-U",
    authDomain: "focai2.firebaseapp.com",
    projectId: "focai2",
    storageBucket: "focai2.firebasestorage.app",
    messagingSenderId: "4025898373",
    appId: "1:4025898373:web:9a76fa8bd951265eb420ec"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

let gameState = {
    nickname: "사용자",
    level: 1,
    xp: 0,
    maxXp: 120,
    coins: 50,
    totalFocusSeconds: 0, 
    giveUpCount: 0,       
    equipped: { 
        bg: "none",
        vde: "none",
        de: [null, null, null]
    },
    inventory: [],
    currentShopTab: "bg",
    currentDecorTab: "all",
    targetFocusMinutes: 10,
    timerInterval: null,
    isTimerRunning: false,
    isTimerPaused: false,
    remainingSeconds: 600,
    attendance: {
        streak: 1,
        monthlyCount: 1,
        checkedToday: false,
        checkedDays: []
    },
    missions: [
        { id: 1, title: "아침 기상 후 물 한 잔 마시기 💧", completed: false },
        { id: 2, title: "스마트폰 내려두고 스트레칭 🧘", completed: false }
    ],
    groupIds: []
};

// 아이템 데이터 모음
const allItems = [
    { id: "bg1", name: "쿨톤 방", type: "bg", img: "bg1.png" },
    { id: "bg2", name: "웜톤 방", type: "bg", img: "bg2.png" },
    { id: "de1", name: "노란 나비", type: "de", img: "de1.png" },
    { id: "de2", name: "무당벌레", type: "de", img: "de2.png" },
    { id: "de3", name: "보라 커튼 창문", type: "de", img: "de3.png" },
    { id: "de4", name: "연두 벽시계", type: "de", img: "de4.png" },
    { id: "de5", name: "꽃 액자", type: "de", img: "de5.png" },
    { id: "vde1", name: "도토리 장식", type: "vde", img: "vde1.png" },
    { id: "vde2", name: "네잎클로버", type: "vde", img: "vde2.png" }
];

const shopItems = {
    bg: [
        { id: "bg1", name: "쿨톤 방", price: 150, type: "bg", img: "bg1.png" },
        { id: "bg2", name: "웜톤 방", price: 150, type: "bg", img: "bg2.png" }
    ],
    de: [
        { id: "de1", name: "노란 나비", price: 100, type: "de", img: "de1.png" },
        { id: "de2", name: "무당벌레", price: 100, type: "de", img: "de2.png" },
        { id: "de3", name: "보라 커튼 창문", price: 180, type: "de", img: "de3.png" },
        { id: "de4", name: "연두 벽시계", price: 120, type: "de", img: "de4.png" },
        { id: "de5", name: "꽃 액자", price: 140, type: "de", img: "de5.png" }
    ],
    vde: [
        { id: "vde1", name: "도토리 장식", price: 90, type: "vde", img: "vde1.png" },
        { id: "vde2", name: "네잎클로버", price: 90, type: "vde", img: "vde2.png" }
    ]
};

// ==========================================
// 인증 및 Firebase 데이터 연동
// ==========================================
onAuthStateChanged(auth, async (user) => {
    const unloggedView = document.getElementById("auth-unlogged");
    const loggedView = document.getElementById("auth-logged");
    const userDisplayEmail = document.getElementById("user-display-email");

    if (user) {
        currentUser = user;
        if (unloggedView) unloggedView.style.display = "none";
        if (loggedView) loggedView.style.display = "block";

        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const data = userSnap.data();
                gameState.nickname = data.nickname || user.email.split('@')[0];
                if (data.coins !== undefined) gameState.coins = data.coins;
                if (data.level !== undefined) gameState.level = data.level;
                if (data.xp !== undefined) gameState.xp = data.xp;
                if (data.totalFocusSeconds !== undefined) gameState.totalFocusSeconds = data.totalFocusSeconds;
                if (data.giveUpCount !== undefined) gameState.giveUpCount = data.giveUpCount;
                if (data.inventory) gameState.inventory = data.inventory;
                if (data.groupIds) gameState.groupIds = data.groupIds;
                
                const attendanceList = data.attendance || [];
                gameState.attendance.checkedDays = attendanceList;
                
                const todayStr = new Date().toISOString().split('T')[0];
                gameState.attendance.checkedToday = attendanceList.includes(todayStr);
                
                const currentMonthStr = todayStr.substring(0, 7);
                const thisMonthAttendance = attendanceList.filter(d => d.startsWith(currentMonthStr));
                gameState.attendance.monthlyCount = thisMonthAttendance.length;
            } else {
                gameState.nickname = user.email.split('@')[0];
                await setDoc(userRef, {
                    nickname: gameState.nickname,
                    coins: 50,
                    level: 1,
                    xp: 0,
                    totalFocusSeconds: 0,
                    giveUpCount: 0,
                    inventory: [],
                    groupIds: []
                }, { merge: true });
            }
        } catch (err) {
            console.error("사용자 데이터 불러오기 오류:", err);
        }

        if (userDisplayEmail) {
            userDisplayEmail.innerText = gameState.nickname;
        }

        updateAllUI();
        loadMyGroups();
    } else {
        currentUser = null;
        if (unloggedView) unloggedView.style.display = "block";
        if (loggedView) loggedView.style.display = "none";
    }
});

window.openAuthModal = function() {
    const modal = document.getElementById("auth-modal");
    if (modal) modal.style.display = "flex";
};

window.closeAuthModal = function() {
    const modal = document.getElementById("auth-modal");
    if (modal) modal.style.display = "none";
};

window.handleSignUp = async function() {
    const emailEl = document.getElementById("auth-email");
    const passEl = document.getElementById("auth-password");
    if (!emailEl || !passEl) return;
    
    const email = emailEl.value;
    const password = passEl.value;
    if (!email || !password) return alert("이메일과 비밀번호를 입력하세요.");

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setDoc(doc(db, "users", user.uid), {
            nickname: email.split('@')[0],
            coins: 50,
            level: 1,
            xp: 0,
            totalFocusSeconds: 0,
            giveUpCount: 0,
            inventory: [],
            groupIds: []
        }, { merge: true });
        alert("회원가입이 완료되었습니다!");
        closeAuthModal();
    } catch (error) {
        alert("회원가입 실패: " + error.message);
    }
};

window.handleLogin = async function() {
    const emailEl = document.getElementById("auth-email");
    const passEl = document.getElementById("auth-password");
    if (!emailEl || !passEl) return;

    const email = emailEl.value;
    const password = passEl.value;
    if (!email || !password) return alert("이메일과 비밀번호를 입력하세요.");

    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert("로그인 성공!");
        closeAuthModal();
    } catch (error) {
        alert("로그인 실패: " + error.message);
    }
};

window.handleLogout = async function() {
    try {
        await signOut(auth);
        alert("로그아웃 되었습니다.");
        closeAuthModal();
    } catch (error) {
        alert("로그아웃 오류: " + error.message);
    }
};

async function syncGameStateToFirebase() {
    if (!currentUser) return;
    try {
        const userRef = doc(db, "users", currentUser.uid);
        await setDoc(userRef, {
            nickname: gameState.nickname,
            coins: gameState.coins,
            level: gameState.level,
            xp: gameState.xp,
            totalFocusSeconds: gameState.totalFocusSeconds,
            giveUpCount: gameState.giveUpCount,
            inventory: gameState.inventory,
            groupIds: gameState.groupIds
        }, { merge: true });
    } catch (e) {
        console.error("Firestore 저장 실패:", e);
    }
}

window.onload = function() {
    updateAllUI();
    updateTimerDisplay(gameState.remainingSeconds);

    const missionInput = document.getElementById('custom-mission-input');
    if (missionInput) {
        missionInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addCustomMission();
        });
    }

    window.addEventListener('keydown', function(e) {
        const modal = document.getElementById('level-up-modal');
        if (modal && e.key === 'Enter' && modal.style.display === 'flex') {
            closeLevelUpModal();
        }
    });
};

// ==========================================
// 화면 전환 및 UI 업데이트
// ==========================================
window.showScreen = function(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('active'));
    
    const targetScreen = document.getElementById('screen-' + id);
    if (targetScreen) targetScreen.classList.add('active');

    const activeNavBtn = document.querySelector(`.nav-${id}`);
    if (activeNavBtn) activeNavBtn.classList.add('active');

    if (id === 'decor') renderInventory();
    if (id === 'shop') renderShop();
    if (id === 'group') loadMyGroups();
};

function updateAllUI() {
    const lvlDisp = document.getElementById('level-display');
    const coinDisp = document.getElementById('coin-display');

    if (lvlDisp) lvlDisp.innerText = `Lv.${gameState.level}`;
    if (coinDisp) coinDisp.innerText = `🪙 ${gameState.coins}`;
    
    const isMaxLevel = gameState.level >= 6;
    const xpPercent = isMaxLevel ? 100 : Math.min(100, Math.floor((gameState.xp / gameState.maxXp) * 100));

    const xpBar = document.getElementById('xp-bar');
    if (xpBar) xpBar.style.width = `${xpPercent}%`;

    const xpText = document.getElementById('xp-text');
    if (xpText) xpText.innerText = isMaxLevel ? "MAX" : `${gameState.xp} / ${gameState.maxXp}`;

    const plantImg = document.getElementById('plant-img');
    if (plantImg) {
        const plantStage = Math.min(gameState.level, 6);
        plantImg.src = `lv${plantStage}.png`;
    }

    const bgItem = allItems.find(i => i.id === gameState.equipped.bg);
    const room = document.getElementById('room');
    if (room) {
        if (bgItem && bgItem.img) {
            room.style.backgroundImage = `url('${bgItem.img}')`;
            room.style.backgroundColor = "transparent";
        } else {
            room.style.backgroundImage = "none";
            room.style.backgroundColor = "#f7f3e9";
        }
    }

    for (let i = 0; i < 3; i++) {
        const slotEl = document.getElementById(`bg-decor-${i + 1}`);
        const equippedId = gameState.equipped.de[i];
        const item = allItems.find(it => it.id === equippedId);

        if (slotEl) {
            if (item && item.img) {
                slotEl.innerHTML = `<img src="${item.img}" alt="${item.name}">`;
            } else {
                slotEl.innerHTML = "";
            }
        }
    }

    const vdeSlot = document.getElementById('vde-decor');
    const vdeItem = allItems.find(i => i.id === gameState.equipped.vde);
    if (vdeSlot) {
        if (vdeItem && vdeItem.img) {
            vdeSlot.innerHTML = `<img src="${vdeItem.img}" alt="${vdeItem.name}">`;
        } else {
            vdeSlot.innerHTML = "";
        }
    }

    const banner = document.getElementById('equipped-banner');
    if (banner) {
        banner.innerText = bgItem ? `🪴 ${bgItem.name}` : "🪴 기본 식물 공간";
    }

    renderMissions();
}

function gainXP(amount) {
    if (gameState.level >= 6) {
        gameState.xp = gameState.maxXp;
        updateAllUI();
        syncGameStateToFirebase();
        return;
    }

    gameState.xp += amount;
    while (gameState.xp >= gameState.maxXp && gameState.level < 6) {
        gameState.xp -= gameState.maxXp;
        gameState.level++;
        gameState.maxXp = Math.round(gameState.maxXp * 1.8);
        
        let rewardCoin = 50 + (gameState.level * 10);
        gameState.coins += rewardCoin;

        openLevelUpModal(gameState.level, rewardCoin);
    }

    if (gameState.level >= 6) {
        gameState.xp = gameState.maxXp;
    }

    updateAllUI();
    syncGameStateToFirebase();
}

// ==========================================
// 꾸미기 및 상점
// ==========================================
window.switchDecorTab = function(tab) {
    gameState.currentDecorTab = tab;
    document.querySelectorAll('#screen-decor .shop-pill').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`decor-tab-${tab}`);
    if (activeBtn) activeBtn.classList.add('active');
    renderInventory();
};

function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.innerHTML = "";

    let ownedItems = gameState.inventory.map(itemId => allItems.find(i => i.id === itemId)).filter(Boolean);

    if (gameState.currentDecorTab !== 'all') {
        ownedItems = ownedItems.filter(item => item.type === gameState.currentDecorTab);
    }

    if (ownedItems.length === 0) {
        grid.innerHTML = `<div style="grid-column: span 2; text-align: center; color: #888; padding: 30px;">보유한 아이템이 없습니다.<br>상점에서 배경이나 장식을 구매해 보세요!</div>`;
        return;
    }

    ownedItems.forEach(item => {
        let isEquipped = false;
        let slotBadge = null;

        if (item.type === 'de') {
            const slotIndex = gameState.equipped.de.indexOf(item.id);
            if (slotIndex !== -1) {
                isEquipped = true;
                const circleNumbers = ['①', '②', '③'];
                slotBadge = circleNumbers[slotIndex];
            }
        } else {
            isEquipped = (gameState.equipped[item.type] === item.id);
        }

        const div = document.createElement('div');
        div.className = "item-card";
        div.innerHTML = `
            ${slotBadge ? `<div class="slot-badge-icon">${slotBadge}</div>` : ''}
            <div class="item-icon">
                <img src="${item.img}" alt="${item.name}">
            </div>
            <div class="item-name">${item.name}</div>
            <button class="item-btn ${isEquipped ? 'equipped' : ''}" onclick="toggleEquip('${item.id}')">
                ${isEquipped ? '해제' : '착용'}
            </button>
        `;
        grid.appendChild(div);
    });
}

window.toggleEquip = function(itemId) {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    if (item.type === 'de') {
        const existingSlotIndex = gameState.equipped.de.indexOf(itemId);
        if (existingSlotIndex !== -1) {
            gameState.equipped.de[existingSlotIndex] = null;
        } else {
            const emptySlotIndex = gameState.equipped.de.findIndex(slot => slot === null);
            if (emptySlotIndex !== -1) {
                gameState.equipped.de[emptySlotIndex] = itemId;
            } else {
                alert("배경 장식은 동시에 최대 3개까지만 착용할 수 있습니다!\n기존 장식을 해제 후 착용해주세요.");
                return;
            }
        }
    } else {
        if (gameState.equipped[item.type] === itemId) {
            gameState.equipped[item.type] = "none";
        } else {
            gameState.equipped[item.type] = itemId;
        }
    }

    updateAllUI();
    renderInventory();
};

window.switchShopTab = function(tab) {
    gameState.currentShopTab = tab;
    document.querySelectorAll('#screen-shop .shop-pill').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`tab-${tab}`);
    if (activeBtn) activeBtn.classList.add('active');
    renderShop();
};

function renderShop() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    grid.innerHTML = "";

    const items = shopItems[gameState.currentShopTab] || [];
    items.forEach(item => {
        const isBought = gameState.inventory.includes(item.id);
        const div = document.createElement('div');
        div.className = "item-card";
        div.innerHTML = `
            <div class="item-icon">
                <img src="${item.img}" alt="${item.name}">
            </div>
            <div class="item-name">${item.name}</div>
            <button class="item-btn ${isBought ? 'bought' : ''}" onclick="buyItem('${item.id}', ${item.price})" ${isBought ? 'disabled' : ''}>
                ${isBought ? '보유중' : item.price + ' 코인'}
            </button>
        `;
        grid.appendChild(div);
    });
}

window.buyItem = function(id, price) {
    if (gameState.coins < price) {
        alert("코인이 부족합니다!");
        return;
    }
    gameState.coins -= price;
    gameState.inventory.push(id);
    alert("🛍️ 아이템을 구매했습니다!");
    updateAllUI();
    renderShop();
    syncGameStateToFirebase();
};

// ==========================================
// 미션 및 타이머 (1초 단위 실시간 타이머 및 그룹 UI 즉시 반영)
// ==========================================
function renderMissions() {
    const list = document.getElementById('mission-list');
    const countDisplay = document.getElementById('mission-count');
    if (!list) return;

    list.innerHTML = "";
    const completedCount = gameState.missions.filter(m => m.completed).length;
    if (countDisplay) countDisplay.innerText = `${completedCount}/${gameState.missions.length} 완료`;

    gameState.missions.forEach((m) => {
        const div = document.createElement('div');
        div.className = "mission-item";
        div.innerHTML = `
            <span class="mission-text" style="${m.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${m.title}</span>
            <div>
                <button class="claim-btn ${m.completed ? 'done' : ''}" onclick="claimMission(${m.id})">${m.completed ? '✓' : '완료'}</button>
                <button class="delete-btn" onclick="deleteMission(${m.id})">✕</button>
            </div>
        `;
        list.appendChild(div);
    });
}

window.claimMission = function(id) {
    const mission = gameState.missions.find(m => m.id === id);
    if (mission && !mission.completed) {
        mission.completed = true;
        gameState.coins += 2;
        gainXP(100);
    }
};

window.addCustomMission = function() {
    const input = document.getElementById('custom-mission-input');
    if (!input) return;
    const title = input.value.trim();
    if (!title) return alert("미션 내용을 입력해주세요!");
    gameState.missions.push({ id: Date.now(), title: title, completed: false });
    input.value = "";
    updateAllUI();
};

window.deleteMission = function(id) {
    gameState.missions = gameState.missions.filter(m => m.id !== id);
    updateAllUI();
};

window.adjustTargetTime = function(min) {
    if (gameState.isTimerRunning || gameState.isTimerPaused) return;
    gameState.targetFocusMinutes = Math.max(1, gameState.targetFocusMinutes + min);
    const targetDisp = document.getElementById('target-time-display');
    if (targetDisp) targetDisp.innerText = gameState.targetFocusMinutes + "분";
    gameState.remainingSeconds = gameState.targetFocusMinutes * 60;
    updateTimerDisplay(gameState.remainingSeconds);
};

function updateTimerDisplay(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.innerText = `00:${m}:${s}`;
}

window.handleMainTimerBtn = function() {
    if (!gameState.isTimerRunning && !gameState.isTimerPaused) {
        gameState.remainingSeconds = gameState.targetFocusMinutes * 60;
        startTimer();
    } else if (gameState.isTimerRunning) {
        pauseTimer();
    } else if (gameState.isTimerPaused) {
        startTimer();
    }
};

function startTimer() {
    gameState.isTimerRunning = true;
    gameState.isTimerPaused = false;
    const mainBtn = document.getElementById('timer-main-btn');
    const stopBtn = document.getElementById('timer-stop-btn');
    if (mainBtn) mainBtn.innerText = "잠시 멈추기 ⏸️";
    if (stopBtn) stopBtn.style.display = "inline-block";

    clearInterval(gameState.timerInterval);
    gameState.timerInterval = setInterval(() => {
        gameState.remainingSeconds--;
        gameState.totalFocusSeconds++; // 1초마다 내 집중 시간 증가
        
        updateTimerDisplay(gameState.remainingSeconds);

        // 내 화면의 그룹 탭이 열려있다면 1초마다 즉시 로컬에서 순위와 내 시간을 부드럽게 갱신 (서버 부하 방지 위해 화면만 즉시 갱신)
        const groupScreen = document.getElementById('screen-group');
        if (groupScreen && groupScreen.classList.contains('active')) {
            loadMyGroups(true); // 로컬 부드러운 갱신
        }

        // 10초마다 서버에 자동 저장
        if (gameState.totalFocusSeconds % 10 === 0) {
            syncGameStateToFirebase();
        }

        if (gameState.remainingSeconds <= 0) {
            clearInterval(gameState.timerInterval);
            finishTimer();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(gameState.timerInterval);
    gameState.isTimerRunning = false;
    gameState.isTimerPaused = true;
    const mainBtn = document.getElementById('timer-main-btn');
    if (mainBtn) mainBtn.innerText = "이어서 시작 ▶️";
}

window.resetTimer = function() {
    clearInterval(gameState.timerInterval);
    if (gameState.isTimerRunning || gameState.isTimerPaused) {
        gameState.giveUpCount++; 
        alert(`🛑 집중을 중도 포기하셨습니다.\n(지금까지 집중한 시간은 누적되었습니다! 포기 횟수: ${gameState.giveUpCount}회)`);
    }
    
    gameState.isTimerRunning = false;
    gameState.isTimerPaused = false;
    gameState.remainingSeconds = gameState.targetFocusMinutes * 60;
    updateTimerDisplay(gameState.remainingSeconds);
    
    const mainBtn = document.getElementById('timer-main-btn');
    const stopBtn = document.getElementById('timer-stop-btn');
    if (mainBtn) mainBtn.innerText = "집중 시작하기 ✨";
    if (stopBtn) stopBtn.style.display = "none";

    syncGameStateToFirebase(); 
};

function finishTimer() {
    resetTimer();
    const mins = gameState.targetFocusMinutes;
    const gainedXP = mins * 20;
    const gainedCoins = mins * 5;
    gameState.coins += gainedCoins;
    
    alert(`🎉 ${mins}분 집중 완료!\n+${gainedXP} XP / +🪙 ${gainedCoins} 코인 획득!`);
    gainXP(gainedXP);
    syncGameStateToFirebase();
}

// ==========================================
// 출석 체크
// ==========================================
window.checkAttendanceFirebase = function() {
    const todayStr = new Date().toISOString().split('T')[0];
    if (gameState.attendance.checkedDays.includes(todayStr)) {
        return alert("오늘 이미 출석체크를 완료했습니다!");
    }
    gameState.attendance.checkedDays.push(todayStr);
    gameState.attendance.streak++;
    gameState.attendance.monthlyCount++;
    gameState.coins += 10;
    alert("📅 오늘의 출석체크 완료! (+10 코인)");
    updateAllUI();
    syncGameStateToFirebase();
};

// ==========================================
// 로드맵 모달
// ==========================================
window.showLevelRewardsInfo = function() {
    const roadmapModal = document.getElementById('roadmap-modal');
    const roadmapList = document.getElementById('roadmap-list');
    if (!roadmapModal || !roadmapList) return;

    roadmapList.innerHTML = "";

    for (let lvl = 1; lvl <= 6; lvl++) {
        const isReached = gameState.level >= lvl;
        const isCurrent = gameState.level === lvl;

        const itemDiv = document.createElement('div');
        itemDiv.className = `roadmap-step ${isReached ? 'achieved' : ''} ${isCurrent ? 'current' : ''}`;

        itemDiv.innerHTML = `
            <div class="roadmap-node">
                <span class="node-dot"></span>
            </div>
            <div class="roadmap-card">
                <div class="roadmap-lvl">Lv.${lvl} ${isCurrent ? '<span class="current-tag">NOW</span>' : ''}</div>
                <div class="roadmap-info">
                    <div class="roadmap-icon-wrap">🪙</div>
                    <div class="roadmap-text">
                        <div class="reward-title">레벨 달성 보상</div>
                        <div class="reward-sub">+ ${50 + (lvl * 10)} 코인</div>
                    </div>
                </div>
            </div>
        `;
        roadmapList.appendChild(itemDiv);
    }

    roadmapModal.style.display = 'flex';
};

window.closeRoadmapModal = function() {
    const modal = document.getElementById('roadmap-modal');
    if (modal) modal.style.display = 'none';
};

function openLevelUpModal(lvl, coins) {
    const modal = document.getElementById('level-up-modal');
    if (!modal) return;

    const lvlNum = document.getElementById('modal-level-num');
    if (lvlNum) lvlNum.innerText = `Lv.${lvl}`;

    const iconSlot = document.getElementById('modal-reward-item');
    const textSlot = document.getElementById('modal-reward-text');
    
    if (iconSlot) iconSlot.innerText = "🪙";
    if (textSlot) textSlot.innerText = `${coins} 코인 획득!`;

    modal.style.display = 'flex';
}

window.closeLevelUpModal = function() {
    const modal = document.getElementById('level-up-modal');
    if (!modal) return;
    modal.style.display = 'none';
};

// ==========================================
// 그룹 기능 (실시간 1초 단위 랭킹 갱신)
// ==========================================
function generateGroupId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 7; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

window.createGroup = async function() {
    if (!currentUser) return alert("로그인이 필요합니다.");

    const groupNameInput = document.getElementById("create-group-name");
    const groupName = groupNameInput ? groupNameInput.value.trim() : "";

    if (!groupName) return alert("그룹 이름을 입력해주세요.");

    const shortId = generateGroupId();
    const groupRef = doc(db, "groups", shortId);

    try {
        await setDoc(groupRef, {
            groupId: shortId,
            groupName: groupName,
            createdBy: currentUser.uid,
            createdAt: new Date(),
            members: [currentUser.uid]
        });

        const userRef = doc(db, "users", currentUser.uid);
        await setDoc(userRef, {
            groupIds: arrayUnion(shortId)
        }, { merge: true });

        if (!gameState.groupIds.includes(shortId)) {
            gameState.groupIds.push(shortId);
        }

        alert(`🎉 그룹 [${groupName}]이(가) 생성되었습니다!\n그룹 ID: ${shortId}`);
        if (groupNameInput) groupNameInput.value = "";
        loadMyGroups();
    } catch (e) {
        console.error("그룹 생성 오류:", e);
        alert("그룹 생성 중 오류가 발생했습니다.");
    }
};

window.joinGroup = async function() {
    if (!currentUser) return alert("로그인이 필요합니다.");

    const groupCodeInput = document.getElementById("join-group-code");
    const groupCode = groupCodeInput ? groupCodeInput.value.trim().toUpperCase() : "";

    if (!groupCode) return alert("그룹 코드를 입력해주세요.");

    try {
        const groupRef = doc(db, "groups", groupCode);
        const groupSnap = await getDoc(groupRef);

        if (!groupSnap.exists()) {
            return alert("존재하지 않는 그룹 코드입니다.");
        }

        await updateDoc(groupRef, {
            members: arrayUnion(currentUser.uid)
        });

        const userRef = doc(db, "users", currentUser.uid);
        await setDoc(userRef, {
            groupIds: arrayUnion(groupCode)
        }, { merge: true });

        if (!gameState.groupIds.includes(groupCode)) {
            gameState.groupIds.push(groupCode);
        }

        alert(`🎉 [${groupSnap.data().groupName}] 그룹에 가입되었습니다!`);
        if (groupCodeInput) groupCodeInput.value = "";
        loadMyGroups();
    } catch (e) {
        console.error("그룹 가입 오류:", e);
        alert("그룹 가입 중 오류가 발생했습니다.");
    }
};

async function loadMyGroups(isLocalTick = false) {
    const listContainer = document.getElementById("my-group-list");
    if (!listContainer) return;

    if (!currentUser || gameState.groupIds.length === 0) {
        listContainer.innerHTML = "가입된 그룹이 없습니다.";
        return;
    }

    if (!isLocalTick) {
        listContainer.innerHTML = "그룹 정보를 불러오는 중...";
    }

    try {
        let html = "";
        for (const gId of gameState.groupIds) {
            const groupSnap = await getDoc(doc(db, "groups", gId));
            if (groupSnap.exists()) {
                const gData = groupSnap.data();
                const members = gData.members || [];

                let memberDataList = [];
                for (const mId of members) {
                    let totalSec = 0;
                    let giveUps = 0;
                    let mName = "알 수 없는 사용자";

                    if (mId === currentUser.uid) {
                        // 내 정보는 실시간 gameState에서 바로 가져와서 1초마다 부드럽게 갱신
                        totalSec = gameState.totalFocusSeconds;
                        giveUps = gameState.giveUpCount;
                        mName = gameState.nickname;
                    } else {
                        const memberSnap = await getDoc(doc(db, "users", mId));
                        if (memberSnap.exists()) {
                            const mData = memberSnap.data();
                            mName = mData.nickname || "사용자";
                            totalSec = mData.totalFocusSeconds || 0;
                            giveUps = mData.giveUpCount || 0;
                        }
                    }
                    memberDataList.push({ mId, mName, totalSec, giveUps });
                }

                // 집중 시간 순위 정렬 (열품타 스타일: 시간이 긴 사람이 위로)
                memberDataList.sort((a, b) => b.totalSec - a.totalSec);

                let memberHtml = "";
                memberDataList.forEach((member, index) => {
                    const hrs = Math.floor(member.totalSec / 3600);
                    const mins = Math.floor((member.totalSec % 3600) / 60);
                    const secs = member.totalSec % 60;
                    const timeStr = hrs > 0 
                        ? `${hrs}시간 ${mins}분 ${secs}초` 
                        : `${mins}분 ${secs}초`;

                    const isMe = (member.mId === currentUser.uid);
                    memberHtml += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 0.8rem; border-bottom: 1px solid #f1f5f9;">
                            <span><b>${index + 1}등</b> ${member.mName} ${isMe ? '<b style="color:#10b981;">(나)</b>' : ''}</span>
                            <div style="text-align: right;">
                                <span style="font-weight: bold; color: #3b82f6;">⏳ ${timeStr}</span><br>
                                <span style="font-size: 0.7rem; color: #ef4444;">포기: ${member.giveUps}회</span>
                            </div>
                        </div>
                    `;
                });

                html += `
                    <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:10px; margin-bottom:10px;">
                        <div style="font-weight:bold; margin-bottom:6px; color:#1e293b;">
                            🌿 ${gData.groupName} <span style="font-size:0.7rem; color:#64748b; font-weight:normal;">(코드: ${gId})</span>
                        </div>
                        <div style="background:#f8fafc; border-radius:6px; padding:6px;">
                            <div style="font-size:0.75rem; font-weight:bold; color:#64748b; margin-bottom:4px;">그룹 멤버 & 실시간 집중 랭킹</div>
                            ${memberHtml}
                        </div>
                    </div>
                `;
            }
        }
        listContainer.innerHTML = html || "가입된 그룹이 없습니다.";
    } catch (e) {
        console.error("그룹 목록 로드 오류:", e);
    }
}