// - Global blogs data - 
// Stores detailed metadata for rendering
let blogSeparate = [];
// Stores unique values for the Sidebar Filters
let blogCombine = {
    tags: new Set(),
    authors: new Map(),
    languages: new Map(),
    dates: { 
        posted: [],
        updated: []
    }
};

// Initialize MiniSearch
let miniSearch = new MiniSearch({
    // Fields to search fuzzily
    fields: [
        `title`,
        `subtitle`,
        // `tagsRaw`,
        `content`
    ],
    storeFields: [`id`],
    searchOptions: {
        // May disable tags for precise match
        boost: { 
            title: 3, 
            subtitle: 2, 
            // tagsRaw: 1.5, 
            content: 1
        },
        fuzzy: 0.2,
        prefix: true
    }
});

// Extract text from every blogs content
function extractContentFromDoc(doc) {
    const clone = doc.body.cloneNode(true);
    // Remove metadata UI parts to not pollute the content search
    const irrelevant = clone.querySelectorAll(`script, style, nav, header, footer, #search-panel, #search-result`);
    irrelevant.forEach(el => el.remove());
    return clone.textContent.replace(/\s+/g, ` `).trim();
}

// Load data to prepare for searching
async function searchPrepare() {
    if (typeof MiniSearch === `undefined`) {
        console.error("MiniSearch library is not loaded. Please check include order.");
        return;
    }

    // Fetch the manifest file (blogs.json)
    let blogPaths = [];
    try {
        const response = await fetch(`/blog/blogs.json`);
        if (!response.ok) throw new Error("Could not load blogs.json");
        blogPaths = await response.json();
    } catch (error) {
        console.error("Error loading blog list:", error);
        return;
    }

    // Fetch and parse every blog
    const fetchPromises = blogPaths.map(async (path, index) => {
        try {
            const res = await fetch(path);
            const text = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, `text/html`);

            // Extract tags
            const tagEls = doc.querySelectorAll(`#tag-container .tag`);
            const tags = Array.from(tagEls).map(el => el.innerText.trim());

            // Extract title, subtitle, and banner
            const title = doc.querySelector(`#header-title`)?.innerText.trim() || "Untitled";
            const subtitle = doc.querySelector(`.text_subtitle`)?.innerText.trim() || "";
            const banner = doc.querySelector(`.blog-banner img`)?.getAttribute(`src`) || "";

            // Extract authors
            const authorEls = doc.querySelectorAll(`#author-container .author`);
            const authors = Array.from(authorEls).map(el => {
                return {
                    name: el.querySelector(`.author-name`)?.innerText.trim() || "Unknown",
                    img: el.querySelector(`img`)?.getAttribute(`src`) || "",
                    role: el.querySelector(`.author-role`)?.innerText.trim() || ""
                };
            });

            // Extract dates (format: YYYY-MM-DD)
            const postedStr = doc.querySelector(`#date-posted`)?.innerText.trim();
            const updatedStr = doc.querySelector(`#date-updated`)?.innerText.trim();
            const parseDate = (str) => {
                if (!str) return null;
                
                const parts = str.split(`-`).map(Number);
                // Month is 0-indexed in JS Date
                return new Date(parts[0], parts[1] - 1, parts[2]);
            };
            const datePosted = parseDate(postedStr);
            const dateUpdated = parseDate(updatedStr);

            // Extract language (every blog has only one active language)
            const langEl = doc.querySelector(`#language-container .language-active`);
            const language = {
                code: langEl?.getAttribute(`data-language-code`) || "en",
                name: langEl?.querySelector(`.language-name`)?.innerText.trim() || "English",
                flag: langEl?.querySelector(`.language-flag`)?.innerText.trim() || "🇬🇧"
            };

            // Extract content in #main-container 
            const content = extractContentFromDoc(doc);

            // Update blogCombine
            tags.forEach(t => blogCombine.tags.add(t));
            authors.forEach(a => blogCombine.authors.set(a.name, a.img));
            blogCombine.languages.set(language.code, { name: language.name, flag: language.flag });
            if (datePosted) blogCombine.dates.posted.push(datePosted);
            if (dateUpdated) blogCombine.dates.updated.push(dateUpdated);

            // Return the Data Object
            return {
                // Internal ID for MiniSearch
                id: index, 
                url: path,
                title,
                subtitle,
                banner,
                tags,
                // Helper for fuzzy search
                // tagsRaw: tags.join(` `), 
                authors,
                datePosted,
                dateUpdated,
                // Keep original string for display
                postedStr,
                updatedStr,
                // Single object
                language,   
                content
            };

        } catch (err) {
            console.error(`Failed to parse ${path}:`, err);
            return null;
        }
    });

    const results = await Promise.all(fetchPromises);
    blogSeparate = results.filter(b => b !== null);

    // Add to search index
    miniSearch.addAll(blogSeparate);

    // Populate the UI of search panel
    updateSearchPanelUI();

    // Default sort: Newest Updated -> Oldest for Updated date
    blogSeparate.sort((a, b) => (b.dateUpdated || 0) - (a.dateUpdated || 0));

    // Render all blogs
    renderInitialBlogs(blogSeparate);

    // Update blogs counter
    document.getElementById(`counter_matched-blog`).innerText = blogSeparate.length;
    document.getElementById(`counter_total-blog`).innerText = blogSeparate.length;

    // Check if there is parameter in the URL
    handleURLParameters();
}

// 
function renderInitialBlogs(blogs) {
    const container = document.getElementById(`search-result_container`);
    container.innerHTML = ``; // Clear skeleton/loading state

    blogs.forEach(blog => {
        const authorsHtml = blog.authors.map(a => `
            <span class="tag">
                <img src="${a.img}" alt="${a.name}">
                <span class="author-name">${a.name}</span>
            </span>`).join(``);
        
        const tagsHtml = blog.tags.map(t => `<span class="tag">${t}</span>`).join(``);

        // IMPORTANT: We add `data-id` to link this DOM element to the blogSeparate array
        const html = `
        <a class="search-result_item" href="${blog.url}" data-id="${blog.id}">
            <div class="search-result_item_banner">
                ${blog.banner ? `<img src="${blog.banner}">` : ``}
            </div>
            <div class="search-result_item_info">
                <div class="tag-container">${tagsHtml}</div>
                <p class="text_title">${blog.title}</p>
                <p class="text_subtitle">${blog.subtitle}</p>
                <div class="author-container">${authorsHtml}</div>
                <div class="date-container">
                    <div class="date-item"><span>Posted: ${blog.postedStr}</span></div>
                    <div class="date-item"><span>Updated: ${blog.updatedStr}</span></div>
                </div>
                <div class="language-container">
                    <span class="language-flag">${blog.language.flag}</span>
                    <span class="language-name">${blog.language.name}</span>
                </div>
            </div>
        </a>`;
        
        container.insertAdjacentHTML(`beforeend`, html);
    });

    // Add a "No results" message that is hidden by default
    container.insertAdjacentHTML(`beforeend`, `<p id="no-results-msg" class="hidden">No results found.</p>`);
}

// Change the UI Panel whenever users hit the search button
function updateSearchPanelUI() {
    // Tags
    const tagContainer = document.querySelector(`#search-panel_tag .search-panel_item_container`);
    tagContainer.innerHTML = ``;
    blogCombine.tags.forEach(tag => {
        tagContainer.innerHTML += `<label class="tag_item"><input type="checkbox" value="${tag}"><span class="tag_item_name">${tag}</span></label>`;
    });

    // Authors
    const authorContainer = document.querySelector(`#search-panel_author .search-panel_item_container`);
    authorContainer.innerHTML = ``;
    blogCombine.authors.forEach((img, name) => {
        authorContainer.innerHTML += `<label class="author_item"><input type="checkbox" value="${name}"><img src="${img}"><span class="author_item_name">${name}</span></label>`;
    });

    // Languages
    const langContainer = document.querySelector(`#search-panel_language .search-panel_item_container`);
    langContainer.innerHTML = ``;
    blogCombine.languages.forEach((meta, code) => {
        langContainer.innerHTML += `<label class="language_item"><input type="checkbox" value="${code}"><span class="language_item_flag">${meta.flag}</span><span data-language-code="${code}" class="language_item_name">${meta.name}</span></label>`;
    });
}

// Search the blog using input from search panel
function searchBlog() {
    // Gather inputs
    const getVals = (s) => Array.from(document.querySelectorAll(`${s} input:checked`)).map(x => x.value);
    
    const filters = {
        tags: getVals(`#search-panel_tag .tag_item`),
        authors: getVals(`#search-panel_author .author_item`),
        languages: getVals(`#search-panel_language .language_item`),
        title: document.querySelector(`#search-panel_title input`).value.toLowerCase(),
        subtitle: document.querySelector(`#search-panel_subtitle input`).value.toLowerCase(),
        content: document.querySelector(`#search-panel_content input`).value.toLowerCase(),
        postedStart: document.getElementById(`search-panel_date-posted_start`).valueAsDate,
        postedEnd: document.getElementById(`search-panel_date-posted_end`).valueAsDate,
        updatedStart: document.getElementById(`search-panel_date-updated_start`).valueAsDate,
        updatedEnd: document.getElementById(`search-panel_date-updated_end`).valueAsDate,
    };

    // Filter candidates
    let fuzzyScores = null;
    const query = `${filters.title} ${filters.subtitle} ${filters.content}`.trim();
    
    if (query.length > 0) {
        const results = miniSearch.search(query);
        fuzzyScores = new Map();
        results.forEach(r => fuzzyScores.set(parseInt(r.id), r.score));
    }

    let candidates = blogSeparate.filter(blog => {
        if (fuzzyScores && !fuzzyScores.has(blog.id)) return false;
        if (filters.title && !blog.title.toLowerCase().includes(filters.title)) return false;
        if (filters.subtitle && !blog.subtitle.toLowerCase().includes(filters.subtitle)) return false;
        if (filters.tags.length > 0 && !blog.tags.some(t => filters.tags.includes(t))) return false;
        if (filters.authors.length > 0 && !blog.authors.some(a => filters.authors.includes(a.name))) return false;
        if (filters.languages.length > 0 && !filters.languages.includes(blog.language.code)) return false;
        
        if (filters.postedStart && blog.datePosted < filters.postedStart) return false;
        if (filters.postedEnd && blog.datePosted > filters.postedEnd) return false;
        if (filters.updatedStart && blog.dateUpdated < filters.updatedStart) return false;
        if (filters.updatedEnd && blog.dateUpdated > filters.updatedEnd) return false;

        return true;
    });

    document.getElementById(`counter_matched-blog`).innerText = candidates.length;

    // Sort candidates based on search panel order
    const panels = Array.from(document.querySelectorAll(`.search-panel_item`));
    panels.sort((a, b) => parseInt(a.dataset.position) - parseInt(b.dataset.position));

    const sortCriteria = panels.map(p => ({
        id: p.id,
        mode: p.querySelector(`.search-panel_item_sort`)?.value || `none`
    })).filter(c => c.mode !== `none`);

    candidates.sort((a, b) => {
        for (let crit of sortCriteria) {
            let res = 0;
            let valA, valB;

            switch(crit.id) {
                case `search-panel_title`: res = a.title.localeCompare(b.title); break;
                case `search-panel_subtitle`: res = a.subtitle.localeCompare(b.subtitle); break;
                case `search-panel_tag`: res = (a.tags[0]||``).localeCompare(b.tags[0]||``); break;
                case `search-panel_author`: res = (a.authors[0]?.name||``).localeCompare(b.authors[0]?.name||``); break;
                case `search-panel_language`: res = a.language.name.localeCompare(b.language.name); break;
                case `search-panel_date-posted`:
                    res = (a.datePosted || 0) - (b.datePosted || 0);
                    if (crit.mode === `n-o`) res *= -1;
                    break;
                case `search-panel_date-updated`:
                    res = (a.dateUpdated || 0) - (b.dateUpdated || 0);
                    if (crit.mode === `n-o`) res *= -1;
                    break;
            }

            if ([`z-a`, `m-l`].includes(crit.mode) && typeof res === `number` && !crit.id.includes(`date`)) {
                res *= -1;
            }
            if (res !== 0) return res;
        }

        if (fuzzyScores) return (fuzzyScores.get(b.id) || 0) - (fuzzyScores.get(a.id) || 0);
        return 0;
    });

    // Reorder & toggle visibility
    const container = document.getElementById(`search-result_container`);
    const noResultsMsg = document.getElementById(`no-results-msg`);
    
    // Create a set of candidate IDs for fast lookup
    const candidateIds = new Set(candidates.map(c => c.id));

    // Process matches: remove hidden, move to bottom
    candidates.forEach(blog => {
        const el = container.querySelector(`.search-result_item[data-id="${blog.id}"]`);
        if (el) {
            el.classList.remove(`hidden`);
            container.appendChild(el);
        }
    });

    // Process non-matches: add hidden
    blogSeparate.forEach(blog => {
        if (!candidateIds.has(blog.id)) {
            const el = container.querySelector(`.search-result_item[data-id="${blog.id}"]`);
            if (el) el.classList.add(`hidden`);
        }
    });

    // Handle no results message
    if (candidates.length === 0) {
        noResultsMsg.classList.remove(`hidden`);
    } 
    else {
        // Move message to bottom
        container.appendChild(noResultsMsg); 
        noResultsMsg.classList.add(`hidden`);
    }
}

// Handle URL if there exists parameter
function handleURLParameters() {
    // Parse the current URL parameters
    const params = new URLSearchParams(window.location.search);
    const contentQuery = params.get('content');

    // If the parameter exists and is not empty
    if (contentQuery) {
        // Find the input field inside the specific search panel item
        const contentInput = document.querySelector('#search-panel_content input');
        if (contentInput) {
            // Populate the input
            contentInput.value = contentQuery;
            // Trigger the search function immediately
            console.log(`Auto-searching for parameter: "${contentQuery}"`);
            searchBlog();
        }
    }
}

// Start loading blogs data when page is loaded
window.addEventListener(`DOMContentLoaded`, searchPrepare);