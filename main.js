// main.js

// Variables to store game state
let panZoomInstance;
let countriesData = [];
let categoriesData = {};
let categoryColors = {};
let exportList = [];
let exportsMap = {};
let selectedCountry = null;
let correctTally = 0;

// Function to start the game initialization process
function initializeGame() {
    loadGameData();
}

// Function to load necessary game data (countries and export categories)
function loadGameData() {
    fetch('countries_and_exports.json')
        .then(response => response.json())
        .then(data => {
            countriesData = data.map(normalizeCountryExports);
            return fetch('categorized_exports.json');
        })
        .then(response => response.json())
        .then(data => {
            categoriesData = data;
            processExportCategories();
            loadMap();
            initializeSelectorsAndUI();
        });
}

// Normalize the 'Main Exports' field in each country object
function normalizeCountryExports(country) {
    return {
        ...country,
        normalizedExport: country['Main Exports'] 
            ? country['Main Exports'].trim().toLowerCase() 
            : null
    };
}

// Process categories data to create color mappings and export lists
function processExportCategories() {
    exportList = [];
    exportsMap = {};
    categoryColors = {};

    for (const category in categoriesData) {
        const { color, products } = categoriesData[category];
        products.sort().forEach(product => {
            const normalizedProduct = product.trim().toLowerCase();
            categoryColors[normalizedProduct] = color;

            if (!exportsMap[normalizedProduct]) {
                exportsMap[normalizedProduct] = product.trim();
                exportList.push({ displayName: product.trim(), normalizedName: normalizedProduct });
            }
        });
    }
}

// Load the SVG map and initialize zoom/pan functionality
function loadMap() {
    fetch('map.svg')
        .then(response => response.text())
        .then(svgText => {
            document.getElementById('map-container').innerHTML = svgText;
            initializeMapControls();
            addGrayStripedPattern();
            applyCountryStyles();
        });
}

// Initialize zoom and pan controls for the SVG map
function initializeMapControls() {
    panZoomInstance = svgPanZoom('svg', {
        zoomEnabled: true,
        controlIconsEnabled: false,
        fit: true,
        center: true
    });

    const svg = document.querySelector('svg');
    svg.classList.add('w-full', 'h-full');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
}

// Add gray striped pattern to represent countries with no export data
function addGrayStripedPattern() {
    const svg = document.querySelector('svg');
    const defs = svg.querySelector('defs') || createSVGElement('defs', svg, svg.firstChild);
    
    const pattern = createSVGElement('pattern', defs, null, {
        id: 'stripedGray',
        patternUnits: 'userSpaceOnUse',
        width: '4',
        height: '4'
    });

    createSVGElement('rect', pattern, null, { width: '4', height: '4', fill: '#808080' });
    createSVGElement('line', pattern, null, {
        x1: '0', y1: '0', x2: '4', y2: '4', stroke: 'white', 'stroke-width': '1'
    });
}

// Helper function to create an SVG element
function createSVGElement(tag, parent, beforeChild = null, attributes = {}) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attributes).forEach(attr => element.setAttribute(attr, attributes[attr]));
    parent.insertBefore(element, beforeChild);
    return element;
}

// Apply initial styles and event listeners to each country in the SVG map
function applyCountryStyles() {
    const countries = document.querySelectorAll('[id]');
    countries.forEach(country => {
        const countryId = country.getAttribute('id');
        const countryData = countriesData.find(c => c.ISO_A3 === countryId);

        if (!countryData || !countryData.normalizedExport) {
            country.style.fill = 'url(#stripedGray)';
            country.style.cursor = 'not-allowed';
        } else {
            country.style.cursor = 'pointer';
            country.addEventListener('click', onCountryClick);
        }
    });
}

// Handler for country selection from the map
function onCountryClick(event) {
    selectedCountry = event.currentTarget;
    document.getElementById('country-select').value = selectedCountry.getAttribute('id');
    document.getElementById('submit-export').disabled = false;
}

// Initialize UI components (country and export selectors, tally message)
function initializeSelectorsAndUI() {
    populateCountrySelector();
    populateExportSelector();
    updateTallyMessage();

    document.getElementById('submit-export').addEventListener('click', handleExportSubmit);
}

// Populate the country selection dropdown
function populateCountrySelector() {
    const countrySelect = document.getElementById('country-select');
    countrySelect.innerHTML = '';

    countriesData
        .filter(country => country['Final Display Name'])
        .sort((a, b) => a['Final Display Name'].localeCompare(b['Final Display Name']))
        .forEach(country => {
            const option = new Option(country['Final Display Name'], country.ISO_A3);
            countrySelect.appendChild(option);
        });

    countrySelect.addEventListener('change', handleCountrySelection);
}

// Handle country selection from the dropdown
function handleCountrySelection() {
    const selectedISO = this.value;
    const countryElement = document.getElementById(selectedISO);
    if (countryElement) {
        selectedCountry = countryElement; // Assign the selected country for future interactions
        document.getElementById('submit-export').disabled = false; // Enable the submit button
    }
}

// Populate the export selection dropdown with optgroups based on categories
function populateExportSelector() {
    const exportSelect = document.getElementById('export-select');
    exportSelect.innerHTML = '';

    Object.keys(categoriesData)
        .sort()
        .forEach(category => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category;

            categoriesData[category].products.sort().forEach(product => {
                const normalizedProduct = product.trim().toLowerCase();
                if (exportsMap[normalizedProduct]) {
                    const option = new Option(exportsMap[normalizedProduct], normalizedProduct);
                    optgroup.appendChild(option);
                }
            });

            exportSelect.appendChild(optgroup);
        });

    document.getElementById('submit-export').disabled = true;
}

// Handle export submission and check for correctness
function handleExportSubmit() {
    if (!selectedCountry) return;

    const selectedExport = document.getElementById('export-select').value;
    const countryId = selectedCountry.getAttribute('id');
    const countryData = countriesData.find(c => c.ISO_A3 === countryId);

    if (countryData && countryData.normalizedExport === selectedExport) {
        selectedCountry.style.fill = categoryColors[selectedExport] || '#808080';
        correctTally++;
    }

    updateTallyMessage();
    resetGameState();
}

// Update the tally message after each correct match
function updateTallyMessage() {
    document.getElementById('tally').textContent = `Correctly Solved Countries: ${correctTally}`;
}

// Reset the game state after an export is submitted
function resetGameState() {
    selectedCountry = null;
    document.getElementById('submit-export').disabled = true;
}

// Start the game initialization
initializeGame();
