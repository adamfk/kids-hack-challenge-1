class UrlArgs {
    urlParams = new URLSearchParams(window.location.search);
    
    constructor() {
        console.log('urlParams', this.urlParams);
    }

    get skipIntroHelp() { return this.urlParams.has('skip-intro-help'); }
    get isDemoMode() { return this.urlParams.has('demo'); }
    get isNotDemoMode() { return this.urlParams.has('not-demo'); } // takes precedence over isDemoMode
    get triesPerUser() { return parseInt(this.urlParams.get('tries-per-user')); }
    get seconds() { return parseInt(this.urlParams.get('seconds')); }
    get passwordMin() { return parseInt(this.urlParams.get('password-min')); }
    get passwordMax() { return parseInt(this.urlParams.get('password-max')); }
    get password() { return parseInt(this.urlParams.get('password')); } // takes precedence over passwordMin and passwordMax
}

const urlArgs = new UrlArgs();

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

const IS_SKIP_HELP_INTRO = urlArgs.skipIntroHelp || false;
const IS_DEMO_MODE = (window.location.href.includes('github.io') || urlArgs.isDemoMode) && !urlArgs.isNotDemoMode;
const MAX_PASS_LEN = 3;
let MAX_ATTEMPTS_PER_PERSON = IS_DEMO_MODE ? 1000 : 400;
MAX_ATTEMPTS_PER_PERSON = urlArgs.triesPerUser || MAX_ATTEMPTS_PER_PERSON;
Object.freeze(MAX_ATTEMPTS_PER_PERSON);

let g_countdownActive = true;
let STARTING_SECONDS_LEFT = IS_DEMO_MODE ? 60 * 3 : 60 * 10;
STARTING_SECONDS_LEFT = urlArgs.seconds || STARTING_SECONDS_LEFT;
Object.freeze(STARTING_SECONDS_LEFT);

let g_countdownSecondsLeft = STARTING_SECONDS_LEFT;
let g_password = randomInt(urlArgs.passwordMin || 5, urlArgs.passwordMax || 995);
g_password = urlArgs.password || g_password;
Object.freeze(g_password);

let g_done = false;
let g_passwordMin = 0;
let g_passwordMax = 1000;
let g_attemptsLeftBeforeHideHackConsole = MAX_ATTEMPTS_PER_PERSON;
let g_progressMaxHeight = -1;   // -1 means not set yet
//--------------------------------------------------------------
console.log(g_password);
console.log(urlArgs);


class EventItem {
    constructor() {
        this.preDelay = 0;
        this.func = null;
        this.duration = 0;
    }
}


class EventQueue {
    #delayOverride = -1;

    constructor() {
        /** @type {EventItem[]} */
        this.queue = [];
    }

    // ignored if negative
    setDelayOverride(preDelay) {
        this.#delayOverride = preDelay;
    }

    clearDelayOverride() {
        this.#delayOverride = -1;
    }

    #getEffectiveDelay(preDelay) {
        if (this.#delayOverride >= 0)
            return this.#delayOverride;
        return preDelay;
    }

    addEventItem(eventItem) {
        this.queue.push(eventItem);
    }

    /**
     * @param {Number} preDelay 
     * @param {Number} duration 
     * @param {Function} func 
     * @returns 
     */
    addWithPreAndPostDelay(preDelay, duration, func) {
        const eventItem = new EventItem();
        eventItem.func = func;
        eventItem.duration = this.#getEffectiveDelay(duration);
        eventItem.preDelay = this.#getEffectiveDelay(preDelay);
        this.addEventItem(eventItem);
        return eventItem;
    }

    /**
     * @param {Number} duration 
     * @param {Function} func 
     * @returns 
     */
    addWithDuration(duration, func) {
        return this.addWithPreAndPostDelay(0, duration, func);
    }

    /**
     * @param {Function} func 
     * @returns 
     */
    addWithNoDuration(func) {
        return this.addWithPreAndPostDelay(0, 0, func);
    }

    process() {
        if (this.queue.length == 0)
            return;

        const eventItem = this.queue.shift();
        EventQueue.#runAfterDelayIfAny(eventItem.preDelay, () => {
            eventItem.func();
            EventQueue.#runAfterDelayIfAny(eventItem.duration, () => {
                this.process(); // continue to next event
            });
        });
    }

    /**
     * Different from window.setTimeout(). This function won't wait for next event cycle if delay is 0.
     * @param {Number} delay
     * @param {Function} func
     */
    static #runAfterDelayIfAny(delay, func) {
        if (delay <= 0) {
            func();
        } else {
            window.setTimeout(() => {
                func();
            }, delay);
        }
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
            {
                event.preventDefault();
            }
            else
            {
                // play sound effect
                const audio = new Audio('audio/key-press.mp3');
                audio.volume = 0.5;
                audio.play();
            }
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


    if (IS_DEMO_MODE && !IS_SKIP_HELP_INTRO) {
        window.setTimeout(() => {
            window.alert("Welcome rebels!\n\nPress 'H' to show/hide the hacker console. Enter the correct password to stop the imperial fleet launch. You have 10 minutes. Good luck!\n\n Refresh screen to play again.");
        }, 1000);
    }
});


/////////////////////////////////////////////////////////


function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function isHackerConsoleVisible() {
    return hackerConsoleDiv.style.display === 'block';
}

function showHideHackerConsole() {
    if (hackerConsoleDiv.style.display === 'block') {
        hackerConsoleDiv.style.display = 'none';
    } else {
        hackerConsoleDiv.style.display = 'block';
        // play sound effect
        const audio = new Audio('audio/hacker-console1.mp3');
        audio.volume = 0.5;
        audio.play();
    }
}

function hideHackerConsole() {
    hackerConsoleDiv.style.display = 'none';
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
    }

    setSizeRelative(fail1Img, mainImg, { top: 0.4, left: 0, });

    setSizeRelative(passwordInput, mainImg, { top: 0.64, left: 0.64, width: 0.24, height: 0.05, fontSize: 0.05, paddingLeft: 0.005 });
    setSizeRelative(countdownInput, mainImg, { top: 0.18, left: 0, width: 0.237, height: 0.05, fontSize: 0.05, paddingLeft: 0.005 });
    setSizeRelative(progressDiv, mainImg, { top: 0.23, left: 0, width: 0.237, height: 0.77, });
    g_progressMaxHeight = progressDiv.clientHeight;
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

    {
        // by carefully watching the time it takes to show the DENIED message, the player can guess if the password is higher or lower
        const preDelay = (guess < g_password) ? 750 : 1500;
        eventQueue.addWithPreAndPostDelay(preDelay, 1500, () => {
            passwordInput.value = 'DENIED!';
            new Audio('audio/dun-dun.mp3').play();
        });
    }

    if (isHackerConsoleVisible()) {
        animateMinMax(guess, eventQueue);
    }

    maybePromptForNextPerson(eventQueue);

    eventQueue.addWithDuration(150, () => {
        passwordInput.disabled = false;
        passwordInput.value = '';
        passwordInput.focus();
    });

    eventQueue.process();
}

function maybePromptForNextPerson(eventQueue) {
    g_attemptsLeftBeforeHideHackConsole--;
    if (g_attemptsLeftBeforeHideHackConsole <= 0) {
        g_attemptsLeftBeforeHideHackConsole = MAX_ATTEMPTS_PER_PERSON;
        
        eventQueue.addWithPreAndPostDelay(0, 500, () => {
            passwordInput.value = "Next rebel!";
        });

        eventQueue.addWithPreAndPostDelay(0, 500, () => {
            alert("Nice try rebel!\n\nYour guesses are up.\nShoot down more targets for more guesses!");
        });

        if (isHackerConsoleVisible()) {
            eventQueue.addWithPreAndPostDelay(2000, 150, () => {
                hideHackerConsole();
            });
        }
    }
}

/**
 * 
 * @param {number} guess 
 * @param {EventQueue} eventQueue 
 */
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
    function addFrame(func) {
        eventQueue.addWithDuration(interval, func);
    }

    const audio = new Audio('audio/cracking-beeps.mp3');

    addFrame(() => { 
        passwordInput.value = '<cracking>';
        audio.playbackRate = Math.random() * 2.0 + 0.75;
        audio.volume = 0.5;
        audio.play();
    });

    function soundTick(rate = 1) {
        // const audio = new Audio(`audio/tick1.mp3`)
        // audio.playbackRate = rate;
        // audio.play();
    }

    // animate clear the span
    for (let i = 0; i < obj.innerText.length; i++) {
        addFrame(() => {
            obj.innerText = obj.innerText.substring(0, obj.innerText.length - 1);
            soundTick();
        });
    }

    for (let i = 0; i < MAX_PASS_LEN; i++) {
        addFrame(() => { 
            obj.innerText += "?";
            soundTick(2);
        });
    }
    for (let i = 0; i < MAX_PASS_LEN; i++) {
        addFrame(() => { 
            obj.innerText = setCharAt(obj.innerText, i, "*");
            soundTick(0.75);
        });
    }
    for (let i = 0; i < MAX_PASS_LEN; i++) {
        addFrame(() => { 
            obj.innerText = setCharAt(obj.innerText, i, "#");
            soundTick(3);
        });
    }

    const newValueStr = value.toString(); //.padStart(3, ' ');
    for (let i = 0; i < newValueStr.length; i++) {
        addFrame(() => { 
            obj.innerText = setCharAt(obj.innerText, i, newValueStr[i]);
            soundTick(2);
        });
    }

    for (let i = MAX_PASS_LEN; i >= newValueStr.length; i--) {
        addFrame(() => {
            obj.innerText = obj.innerText.substring(0, i);
            soundTick(1);
        });
    }

    addFrame(() => { 
        audio.pause();
    });
}

function passwordSuccess() {
    console.log('success!!!');
    new Audio('audio/fireworks.mp3').play();
    g_done = true;
    g_countdownActive = false;

    window.setTimeout(() => {
        successStatsDiv.style.display = 'block';
        successStatsDiv.innerText = `Password: ${g_password}\nAttempts: ${attemptCountSpan.innerText}\nTime: ${secondsToTimeString(STARTING_SECONDS_LEFT - g_countdownSecondsLeft)}`;
        successImg.style.display = 'block';
    }, 1500);
}

function countdownTick() {
    g_countdownSecondsLeft -= 1;
    if (g_countdownSecondsLeft <= 0) {
        g_countdownActive = false;
        g_countdownSecondsLeft = 0;
        console.log('countdown finished');
    }

    const percentage = g_countdownSecondsLeft / STARTING_SECONDS_LEFT;
    progressDiv.style.height = g_progressMaxHeight * percentage + 'px';

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

let g_fKeysDisabled = true;

// disable all F keys as kids hit them by accident sometimes while trying to punch in numbers
document.addEventListener('keydown', function (event) {
    // provide a way to enable/disable F keys with 'z' key
    if (event.key.toLowerCase() === 'z') { 
        if (g_fKeysDisabled === true) {
            g_fKeysDisabled = false;
            window.setTimeout(() => {
                g_fKeysDisabled = true;
            }, 3000);
        } else {
            g_fKeysDisabled = true;
        }
    }

    if (g_fKeysDisabled && event.key.startsWith('F')) {
        event.preventDefault(); // Prevent default action
        console.log(`Blocked: ${event.key}`);
    }
});




/*
TODO

# Extras
- tick sound every second
- prevent page from leaving (F5)

*/
