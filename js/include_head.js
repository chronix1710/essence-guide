// Include head.html
(async () => {
    const head = document.head;
    try {
        const resp = await fetch(`/html/head.html`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const html = await resp.text();
        const template = document.createElement(`template`);
        template.innerHTML = html.trim();
        head.appendChild(template.content.cloneNode(true));
    } 
    catch (err) {
        console.error(`Failed to load head.html:`, err);
    }
})();

// Include global.js
const scriptGlobal = document.createElement('script');
scriptGlobal.src = '/js/global.js';
scriptGlobal.defer = true;
document.head.appendChild(scriptGlobal);

// Include minisearch.js
const scriptSearch = document.createElement('script');
scriptSearch.src = '/js/minisearch.js';
document.head.appendChild(scriptSearch);