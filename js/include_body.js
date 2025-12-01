// Global variable for image
let viewerState = {
    images: [],         // Array of image sources found in local-html
    captions: [],       // Array of captions sources found in local-html
    currentIndex: 0,    // Current index in the array
    zoom: 1,            // Current zoom scale
    rotate: 0,          // Current rotation in degrees
    flipH: 1,           // Horizontal scale (1 or -1)
    flipV: 1,           // Vertical scale (1 or -1)
    // New state for positioning
    posX: 0,
    posY: 0,
    // Interaction flags
    isDragging: false,
    startX: 0,
    startY: 0,
    lastTouchDist: 0 // For pinch zoom
};

// Generate image viewer
function imageViewer() {
    // Helper to calculate distance between two fingers
    function getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Add on-click event listener to every image
    const localHtml = document.getElementById(`local-html`);
    const imgs = localHtml.querySelectorAll(`figure > img`);
    const captions = localHtml.querySelectorAll(`figure > figcaption`);
    viewerState.images = Array.from(imgs);
    viewerState.captions = Array.from(captions);
    viewerState.images.forEach((img, index) => {
        img.addEventListener(`click`, () => {imageOpen(index)});
    });

    // Add drag event listener to the image
    const container = document.getElementById(`image-container`);
    // Mouse Wheel Zoom
    container.addEventListener(`wheel`, (e) => {
        e.preventDefault();
        
        const zoomStep = 0.1;
        // Check deltaY: negative is scrolling up (zoom in), positive is down (zoom out)
        if (e.deltaY < 0) {
            viewerState.zoom += zoomStep;
        } else {
            viewerState.zoom = Math.max(0.1, viewerState.zoom - zoomStep);
        }
        applyTransforms();
    }, { passive: false });

    // Mouse Drag (Desktop)
    container.addEventListener(`mousedown`, (e) => {
        // Only left click
        if (e.button !== 0) return;
        
        viewerState.isDragging = true;
        // Calculate the cursor offset relative to current image position
        viewerState.startX = e.clientX - viewerState.posX;
        viewerState.startY = e.clientY - viewerState.posY;
        
        container.style.cursor = `grabbing`;
        
        // Disable transition for instant drag response
        const img = document.getElementById(`viewer-active-image`);
        if(img) img.style.transition = `none`;
    });
    window.addEventListener(`mousemove`, (e) => {
        if (!viewerState.isDragging) return;
        e.preventDefault();
        
        viewerState.posX = e.clientX - viewerState.startX;
        viewerState.posY = e.clientY - viewerState.startY;
        applyTransforms();
    });

    window.addEventListener(`mouseup`, () => {
        if (viewerState.isDragging) {
            viewerState.isDragging = false;
            const container = document.getElementById(`image-container`);
            if(container) container.style.cursor = `grab`;
            
            // Re-enable smooth transition
            const img = document.getElementById(`viewer-active-image`);
            if(img) img.style.transition = `transform 0.1s ease-out`;
        }
    });

    // Touch Gestures (Mobile: Drag & Pinch)
    container.addEventListener(`touchstart`, (e) => {
        const img = document.getElementById(`viewer-active-image`);
        if(img) img.style.transition = `none`;

        if (e.touches.length === 1) {
            // Single finger: Drag
            viewerState.isDragging = true;
            viewerState.startX = e.touches[0].clientX - viewerState.posX;
            viewerState.startY = e.touches[0].clientY - viewerState.posY;
        } else if (e.touches.length === 2) {
            // Two fingers: Pinch Start
            viewerState.isDragging = false; // Stop dragging if pinching
            viewerState.lastTouchDist = getTouchDistance(e.touches);
        }
    }, { passive: false });

    container.addEventListener(`touchmove`, (e) => {
        // Prevent scrolling
        e.preventDefault();

        if (e.touches.length === 1 && viewerState.isDragging) {
            // Drag logic
            viewerState.posX = e.touches[0].clientX - viewerState.startX;
            viewerState.posY = e.touches[0].clientY - viewerState.startY;
            applyTransforms();
        } else if (e.touches.length === 2) {
            // Pinch logic
            const currentDist = getTouchDistance(e.touches);
            if (viewerState.lastTouchDist > 0) {
                const diff = currentDist - viewerState.lastTouchDist;
                // Sensitivity factor for pinch
                const sensitivity = 0.005; 
                viewerState.zoom += diff * sensitivity;
                // Clamp zoom
                if (viewerState.zoom < 0.1) viewerState.zoom = 0.1;
                
                applyTransforms();
            }
            viewerState.lastTouchDist = currentDist;
        }
    }, { passive: false });

    // Reset once touch ends
    container.addEventListener(`touchend`, () => {
        viewerState.isDragging = false;
        viewerState.lastTouchDist = 0;
        const img = document.getElementById(`viewer-active-image`);
        if(img) img.style.transition = `transform 0.1s ease-out`;
    });
}

// Generate table of contents from heading
function generateTableOfContents() {
    const mainContainer = document.getElementById("main-container");
    const sidebar = document.getElementById("sidebar-right_content");

    // Select all heading elements within the main container
    const headings = mainContainer.querySelectorAll("h1, h2, h3, h4, h5, h6");

    // Initialize counters for levels 1 through 6
    let counters = [0, 0, 0, 0, 0, 0];

    // Iterate through headings
    headings.forEach((heading) => {
        const level = parseInt(heading.tagName.substring(1));
        const arrayIndex = level - 1;

        counters[arrayIndex]++;

        // Reset all counters for deeper levels
        for (let i = arrayIndex + 1; i < 6; i++) {
            counters[i] = 0;
        }

        // Slice the array to only include numbers up to the current level
        const currentHierarchy = counters.slice(0, level); 
        const idString = "heading_" + currentHierarchy.join("-");
        heading.id = idString;

        // Create the anchor element for the Table of Contents
        const link = document.createElement("a");
        link.href = "#" + idString;
        link.className = "content-heading" + level; // e.g., content-heading1, content-heading2
        link.textContent = heading.textContent;
        
        // Append the link to the sidebar
        sidebar.appendChild(link);
    });
}

// Generate comment section
function enableCommmentSection() {
    const commentContainer = document.getElementById(`comment-container`);
    if (!commentContainer) return;

    commentContainer.innerHTML = ``;
    const script = document.createElement(`script`);
    script.id = `giscus-script`;

    script.src = `https://giscus.app/client.js`;
    script.setAttribute(`async`, `true`);
    script.setAttribute(`crossorigin`, `anonymous`);

    // Get current light/dark mode
    const mode = localStorage.getItem(`mode`);
    if (!mode) {
        // Light mode as default
        mode = `light`;
    }

    // Giscus configuration
    const giscusConfig = {
        "data-repo": `chronix1710/essence-guide`,
        "data-repo-id": `R_kgDOQUOdQg`, 
        "data-category": `Blog`,
        "data-category-id": `DIC_kwDOQUOdQs4CzLc3`,
        "data-mapping": `number`,
        "data-term": `1`,
        "data-reactions-enabled": `1`,
        "data-emit-metadata": `0`,
        "data-input-position": `top`,
        "data-theme": mode,
        "data-lang": `en`,
        "data-loading": `lazy`
    };

    Object.entries(giscusConfig).forEach(([key, value]) => {
        script.setAttribute(key, value);
    });

    commentContainer.appendChild(script);
}

// Include body.html based on conditions
(async () => {
    const body = document.body;
    const main = document.getElementById(`main`);
    try {
        const resp = await fetch(`/essence-guide/html/body.html`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const html = await resp.text();
        const template = document.createElement(`template`);
        template.innerHTML = html.trim();

        // Move the main element to the correct position
        body.appendChild(template.content.cloneNode(true));
        document.getElementById(`local-html`).appendChild(main);
        document.getElementById(`main`).style.display = "block";

        // Remove disabled partial elements in body.html
        if (main.dataset["sidebarLeft"] === "false") {
            document.getElementById(`sidebar-left`).remove();
        }
        if (main.dataset["sidebarRight"] === "false") {
            document.getElementById(`sidebar-right`).remove();
            document.getElementById(`button_sidebar-right_open`).classList.add(`hidden`);
        }
        else {
            generateTableOfContents();
            imageViewer();
        }
        if (main.dataset["menubar"] === "false") {
            document.getElementById(`menubar`).remove();
        }
        if (main.dataset["commentSection"] === "false") {
            document.getElementById(`comment-section`).remove();
        }
        // Enable GitHub comment section
        else {
            enableCommmentSection();
            const discussionBaseLink = `https://github.com/chronix1710/essence-guide/discussions/`;
            const discussionLink = document.getElementById(`discussion-link`);
            const discussionNumber = main.dataset["discussionNumber"];
            discussionLink.href = discussionBaseLink + discussionNumber;
            discussionLink.innerText = discussionBaseLink + discussionNumber;
        }
        
    } 
    catch (err) {
        console.error(`Failed to load body.html:`, err);
    }

    // Apply light/dark mode
    const mode_key = `mode`;
    const mode = localStorage.getItem(mode_key);
    if (!mode) {
        if (window.matchMedia(`(prefers-color-scheme: dark)`).matches) {
            localStorage.setItem(mode_key,`dark`);
            mode = `dark`;
        }
        else {
            localStorage.setItem(mode_key,`dark`);
            mode = `light`;
        }
    }
    if (mode === `light`) {
        document.getElementById(`button_mode_light`).classList.add(`button-close`);
    }
    else {
        document.documentElement.classList.toggle(`darkmode`);
        document.getElementById(`button_mode_dark`).classList.add(`button-close`);
    }
})();