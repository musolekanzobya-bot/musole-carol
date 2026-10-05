/* =========================================================
   M & C WEDDING
   GUEST INVITATION APPLICATION
   ---------------------------------------------------------
   COMPLETE CORRECTED APP.JS
   ---------------------------------------------------------
   FEATURES:
   - Personalized guest invitation
   - Secure Supabase guest lookup via RPC
   - Secure Supabase RSVP via RPC
   - Real envelope opening animation
   - Wax seal interaction
   - Paper emergence and 3D flip
   - Wedding music
   - Music toggle
   - Countdown
   - RSVP
   - QR invitation pass
   - QR download
   - Smooth navigation
   ========================================================= */

"use strict";


/* =========================================================
   STATE
========================================================= */

let invitationOpening = false;

let invitationOpened = false;

let weddingMusicStarted = false;

let countdownTimer = null;

let currentGuest = null;

let currentGuestId = null;

let currentRsvpStatus = "pending";


/* =========================================================
   DOM HELPER
========================================================= */

function $(id) {

    return document.getElementById(id);

}


/* =========================================================
   SLEEP / DELAY
========================================================= */

function sleep(ms) {

    return new Promise(
        resolve => setTimeout(resolve, ms)
    );

}


/* =========================================================
   SAFE TEXT
========================================================= */

function setText(
    element,
    value
) {

    if (!element) {
        return;
    }


    element.textContent =
        value === null ||
        value === undefined
            ? ""
            : String(value);

}


/* =========================================================
   SUPABASE
========================================================= */

function getSupabaseClient() {

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.from ===
            "function"
    ) {

        return window.supabaseClient;

    }


    console.warn(
        "M & C Wedding: Supabase client is unavailable."
    );


    return null;

}


/* =========================================================
   URL / GUEST ID
========================================================= */

function getGuestIdFromUrl() {

    try {

        const params =
            new URLSearchParams(
                window.location.search
            );


        return (
            params.get("guest") ||
            params.get("guest_id") ||
            params.get("id") ||
            ""
        ).trim();


    } catch (error) {

        console.warn(
            "M & C Wedding: Could not read guest URL.",
            error
        );


        return "";

    }

}


/* =========================================================
   GUEST NAME
========================================================= */

function getGuestName(
    guest
) {

    if (!guest) {

        return "Beloved Guest";

    }


    return (

        guest.name ||

        guest.full_name ||

        guest.guest_name ||

        guest.display_name ||

        "Beloved Guest"

    );

}


/* =========================================================
   GUEST PHONE
========================================================= */

function getGuestPhone(
    guest
) {

    if (!guest) {

        return "";

    }


    return (

        guest.phone ||

        guest.phone_number ||

        guest.mobile ||

        ""

    );

}


/* =========================================================
   GUEST TYPE
========================================================= */

function getGuestType(
    guest
) {

    if (!guest) {

        return "single";

    }


    const type =
        String(
            guest.guest_type ||
            guest.type ||
            "single"
        ).toLowerCase();


    return type === "couple"

        ? "couple"

        : "single";

}


/* =========================================================
   PERSONALIZATION
========================================================= */

function personalizeGuestInterface(
    guest
) {

    const name =
        getGuestName(
            guest
        );


    const phone =
        getGuestPhone(
            guest
        );


    const type =
        getGuestType(
            guest
        );


    /* -----------------------------------------------------
       PAPER GUEST NAME
    ----------------------------------------------------- */

    setText(
        $("paperGuestName"),
        name
    );


    /* -----------------------------------------------------
       NAME INPUT
    ----------------------------------------------------- */

    const nameInput =
        $("guestName");


    if (
        nameInput &&
        !nameInput.value.trim() &&
        name !== "Beloved Guest"
    ) {

        nameInput.value =
            name;

    }


    /* -----------------------------------------------------
       PHONE INPUT
    ----------------------------------------------------- */

    const phoneInput =
        $("guestPhone");


    if (
        phoneInput &&
        !phoneInput.value.trim() &&
        phone
    ) {

        phoneInput.value =
            phone;

    }


    /* -----------------------------------------------------
       GUEST TYPE
    ----------------------------------------------------- */

    const radio =
        document.querySelector(
            `input[name="guestType"][value="${type}"]`
        );


    if (radio) {

        radio.checked =
            true;

    }


    /* -----------------------------------------------------
       QR INFORMATION
    ----------------------------------------------------- */

    setText(
        $("qrGuestInfo"),
        `Personalized invitation for ${name}`
    );


    /* -----------------------------------------------------
       ALL PERSONALIZED NAME ELEMENTS
    ----------------------------------------------------- */

    document
        .querySelectorAll(
            "[data-guest-name]"
        )
        .forEach(
            element => {

                setText(
                    element,
                    name
                );

            }
        );


    currentGuest =
        guest || null;

}


/* =========================================================
   LOAD PERSONALIZED GUEST
   ---------------------------------------------------------
   IMPORTANT:
   Anonymous guests must NOT directly SELECT from guests.
   We use the secure Supabase RPC:
   get_guest_invitation
========================================================= */

async function loadGuest() {

    currentGuestId =
        getGuestIdFromUrl();


    /* -----------------------------------------------------
       GENERIC INVITATION MODE
    ----------------------------------------------------- */

    if (!currentGuestId) {

        console.log(
            "M & C Wedding: No personalized guest ID supplied. Generic invitation mode."
        );


        personalizeGuestInterface(
            null
        );


        generateGuestQr();


        return;

    }


    /* -----------------------------------------------------
       SUPABASE CLIENT
    ----------------------------------------------------- */

    const supabase =
        getSupabaseClient();


    if (!supabase) {

        personalizeGuestInterface(
            null
        );


        generateGuestQr();


        return;

    }


    try {

        /* -------------------------------------------------
           SECURE PUBLIC GUEST LOOKUP
           -------------------------------------------------
           This calls the PostgreSQL function:

           get_guest_invitation(uuid)

           instead of directly reading:
           .from("guests").select("*")
        ------------------------------------------------- */

        const {
            data,
            error
        } =
            await supabase.rpc(
                "get_guest_invitation",
                {
                    p_guest_id:
                        currentGuestId
                }
            );


        /* -------------------------------------------------
           ERROR
        ------------------------------------------------- */

        if (error) {

            console.error(
                "M & C Wedding: Guest invitation lookup failed.",
                error
            );


            personalizeGuestInterface(
                null
            );


            generateGuestQr();


            return;

        }


        /* -------------------------------------------------
           RETURNS TABLE PRODUCES AN ARRAY
        ------------------------------------------------- */

        const guest =
            Array.isArray(data)
                ? data[0]
                : data;


        /* -------------------------------------------------
           GUEST NOT FOUND
        ------------------------------------------------- */

        if (!guest) {

            console.warn(
                "M & C Wedding: Guest not found.",
                currentGuestId
            );


            personalizeGuestInterface(
                null
            );


            generateGuestQr();


            return;

        }


        /* -------------------------------------------------
           SAVE CURRENT GUEST
        ------------------------------------------------- */

        currentGuest =
            guest;


        currentRsvpStatus =
            guest.rsvp_status ||
            "pending";


        /* -------------------------------------------------
           PERSONALIZE PAGE
        ------------------------------------------------- */

        personalizeGuestInterface(
            guest
        );


        /* -------------------------------------------------
           GENERATE QR
        ------------------------------------------------- */

        generateGuestQr();


        console.log(
            "M & C Wedding: Guest loaded successfully.",
            guest
        );


    } catch (error) {

        console.error(
            "M & C Wedding: Unexpected guest loading error.",
            error
        );


        personalizeGuestInterface(
            null
        );


        generateGuestQr();

    }

}


/* =========================================================
   MUSIC BUTTON
========================================================= */

function updateMusicButton(
    isPlaying
) {

    const button =
        $("musicToggle");


    if (!button) {

        return;

    }


    const icon =
        button.querySelector(
            "i"
        );


    if (!icon) {

        return;

    }


    if (isPlaying) {

        icon.classList.remove(
            "fa-music",
            "fa-volume-xmark"
        );


        icon.classList.add(
            "fa-volume-high"
        );


        button.setAttribute(
            "aria-label",
            "Pause wedding music"
        );


        button.setAttribute(
            "title",
            "Pause wedding music"
        );


    } else {

        icon.classList.remove(
            "fa-volume-high",
            "fa-volume-xmark"
        );


        icon.classList.add(
            "fa-music"
        );


        button.setAttribute(
            "aria-label",
            "Play wedding music"
        );


        button.setAttribute(
            "title",
            "Play wedding music"
        );

    }

}


/* =========================================================
   START WEDDING MUSIC
   ---------------------------------------------------------
   Music failure NEVER stops the invitation.
========================================================= */

function startWeddingMusic() {

    const music =
        $("weddingMusic");


    if (!music) {

        return;

    }


    /* -----------------------------------------------------
       Set comfortable background volume
    ----------------------------------------------------- */

    music.volume =
        0.35;


    /* -----------------------------------------------------
       Attempt playback
    ----------------------------------------------------- */

    try {

        const playRequest =
            music.play();


        if (
            playRequest &&
            typeof playRequest.then ===
                "function"
        ) {

            playRequest

                .then(
                    () => {

                        weddingMusicStarted =
                            true;


                        updateMusicButton(
                            true
                        );

                    }
                )

                .catch(
                    error => {

                        weddingMusicStarted =
                            false;


                        updateMusicButton(
                            false
                        );


                        console.warn(
                            "M & C Wedding: Music could not start.",
                            error
                        );

                    }
                );


        } else {

            weddingMusicStarted =
                true;


            updateMusicButton(
                true
            );

        }


    } catch (error) {

        weddingMusicStarted =
            false;


        updateMusicButton(
            false
        );


        console.warn(
            "M & C Wedding: Music could not start.",
            error
        );

    }

}


/* =========================================================
   TOGGLE WEDDING MUSIC
========================================================= */

function toggleWeddingMusic() {

    const music =
        $("weddingMusic");


    if (!music) {

        return;

    }


    if (music.paused) {

        try {

            music.volume =
                0.35;


            const promise =
                music.play();


            if (
                promise &&
                typeof promise.catch ===
                    "function"
            ) {

                promise.catch(
                    error => {

                        weddingMusicStarted =
                            false;


                        updateMusicButton(
                            false
                        );


                        console.warn(
                            "M & C Wedding: Unable to play music.",
                            error
                        );

                    }
                );

            }


        } catch (error) {

            weddingMusicStarted =
                false;


            updateMusicButton(
                false
            );


            console.warn(
                "M & C Wedding: Music could not start.",
                error
            );

        }


    } else {

        music.pause();


        weddingMusicStarted =
            false;


        updateMusicButton(
            false
        );

    }

}


/* =========================================================
   MUSIC SETUP
========================================================= */

function setupMusic() {

    const music =
        $("weddingMusic");


    if (music) {

        music.loop =
            true;


        music.preload =
            "auto";


        music.addEventListener(
            "play",
            () => {

                weddingMusicStarted =
                    true;


                updateMusicButton(
                    true
                );

            }
        );


        music.addEventListener(
            "pause",
            () => {

                weddingMusicStarted =
                    false;


                updateMusicButton(
                    false
                );

            }
        );


        music.addEventListener(
            "error",
            () => {

                weddingMusicStarted =
                    false;


                updateMusicButton(
                    false
                );


                console.warn(
                    "M & C Wedding: Music file could not be loaded."
                );


                console.warn(
                    "Expected file: wedding-music/Goodness-of-God.m4a"
                );

            }
        );

    }


    const button =
        $("musicToggle");


    if (button) {

        button.addEventListener(
            "click",
            toggleWeddingMusic
        );

    }

}


/* =========================================================
   INITIAL ENVELOPE STATE
   ---------------------------------------------------------
   IMPORTANT:
   The invitation paper is completely hidden initially.
   No written invitation should be visible before
   the wax seal is pressed.
========================================================= */

function prepareInitialScreen() {

    const screen =
        $("envelopeScreen");


    const envelope =
        $("weddingEnvelope");


    const paper =
        $("invitationPaper");


    const paperInner =
        paper?.querySelector(
            ".paper-inner"
        );


    const blankFace =
        paper?.querySelector(
            ".paper-blank-face"
        );


    const contentFace =
        paper?.querySelector(
            ".paper-content-face"
        );


    const content =
        $("paperInvitationContent");


    const continueButton =
        $("continueInvitationBtn");


    const seal =
        $("waxSealButton");


    const instruction =
        $("openingInstruction");


    const invitation =
        $("invitation");


    invitationOpening =
        false;


    invitationOpened =
        false;


    /* -----------------------------------------------------
       RESET SCREEN
    ----------------------------------------------------- */

    screen?.classList.remove(
        "fade-out"
    );


    /* -----------------------------------------------------
       RESET ENVELOPE CLASSES
    ----------------------------------------------------- */

    envelope?.classList.remove(
        "opening",
        "paper-flipping",
        "paper-revealed"
    );


    /* -----------------------------------------------------
       PAPER COMPLETELY HIDDEN
    ----------------------------------------------------- */

    if (paper) {

        paper.style.opacity =
            "0";


        paper.style.visibility =
            "hidden";


        paper.style.transform =
            "translateX(-50%) translateY(72%) scale(.94)";

    }


    /* -----------------------------------------------------
       RESET PAPER 3D POSITION
    ----------------------------------------------------- */

    if (paperInner) {

        paperInner.style.transform =
            "rotateY(0deg)";

    }


    if (blankFace) {

        blankFace.style.transform =
            "rotateY(0deg)";

    }


    if (contentFace) {

        contentFace.style.transform =
            "rotateY(180deg)";

    }


    /* -----------------------------------------------------
       HIDE WRITTEN CONTENT
    ----------------------------------------------------- */

    content?.classList.remove(
        "visible"
    );


    /* -----------------------------------------------------
       CONTINUE BUTTON HIDDEN
    ----------------------------------------------------- */

    if (continueButton) {

        continueButton.classList.add(
            "hidden"
        );


        continueButton.disabled =
            true;


        continueButton.style.opacity =
            "0";


        continueButton.style.pointerEvents =
            "none";

    }


    /* -----------------------------------------------------
       ENABLE SEAL
    ----------------------------------------------------- */

    if (seal) {

        seal.disabled =
            false;


        seal.classList.remove(
            "opening"
        );

    }


    /* -----------------------------------------------------
       OPENING INSTRUCTION
    ----------------------------------------------------- */

    if (instruction) {

        instruction.style.opacity =
            "1";


        instruction.textContent =
            "Press the golden seal to open your invitation";

    }


    /* -----------------------------------------------------
       HIDE MAIN INVITATION
    ----------------------------------------------------- */

    if (invitation) {

        invitation.classList.add(
            "hidden"
        );


        invitation.classList.remove(
            "visible"
        );


        invitation.style.display =
            "none";


        invitation.style.opacity =
            "0";


        invitation.style.visibility =
            "hidden";

    }

}


/* =========================================================
   OPEN ENVELOPE
   ---------------------------------------------------------
   EXACT EXPERIENCE:

   1. Guest presses wax seal
   2. Music attempts to start
   3. Envelope opens
   4. Paper becomes visible
   5. Paper rises completely out
   6. Paper flips in 3D
   7. Written invitation appears
   8. Continue button appears
========================================================= */

async function openInvitation() {

    if (
        invitationOpening ||
        invitationOpened
    ) {

        return;

    }


    const envelope =
        $("weddingEnvelope");


    const seal =
        $("waxSealButton");


    const instruction =
        $("openingInstruction");


    const paper =
        $("invitationPaper");


    const paperInner =
        paper?.querySelector(
            ".paper-inner"
        );


    const blankFace =
        paper?.querySelector(
            ".paper-blank-face"
        );


    const contentFace =
        paper?.querySelector(
            ".paper-content-face"
        );


    const content =
        $("paperInvitationContent");


    const continueButton =
        $("continueInvitationBtn");


    /* -----------------------------------------------------
       CHECK REQUIRED MARKUP
    ----------------------------------------------------- */

    if (
        !envelope ||
        !paper ||
        !paperInner
    ) {

        console.error(
            "M & C Wedding: Envelope markup is incomplete."
        );


        return;

    }


    invitationOpening =
        true;


    console.log(
        "M & C Wedding: Opening sealed envelope..."
    );


    /* -----------------------------------------------------
       MUSIC
       This is triggered by the user's click.
    ----------------------------------------------------- */

    startWeddingMusic();


    /* -----------------------------------------------------
       DISABLE SEAL
    ----------------------------------------------------- */

    if (seal) {

        seal.disabled =
            true;


        seal.classList.add(
            "opening"
        );

    }


    /* -----------------------------------------------------
       HIDE INSTRUCTION
    ----------------------------------------------------- */

    if (instruction) {

        instruction.style.opacity =
            "0";

    }


    /* -----------------------------------------------------
       HIDE CONTINUE
    ----------------------------------------------------- */

    if (continueButton) {

        continueButton.classList.add(
            "hidden"
        );


        continueButton.disabled =
            true;


        continueButton.style.opacity =
            "0";


        continueButton.style.pointerEvents =
            "none";

    }


    /* -----------------------------------------------------
       RESET PAPER
    ----------------------------------------------------- */

    paper.classList.remove(
        "paper-revealed"
    );


    content?.classList.remove(
        "visible"
    );


    paper.style.opacity =
        "0";


    paper.style.visibility =
        "hidden";


    paper.style.transform =
        "translateX(-50%) translateY(72%) scale(.94)";


    paperInner.style.transform =
        "rotateY(0deg)";


    if (blankFace) {

        blankFace.style.transform =
            "rotateY(0deg)";

    }


    if (contentFace) {

        contentFace.style.transform =
            "rotateY(180deg)";

    }


    /* =====================================================
       STAGE 1
       OPEN ENVELOPE
    ===================================================== */

    envelope.classList.add(
        "opening"
    );


    console.log(
        "M & C Wedding: Envelope flap opening..."
    );


    await sleep(
        1550
    );


    /* =====================================================
       STAGE 2
       PAPER RISES
    ===================================================== */

    paper.style.opacity =
        "1";


    paper.style.visibility =
        "visible";


    paper.style.transition =
        "transform 1.8s cubic-bezier(.22,.61,.36,1)";


    paper.style.transform =
        "translateX(-50%) translateY(-78%) scale(1.02)";


    console.log(
        "M & C Wedding: Paper rising..."
    );


    await sleep(
        1800
    );


    /* =====================================================
       STAGE 3
       PAPER COMPLETELY OUT
    ===================================================== */

    paper.style.transition =
        "transform .65s cubic-bezier(.22,.61,.36,1)";


    paper.style.transform =
        "translateX(-50%) translateY(-112%) scale(1.02)";


    await sleep(
        650
    );


    console.log(
        "M & C Wedding: Paper has fully emerged."
    );


    /* =====================================================
       STAGE 4
       PAPER 3D FLIP
    ===================================================== */

    envelope.classList.add(
        "paper-flipping"
    );


    paperInner.style.transition =
        "transform 1.35s cubic-bezier(.22,.61,.36,1)";


    paperInner.style.transform =
        "rotateY(180deg)";


    console.log(
        "M & C Wedding: Paper is physically flipping..."
    );


    await sleep(
        1350
    );


    /* =====================================================
       STAGE 5
       WRITTEN CONTENT
    ===================================================== */

    paper.classList.add(
        "paper-revealed"
    );


    if (content) {

        content.classList.add(
            "visible"
        );

    }


    console.log(
        "M & C Wedding: Invitation contents revealed."
    );


    /* =====================================================
       STAGE 6
       CONTINUE BUTTON
    ===================================================== */

    await sleep(
        750
    );


    if (continueButton) {

        continueButton.classList.remove(
            "hidden"
        );


        continueButton.disabled =
            false;


        continueButton.style.opacity =
            "1";


        continueButton.style.pointerEvents =
            "auto";

    }


    invitationOpening =
        false;


    console.log(
        "M & C Wedding: Continue Invitation is ready."
    );

}


/* =========================================================
   CONTINUE INVITATION
========================================================= */

function continueInvitation(
    event
) {

    if (event) {

        event.preventDefault();

        event.stopPropagation();

    }


    if (
        invitationOpening ||
        invitationOpened
    ) {

        return;

    }


    const button =
        $("continueInvitationBtn");


    if (
        button &&
        button.disabled
    ) {

        return;

    }


    revealInvitation();

}


/* =========================================================
   REVEAL MAIN INVITATION
========================================================= */

async function revealInvitation() {

    if (invitationOpened) {

        return;

    }


    const invitation =
        $("invitation");


    const screen =
        $("envelopeScreen");


    const continueButton =
        $("continueInvitationBtn");


    if (!invitation) {

        console.error(
            "M & C Wedding: Main invitation is missing."
        );


        return;

    }


    invitationOpened =
        true;


    /* -----------------------------------------------------
       Disable continue button
    ----------------------------------------------------- */

    if (continueButton) {

        continueButton.disabled =
            true;

    }


    /* -----------------------------------------------------
       SHOW MAIN INVITATION
    ----------------------------------------------------- */

    invitation.classList.remove(
        "hidden"
    );


    invitation.classList.add(
        "visible"
    );


    invitation.style.display =
        "block";


    invitation.style.visibility =
        "visible";


    invitation.style.opacity =
        "1";


    /* -----------------------------------------------------
       REMOVE SCROLL LOCK IF PRESENT
    ----------------------------------------------------- */

    document.body.classList.remove(
        "no-scroll"
    );


    document.documentElement.classList.remove(
        "no-scroll"
    );


    await sleep(
        150
    );


    /* -----------------------------------------------------
       FADE ENVELOPE SCREEN
    ----------------------------------------------------- */

    screen?.classList.add(
        "fade-out"
    );


    /* -----------------------------------------------------
       KEEP MUSIC GOING
    ----------------------------------------------------- */

    startWeddingMusic();


    /* -----------------------------------------------------
       SCROLL TO TOP
    ----------------------------------------------------- */

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });


    await sleep(
        1000
    );


    /* -----------------------------------------------------
       REMOVE ENVELOPE SCREEN
    ----------------------------------------------------- */

    if (screen) {

        screen.style.display =
            "none";

    }


    console.log(
        "M & C Wedding: Main invitation displayed."
    );

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    document
        .querySelectorAll(
            'a[href^="#"]'
        )
        .forEach(
            link => {

                link.addEventListener(
                    "click",
                    event => {

                        const href =
                            link.getAttribute(
                                "href"
                            );


                        if (
                            !href ||
                            href === "#"
                        ) {

                            return;

                        }


                        const target =
                            document.querySelector(
                                href
                            );


                        if (!target) {

                            return;

                        }


                        event.preventDefault();


                        target.scrollIntoView({

                            behavior:
                                "smooth",

                            block:
                                "start"

                        });

                    }
                );

            }
        );

}


/* =========================================================
   COUNTDOWN
========================================================= */

function setupCountdown() {

    const days =
        $("days");


    const hours =
        $("hours");


    const minutes =
        $("minutes");


    const seconds =
        $("seconds");


    if (
        !days ||
        !hours ||
        !minutes ||
        !seconds
    ) {

        return;

    }


    /* -----------------------------------------------------
       Saturday, 19 December 2026
       10:00 AM Zambia time
       UTC+02:00
    ----------------------------------------------------- */

    const weddingDate =
        new Date(
            "2026-12-19T10:00:00+02:00"
        ).getTime();


    function update() {

        let difference =
            weddingDate -
            Date.now();


        if (
            difference < 0
        ) {

            difference =
                0;

        }


        const totalSeconds =
            Math.floor(
                difference /
                1000
            );


        const d =
            Math.floor(
                totalSeconds /
                86400
            );


        const h =
            Math.floor(
                (
                    totalSeconds %
                    86400
                ) /
                3600
            );


        const m =
            Math.floor(
                (
                    totalSeconds %
                    3600
                ) /
                60
            );


        const s =
            totalSeconds %
            60;


        setText(
            days,
            String(d).padStart(
                2,
                "0"
            )
        );


        setText(
            hours,
            String(h).padStart(
                2,
                "0"
            )
        );


        setText(
            minutes,
            String(m).padStart(
                2,
                "0"
            )
        );


        setText(
            seconds,
            String(s).padStart(
                2,
                "0"
            )
        );

    }


    update();


    if (countdownTimer) {

        clearInterval(
            countdownTimer
        );

    }


    countdownTimer =
        setInterval(
            update,
            1000
        );

}


/* =========================================================
   RSVP
========================================================= */

function getSelectedGuestType() {

    const selected =
        document.querySelector(
            'input[name="guestType"]:checked'
        );


    return selected

        ? selected.value

        : "single";

}


/* =========================================================
   RSVP MESSAGE
========================================================= */

function showRsvpMessage(
    message,
    type
) {

    const element =
        $("rsvpMessage");


    if (!element) {

        return;

    }


    element.textContent =
        message;


    element.className =
        "rsvp-message";


    if (type) {

        element.classList.add(
            type
        );

    }

}


/* =========================================================
   SAVE RSVP
   ---------------------------------------------------------
   IMPORTANT:
   Anonymous guests must NOT directly UPDATE guests.

   This function calls the secure Supabase RPC:

   submit_guest_rsvp(
       uuid,
       text,
       text,
       text,
       text
   )
========================================================= */

async function saveRsvp(
    status
) {

    /* -----------------------------------------------------
       PERSONALIZED LINK REQUIRED
    ----------------------------------------------------- */

    if (!currentGuestId) {

        showRsvpMessage(
            "Your personalized guest link is required to save your RSVP.",
            "error"
        );


        return;

    }


    /* -----------------------------------------------------
       SUPABASE
    ----------------------------------------------------- */

    const supabase =
        getSupabaseClient();


    if (!supabase) {

        showRsvpMessage(
            "RSVP service is temporarily unavailable. Please try again.",
            "error"
        );


        return;

    }


    /* -----------------------------------------------------
       INPUTS
    ----------------------------------------------------- */

    const nameInput =
        $("guestName");


    const phoneInput =
        $("guestPhone");


    const name =
        nameInput?.value.trim() ||
        "";


    const phone =
        phoneInput?.value.trim() ||
        "";


    const guestType =
        getSelectedGuestType();


    /* -----------------------------------------------------
       NAME VALIDATION
    ----------------------------------------------------- */

    if (!name) {

        showRsvpMessage(
            "Please enter your name.",
            "error"
        );


        nameInput?.focus();


        return;

    }


    /* -----------------------------------------------------
       RSVP STATUS VALIDATION
    ----------------------------------------------------- */

    if (
        status !== "accepted" &&
        status !== "declined"
    ) {

        showRsvpMessage(
            "Invalid RSVP selection.",
            "error"
        );


        return;

    }


    /* -----------------------------------------------------
       GUEST TYPE VALIDATION
    ----------------------------------------------------- */

    if (
        guestType !== "single" &&
        guestType !== "couple"
    ) {

        showRsvpMessage(
            "Please select whether you are attending alone or as a couple.",
            "error"
        );


        return;

    }


    /* -----------------------------------------------------
       SHOW LOADING
    ----------------------------------------------------- */

    showRsvpMessage(
        "Saving your RSVP...",
        "loading"
    );


    try {

        /* -------------------------------------------------
           SECURE RSVP RPC
           -------------------------------------------------
           This replaces direct:

           .from("guests")
           .update(...)

           Anonymous guests call the PostgreSQL
           SECURITY DEFINER function instead.
        ------------------------------------------------- */

        const {
            data,
            error
        } =
            await supabase.rpc(
                "submit_guest_rsvp",
                {

                    p_guest_id:
                        currentGuestId,

                    p_full_name:
                        name,

                    p_phone:
                        phone,

                    p_guest_type:
                        guestType,

                    p_rsvp_status:
                        status

                }
            );


        /* -------------------------------------------------
           SUPABASE ERROR
        ------------------------------------------------- */

        if (error) {

            console.error(
                "M & C Wedding: RSVP failed.",
                error
            );


            showRsvpMessage(
                "We could not save your RSVP right now. Please try again.",
                "error"
            );


            return;

        }


        /* -------------------------------------------------
           FUNCTION RETURNED FALSE
        ------------------------------------------------- */

        if (data !== true) {

            console.error(
                "M & C Wedding: RSVP was not accepted by the server.",
                data
            );


            showRsvpMessage(
                "We could not save your RSVP. Please check your invitation link and try again.",
                "error"
            );


            return;

        }


        /* -------------------------------------------------
           UPDATE LOCAL GUEST STATE
        ------------------------------------------------- */

        currentGuest = {

            ...(currentGuest || {}),

            full_name:
                name,

            name:
                name,

            phone:
                phone,

            guest_type:
                guestType,

            rsvp_status:
                status

        };


        currentRsvpStatus =
            status;


        /* -------------------------------------------------
           REFRESH PERSONALIZATION
        ------------------------------------------------- */

        personalizeGuestInterface(
            currentGuest
        );


        /* -------------------------------------------------
           REFRESH QR
        ------------------------------------------------- */

        generateGuestQr();


        /* -------------------------------------------------
           SUCCESS MESSAGE
        ------------------------------------------------- */

        if (
            status ===
            "accepted"
        ) {

            showRsvpMessage(
                "Thank you! Your attendance has been confirmed. We look forward to celebrating with you.",
                "success"
            );


        } else {

            showRsvpMessage(
                "Thank you for letting us know. We truly appreciate your response.",
                "success"
            );

        }


    } catch (error) {

        console.error(
            "M & C Wedding: Unexpected RSVP error.",
            error
        );


        showRsvpMessage(
            "We could not save your RSVP right now. Please try again.",
            "error"
        );

    }

}


/* =========================================================
   RSVP SETUP
========================================================= */

function setupRsvp() {

    const form =
        $("rsvpForm");


    if (!form) {

        return;

    }


    /* -----------------------------------------------------
       PREVENT NORMAL FORM SUBMISSION
    ----------------------------------------------------- */

    form.addEventListener(
        "submit",
        event => {

            event.preventDefault();

        }
    );


    /* -----------------------------------------------------
       ACCEPT
    ----------------------------------------------------- */

    $("acceptBtn")?.addEventListener(
        "click",
        () => {

            saveRsvp(
                "accepted"
            );

        }
    );


    /* -----------------------------------------------------
       REGRET / DECLINE
    ----------------------------------------------------- */

    $("regretBtn")?.addEventListener(
        "click",
        () => {

            saveRsvp(
                "declined"
            );

        }
    );

}


/* =========================================================
   QR PASS
========================================================= */

function getGuestInvitationUrl() {

    try {

        const url =
            new URL(
                window.location.href
            );


        /* Remove page hash */
        url.hash =
            "";


        return url.toString();


    } catch (error) {

        console.warn(
            "M & C Wedding: Could not generate invitation URL.",
            error
        );


        return window.location.href;

    }

}


/* =========================================================
   GENERATE QR
========================================================= */

function generateGuestQr() {

    const container =
        $("qrContainer");


    if (!container) {

        return;

    }


    /* -----------------------------------------------------
       CLEAR OLD QR
    ----------------------------------------------------- */

    container.innerHTML =
        "";


    /* -----------------------------------------------------
       QR LIBRARY CHECK
    ----------------------------------------------------- */

    if (
        typeof window.QRCode ===
        "undefined"
    ) {

        container.textContent =
            "QR code library could not be loaded.";


        return;

    }


    try {

        new QRCode(
            container,
            {

                text:
                    getGuestInvitationUrl(),

                width:
                    220,

                height:
                    220,

                colorDark:
                    "#1C3B26",

                colorLight:
                    "#ffffff",

                correctLevel:
                    QRCode.CorrectLevel.H

            }
        );


    } catch (error) {

        console.error(
            "M & C Wedding: QR generation failed.",
            error
        );


        container.textContent =
            "Unable to generate QR pass.";

    }

}


/* =========================================================
   DOWNLOAD QR
========================================================= */

function downloadQr() {

    const container =
        $("qrContainer");


    if (!container) {

        return;

    }


    const canvas =
        container.querySelector(
            "canvas"
        );


    const image =
        container.querySelector(
            "img"
        );


    let dataUrl =
        "";


    /* -----------------------------------------------------
       CANVAS QR
    ----------------------------------------------------- */

    if (canvas) {

        try {

            dataUrl =
                canvas.toDataURL(
                    "image/png"
                );

        } catch (error) {

            console.error(
                "M & C Wedding: Could not create QR image.",
                error
            );

        }

    }


    /* -----------------------------------------------------
       IMAGE QR FALLBACK
    ----------------------------------------------------- */

    else if (image) {

        dataUrl =
            image.src;

    }


    /* -----------------------------------------------------
       NO QR
    ----------------------------------------------------- */

    if (!dataUrl) {

        alert(
            "The QR pass is not ready yet."
        );


        return;

    }


    /* -----------------------------------------------------
       DOWNLOAD
    ----------------------------------------------------- */

    const link =
        document.createElement(
            "a"
        );


    link.href =
        dataUrl;


    link.download =
        "Musole-Carol-Wedding-QR-Pass.png";


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();

}


/* =========================================================
   QR SETUP
========================================================= */

function setupQr() {

    const button =
        $("downloadQrBtn");


    if (button) {

        button.addEventListener(
            "click",
            downloadQr
        );

    }

}


/* =========================================================
   ENVELOPE EVENTS
========================================================= */

function setupEnvelopeEvents() {

    const seal =
        $("waxSealButton");


    const continueButton =
        $("continueInvitationBtn");


    /* -----------------------------------------------------
       WAX SEAL CLICK
    ----------------------------------------------------- */

    if (seal) {

        seal.addEventListener(
            "click",
            event => {

                event.preventDefault();


                openInvitation();

            }
        );


        /* -------------------------------------------------
           KEYBOARD ACCESS
        ------------------------------------------------- */

        seal.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                        "Enter" ||
                    event.key ===
                        " "
                ) {

                    event.preventDefault();


                    openInvitation();

                }

            }
        );

    }


    /* -----------------------------------------------------
       CONTINUE BUTTON
    ----------------------------------------------------- */

    if (continueButton) {

        continueButton.addEventListener(
            "click",
            continueInvitation
        );


        /* -------------------------------------------------
           KEYBOARD ACCESS
        ------------------------------------------------- */

        continueButton.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                        "Enter" ||
                    event.key ===
                        " "
                ) {

                    event.preventDefault();


                    continueInvitation(
                        event
                    );

                }

            }
        );

    }

}


/* =========================================================
   INITIALIZE APPLICATION
========================================================= */

async function initializeWeddingApp() {

    console.log(
        "M & C Wedding: Initializing..."
    );


    /* -----------------------------------------------------
       ENVELOPE
    ----------------------------------------------------- */

    prepareInitialScreen();


    /* -----------------------------------------------------
       ENVELOPE EVENTS
    ----------------------------------------------------- */

    setupEnvelopeEvents();


    /* -----------------------------------------------------
       MUSIC
    ----------------------------------------------------- */

    setupMusic();


    /* -----------------------------------------------------
       NAVIGATION
    ----------------------------------------------------- */

    setupNavigation();


    /* -----------------------------------------------------
       RSVP
    ----------------------------------------------------- */

    setupRsvp();


    /* -----------------------------------------------------
       QR
    ----------------------------------------------------- */

    setupQr();


    /* -----------------------------------------------------
       COUNTDOWN
    ----------------------------------------------------- */

    setupCountdown();


    /* -----------------------------------------------------
       LOAD PERSONALIZED GUEST
    ----------------------------------------------------- */

    await loadGuest();


    console.log(
        "M & C Wedding: Application ready."
    );

}


/* =========================================================
   DOM READY
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeWeddingApp
    );

} else {

    initializeWeddingApp();

}


/* =========================================================
   GLOBAL API
========================================================= */

window.MCWedding = {

    openInvitation,

    continueInvitation,

    revealInvitation,

    startWeddingMusic,

    toggleWeddingMusic,

    generateGuestQr,

    downloadQr

};