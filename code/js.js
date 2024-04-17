const mainDiv = document.getElementById('main');
const mainImg = document.getElementById('main-bg');
const successImg = document.getElementById('success');
const successStatsDiv = document.getElementById('success-stats');
const fail1Img = document.getElementById('fail-1');

const mainImgWidthHeightRatio = mainImg.clientWidth / mainImg.clientHeight;
const passwordInput = document.getElementById('password');
const countdownInput = document.getElementById('countdown');
const progressDiv = document.getElementById('progress-div');
const hackerConsoleDiv = document.getElementById('hacker-console');
const passwordMinSpan = document.getElementById('password-min');
const passwordMaxSpan = document.getElementById('password-max');
const attemptCountSpan = document.getElementById('attempt-count');

const IS_DEMO_MODE = window.location.href.includes('github.io');
const MAX_PASS_LEN = 3;
const MAX_ATTEMPTS_PER_PERSON = IS_DEMO_MODE ? 1000 : 2; // 2 for running game, unlimited for online demo

window.keepFocus = true;
let g_countdownActive = true;
const startingSecondsLeft = 60 * 10;
let g_countdownSecondsLeft = startingSecondsLeft;
let g_password = randomInt(5, 995);
let g_done = false;
let g_passwordMin = 0;
let g_passwordMax = 1000;
let g_attemptsLeftBeforeHideHackConsole = MAX_ATTEMPTS_PER_PERSON;
console.log(g_password);


class EventItem {
    constructor() {
        this.delay = 0;
        this.func = null;
    }
}


class EventQueue {
    constructor() {
        /** @type {EventItem[]} */
        this.queue = [];
    }

    addEventItem(eventItem) {
        this.queue.push(eventItem);
    }

    addFunction(func, delay) {
        const eventItem = new EventItem();
        eventItem.func = func;
        eventItem.delay = delay;
        this.addEventItem(eventItem);
    }

    process() {
        if (this.queue.length == 0)
            return;

        const eventItem = this.queue.shift();
        window.setTimeout(() => {
            eventItem.func();
            this.process();
        }, eventItem.delay);
    }
}


window.addEventListener('load', function () {
    adjustScale();
    mainDiv.style.opacity = 1;
    window.addEventListener('resize', adjustScale);

    // listen to whenever keyboard is pressed
    document.addEventListener('keydown', function (event) {
        // console.log(event.key);
        if (event.key === 'h' || event.key === 'H') {
            showHideHackerConsole();
        }
    });

    passwordInput.addEventListener('keydown', function (event) {
        // console.log(event.key);

        // prevent if non-numeric key is pressed
        if (event.key.length == 1) {
            if (event.key < '0' || event.key > '9')
                event.preventDefault();
        }

        if (event.key === 'Enter') {
            passwordEntered();
        }
    });

    passwordInput.addEventListener('focusout', function (event) {
        if (window.keepFocus)
            passwordInput.focus();
    });
    passwordInput.focus();

    window.setInterval(() => {
        if (g_countdownActive) {
            countdownTick();
        }
    }, 1000);


    if (IS_DEMO_MODE) {
        window.setTimeout(() => {
            window.alert("Welcome rebels! Press 'H' to show/hide the hacker console. Enter the correct password to stop the imperial fleet launch. You have 10 minutes. Good luck!");
        }, 1000);
    }
});


/////////////////////////////////////////////////////////


function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function showHideHackerConsole() {
    if (hackerConsoleDiv.style.display === 'block') {
        hackerConsoleDiv.style.display = 'none';
    } else {
        hackerConsoleDiv.style.display = 'block';
    }
}

function adjustScale() {
    console.log('resize');

    // scale main image to fit the screen
    {
        const availableWidth = window.innerWidth;
        const availableHeight = window.innerHeight;
        const availableWidthHeightRatio = availableWidth / availableHeight;

        const effectiveWidthHeightRatio = Math.min(mainImgWidthHeightRatio, availableWidthHeightRatio);
        const newWidth = effectiveWidthHeightRatio * availableHeight;
        const newHeight = newWidth / mainImgWidthHeightRatio;

        mainImg.style.width = newWidth + 'px';
        mainImg.style.height = newHeight + 'px';
        successImg.style.width = mainImg.style.width;
        successImg.style.height = mainImg.style.height;
        progressDiv.style.bottom = (availableHeight - newHeight) + 'px';
    }

    setSizeRelative(fail1Img, mainImg, { top: 0.4, left: 0, });

    setSizeRelative(passwordInput, mainImg, { top: 0.64, left: 0.64, width: 0.24, height: 0.05, fontSize: 0.05, paddingLeft: 0.005 });
    setSizeRelative(countdownInput, mainImg, { top: 0.18, left: 0, width: 0.237, height: 0.05, fontSize: 0.05, paddingLeft: 0.005 });
    setSizeRelative(progressDiv, mainImg, { left: 0, width: 0.237, height: 0.05, });
    setSizeRelative(hackerConsoleDiv, mainImg, { top: 0.77, left: 0.29, width: 0.65, height: 0.20, fontSize: 0.05, paddingLeft: 0.005 });
    setSizeRelative(successStatsDiv, mainImg, { top: 0.70, left: 0.35, width: 0.30, height: 0.20, fontSize: 0.05, paddingLeft: 0.005 });

}

/** @param {HTMLElement} element */
function setSizeRelative(element, reference, size) {

    if (size.bottom !== undefined)
        element.style.bottom = reference.clientHeight * size.bottom + 'px';

    if (size.top !== undefined)
        element.style.top = reference.clientHeight * size.top + 'px';

    if (size.left !== undefined)
        element.style.left = reference.clientWidth * size.left + 'px';

    if (size.width !== undefined)
        element.style.width = reference.clientWidth * size.width + 'px';

    if (size.height !== undefined)
        element.style.height = reference.clientHeight * size.height + 'px';

    if (size.fontSize !== undefined)
        element.style.fontSize = reference.clientHeight * size.fontSize + 'px';

    if (size.paddingLeft !== undefined)
        element.style.paddingLeft = reference.clientWidth * size.paddingLeft + 'px';
}


function passwordEntered() {
    if (g_done)
        return;

    console.log('password entered: ' + passwordInput.value);
    const guess = parseInt(passwordInput.value);

    if (isNaN(guess)) {
        passwordInput.value = '';
        return;
    }

    passwordInput.value = 'validating...';
    passwordInput.disabled = true;

    attemptCountSpan.innerText = parseInt(attemptCountSpan.innerText) + 1;

    if (guess === g_password) {
        passwordSuccess();
    } else {
        passwordFailure(guess);
    }
}


function passwordFailure(guess) {
    const eventQueue = new EventQueue();

    eventQueue.addFunction(() => { passwordInput.value = 'DENIED!'; }, 1500);

    animateMinMax(guess, eventQueue);

    eventQueue.addFunction(() => {
        passwordInput.disabled = false;
        passwordInput.value = '';
        passwordInput.focus();
    }, 500);

    eventQueue.addFunction(() => {
        g_attemptsLeftBeforeHideHackConsole--;
        if (g_attemptsLeftBeforeHideHackConsole <= 0) {
            g_attemptsLeftBeforeHideHackConsole = MAX_ATTEMPTS_PER_PERSON;
            showHideHackerConsole();
        }
    }, 2000);

    eventQueue.process();
}

function animateMinMax(guess, eventQueue) {
    /** @type {HTMLElement} */
    let obj = null;
    let value = 0;
    if (guess < g_password) {
        g_passwordMin = Math.max(g_passwordMin, guess);
        obj = passwordMinSpan;
        value = g_passwordMin;
    } else {
        g_passwordMax = Math.min(g_passwordMax, guess);
        obj = passwordMaxSpan;
        value = g_passwordMax;
    }

    const interval = 150;
    eventQueue.addFunction(() => { passwordInput.value = '<cracking>'; }, 1500);

    // animate clear the span
    for (let i = 0; i < obj.innerText.length; i++) {
        eventQueue.addFunction(() => { obj.innerText = obj.innerText.substring(0, obj.innerText.length - 1); }, interval);
    }

    for (let i = 0; i < MAX_PASS_LEN; i++) {
        eventQueue.addFunction(() => { obj.innerText += "?"; }, interval);
    }
    for (let i = 0; i < MAX_PASS_LEN; i++) {
        eventQueue.addFunction(() => { obj.innerText = setCharAt(obj.innerText, i, "*"); }, interval);
    }
    for (let i = 0; i < MAX_PASS_LEN; i++) {
        eventQueue.addFunction(() => { obj.innerText = setCharAt(obj.innerText, i, "#"); }, interval);
    }

    const newValueStr = value.toString(); //.padStart(3, ' ');
    for (let i = 0; i < newValueStr.length; i++) {
        eventQueue.addFunction(() => { obj.innerText = setCharAt(obj.innerText, i, newValueStr[i]); }, interval);
    }

    for (let i = MAX_PASS_LEN; i >= newValueStr.length; i--) {
        eventQueue.addFunction(() => { obj.innerText = obj.innerText.substring(0, i); }, interval);
    }
}

function passwordSuccess() {
    console.log('success!!!');
    g_done = true;
    g_countdownActive = false;

    window.setTimeout(() => {
        successStatsDiv.style.display = 'block';
        successStatsDiv.innerText = `Password: ${g_password}\nAttempts: ${attemptCountSpan.innerText}\nTime: ${secondsToTimeString(startingSecondsLeft - g_countdownSecondsLeft)}`;
        successImg.style.display = 'block';
    }, 1500);
}

function countdownTick() {
    g_countdownSecondsLeft--;
    if (g_countdownSecondsLeft <= 0) {
        g_countdownActive = false;
        g_countdownSecondsLeft = 0;
        console.log('countdown finished');
    }
    updateCountdownText();
}

function updateCountdownText() {
    if (g_countdownSecondsLeft <= 0) {
        rebelsLose();
        return;
    }

    const countdownSeconds = g_countdownSecondsLeft;
    const str = secondsToTimeString(countdownSeconds);
    countdownInput.value = str;
}

function secondsToTimeString(countdownSeconds) {
    if (countdownSeconds < 0) {
        countdownSeconds = 0;
    }

    const minutes = Math.floor(countdownSeconds / 60);
    const seconds = countdownSeconds % 60;
    const str = `0h ${minutes}m ${seconds}s`;
    return str;
}

function rebelsLose() {
    g_done = true;
    passwordInput.disabled = true;
    countdownInput.value = 'LAUNCHED!!!';
    fail1Img.style.display = 'block';
}


function setCharAt(str, index, chr) {
    if(index > str.length-1) return str;
    return str.substring(0,index) + chr + str.substring(index+1);
}


/*
TODO

# Extras
- tick sound every second
- prevent page from leaving (F5)

*/
