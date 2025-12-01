function sidebarToggle(side) {
    document.getElementById(`sidebar-` + side.toString()).classList.toggle(`sidebar-close`);
    document.getElementById(`button_sidebar-` + side.toString() + `_open`).classList.toggle(`button-close`);
    document.getElementById(`button_sidebar-` + side.toString() + `_close`).classList.toggle(`button-close`);
}

function modeToggle(mode) {
    document.documentElement.classList.toggle(`darkmode`);
    document.getElementById(`button_mode_light`).classList.toggle(`button-close`);
    document.getElementById(`button_mode_dark`).classList.toggle(`button-close`);
    localStorage.setItem(`mode`, mode);
    // Update Giscus` theme
    if (document.getElementById(`giscus-script`)) {
        document.getElementById(`giscus-script`).dataset[`theme`] = mode;
        const iframe = document.querySelector(`iframe.giscus-frame`);
        iframe.contentWindow.postMessage({
            giscus: {
                setConfig: {
                    theme: mode
                }
            }
        }, `https://giscus.app`);
    }
}

function searchToggle() {
    document.getElementById(`search-panel_container`).classList.toggle(`hidden`);
}

function selectToggle(item) {
    const checkState = document.querySelector(`#search-panel_${item} > .search-panel_item_container`);
    let flag;
    if (checkState.dataset[`checkState`] === `checked`) {
        flag = false;
        checkState.dataset[`checkState`] = `unchecked`;
    }
    else {
        flag = true;
        checkState.dataset[`checkState`] = `checked`;
    }
    Array.from(document.querySelectorAll(`.${item}_item > input`)).forEach((input) => {
        input.checked = flag;
    });
}

function searchItemMove(direction, event) {
    const item = event.parentElement;
    const position = Number(item.dataset[`position`]);
    
    let step = 0;
    if (direction === `down`) {
        if (position === 7) {
            return;
        }
        step = 1;
    }
    else {
        if (position === 1) {
            return;
        }
        step = -1;
    }
    const newposition = position + step;
    const itemref = document.querySelector(`.search-panel_item[data-position="${newposition}"]`);
    itemref.dataset[`position`] = String(position);
    item.dataset[`position`] = String(newposition);
    if (direction === `down`) {
        document.getElementById(`search-panel_container`).insertBefore(itemref, item);
    }
    else {
        document.getElementById(`search-panel_container`).insertBefore(item, itemref);
    }

}

function tableOfContentsToggle() {
    document.getElementById(`table-of-content_wrap`).classList.toggle(`hidden`);
    document.getElementById(`table-of-content_overflow`).classList.toggle(`hidden`);
    Array.from(document.querySelectorAll(`#sidebar-right_content > a`)).forEach((heading) => {
        heading.classList.toggle(`overflow`);
    });
}

function resetState(index) {
    viewerState.currentIndex = typeof index === `number` ? index : viewerState.currentIndex;
    viewerState.zoom = 1;
    viewerState.rotate = 0;
    viewerState.flipH = 1;
    viewerState.flipV = 1;
    viewerState.posX = 0;
    viewerState.posY = 0;
}

function imageOpen(index) {
    const wrapper = document.getElementById(`wrapper`);

    wrapper.style.display = "block";

    viewerState.currentIndex = index;
    viewerState.zoom = 1;
    viewerState.rotate = 0;
    viewerState.flipH = 1;
    viewerState.flipV = 1;

    resetState(index);
    renderImage();
    renderCaption();
}

function renderCaption() {
    const caption = document.getElementById(`image-caption`);
    caption.innerHTML = ``;
    caption.appendChild(viewerState.captions[viewerState.currentIndex].cloneNode(true));
}

function renderImage() {
    const container = document.getElementById(`image-container`);
    const currentImgObj = viewerState.images[viewerState.currentIndex];

    container.innerHTML = ``;

    const img = document.createElement(`img`);
    img.src = currentImgObj.src;
    img.id = `viewer-active-image`;

    img.style.transition = `transform 0.1s ease-out`;
    img.draggable = false;

    container.appendChild(img);
    applyTransforms();
}

function applyTransforms() {
    const img = document.getElementById(`viewer-active-image`);
    if (!img) return;

    img.style.transform = `
        translate(${viewerState.posX}px, ${viewerState.posY}px)
        rotate(${viewerState.rotate}deg) 
        scale(${viewerState.zoom}) 
        scaleX(${viewerState.flipH}) 
        scaleY(${viewerState.flipV})
    `;
}

function imageClose() {
    const wrapper = document.getElementById(`wrapper`);
    const container = document.getElementById(`image-container`);

    wrapper.style.display = "none";
    if (container) container.innerHTML = ``;
}

function imageMove(direction) {
    const total = viewerState.images.length;
    if (total === 0) return;

    if (direction === `left`) {
        viewerState.currentIndex--;
        if (viewerState.currentIndex < 0) {
            viewerState.currentIndex = total - 1;
        }
    } else if (direction === `right`) {
        viewerState.currentIndex++;
        if (viewerState.currentIndex >= total) {
            viewerState.currentIndex = 0;
        }
    }
    
    viewerState.zoom = 1;
    viewerState.rotate = 0;
    viewerState.flipH = 1;
    viewerState.flipV = 1;
    
    resetState();
    renderImage();
    renderCaption();
}

function imageZoom(direction) {
    const step = 0.2;
    
    if (direction === `in`) {
        viewerState.zoom += step;
    } else if (direction === `out`) {
        viewerState.zoom -= step;
        if (viewerState.zoom < 0.2) viewerState.zoom = 0.2; 
    }
    applyTransforms();
}

function imageRotate(direction) {
    if (direction === `left`) {
        viewerState.rotate -= 90;
    } else if (direction === `right`) {
        viewerState.rotate += 90;
    }
    applyTransforms();
}

function imageFlip(direction) {
    if (direction === `horizontal`) {
        viewerState.flipH *= -1;
    } else if (direction === `vertical`) {
        viewerState.flipV *= -1;
    }
    applyTransforms();
}

function imageDownload() {
    const currentImgObj = viewerState.images[viewerState.currentIndex];
    if (!currentImgObj) return;

    const link = document.createElement(`a`);
    link.href = currentImgObj.src;
    
    const filename = currentImgObj.src.substring(currentImgObj.src.lastIndexOf(`/essence-guide/`) + 1) || `downloaded-image.jpg`;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function searchBlogContent() {
    const inputElement = document.getElementById('input_search');

    if (inputElement) {
        const rawValue = inputElement.value.trimStart();
        const encodedValue = encodeURIComponent(rawValue);
        const targetUrl = `/essence-guide/blog.html?content=${encodedValue}`;
        window.open(targetUrl, '_blank');
    }
}